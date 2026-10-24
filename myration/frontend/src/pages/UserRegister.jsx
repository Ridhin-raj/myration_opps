import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Edit2, ShieldCheck, Upload, LogOut } from "lucide-react";
import { states, districtsByState, taluksByDistrict, mockShops, cardTypes, genderOptions } from "@/data/mockData";
import { getPublicShops, registerUserAPI, checkUsernameAPI, checkAadhaarAPI } from "@/data/api";

const UserRegister = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [cardPreview, setCardPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState([]);
  const [regData, setRegData] = useState(null);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ value: "", checked: false, available: false, msg: "" });
  const [aadhaarStatus, setAadhaarStatus] = useState({ value: "", checked: false, available: false, msg: "" });
  const [verifying, setVerifying] = useState(false);
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    navigate("/");
  };

  useEffect(() => {
    getPublicShops()
      .then(data => { 
        if (data.length > 0) {
          setShops(data); 
          setIsUsingMock(false);
        } else {
          setShops(mockShops);
          setIsUsingMock(true);
        }
      })
      .catch(() => {
        setShops(mockShops);
        setIsUsingMock(true);
      });
  }, []);

  const [form, setForm] = useState({
    name: "", dob: "", gender: "", mobile: "", aadhaar: "",
    rationCardNo: "", cardType: "", familyMembers: "", rationCardImage: null,
    state: "", district: "", taluk: "", village: "", pincode: "",
    selectedShop: "", password: "", username: "",
  });

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if (key === "username") {
      setUsernameStatus({ value, checked: false, available: false, msg: "" });
    }
    if (key === "aadhaar") setAadhaarStatus({ value, checked: false, available: false, msg: "" });
  };

  const handleVerifyUsername = async () => {
    const username = form.username.trim();
    if (!username) {
      setErrors((prev) => ({ ...prev, username: "Please enter a username first" }));
      return;
    }
    setVerifying(true);
    setUsernameStatus({ value: username, checked: false, available: false, msg: "Checking username..." });
    try {
      const res = await checkUsernameAPI(username);
      setUsernameStatus((current) => current.value === username ? { value: username, checked: true, available: res.available, msg: res.message } : current);
    } catch {
      setUsernameStatus((current) => current.value === username ? { value: username, checked: true, available: false, msg: "Could not check username. Try again." } : current);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyAadhaar = async () => {
    const aadhaar = form.aadhaar.trim();
    if (!/^\d{12}$/.test(aadhaar)) {
      setErrors((prev) => ({ ...prev, aadhaar: "Enter a valid 12-digit Aadhaar number" }));
      return;
    }
    setVerifyingAadhaar(true);
    setAadhaarStatus({ value: aadhaar, checked: false, available: false, msg: "Checking Aadhaar..." });
    try {
      const res = await checkAadhaarAPI(aadhaar);
      setAadhaarStatus((current) => current.value === aadhaar ? { value: aadhaar, checked: true, available: res.available, msg: res.message } : current);
    } catch {
      setAadhaarStatus((current) => current.value === aadhaar ? { value: aadhaar, checked: true, available: false, msg: "Could not check Aadhaar. Try again." } : current);
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      update("rationCardImage", file);
      const reader = new FileReader();
      reader.onload = (ev) => setCardPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const filteredShops = shops.filter(
    (s) => s.district === form.district && (!form.taluk || s.taluk === form.taluk)
  );

  const districts = form.state ? districtsByState[form.state] || [] : [];
  const taluks = form.district ? taluksByDistrict[form.district] || [] : [];

  const validate = () => {
    const err = {};
    if (!form.username) err.username = "Required";
    if (!form.name) err.name = "Required";
    if (!form.dob) err.dob = "Required";
    if (!form.gender) err.gender = "Required";
    if (!form.mobile || form.mobile.length !== 10) err.mobile = "Enter 10-digit mobile";
    if (!form.aadhaar || !/^\d{12}$/.test(form.aadhaar)) err.aadhaar = "Enter 12-digit Aadhaar";
    if (!form.password || form.password.length < 6) err.password = "Create a password (min 6 chars)";
    if (!form.rationCardNo) err.rationCardNo = "Required";
    if (!form.cardType) err.cardType = "Required";
    if (!form.familyMembers) err.familyMembers = "Required";
    if (!form.rationCardImage) err.rationCardImage = "Please upload your ration card image";
    if (!form.state) err.state = "Required";
    if (!form.district) err.district = "Required";
    if (!form.village) err.village = "Required";
    if (!form.pincode || form.pincode.length !== 6) err.pincode = "Enter 6-digit pincode";
    if (!form.selectedShop) err.selectedShop = "Please select a shop";
    
    if (!usernameStatus.checked || usernameStatus.value !== form.username.trim()) {
      err.username = "Please verify this username";
    } else if (!usernameStatus.available) {
      err.username = "Username is already taken";
    }

    if (!aadhaarStatus.checked || aadhaarStatus.value !== form.aadhaar.trim()) err.aadhaar = "Please verify this Aadhaar number";
    else if (!aadhaarStatus.available) err.aadhaar = "Aadhaar number is already registered";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (form[key]) formData.append(key, form[key]);
      });
      
      const result = await registerUserAPI(formData);
      setRegData(result);
      setSubmitted(true);
    } catch (err) {
      setErrors({ submit: err.message || "Registration failed. Try again." });
    } finally {
      setLoading(false);
    }
  };

  // ---- SUCCESS PAGE ----
  if (submitted) {
    return (
      <div className="success-page animate-in">
        <div className="card success-card">
          <div className="card-body" style={{ padding: "2.5rem 1.5rem" }}>
            <div className="success-icon">
              <Check size={32} />
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Application Submitted!</h2>
            <span className="badge badge-warning" style={{ marginBottom: "1rem" }}>Pending Verification</span>
            <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
              Your registration has been submitted. The shopkeeper will verify your documents.
              After approval, your account will be ready to use.
            </p>
            {regData && (
              <div className="alert alert-info" style={{ textAlign: "left", fontSize: "0.8125rem" }}>
                <p><strong>Username:</strong> {regData.username}</p>
                <p style={{ marginTop: "0.5rem", fontStyle: "italic" }}>Please note down your username and your created password for future login.</p>
              </div>
            )}
            <button className="btn btn-outline btn-block mt-2" onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedShopObj = shops.find((s) => s.id === form.selectedShop);

  return (
    <div className="register-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-icon" onClick={() => navigate("/")}>
              <ArrowLeft size={18} />
            </button>
            <div className="navbar-brand">
              <div className="navbar-logo"><ShieldCheck size={18} /></div>
              <div className="navbar-title">User Registration</div>
            </div>
          </div>
          {currentUser && (
            <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ marginLeft: "auto" }}>
              <LogOut size={14} /> Logout
            </button>
          )}
        </div>
      </nav>

      <div className="register-container">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Registration Form</h2>
          </div>
          <div className="card-body">
            
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginTop: "1rem", marginBottom: "0.5rem" }}>Personal Details</h3>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Enter full name" />
              {errors.name && <small style={{ color: "var(--danger)" }}>{errors.name}</small>}
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input className="form-input" type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} />
              {errors.dob && <small style={{ color: "var(--danger)" }}>{errors.dob}</small>}
            </div>
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <div className="form-radio-group">
                {genderOptions.map((g) => (
                  <label key={g} className="form-radio">
                    <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={(e) => update("gender", e.target.value)} />
                    {g}
                  </label>
                ))}
              </div>
              {errors.gender && <small style={{ color: "var(--danger)" }}>{errors.gender}</small>}
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input className="form-input" value={form.mobile} onChange={(e) => update("mobile", e.target.value)} placeholder="10-digit number" maxLength={10} />
                {errors.mobile && <small style={{ color: "var(--danger)" }}>{errors.mobile}</small>}
              </div>
              <div className="form-group">
                <label className="form-label">Aadhaar Number *</label>
                <div className="flex gap-1">
                  <input className="form-input" value={form.aadhaar} onChange={(e) => update("aadhaar", e.target.value)} placeholder="12-digit Aadhaar" maxLength={12} />
                  <button type="button" className={`btn ${aadhaarStatus.available ? "btn-success" : "btn-outline"} btn-sm`} onClick={handleVerifyAadhaar} disabled={verifyingAadhaar || !/^\d{12}$/.test(form.aadhaar)} style={{ whiteSpace: "nowrap" }}>
                    {verifyingAadhaar ? "..." : "Verify"}
                  </button>
                </div>
                {aadhaarStatus.msg && <small style={{ color: verifyingAadhaar ? "var(--muted)" : aadhaarStatus.available ? "var(--success)" : "var(--danger)" }}>{aadhaarStatus.msg}</small>}
                {errors.aadhaar && <small style={{ color: "var(--danger)" }}>{errors.aadhaar}</small>}
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Create Username *</label>
                <div className="flex gap-1">
                  <input 
                    className="form-input" 
                    value={form.username} 
                    onChange={(e) => update("username", e.target.value)} 
                    placeholder="e.g. venky_rao" 
                  />
                  <button 
                    type="button"
                    className={`btn ${usernameStatus.available ? 'btn-success' : 'btn-outline'} btn-sm`}
                    onClick={handleVerifyUsername}
                    disabled={verifying || !form.username}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {verifying ? "..." : "Verify"}
                  </button>
                </div>
                {usernameStatus.checked && (
                  <small style={{ color: usernameStatus.available ? "var(--success)" : "var(--danger)" }}>
                    {usernameStatus.msg}
                  </small>
                )}
                {errors.username && <small style={{ color: "var(--danger)" }}>{errors.username}</small>}
              </div>
              <div className="form-group">
                <label className="form-label">Create Password *</label>
                <input className="form-input" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 characters" />
                {errors.password && <small style={{ color: "var(--danger)" }}>{errors.password}</small>}
              </div>
            </div>

            <hr style={{ margin: "1.5rem 0", borderColor: "var(--border)" }} />
            
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Ration Card Info</h3>
            <div className="form-group">
              <label className="form-label">Ration Card Number *</label>
              <input className="form-input" value={form.rationCardNo} onChange={(e) => update("rationCardNo", e.target.value)} placeholder="Enter ration card number" />
              {errors.rationCardNo && <small style={{ color: "var(--danger)" }}>{errors.rationCardNo}</small>}
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Card Type *</label>
                <select className="form-select" value={form.cardType} onChange={(e) => update("cardType", e.target.value)}>
                  <option value="" disabled>Select type</option>
                  {cardTypes.map((t) => (
                    <option key={t.code} value={t.code}>{t.code} — {t.name}</option>
                  ))}
                </select>
                {errors.cardType && <small style={{ color: "var(--danger)" }}>{errors.cardType}</small>}
              </div>
              <div className="form-group">
                <label className="form-label">Family Members *</label>
                <input className="form-input" type="number" min="1" max="20" value={form.familyMembers} onChange={(e) => update("familyMembers", e.target.value)} placeholder="Count" />
                {errors.familyMembers && <small style={{ color: "var(--danger)" }}>{errors.familyMembers}</small>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Upload Ration Card Image *</label>
              <input className="form-file" type="file" accept="image/*" onChange={handleImageUpload} />
              {errors.rationCardImage && <small style={{ color: "var(--danger)" }}>{errors.rationCardImage}</small>}
              {cardPreview && (
                <div className="upload-preview">
                  <Upload size={20} style={{ color: "var(--muted)" }} />
                  <p className="text-xs text-muted mt-1">Card image uploaded successfully</p>
                  <img src={cardPreview} alt="Ration Card Preview" />
                </div>
              )}
            </div>

            <hr style={{ margin: "1.5rem 0", borderColor: "var(--border)" }} />
            
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Address & Shop Selection</h3>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">State *</label>
                <select className="form-select" value={form.state} onChange={(e) => { update("state", e.target.value); update("district", ""); update("taluk", ""); }}>
                  <option value="" disabled>Select state</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <small style={{ color: "var(--danger)" }}>{errors.state}</small>}
              </div>
              <div className="form-group">
                <label className="form-label">District *</label>
                <select className="form-select" value={form.district} onChange={(e) => { update("district", e.target.value); update("taluk", ""); }} disabled={!form.state}>
                  <option value="" disabled>Select district</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.district && <small style={{ color: "var(--danger)" }}>{errors.district}</small>}
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Taluk / Block</label>
                <select className="form-select" value={form.taluk} onChange={(e) => update("taluk", e.target.value)} disabled={!form.district}>
                  <option value="" disabled>Select taluk</option>
                  {taluks.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Village / Ward *</label>
                <input className="form-input" value={form.village} onChange={(e) => update("village", e.target.value)} placeholder="Enter village/ward" />
                {errors.village && <small style={{ color: "var(--danger)" }}>{errors.village}</small>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Pincode *</label>
              <input className="form-input" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} placeholder="6-digit pincode" maxLength={6} style={{ maxWidth: "12rem" }} />
              {errors.pincode && <small style={{ color: "var(--danger)" }}>{errors.pincode}</small>}
            </div>

            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, marginTop: "0.5rem", marginBottom: "0.75rem" }}>Select Nearest Ration Shop *</h3>
            {filteredShops.length === 0 ? (
              <div className="alert alert-warning">
                <strong>No approved shops found.</strong>
                <p className="text-xs mt-1">Make sure you have selected the correct District and Taluk. Shops only appear here AFTER they are approved by an Admin.</p>
              </div>
            ) : (
              <>
                {isUsingMock && (
                  <div className="alert alert-info py-1 mb-1" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                    💡 <strong>Demo Mode:</strong> No approved shops exist in this district yet. 
                    The shops below are for display only and won't be saved for real transactions.
                  </div>
                )}
                <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "1rem" }}>
                  {filteredShops.map((shop) => (
                    <div
                      key={shop.id}
                      className={`shop-option ${form.selectedShop === shop.id ? "selected" : ""}`}
                      onClick={() => update("selectedShop", shop.id)}
                    >
                      <input type="radio" name="shop" checked={form.selectedShop === shop.id} onChange={() => update("selectedShop", shop.id)} />
                      <div>
                        <div className="shop-option-name">{shop.name}</div>
                        <div className="shop-option-addr">{shop.address} • ID: {shop.id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {errors.selectedShop && <small style={{ color: "var(--danger)" }}>{errors.selectedShop}</small>}

            {/* Navigation Buttons */}
            <div className="flex justify-end mt-4">
              <button className="btn btn-success" onClick={handleSubmit} disabled={loading}>
                <Check size={14} /> {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegister;
