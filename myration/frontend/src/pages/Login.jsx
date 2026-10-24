import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn, ShieldCheck } from "lucide-react";
import { loginAPI } from "@/data/api";

const roleRoutes = {
  user: "/dashboard/user",
  shopkeeper: "/dashboard/shopkeeper",
  admin: "/dashboard/admin",
};

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [demoRole, setDemoRole] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setError("");
    setLoading(true);
    try {
      const data = await loginAPI(username, password);
      // data: { message, token, user: { id, username, role, name, cardType } }
      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      navigate(roleRoutes[data.user.role]);
    } catch (err) {
      setError(err.message || "Invalid credentials. Try the demo accounts.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-icon" onClick={() => navigate("/")}>
              <ArrowLeft size={18} />
            </button>
            <div className="navbar-brand">
              <div className="navbar-logo">
                <ShieldCheck size={18} />
              </div>
              <div className="navbar-title">Smart Ration — Login</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="auth-container">
        {/* Login Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Welcome Back</h2>
            <p className="card-subtitle">Enter your credentials to access your dashboard</p>
          </div>
          <div className="card-body">
            <form onSubmit={handleLogin}>
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="username">Username</label>
                <input
                  id="username"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                <LogIn size={16} /> Login
              </button>
            </form>
          </div>
        </div>

        <div className="mt-3 text-center" style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
          <p>Don't have an account? <span className="text-primary pointer" onClick={() => navigate("/")}>Register here</span></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
