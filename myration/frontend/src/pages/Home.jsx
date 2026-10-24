import { useNavigate } from "react-router-dom";
import { ShieldCheck, Users, Store, LogIn, ChevronRight, LogOut } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  const handleRoleClick = (role) => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (user.role === role) {
      navigate(`/dashboard/${role}`);
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="auth-page ">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand" onClick={() => navigate("/")}>
            <div className="navbar-logo">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="navbar-title">Smart Ration</div>
              <div className="navbar-subtitle">Public Distribution System</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/login")}>
            <LogIn size={14} /> Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero ">
        <div className="hero-badge">
          🇮🇳 Government of India Initiative
        </div>
        <h1>
          Digital <span>Ration Management</span> System
        </h1>
        <p>
          Register as a beneficiary to receive your ration entitlements, or register your ration shop to serve your community digitally.
        </p>

      </section>

      {/* Role Registration */}
      <h2 style={{ textAlign: "center", marginBottom: "2rem", color: "var(--primary)" }}>Get Started</h2>
      <div className="role-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div className="role-card" onClick={() => navigate("/register/user")}>
          <div className="role-card-icon blue">
            <Users size={24} />
          </div>
          <h3>Beneficiary Registration</h3>
          <p>Apply for a new ration card or link your existing card to a digital fair price shop in your area.</p>
          <button className="btn btn-primary btn-block">
            Register Now <ChevronRight size={14} />
          </button>
        </div>

        <div className="role-card" onClick={() => navigate("/register/shopkeeper")}>
          <div className="role-card-icon green">
            <Store size={24} />
          </div>
          <h3>Shopkeeper Registration</h3>
          <p>Bring your ration shop online. Manage stock, verify users, and provide digital distribution services.</p>
          <button className="btn btn-outline btn-block">
            Register Shop <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        Already registered? <a onClick={() => navigate("/login")} style={{ cursor: "pointer" }}>Login to your dashboard</a> to check your application status.
        <br />
        <span style={{ marginTop: "0.5rem", display: "inline-block" }}>
          © 2026 Smart Ration Management System — College Mini Project
        </span>
      </footer>
    </div>
  );
};

export default Home;
