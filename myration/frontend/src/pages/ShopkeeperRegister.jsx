import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Edit2, ShieldCheck, LogOut } from "lucide-react";
import { states, districtsByState, taluksByDistrict } from "@/data/mockData";
import { registerShopkeeperAPI, checkUsernameAPI, checkAadhaarAPI, checkLicenseAPI } from "@/data/api";

const ShopkeeperRegister = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ value: "", checked: false, available: false, msg: "" });
  const [aadhaarStatus, setAadhaarStatus] = useState({ value: "", checked: false, available: false, msg: "" });
  const [licenseStatus, setLicenseStatus] = useState({ value: "", checked: false, available: false, msg: "" });
  const [verifying, setVerifying] = useState(false);
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [verifyingLicense, setVerifyingLicense] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    navigate("/");
  };

  const [form, setForm] = useState({
    ownerName: "", mobile: "", aadhaar: "",
    shopName: "", licenseNo: "", capacity: "",
    state: "", district: "", taluk: "", village: "", pincode: "", password: "", username: "",
  });

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if (key === "username") {
      setUsernameStatus({ value, checked: false, available: false, msg: "" });
    }
    if (key === "aadhaar") setAadhaarStatus({ value, checked: false, available: false, msg: "" });
    if (key === "licenseNo") setLicenseStatus({ value, checked: false, available: false, msg: "" });
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
    } catch (err) {
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

  const handleVerifyLicense = async () => {
    const licenseNo = form.licenseNo.trim();
    if (!licenseNo) {
      setErrors((prev) => ({ ...prev, licenseNo: "Enter a license number first" }));
      return;
    }
    setVerifyingLicense(true);
    setLicenseStatus({ value: licenseNo, checked: false, available: false, msg: "Checking license number..." });
    try {
      const res = await checkLicenseAPI(licenseNo);
      setLicenseStatus((current) => current.value === licenseNo ? { value: licenseNo, checked: true, available: res.available, msg: res.message } : current);
    } catch {
      setLicenseStatus((current) => current.value === licenseNo ? { value: licenseNo, checked: true, available: false, msg: "Could not check license number. Try again." } : current);
    } finally {
      setVerifyingLicense(false);
    }
  };

  const districts = form.state ? districtsByState[form.state] || [] : [];
  const taluks = form.district ? taluksByDistrict[form.district] || [] : [];

  const validate = () => {
    const err = {};
    if (!form.username) err.username = "Required";
    if (!form.ownerName) err.ownerName = "Required";
    if (!form.mobile || form.mobile.length !== 10) err.mobile = "Enter 10-digit mobile";
    if (!form.aadhaar || !/^\d{12}$/.test(form.aadhaar)) err.aadhaar = "Enter 12-digit Aadhaar";
    if (!form.password || form.password.length < 6) err.password = "Create a password (min 6 chars)";
    if (!form.shopName) err.shopName = "Required";
    if (!form.licenseNo) err.licenseNo = "Required";
    if (!form.capacity) err.capacity = "Required";
    if (!form.state) err.state = "Required";
    if (!form.district) err.district = "Required";
    if (!form.village) err.village = "Required";
    if (!form.pincode || form.pincode.length !== 6) err.pincode = "Enter 6-digit pincode";

    if (!usernameStatus.checked || usernameStatus.value !== form.username.trim()) {
      err.username = "Please verify this username";
    } else if (!usernameStatus.available) {
      err.username = "Username is already taken";
    }

    if (!aadhaarStatus.checked || aadhaarStatus.value !== form.aadhaar.trim()) err.aadhaar = "Please verify this Aadhaar number";
    else if (!aadhaarStatus.available) err.aadhaar = "Aadhaar number is already registered";

    if (!licenseStatus.checked || licenseStatus.value !== form.licenseNo.trim()) err.licenseNo = "Please verify this license number";
    else if (!licenseStatus.available) err.licenseNo = "License number is already registered";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const [regData, setRegData] = useState(null);

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await registerShopkeeperAPI(form);
      setRegData(result);
      setSubmitted(true);
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.message || "Registration failed. Try again." }));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="success-page animate-in">
        <div className="card success-card">
          <div className="card-body" style={{ padding: "2.5rem 1.5rem" }}>
            <div className="success-icon"><Check size={32} /></div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Registration Submitted!</h2>
            <span className="badge badge-warning" style={{ marginBottom: "1rem" }}>Pending Admin Approval</span>
            <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
              Your shop registration has been submitted. Admin will review your shop details and approve your registration.
            </p>
            {regData && (
              <div className="alert alert-info" style={{ textAlign: "left", fontSize: "0.8125rem" }}>
                <p><strong>Username:</strong> {regData.username}</p>
                <p style={{ marginTop: "0.5rem", fontStyle: "italic" }}>Use this username and your created password to login once approved by admin.</p>
              </div>
            )}
            <button className="btn btn-outline btn-block mt-2" onClick={() => navigate("/")}>Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-icon" onClick={() => navigate("/")}>
              <ArrowLeft size={18} />
            </button>
            <div className="navbar-brand">
              <div className="navbar-logo"><ShieldCheck size={18} /></div>
              <div className="navbar-title">Shopkeeper Registration</div>
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
          <div className="card-header"><h2 className="card-title">Registration Form</h2></div>
          <div className="card-body">
            
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginTop: "1rem", marginBottom: "0.5rem" }}>Personal Details</h3>
            <div className="form-group">
              <label className="form-label">Owner Full Name *</label>
              <input className="form-input" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} placeholder="Enter owner name" />
              {errors.ownerName && <small style={{ color: "var(--danger)" }}>{errors.ownerName}</small>}
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input className="form-input" value={form.mobile} onChange={(e) => update("mobile", e.target.value)} placeholder="10-digit mobile" maxLength={10} />
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
                    placeholder="e.g. shop_owner_1" 
                  />
                  <button 
                    type="button"
                    className={`btn ${usernameStatus.available ? 'btn-success' : 'btn-outline'} btn-sm`}
                    onClick={handleVerifyUsername}
                    disabled={verifying || !form.username.trim()}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {verifying ? "..." : "Verify"}
                  </button>
                </div>
                {usernameStatus.msg && (
                  <small style={{ color: verifying ? "var(--muted)" : usernameStatus.available ? "var(--success)" : "var(--danger)" }}>
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
            
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Shop Details</h3>
            <div className="form-group">
              <label className="form-label">Shop Name *</label>
              <input className="form-input" value={form.shopName} onChange={(e) => update("shopName", e.target.value)} placeholder="Enter fair price shop name" />
              {errors.shopName && <small style={{ color: "var(--danger)" }}>{errors.shopName}</small>}
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">FPS License Number *</label>
                <div className="flex gap-1">
                  <input className="form-input" value={form.licenseNo} onChange={(e) => update("licenseNo", e.target.value)} placeholder="Enter license number" />
                  <button type="button" className={`btn ${licenseStatus.available ? "btn-success" : "btn-outline"} btn-sm`} onClick={handleVerifyLicense} disabled={verifyingLicense || !form.licenseNo.trim()} style={{ whiteSpace: "nowrap" }}>
                    {verifyingLicense ? "..." : "Verify"}
                  </button>
                </div>
                {licenseStatus.msg && <small style={{ color: verifyingLicense ? "var(--muted)" : licenseStatus.available ? "var(--success)" : "var(--danger)" }}>{licenseStatus.msg}</small>}
                {errors.licenseNo && <small style={{ color: "var(--danger)" }}>{errors.licenseNo}</small>}
              </div>
              <div className="form-group">
                <label className="form-label">Max Beneficiary Capacity *</label>
                <input className="form-input" type="number" value={form.capacity} onChange={(e) => update("capacity", e.target.value)} placeholder="e.g. 500" />
                {errors.capacity && <small style={{ color: "var(--danger)" }}>{errors.capacity}</small>}
              </div>
            </div>

            <hr style={{ margin: "1.5rem 0", borderColor: "var(--border)" }} />
            
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Address</h3>
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

            <div className="flex justify-end mt-4">
              {errors.submit && <small style={{ color: "var(--danger)", marginRight: "auto" }}>{errors.submit}</small>}
              <button className="btn btn-success" onClick={handleSubmit} disabled={loading}>
                <Check size={14} /> {loading ? "Submitting..." : "Submit Registration"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopkeeperRegister;
