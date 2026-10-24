import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, LogOut, LayoutDashboard, Clock, UserCheck, Package,
  CheckCircle, XCircle, Eye, Plus, Minus, Calendar
} from "lucide-react";
import { getUploadedFileUrl, getShopkeeperDashboard, getPendingVerifications, getVerifiedBeneficiaries, getShopkeeperStock, verifyUser, updateStock, toggleShopStatus, sellStock, getBeneficiaryQuotaAPI, collectRationAPI, getShopkeeperStockHistoryAPI, getAssignedStockAPI, receiveStockAPI, getShopkeeperBookingsAPI, updateShopkeeperBookingAPI } from "@/data/api";

const ShopkeeperDashboard = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState("overview");
  const [user] = useState(() => JSON.parse(localStorage.getItem("currentUser") || "{}"));
  const [loading, setLoading] = useState(true);

  // Shop status
  const [shopOpen, setShopOpen] = useState(true);
  const [stats, setStats] = useState({ pending: 0, verified: 0, stockItems: 0 });

  // Pending verifications
  const [pendingApps, setPendingApps] = useState([]);
  const [verifiedList, setVerifiedList] = useState([]);
  const [stock, setStock] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [assignedStock, setAssignedStock] = useState([]);
  const [bookings, setBookings] = useState([]);

  // Log filter
  const [logFilter, setLogFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dash, pending, verified, stk, hist, assigned, bkings] = await Promise.all([
          getShopkeeperDashboard(),
          getPendingVerifications(), 
          getVerifiedBeneficiaries(),
          getShopkeeperStock(),
          getShopkeeperStockHistoryAPI().catch(() => []),
          getAssignedStockAPI().catch(() => []),
          getShopkeeperBookingsAPI().catch(() => []),
        ]);

        setStats(dash.stats || { pending: 0, verified: 0, stockItems: 0 });
        setShopOpen(dash.shop?.is_open ?? true);
        setPendingApps(pending);
        setVerifiedList(verified);
        setStock(stk);
        setStockHistory(hist);
        setAssignedStock(assigned);
        setBookings(bkings);
      } catch (err) {
        console.error("Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const [viewApp, setViewApp] = useState(null);
  const [addStockItem, setAddStockItem] = useState(null);
  const [sellStockItem, setSellStockItem] = useState(null);
  const [addQty, setAddQty] = useState("");
  const [sellQty, setSellQty] = useState("");

  const [collectUser, setCollectUser] = useState(null);
  const [bQuota, setBQuota] = useState([]);
  const [collectLoading, setCollectLoading] = useState(false);

  const handleOpenCollect = async (beneficiary) => {
    setCollectUser(beneficiary);
    setCollectLoading(true);
    try {
      const q = await getBeneficiaryQuotaAPI(beneficiary.id);
      setBQuota(q);
    } catch {
      alert("Failed to load user quota.");
    } finally {
      setCollectLoading(false);
    }
  };

  const handleCollectRation = async (itemName, amount) => {
    if (!amount || amount <= 0) return;
    try {
      await collectRationAPI({ userId: collectUser.id, itemName, amount });
      // Update local quota state
      setBQuota(prev => prev.map(q => q.item_name === itemName ? { ...q, remaining_quota: q.remaining_quota - amount } : q));
      // Refresh stock and history
      const [stk, hist] = await Promise.all([
        getShopkeeperStock(),
        getShopkeeperStockHistoryAPI()
      ]);
      setStock(stk);
      setStockHistory(hist);
    } catch (err) {
      alert(err.message || "Collection failed.");
    }
  };

  const handleVerify = async (id, action) => {
    try { 
      await verifyUser(id, action); 
      setPendingApps((prev) => prev.filter((a) => a.id !== id));
      setViewApp(null);
    } catch { 
      alert("Action failed. Check backend.");
    }
  };

  const handleToggleShop = async () => {
    const newStatus = !shopOpen;
    try { 
      await toggleShopStatus(newStatus); 
      setShopOpen(newStatus);
    } catch { 
      alert("Failed to toggle shop status.");
    }
  };

  const handleUpdateStock = async (itemId) => {
    if (!addQty) return;
    const qty = parseInt(addQty, 10);
    try { 
      await updateStock(itemId, qty); 
      setStock((prev) =>
        prev.map((s) => s.id === itemId ? { ...s, allocated: Number(s.allocated) + qty } : s)
      );
      setAddStockItem(null);
      setAddQty("");
      const hist = await getShopkeeperStockHistoryAPI();
      setStockHistory(hist);
    } catch {
      alert("Failed to update stock.");
    }
  };

  const handleSellStock = async (itemId) => {
    if (!sellQty) return;
    const qty = parseInt(sellQty, 10);
    try { 
      await sellStock(itemId, qty); 
      setStock((prev) =>
        prev.map((s) => s.id === itemId ? { ...s, distributed: Number(s.distributed) + qty } : s)
      );
      setSellStockItem(null);
      setSellQty("");
      const hist = await getShopkeeperStockHistoryAPI();
      setStockHistory(hist);
    } catch (err) {
      alert(err.message || "Failed to record sale.");
    }
  };

  const handleReceiveStock = async (id) => {
    try {
      await receiveStockAPI(id);
      
      const [stk, hist, assigned] = await Promise.all([
        getShopkeeperStock(),
        getShopkeeperStockHistoryAPI(),
        getAssignedStockAPI()
      ]);
      setStock(stk);
      setStockHistory(hist);
      setAssignedStock(assigned);
      
      alert("Stock received successfully!");
    } catch {
      alert("Failed to receive stock.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    navigate("/login");
  };
  const handleUpdateBooking = async (id, status) => {
    try {
      await updateShopkeeperBookingAPI(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (err) {
      alert("Failed to update booking status: " + (err.message || ""));
    }
  };

  const navItems = [
    { title: "Overview", icon: LayoutDashboard, key: "overview" },
    { title: "Pending Verifications", icon: Clock, key: "pending" },
    { title: "Verified Beneficiaries", icon: UserCheck, key: "verified" },
    { title: "Customer Bookings", icon: Calendar, key: "bookings" },
    { title: "Stock / Inventory", icon: Package, key: "inventory" },
    { title: "Incoming Shipments", icon: ShieldCheck, key: "shipments" },
    { title: "Stock Log", icon: Clock, key: "stock-log" },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon"><ShieldCheck size={14} /></div>
          <span>Shopkeeper</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`sidebar-link ${section === item.key ? "active" : ""}`}
              onClick={() => setSection(item.key)}
            >
              <item.icon size={16} />
              <span>{item.title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleLogout}><LogOut size={16} /><span>Logout</span></button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard-main">
        <header className="topbar">
          <div className="topbar-title">Shopkeeper Dashboard</div>
          <div className="topbar-right">
            <span className="badge badge-primary" style={{ marginRight: "0.5rem" }}>{user.name || "Ramesh Kumar"}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="dashboard-content animate-in">
          {/* OVERVIEW */}
          {section === "overview" && (
            <>
              {/* Shop Status Toggle */}
              <div className="shop-status">
                <span className={`status-dot ${shopOpen ? "open" : "closed"}`} />
                <span style={{ fontWeight: 700, flex: 1 }}>Shop is {shopOpen ? "Open" : "Closed"}</span>
                <input type="checkbox" className="toggle-switch" checked={shopOpen} onChange={handleToggleShop} />
              </div>

              <div className="grid-3">
                {[
                  { label: "Total Beneficiaries", value: verifiedList.length + pendingApps.length, icon: UserCheck, color: "blue" },
                  { label: "Pending Verifications", value: pendingApps.length, icon: Clock, color: "orange" },
                  { label: "Stock Items", value: stock.length, icon: Package, color: "green" },
                ].map((card) => (
                  <div key={card.label} className="card">
                    <div className="stat-card">
                      <div className={`stat-icon ${card.color}`}><card.icon size={22} /></div>
                      <div>
                        <div className="stat-value">{card.value}</div>
                        <div className="stat-label">{card.label}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* PENDING VERIFICATIONS */}
          {section === "pending" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Pending User Verifications</h2>
                <p className="card-subtitle">Verify user documents and forward to admin for final approval</p>
              </div>
              <div className="card-body">
                {pendingApps.length === 0 ? (
                  <div className="empty-state"><Clock size={40} /><p>No pending verifications</p></div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>ID</th><th>Name</th><th>Card Type</th><th>Members</th><th>Date</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {pendingApps.map((app) => (
                          <tr key={app.id}>
                            <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{app.id}</td>
                            <td style={{ fontWeight: 600 }}>{app.name}</td>
                            <td><span className="badge badge-outline">{app.cardType}</span></td>
                            <td>{app.members}</td>
                            <td className="text-muted">{app.date}</td>
                            <td>
                              <div className="flex gap-1">
                                <button className="btn btn-ghost btn-sm" onClick={() => setViewApp(app)} title="View"><Eye size={14} /></button>
                                <button className="btn btn-success btn-sm" onClick={() => handleVerify(app.id, "approve")} title="Approve"><CheckCircle size={14} /></button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleVerify(app.id, "reject")} title="Reject"><XCircle size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VERIFIED BENEFICIARIES */}
          {section === "verified" && (
            <div className="card">
              <div className="card-header"><h2 className="card-title">Verified Beneficiaries</h2></div>
              <div className="card-body">
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>ID</th><th>Name</th><th>Card Type</th><th>Members</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {verifiedList.map((v) => (
                        <tr key={v.id}>
                          <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{v.id}</td>
                          <td style={{ fontWeight: 600 }}>{v.name}</td>
                          <td><span className="badge badge-outline">{v.cardType}</span></td>
                          <td>{v.members}</td>
                          <td><span className="badge badge-success">{v.status}</span></td>
                          <td>
                            <button className="btn btn-primary btn-sm" onClick={() => handleOpenCollect(v)}>
                              <Clock size={12} style={{ marginRight: "0.25rem" }} /> Collect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STOCK / INVENTORY */}
          {section === "inventory" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Stock / Inventory Management</h2>
                <p className="card-subtitle">Update stock when new supply arrives</p>
              </div>
              <div className="card-body">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Total Received</th>
                        <th>Total Distributed</th>
                        <th>Current Balance</th>
                        <th style={{ textAlign: 'right' }}>Stock Health</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.map((s) => {
                        const remaining = Number(s.allocated) - Number(s.distributed);
                        const pct = s.allocated > 0 ? Math.round((remaining / s.allocated) * 100) : 0;
                        const level = pct > 50 ? "good" : pct > 20 ? "low" : "critical";
                        return (
                          <tr key={s.id} className={level === "critical" ? "table-row-danger" : level === "low" ? "table-row-warning" : ""}>
                            <td style={{ fontWeight: 700 }}>
                              {s.item}
                              {level === "critical" && <span className="badge badge-danger ml-1" style={{ fontSize: '10px' }}>LOW</span>}
                            </td>
                            <td>{s.allocated} kg</td>
                            <td>{s.distributed} kg</td>
                            <td style={{ fontWeight: 700, color: level === "critical" ? "var(--primary)" : "inherit" }}>
                              {remaining.toFixed(1)} kg
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="flex items-center justify-end gap-2">
                                <span className={`text-xs font-bold ${level === "good" ? "text-success" : level === "low" ? "text-warning" : "text-danger"}`}>
                                  {pct}% Available
                                </span>
                                <div className="stock-bar-track" style={{ width: "100px" }}>
                                  <div className={`stock-bar-fill ${level}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SHIPMENTS */}
          {section === "shipments" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Stock From Admin</h2>
                <p className="card-subtitle">Pending shipments sent by the district office</p>
              </div>
              <div className="card-body">
                {assignedStock.length === 0 ? (
                  <div className="empty-state"><Package size={40} /><p>No pending shipments from Admin</p></div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Item</th>
                          <th>Quantity</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedStock.map((a) => (
                          <tr key={a.id}>
                            <td className="text-sm">{new Date(a.created_at).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 600 }}>{a.item_name}</td>
                            <td style={{ fontWeight: 700 }}>{a.quantity} kg</td>
                            <td>
                              <button 
                                className="btn btn-success btn-sm" 
                                onClick={() => handleReceiveStock(a.id)}
                              >
                                Verify & Receive
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STOCK LOG */}
          {section === "stock-log" && (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <h2 className="card-title">Detailed Stock History</h2>
                  <p className="card-subtitle">Detailed log of all inventory movements</p>
                </div>
                <div className="flex gap-1 mb-1">
                  <button onClick={() => setLogFilter("all")} className={`btn btn-sm ${logFilter === "all" ? "btn-primary" : "btn-ghost"}`}>All</button>
                  <button onClick={() => setLogFilter("ADDED")} className={`btn btn-sm ${logFilter === "ADDED" ? "btn-success" : "btn-ghost"}`}>Shipments</button>
                  <button onClick={() => setLogFilter("DISTRIBUTED")} className={`btn btn-sm ${logFilter === "DISTRIBUTED" ? "btn-primary" : "btn-ghost"}`} style={logFilter === "DISTRIBUTED" ? {} : {color: "var(--primary)"}}>Distributions</button>
                </div>
              </div>
              <div className="card-body">
                {stockHistory.length === 0 ? (
                  <div className="empty-state"><Clock size={40} /><p>No stock activity recorded</p></div>
                ) : (
                  <div className="timeline-container">
                    {(() => {
                      const filtered = logFilter === "all" ? stockHistory : stockHistory.filter(h => h.action_type === logFilter);
                      
                      if (filtered.length === 0) {
                        return <div className="empty-state"><Package size={30} /><p>No results for this filter</p></div>;
                      }

                      // Group by date
                      const groups = {};
                      filtered.forEach(h => {
                        const date = new Date(h.timestamp).toLocaleDateString(undefined, {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        });
                        if (!groups[date]) groups[date] = [];
                        groups[date].push(h);
                      });

                      return Object.entries(groups).map(([date, items]) => (
                        <div key={date} className="history-group mb-2">
                          <h3 className="history-date-header">{date}</h3>
                          <div className="table-wrap no-border">
                            <table className="table compact-table">
                              <thead>
                                <tr>
                                  <th>Time</th>
                                  <th>Item</th>
                                  <th>Event</th>
                                  <th>Weight</th>
                                  <th>Source / Destination</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((h) => (
                                  <tr key={h.id}>
                                    <td className="text-xs text-muted">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td style={{ fontWeight: 600 }}>{h.item_name}</td>
                                    <td>
                                      <span className={`badge ${h.action_type === 'ADDED' ? 'badge-success' : 'badge-primary'}`}>
                                        {h.action_type === 'ADDED' ? 'Shipment Received' : 'Ration Distributed'}
                                      </span>
                                    </td>
                                    <td>
                                      <span style={{ fontWeight: 700, fontSize: '1rem', color: h.action_type === 'ADDED' ? 'var(--success)' : 'var(--primary)' }}>
                                        {h.action_type === 'ADDED' ? '+' : '-'}{h.quantity} kg
                                      </span>
                                    </td>
                                    <td className="text-sm">
                                      {h.action_type === 'DISTRIBUTED' 
                                        ? <span>Beneficiary: <strong>{h.user_name || 'Verified User'}</strong></span> 
                                        : <span>From: <strong>District Admin</strong></span>
                                      }
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CUSTOMER BOOKINGS */}
          {section === "bookings" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Customer Slot Bookings</h2>
                <p className="card-subtitle">Manage upcoming ration collection appointments booked by beneficiaries</p>
              </div>
              <div className="card-body">
                {bookings.length === 0 ? (
                  <div className="empty-state"><Calendar size={40} /><p>No customer slot bookings found</p></div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time Slot</th>
                          <th>Beneficiary</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((b) => (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 600 }}>{b.booking_date}</td>
                            <td>{b.time_slot}</td>
                            <td>{b.beneficiary_name} (ID: #{b.beneficiary_id})</td>
                            <td>
                              <span className={`badge ${b.status === 'completed' ? 'badge-success' : b.status === 'cancelled' ? 'badge-danger' : 'badge-primary'}`}>
                                {b.status === 'booked' ? 'Active' : b.status}
                              </span>
                            </td>
                            <td>
                              {b.status === 'booked' && (
                                <div className="flex gap-1">
                                  <button className="btn btn-success btn-sm" onClick={() => handleUpdateBooking(b.id, 'completed')}>
                                    Complete
                                  </button>
                                  <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateBooking(b.id, 'cancelled')} style={{ color: "var(--danger)" }}>
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Application Modal */}
      {viewApp && (
        <div className="modal-overlay" onClick={() => setViewApp(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "42rem", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 className="modal-title">Application {viewApp.id}</h3>
            {[
              ["Username", viewApp.username], ["Full Name", viewApp.name], ["Date of Birth", viewApp.dob],
              ["Gender", viewApp.gender], ["Mobile", viewApp.mobile], ["Aadhaar", viewApp.aadhaar],
              ["Ration Card Number", viewApp.ration_card_no], ["Card Type", viewApp.cardType],
              ["Family Members", viewApp.members], ["State", viewApp.state], ["District", viewApp.district],
              ["Taluk / Block", viewApp.taluk], ["Village / Ward", viewApp.village], ["Pincode", viewApp.pincode],
              ["Assigned Shop", viewApp.assigned_shop_name], ["Submitted", viewApp.date],
            ].map(([label, value]) => (
              <div key={label} className="data-row"><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>
            ))}
            <div className="data-row"><dt>Ration Card Image</dt><dd>{viewApp.ration_card_image ? "Uploaded" : "Not uploaded"}</dd></div>
            {viewApp.ration_card_image && (
              <a href={getUploadedFileUrl(viewApp.ration_card_image)} target="_blank" rel="noreferrer">
                <img src={getUploadedFileUrl(viewApp.ration_card_image)} alt="Beneficiary ration card" style={{ display: "block", maxWidth: "100%", maxHeight: "24rem", objectFit: "contain", margin: "0.75rem auto" }} />
              </a>
            )}
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => handleVerify(viewApp.id, "reject")}>Reject</button>
              <button className="btn btn-success" onClick={() => handleVerify(viewApp.id, "approve")}>Approve & Forward to Admin</button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Ration Modal */}
      {collectUser && (
        <div className="modal-overlay" onClick={() => setCollectUser(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="modal-title">Collect Ration: {collectUser.name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setCollectUser(null)}><XCircle size={18} /></button>
            </div>
            <p className="text-sm text-muted mb-2">Record ration collection for current month</p>
            
            {collectLoading ? (
              <div className="empty-state">Loading quota...</div>
            ) : bQuota.length === 0 ? (
              <div className="empty-state">No quota definition found for this user.</div>
            ) : (
              <div className="quota-list">
                {bQuota.map((q) => (
                  <QuotaCollectRow 
                    key={q.item_name}
                    item={q}
                    stock={stock}
                    onCollect={handleCollectRation}
                  />
                ))}
              </div>
            )}
            
            <div className="modal-actions mt-2">
              <button className="btn btn-ghost" onClick={() => setCollectUser(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuotaCollectRow = ({ item, stock, onCollect }) => {
  const [collectAmt, setCollectAmt] = useState("");
  const available = item.remaining_quota;
  
  const stockItem = stock.find(s => s.item.toLowerCase() === item.item_name.toLowerCase());
  const shopStock = stockItem ? (stockItem.remaining ?? (stockItem.allocated - stockItem.distributed)) : 0;
  
  const canCollect = Math.min(available, shopStock);

  return (
    <div className="card" style={{ marginBottom: "1rem", border: "1px solid var(--border)" }}>
      <div className="card-body" style={{ padding: "0.75rem" }}>
        <div className="flex justify-between items-center mb-1">
          <strong style={{ fontSize: "1rem" }}>{item.item_name}</strong>
          <span className="badge badge-outline">{item.remaining_quota} {item.unit || 'kg'} left of {item.total_quota} {item.unit || 'kg'}</span>
        </div>
        {item.per_person_qty && (
          <p className="text-xs text-muted mb-1">
            Calculated: {item.per_person_qty} {item.unit || 'kg'}/person × {item.family_members || 1} family members
          </p>
        )}
        <div className="flex items-center gap-1">
          <input 
            type="number" 
            className="form-input" 
            placeholder="Qty to give" 
            value={collectAmt} 
            onChange={(e) => setCollectAmt(e.target.value)}
            max={canCollect}
            style={{ flex: 1 }}
          />
          <button 
            className="btn btn-success" 
            onClick={() => {
              onCollect(item.item_name, parseFloat(collectAmt));
              setCollectAmt("");
            }}
            disabled={!collectAmt || parseFloat(collectAmt) > canCollect || parseFloat(collectAmt) <= 0}
          >
            Give
          </button>
        </div>
        <p className="text-xs text-muted mt-1">
          Shop Stock: {shopStock} {item.unit || 'kg'} available
        </p>
      </div>
    </div>
  );
};

export default ShopkeeperDashboard;
