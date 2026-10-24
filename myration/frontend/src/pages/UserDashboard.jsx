import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, LogOut, User, CreditCard, Store, Package,
  Calendar, MessageSquare, Bell, Clock, CheckCircle, Send,
  AlertTriangle, ChevronRight
} from "lucide-react";
import { defaultQuota, timeSlots, complaintTypes } from "@/data/mockData";
import { getUserProfile, getUserQuota, getUserHistory, getAssignedShop, getUserShopStock, bookSlot, getUserSlots, submitComplaint, getUserAlerts, getQuotaHistoryAPI } from "@/data/api";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("currentUser") || "{}"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Real Data States ---
  const [profile, setProfile] = useState(user);
  const [quota, setQuota] = useState(defaultQuota[user.cardType || "BPL"]);
  const [shopInfo, setShopInfo] = useState({ name: "Loading...", isOpen: true });
  const [stock, setStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [quotaHistory, setQuotaHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Slot booking
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookedSlot, setBookedSlot] = useState(null);
  const [userSlots, setUserSlots] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [p, q, s, h, a, qha, slots] = await Promise.all([
          getUserProfile().catch(() => null),
          getUserQuota().catch(() => ({ quota: [] })),
          getAssignedShop().catch(() => null),
          getUserHistory().catch(() => []),
          getUserAlerts().catch(() => []),
          getQuotaHistoryAPI().catch(() => ({ history: [] })),
          getUserSlots().catch(() => []),
        ]);

        setProfile(p || user);
        setQuota(q?.quota || q || []);
        setShopInfo(s);
        setHistory(h);
        setAlerts(a);
        setQuotaHistory(qha?.history || []);
        setUserSlots(Array.isArray(slots) ? slots : []);

        if (s && s.id) {
          const stk = await getUserShopStock(s.id).catch(() => []);
          setStock(stk);
        }
      } catch (err) {
        console.error("Fetch failed:", err);
        setError("Failed to load dashboard. Try restarting backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleBookSlot = async () => {
    if (!selectedDate || !selectedSlot) return;
    try {
      await bookSlot(selectedDate, selectedSlot);
      setBookedSlot({ date: selectedDate, time: selectedSlot });
      const updated = await getUserSlots().catch(() => []);
      setUserSlots(Array.isArray(updated) ? updated : []);
      setSelectedDate("");
      setSelectedSlot("");
    } catch (err) {
      alert("Booking failed: " + (err.message || "Failed to book slot."));
    }
  };

  // Complaint
  const [complaintType, setComplaintType] = useState("");
  const [complaintMsg, setComplaintMsg] = useState("");
  const [complaintSent, setComplaintSent] = useState(false);

  const handleComplaint = async () => {
    if (!complaintType || !complaintMsg) return;
    try {
      await submitComplaint({ type: complaintType, message: complaintMsg, shopId: shopInfo.id });
      setComplaintSent(true);
      setComplaintType("");
      setComplaintMsg("");
      setTimeout(() => setComplaintSent(false), 3000);
    } catch (err) {
      alert("Failed to submit complaint.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: User },
    { key: "quota", label: "Ration Quota", icon: Package },
    { key: "history", label: "Collection History", icon: Clock },
    { key: "shop", label: "My Shop", icon: Store },
    { key: "slot", label: "Book Slot", icon: Calendar },
    { key: "complaints", label: "Complaints", icon: MessageSquare },
    { key: "alerts", label: "Alerts", icon: Bell },
  ];

  return (
    <div className="user-dashboard">
      {/* Header */}
      <div className="user-dash-header">
        <div className="user-dash-header-inner flex justify-between items-center">
          <div>
            <div className="user-dash-hello">Welcome back,</div>
            <div className="user-dash-name">{user.name || "Venkatesh Rao"}</div>
          </div>
          <div className="flex items-center gap-1">
            <span className="badge badge-success" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>{user.cardType || "BPL"} Card</span>
            <button className="btn btn-outline btn-sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={handleLogout}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="user-dash-cards">
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ padding: "0 0.5rem", overflowX: "auto" }}>
            <div className="tabs" style={{ borderBottom: "none", gap: 0 }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  className={`tab-btn ${tab === t.key ? "active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  <t.icon size={14} style={{ marginRight: "0.375rem", verticalAlign: "middle" }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="user-dash-body animate-in">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="grid-3">
            <div className="card">
              <div className="card-header"><h3 className="card-title" style={{ fontSize: "0.9375rem" }}>👤 Profile</h3></div>
              <div className="card-body">
                {[
                  ["Name", profile?.name || user.name || "N/A"],
                  ["Aadhaar", "•••• •••• " + (profile?.aadhaar ? profile.aadhaar.slice(-4) : "xxxx")],
                  ["Mobile", profile?.mobile || "N/A"],
                  ["Gender", profile?.gender || "N/A"]
                ].map(([l, v]) => (
                  <div key={l} className="data-row"><dt>{l}</dt><dd>{v}</dd></div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title" style={{ fontSize: "0.9375rem" }}>💳 Ration Card</h3></div>
              <div className="card-body">
                 {[
                   ["Card No.", profile?.ration_card_no || "N/A"],
                   ["Card Type", profile?.card_type || user.cardType || "BPL"],
                   ["Family Members", profile?.family_members || "N/A"]
                 ].map(([l, v]) => (
                  <div key={l} className="data-row"><dt>{l}</dt><dd>{v}</dd></div>
                ))}
                <div className="data-row"><dt>Status</dt><dd><span className="badge badge-success">{profile?.status === 'approved' ? 'Verified' : profile?.status || 'Active'}</span></dd></div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title" style={{ fontSize: "0.9375rem" }}>🏪 Assigned Shop</h3></div>
              <div className="card-body">
                {shopInfo ? (
                  <>
                    {[["Shop", shopInfo.name], ["ID", shopInfo.id], ["Address", shopInfo.village]].map(([l, v]) => (
                      <div key={l} className="data-row"><dt>{l}</dt><dd>{v}</dd></div>
                    ))}
                    <div className="data-row">
                      <dt>Status</dt>
                      <dd><span className={`badge ${shopInfo.is_open ? "badge-success" : "badge-danger"}`}>{shopInfo.is_open ? "Open" : "Closed"}</span></dd>
                    </div>
                  </>
                ) : (
                  <div className="empty-state" style={{ padding: "1rem" }}>
                    <Store size={24} />
                    <p className="text-xs mt-1">No shop assigned yet. Please wait for verification.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RATION QUOTA */}
        {tab === "quota" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Monthly Ration Quota</h3>
              <p className="card-subtitle">Current status of your household monthly balance ({profile?.family_members || 1} family member(s))</p>
            </div>
            <div className="card-body">
              {quota.map((q) => (
                <div key={q.item} className="quota-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <div className="quota-item-name">{q.item}</div>
                      <div className="quota-item-price">
                        Price: {q.price}
                        {q.per_person_qty && (
                          <span className="text-xs text-muted" style={{ marginLeft: "0.5rem" }}>
                            ({q.per_person_qty} {q.unit || 'kg'}/person × {profile?.family_members || q.family_members || 1} members)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                       <div style={{ fontWeight: 700, color: "var(--primary)" }}>{q.remaining} {q.unit || 'kg'} left</div>
                       <div className="text-xs text-muted">of {q.total} {q.unit || 'kg'} total entitlement</div>
                    </div>
                  </div>
                  <div className="stock-bar-track" style={{ height: "6px" }}>
                    <div className="stock-bar-fill good" style={{ width: `${q.total > 0 ? (q.remaining / q.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">My Collection Records</h3>
                <p className="card-subtitle">Grouped by collection date</p>
              </div>
            </div>
            <div className="card-body">
              {quotaHistory.length === 0 ? (
                <div className="empty-state"><Clock size={40} /><p>No history available</p></div>
              ) : (
                <div className="timeline-container">
                  {(() => {
                    const groups = {};
                    quotaHistory.forEach(h => {
                      const date = new Date(h.timestamp).toLocaleDateString(undefined, {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      });
                      if (!groups[date]) groups[date] = [];
                      groups[date].push(h);
                    });

                    return Object.entries(groups).map(([date, items]) => (
                      <div key={date} className="history-group mb-2">
                        <h4 className="history-date-header">{date}</h4>
                        <div className="table-wrap no-border">
                          <table className="table compact-table">
                            <thead>
                              <tr>
                                <th>Time</th>
                                <th>Item Name</th>
                                <th>Quantity</th>
                                <th>Balance After</th>
                                <th>Location</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((h) => (
                                <tr key={h.id}>
                                  <td className="text-xs text-muted">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                  <td style={{ fontWeight: 600 }}>{h.item_name}</td>
                                  <td><span className="badge badge-success">Received {h.amount} kg</span></td>
                                  <td className="text-sm">{h.remaining_quota} kg left / {h.total_quota} kg</td>
                                  <td className="text-xs text-muted">Shop ID: #{h.shop_id}</td>
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

        {/* MY SHOP & STOCK */}
        {tab === "shop" && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><h3 className="card-title">🏪 Shop Details</h3></div>
              <div className="card-body">
                {shopInfo ? (
                  <>
                    {[["Shop Name", shopInfo.shop_name], ["Shop ID", shopInfo.id], ["Address", shopInfo.village], ["License", shopInfo.license_no]].map(([l, v]) => (
                      <div key={l} className="data-row"><dt>{l}</dt><dd>{v}</dd></div>
                    ))}
                    <div className="data-row">
                      <dt>Status</dt>
                      <dd>
                        <div className="flex items-center gap-1">
                          <span className={`status-dot ${shopInfo.is_open ? "open" : "closed"}`} />
                          <span style={{ fontWeight: 700 }}>{shopInfo.is_open ? "Open" : "Closed"}</span>
                        </div>
                      </dd>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">No shop assigned to your profile yet.</p>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">📦 Current Stock</h3></div>
              <div className="card-body">
                {stock.map((s) => {
                  const pct = Math.round((s.remaining / s.allocated) * 100);
                  const level = pct > 50 ? "good" : pct > 20 ? "low" : "critical";
                  return (
                    <div key={s.item} className="stock-row">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{s.item}</div>
                        <div className="text-xs text-muted">{s.remaining} / {s.allocated} {s.unit}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="stock-bar-track">
                          <div className={`stock-bar-fill ${level}`} style={{ width: `${pct}%` }} />
                        </div>
                        {pct <= 20 && <AlertTriangle size={14} style={{ color: "var(--danger)" }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* BOOK SLOT */}
        {tab === "slot" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📅 Book Collection Slot</h3>
              <p className="card-subtitle">Book a slot to avoid rush at your assigned ration shop</p>
            </div>
            <div className="card-body">
              {!shopInfo ? (
                <div className="alert alert-warning">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Shop Not Assigned</strong>
                    <p className="text-sm">You can only book a slot after a ration shop is assigned to your profile.</p>
                  </div>
                </div>
              ) : bookedSlot ? (
                <div className="alert alert-success">
                  <CheckCircle size={18} />
                  <div>
                    <strong>Slot Booked!</strong>
                    <div className="text-sm">Date: {bookedSlot.date} • Time: {bookedSlot.time}</div>
                    <button className="btn btn-outline btn-sm mt-1" onClick={() => setBookedSlot(null)}>Book Another</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Select Date</label>
                    <input className="form-input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split("T")[0]} style={{ maxWidth: "14rem" }} />
                  </div>
                  {selectedDate && (
                    <>
                      <label className="form-label">Select Time Slot</label>
                      <div className="slot-grid">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot}
                            className={`slot-btn ${selectedSlot === slot ? "booked" : ""}`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                      <button className="btn btn-primary mt-2" onClick={handleBookSlot} disabled={!selectedSlot}>
                        <Calendar size={14} /> Confirm Booking
                      </button>
                    </>
                  )}
                </>
              )}

              {userSlots.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.75rem" }}>My Booked Slots</h4>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time Slot</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userSlots.map((s, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{s.booking_date}</td>
                            <td>{s.time_slot}</td>
                            <td>
                              <span className={`badge ${s.status === 'completed' ? 'badge-success' : s.status === 'cancelled' ? 'badge-danger' : 'badge-primary'}`}>
                                {s.status === 'booked' ? 'Active' : s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPLAINTS */}
        {tab === "complaints" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📝 File a Complaint</h3>
              <p className="card-subtitle">Report issues about ration quality, quantity, or shopkeeper behaviour directly to the admin</p>
            </div>
            <div className="card-body">
              {!shopInfo ? (
                <div className="alert alert-warning">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Action Required</strong>
                    <p className="text-sm">You can only file complaints against your assigned shop. No shop is assigned to you yet.</p>
                  </div>
                </div>
              ) : (
                <>
                  {complaintSent && (
                    <div className="alert alert-success">
                      <CheckCircle size={18} />
                      <strong>Complaint submitted successfully! Admin will review it.</strong>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Complaint Type *</label>
                    <select className="form-select" value={complaintType} onChange={(e) => setComplaintType(e.target.value)}>
                      <option value="" disabled>Select type</option>
                      {complaintTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Describe Your Issue *</label>
                    <textarea className="form-textarea" value={complaintMsg} onChange={(e) => setComplaintMsg(e.target.value)} placeholder="Explain your complaint in detail..." rows={4} />
                  </div>
                  <button className="btn btn-danger" onClick={handleComplaint} disabled={!complaintType || !complaintMsg}>
                    <Send size={14} /> Submit Complaint
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ALERTS */}
        {tab === "alerts" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🔔 Notifications & Stock Alerts</h3>
              <p className="card-subtitle">Real-time alerts regarding new stock arrivals and low inventory at your assigned shop</p>
            </div>
            <div className="card-body">
              {alerts.length === 0 ? (
                <p className="text-muted text-sm">No new notifications or stock alerts at this time.</p>
              ) : (
                alerts.map((a) => {
                  const alertKind = a.alert_type || a.type || "info";
                  const displayTime = a.created_at ? new Date(a.created_at).toLocaleString() : a.time || "";
                  return (
                    <div key={a.id} className={`alert alert-${alertKind === "danger" ? "danger" : alertKind === "warning" ? "warning" : alertKind === "success" ? "success" : "info"}`} style={{ marginBottom: "0.75rem" }}>
                      {(alertKind === "success") && <CheckCircle size={18} />}
                      {(alertKind === "warning" || alertKind === "danger") && <AlertTriangle size={18} />}
                      {(alertKind === "info" || alertKind === "stock_new") && <Bell size={18} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{a.message}</div>
                        {displayTime && <div className="text-xs mt-1" style={{ opacity: 0.75 }}>{displayTime}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
