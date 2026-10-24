import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, LogOut, LayoutDashboard, CheckSquare, Users, Settings,
  MessageSquare, CheckCircle, XCircle, AlertTriangle, Eye, Save, Plus, Trash2, Store, Package, TrendingUp
} from "lucide-react";
import { defaultQuota, cardTypes } from "@/data/mockData";
import { getUploadedFileUrl, getAdminDashboard, getPendingApprovals, getAllUsers, getComplaints, getQuotaSettings, approveRegistration, updateQuota, resolveComplaint, addNewQuotaItem, removeQuotaItemAPI, getShopsAPI, getShopDemandAPI, allocateStockAPI } from "@/data/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState("overview");
  const [user] = useState(() => JSON.parse(localStorage.getItem("currentUser") || "{}"));
  const [loading, setLoading] = useState(true);

  // States
  const [stats, setStats] = useState({ totalUsers: 0, pendingApprovals: 0, openComplaints: 0 });
  const [approvals, setApprovals] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [quotaData, setQuotaData] = useState(defaultQuota);
  const [shops, setShops] = useState([]);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [allocationLoading, setAllocationLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dash, pending, users, cmps, qta] = await Promise.all([
          getAdminDashboard(),
          getPendingApprovals(),
          getAllUsers(),
          getComplaints(),
          getQuotaSettings(),
        ]);

        setStats(dash);
         setApprovals(pending);
         setAllUsers(users);
         setComplaints(cmps);
         setQuotaData(qta);
         const shps = await getShopsAPI();
         setShops(shps);
      } catch (err) {
        console.error("Error fetching admin dashboard data:", err);
        // Fallback to initial empty states if API calls fail
        setStats({ totalUsers: 0, pendingApprovals: 0, openComplaints: 0 });
        setApprovals([]);
        setAllUsers([]);
        setComplaints([]);
        setQuotaData(defaultQuota);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Quota Management
  const [editingCard, setEditingCard] = useState("BPL");
  const [quotaSaved, setQuotaSaved] = useState(false);
  const [newItem, setNewItem] = useState({ itemName: "", quantity: "", price: "", unit: "kg", initialStock: "0" });
  const [newItemAdded, setNewItemAdded] = useState(false);
  const [cardSpecificItem, setCardSpecificItem] = useState({ item: "", qty: "", price: "" });

  const handleAddItemToSpecificCard = () => {
    if (!cardSpecificItem.item || !cardSpecificItem.qty || !cardSpecificItem.price) {
      alert("Please enter Item Name, Quantity, and Price.");
      return;
    }
    const itemNameClean = cardSpecificItem.item.trim();
    const currentItems = quotaData[editingCard] || [];
    if (currentItems.some((i) => i.item.toLowerCase() === itemNameClean.toLowerCase())) {
      alert(`Item '${itemNameClean}' is already in ${editingCard} quota table.`);
      return;
    }
    setQuotaData((prev) => ({
      ...prev,
      [editingCard]: [
        ...currentItems,
        { item: itemNameClean, qty: cardSpecificItem.qty.trim(), price: cardSpecificItem.price.trim() }
      ]
    }));
    setCardSpecificItem({ item: "", qty: "", price: "" });
  };

  const [viewItem, setViewItem] = useState(null);

  const handleApproval = async (id, action) => {
    const item = approvals.find((a) => a.id === id);
    try {
      await approveRegistration(id, item?.type?.toLowerCase(), action);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      setViewItem(null);
    } catch {
      alert("Action failed.");
    }
  };

  const handleComplaintAction = async (id, action) => {
    try {
      await resolveComplaint(id, action, action === "warn");
      setComplaints((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: action === "resolve" ? "resolved" : action === "warn" ? "warning_issued" : "dismissed" } : c)
      );
    } catch {
      alert("Action failed.");
    }
  };

  const handleQuotaSave = async () => {
    try {
      await updateQuota(editingCard, quotaData[editingCard]);
      setQuotaSaved(true);
      setTimeout(() => setQuotaSaved(false), 2000);
    } catch {
      alert("Failed to save quota.");
    }
  };

  const handleAddNewItem = async () => {
    if (!newItem.itemName || !newItem.quantity || !newItem.price) {
      alert("Please fill all fields for the new item.");
      return;
    }
    try {
      await addNewQuotaItem(newItem);
      
      const qta = await getQuotaSettings();
      setQuotaData(qta);
      
      setNewItem({ itemName: "", quantity: "", price: "", unit: "kg", initialStock: "0" });
      setNewItemAdded(true);
      setTimeout(() => setNewItemAdded(false), 2000);
    } catch (err) {
      alert("Failed to add new item");
    }
  };

  const handleRemoveQuotaItem = async (itemName) => {
    if (!window.confirm(`Are you sure you want to remove '${itemName}' from ${editingCard} quota?`)) return;
    try {
      await removeQuotaItemAPI(editingCard, itemName);
      setQuotaData((prev) => {
        const updated = { ...prev };
        updated[editingCard] = updated[editingCard].filter((q) => q.item !== itemName);
        return updated;
      });
    } catch {
      alert("Failed to remove item.");
    }
  };

  const updateQuotaItem = (index, field, value) => {
    setQuotaData((prev) => {
      const updated = { ...prev };
      updated[editingCard] = [...updated[editingCard]];
      updated[editingCard][index] = { ...updated[editingCard][index], [field]: value };
      return updated;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSectionChange = (key) => {
    setSection(key);
  };

  const handleAnalyzeDemand = async (shop) => {
    setSelectedDemand({ shop, loading: true, data: [] });
    try {
      const data = await getShopDemandAPI(shop.id);
      setSelectedDemand({ shop, loading: false, data });
    } catch {
      alert("Failed to analyze demand.");
      setSelectedDemand(null);
    }
  };

  const handleAllocateStock = async () => {
    if (!selectedDemand) return;
    setAllocationLoading(true);
    try {
      const itemsToAllocate = selectedDemand.data
        .filter(d => d.suggestedShipment > 0)
        .map(d => ({
          itemName: d.item,
          quantity: Number(d.suggestedShipment)
        }));

      if (itemsToAllocate.length === 0) {
        alert("No items have a positive demand to allocate.");
        setAllocationLoading(false);
        return;
      }

      await allocateStockAPI(selectedDemand.shop.id, itemsToAllocate);
      alert("Stock allocated successfully!");
      setSelectedDemand(null);
    } catch {
      alert("Stock allocation failed.");
    } finally {
      setAllocationLoading(false);
    }
  };

  const navItems = [
    { title: "Overview", icon: LayoutDashboard, key: "overview" },
    { title: "Approvals", icon: CheckSquare, key: "approvals" },
    { title: "Shop Management", icon: Store, key: "shops" },
    { title: "Quota Management", icon: Settings, key: "quota" },
    { title: "Complaints", icon: MessageSquare, key: "complaints" },
    { title: "All Users", icon: Users, key: "users" },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon"><ShieldCheck size={14} /></div>
          <span>Admin</span>
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
          <div className="topbar-title">Admin Dashboard</div>
          <div className="topbar-right">
            <span className="badge badge-primary" style={{ marginRight: "0.5rem" }}>{user.name || "Anita Sharma"}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="dashboard-content animate-in">
          {/* OVERVIEW */}
          {section === "overview" && (
            <div className="grid-4">
              {[
                { label: "Total Users", value: allUsers.length, icon: Users, color: "blue" },
                { label: "Pending Approvals", value: approvals.length, icon: CheckSquare, color: "orange" },
                { label: "Open Complaints", value: complaints.filter((c) => c.status === "pending").length, icon: MessageSquare, color: "red" },
                { label: "Card Types", value: cardTypes.length, icon: Settings, color: "green" },
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
          )}

          {/* APPROVALS */}
          {section === "approvals" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Final Approvals</h2>
                <p className="card-subtitle">Approve or reject user and shopkeeper registrations</p>
              </div>
              <div className="card-body">
                {approvals.length === 0 ? (
                  <div className="empty-state"><CheckSquare size={40} /><p>No pending approvals</p></div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Details</th><th>Date</th><th>Actions</th></tr></thead>
                      <tbody>
                        {approvals.map((a) => (
                          <tr key={a.id}>
                            <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{a.id}</td>
                            <td style={{ fontWeight: 600 }}>{a.name}</td>
                            <td><span className={`badge ${a.type === "User" ? "badge-primary" : "badge-success"}`}>{a.type}</span></td>
                            <td className="text-sm text-muted">{a.details}</td>
                            <td>{a.date}</td>
                            <td>
                              <div className="flex gap-1">
                                <button className="btn btn-ghost btn-sm" onClick={() => setViewItem(a)}><Eye size={14} /></button>
                                <button className="btn btn-success btn-sm" onClick={() => handleApproval(a.id, "approve")}><CheckCircle size={14} /></button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleApproval(a.id, "reject")}><XCircle size={14} /></button>
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

          {/* QUOTA MANAGEMENT */}
          {section === "quota" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Ration Quota Management (Per-Person)</h2>
                <p className="card-subtitle">Set monthly per-person quota for each card type. Total household entitlement is automatically calculated by multiplying per-person quantity by family members count.</p>
              </div>
              <div className="card-body">
                {quotaSaved && (
                  <div className="alert alert-success"><CheckCircle size={16} /><strong>Quota saved successfully!</strong></div>
                )}

                {/* Card Type Tabs */}
                <div className="tabs">
                  {cardTypes.map((ct) => (
                    <button
                      key={ct.code}
                      className={`tab-btn ${editingCard === ct.code ? "active" : ""}`}
                      onClick={() => setEditingCard(ct.code)}
                    >
                      {ct.code}
                    </button>
                  ))}
                </div>

                <p className="text-sm text-muted mb-2">
                  Editing quota for <strong>{editingCard}</strong> — {cardTypes.find((c) => c.code === editingCard)?.name}
                </p>

                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Item</th><th>Quantity</th><th>Price</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
                    <tbody>
                      {(quotaData[editingCard] || []).map((q, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700 }}>{q.item}</td>
                          <td>
                            <input
                              className="form-input"
                              value={q.qty}
                              onChange={(e) => updateQuotaItem(i, "qty", e.target.value)}
                              style={{ width: "8rem", height: "2rem", fontSize: "0.8125rem" }}
                            />
                          </td>
                          <td>
                            <input
                              className="form-input"
                              value={q.price}
                              onChange={(e) => updateQuotaItem(i, "price", e.target.value)}
                              style={{ width: "8rem", height: "2rem", fontSize: "0.8125rem" }}
                            />
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              onClick={() => handleRemoveQuotaItem(q.item)}
                              style={{ color: "var(--danger)" }}
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Inline form to add item specifically to selected card */}
                <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "var(--bg-secondary, #f8fafc)", borderRadius: "8px", border: "1px dashed var(--border)" }}>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>Add Item specifically to {editingCard} Quota</h4>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: 1, minWidth: "140px" }}>
                      <label className="form-label text-xs">Item Name</label>
                      <input className="form-input" placeholder="e.g. Sugar" value={cardSpecificItem.item} onChange={(e) => setCardSpecificItem({ ...cardSpecificItem, item: e.target.value })} style={{ height: "2.25rem", fontSize: "0.8125rem" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: "120px" }}>
                      <label className="form-label text-xs">Quantity</label>
                      <input className="form-input" placeholder="e.g. 5 kg" value={cardSpecificItem.qty} onChange={(e) => setCardSpecificItem({ ...cardSpecificItem, qty: e.target.value })} style={{ height: "2.25rem", fontSize: "0.8125rem" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: "120px" }}>
                      <label className="form-label text-xs">Price</label>
                      <input className="form-input" placeholder="e.g. ₹13.50/kg" value={cardSpecificItem.price} onChange={(e) => setCardSpecificItem({ ...cardSpecificItem, price: e.target.value })} style={{ height: "2.25rem", fontSize: "0.8125rem" }} />
                    </div>
                    <button type="button" className="btn btn-outline btn-sm" onClick={handleAddItemToSpecificCard} style={{ height: "2.25rem" }}>
                      <Plus size={14} style={{ marginRight: "0.25rem" }} /> Add to {editingCard}
                    </button>
                  </div>
                </div>

                <button className="btn btn-primary mt-2" onClick={handleQuotaSave}>
                  <Save size={14} /> Save Quota for {editingCard}
                </button>

                <hr style={{ margin: "2rem 0", borderColor: "var(--border)" }} />
                
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Add New Item to All Card Types</h3>
                <p className="text-sm text-muted mb-2">This will add a new item for all beneficiaries and update stock records for all shopkeepers.</p>
                
                {newItemAdded && (
                  <div className="alert alert-success mb-2" style={{ padding: "0.5rem 1rem" }}>
                    <CheckCircle size={16} style={{ display: "inline-block", marginRight: "0.5rem", verticalAlign: "middle" }} />
                    <strong>New item added successfully!</strong>
                  </div>
                )}
                
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", marginTop: "1rem" }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "150px" }}>
                    <label className="form-label text-xs">Item Name</label>
                    <input className="form-input" placeholder="e.g. Cooking Oil" value={newItem.itemName} onChange={(e) => setNewItem({...newItem, itemName: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "100px" }}>
                    <label className="form-label text-xs">Unit</label>
                    <input className="form-input" placeholder="kg, L, etc." value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "150px" }}>
                    <label className="form-label text-xs">Default Quantity</label>
                    <input className="form-input" placeholder="e.g. 2 L" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "150px" }}>
                    <label className="form-label text-xs">Default Price</label>
                    <input className="form-input" placeholder="e.g. ₹50/L" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "100px" }}>
                    <label className="form-label text-xs">Initial Stock</label>
                    <input className="form-input" type="number" placeholder="e.g. 500" value={newItem.initialStock} onChange={(e) => setNewItem({...newItem, initialStock: e.target.value})} />
                  </div>
                  <button className="btn btn-secondary" style={{ height: "42px", padding: "0 1.5rem" }} onClick={handleAddNewItem}>
                    <Plus size={14} style={{ marginRight: "0.5rem" }} /> Add Item
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* COMPLAINTS */}
          {section === "complaints" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">User Complaints</h2>
                <p className="card-subtitle">Review complaints and take action or issue warnings</p>
              </div>
              <div className="card-body">
                {complaints.map((c) => (
                  <div key={c.id} className="complaint-card">
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>{c.type}</strong>
                        <span className="text-xs text-muted" style={{ marginLeft: "0.5rem" }}>{c.id}</span>
                      </div>
                      <span className={`badge ${c.status === "pending" ? "badge-warning" : c.status === "resolved" ? "badge-success" : "badge-danger"}`}>
                        {c.status === "pending" ? "Pending" : c.status === "resolved" ? "Resolved" : "Warning Issued"}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{c.message}</p>
                    <div className="complaint-meta">
                      <span className="text-xs text-muted">By: {c.user}</span>
                      <span className="text-xs text-muted">• Shop: {c.shop}</span>
                      <span className="text-xs text-muted">• {c.date}</span>
                    </div>
                    {c.status === "pending" && (
                      <div className="flex gap-1 mt-1">
                        <button className="btn btn-success btn-sm" onClick={() => handleComplaintAction(c.id, "resolve")}>
                          <CheckCircle size={12} /> Resolve
                        </button>
                        <button className="btn btn-warning btn-sm" onClick={() => handleComplaintAction(c.id, "warn")}>
                          <AlertTriangle size={12} /> Warn Shopkeeper
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleComplaintAction(c.id, "dismiss")}>
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SHOP MANAGEMENT */}
          {section === "shops" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Shop Management & Demand Analysis</h2>
                <p className="card-subtitle">Monitor shop inventory needs based on total user registrations</p>
              </div>
              <div className="card-body">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Shop Name</th>
                        <th>Owner</th>
                        <th>License</th>
                        <th>Joined</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shops.map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{s.shop_name}</td>
                          <td>{s.owner_name}</td>
                          <td style={{ fontFamily: "monospace" }}>{s.license_no}</td>
                          <td className="text-sm">{new Date(s.created_at).toLocaleDateString()}</td>
                          <td>
                            <button 
                              className="btn btn-outline btn-sm" 
                              onClick={() => handleAnalyzeDemand(s)}
                            >
                              <TrendingUp size={14} /> Analyze Demand
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

          {/* ALL USERS */}
          {section === "users" && (
            <div className="card">
              <div className="card-header"><h2 className="card-title">User Management</h2></div>
              <div className="card-body">
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Card Type</th><th>Status</th></tr></thead>
                    <tbody>
                      {allUsers.map((u) => (
                        <tr key={u.id}>
                          <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{u.id}</td>
                          <td style={{ fontWeight: 600 }}>{u.name}</td>
                          <td><span className="badge badge-outline">{u.role}</span></td>
                          <td>{u.cardType}</td>
                          <td><span className={`badge ${u.status === "Active" ? "badge-success" : "badge-warning"}`}>{u.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Demand Analysis Modal */}
      {selectedDemand && (
        <div className="modal-overlay" onClick={() => setSelectedDemand(null)}>
          <div className="modal-box" style={{ maxWidth: "800px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="modal-title" style={{ margin: 0 }}>Stock Demand: {selectedDemand.shop.shop_name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDemand(null)}><XCircle size={20} /></button>
            </div>
            
            {selectedDemand.loading ? (
              <div className="empty-state">Calculating requirements...</div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ration Item</th>
                        <th>Monthly Demand</th>
                        <th>Previous Surplus</th>
                        <th>Net Suggested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDemand.data.map((d) => {
                        return (
                          <tr key={d.item}>
                            <td style={{ fontWeight: 700 }}>{d.item}</td>
                            <td>{d.totalDemand} kg</td>
                            <td className={d.previousMonthSurplus > 0 ? "text-success font-bold" : ""}>
                              {d.previousMonthSurplus.toFixed(1)} kg
                            </td>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-bold text-primary">{d.suggestedShipment.toFixed(1)} kg</span>
                                {d.previousMonthSurplus > 0 && <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Demand {d.totalDemand} - Surplus {d.previousMonthSurplus}</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="alert alert-info mt-2">
                  <Package size={16} />
                  <span>The <strong>Total Demand</strong> is calculated by multiplying the active user count of each card type by their assigned quota.</span>
                </div>

                <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
                  <button className="btn btn-ghost" onClick={() => setSelectedDemand(null)}>Cancel</button>
                  <button 
                    className="btn btn-success" 
                    onClick={handleAllocateStock}
                    disabled={allocationLoading}
                  >
                    {allocationLoading ? "Allocating..." : "Allocate Full Monthly Demand"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "42rem", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 className="modal-title">Review: {viewItem.id}</h3>
            {(viewItem.type === "User" ? [
              ["Registration Type", "Beneficiary"], ["Username", viewItem.username], ["Full Name", viewItem.name],
              ["Date of Birth", viewItem.dob], ["Gender", viewItem.gender], ["Mobile", viewItem.mobile],
              ["Aadhaar", viewItem.aadhaar], ["Ration Card Number", viewItem.ration_card_no],
              ["Card Type", viewItem.card_type], ["Family Members", viewItem.family_members],
              ["State", viewItem.state], ["District", viewItem.district], ["Taluk / Block", viewItem.taluk],
              ["Village / Ward", viewItem.village], ["Pincode", viewItem.pincode],
              ["Assigned Shop", viewItem.assigned_shop_name], ["Shop District", viewItem.assigned_shop_district],
              ["Submitted", viewItem.date],
            ] : [
              ["Registration Type", "Shopkeeper"], ["Username", viewItem.username], ["Owner Name", viewItem.name],
              ["Mobile", viewItem.mobile], ["Aadhaar", viewItem.aadhaar], ["Shop Name", viewItem.shop_name],
              ["License Number", viewItem.license_no], ["Beneficiary Capacity", viewItem.capacity],
              ["State", viewItem.state], ["District", viewItem.district], ["Taluk / Block", viewItem.taluk],
              ["Village / Ward", viewItem.village], ["Pincode", viewItem.pincode], ["Submitted", viewItem.date],
            ]).map(([label, value]) => (
              <div key={label} className="data-row"><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>
            ))}
            {viewItem.type === "User" && (
              <>
                <div className="data-row"><dt>Ration Card Image</dt><dd>{viewItem.ration_card_image ? "Uploaded" : "Not uploaded"}</dd></div>
                {viewItem.ration_card_image && (
                  <a href={getUploadedFileUrl(viewItem.ration_card_image)} target="_blank" rel="noreferrer">
                    <img src={getUploadedFileUrl(viewItem.ration_card_image)} alt="Beneficiary ration card" style={{ display: "block", maxWidth: "100%", maxHeight: "24rem", objectFit: "contain", margin: "0.75rem auto" }} />
                  </a>
                )}
              </>
            )}
            {[["Name", viewItem.name], ["Type", viewItem.type], ["Details", viewItem.details], ["Submitted", viewItem.date]].map(([l, v]) => (
              <div key={l} className="data-row"><dt>{l}</dt><dd>{v}</dd></div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => handleApproval(viewItem.id, "reject")}>Reject</button>
              <button className="btn btn-success" onClick={() => handleApproval(viewItem.id, "approve")}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
