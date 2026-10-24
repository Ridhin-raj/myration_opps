import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import UserRegister from "./pages/UserRegister";
import ShopkeeperRegister from "./pages/ShopkeeperRegister";
import UserDashboard from "./pages/UserDashboard";
import ShopkeeperDashboard from "./pages/ShopkeeperDashboard";
import AdminDashboard from "./pages/AdminDashboard";

/* ======================================================
   ROLE-BASED ROUTE PROTECTION
   ======================================================
   ProtectedRoute checks if user is logged in and has
   the correct role before showing the dashboard.
   If not, it redirects to the login page.
   ====================================================== */

const ProtectedRoute = ({ children, allowedRole }) => {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null");

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role → go to login
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register/user" element={<UserRegister />} />
      <Route path="/register/shopkeeper" element={<ShopkeeperRegister />} />

      {/* Protected Routes — Role Based */}
      <Route
        path="/dashboard/user"
        element={
          <ProtectedRoute allowedRole="user">
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/shopkeeper"
        element={
          <ProtectedRoute allowedRole="shopkeeper">
            <ShopkeeperDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 - Redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
