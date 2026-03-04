import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = ({ setAuth }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Hardcoded credentials
  const USERS = {
    admin: {
      email: "admin@pos.com",
      password: "admin123",
      role: "admin",
      name: "Admin User",
      id: 1
    },
    user: {
      email: "user@pos.com",
      password: "user123",
      role: "user",
      name: "Regular User",
      id: 2
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check against hardcoded credentials
      let authenticatedUser = null;

      if (email === USERS.admin.email && password === USERS.admin.password) {
        authenticatedUser = USERS.admin;
      } else if (email === USERS.user.email && password === USERS.user.password) {
        authenticatedUser = USERS.user;
      }

      if (authenticatedUser) {
        // Create user data object
        const userData = {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          name: authenticatedUser.name,
          role: authenticatedUser.role
        };

        // Store in localStorage
        localStorage.setItem("token", `mock-token-${authenticatedUser.role}-${Date.now()}`);
        localStorage.setItem("user", JSON.stringify(userData));

        setAuth({ isAuthenticated: true, user: userData });
        navigate("/dashboard");
      } else {
        throw new Error("Invalid email or password");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Quick fill for demo
  const fillAdminCredentials = () => {
    setEmail(USERS.admin.email);
    setPassword(USERS.admin.password);
  };

  const fillUserCredentials = () => {
    setEmail(USERS.user.email);
    setPassword(USERS.user.password);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>POS System</h2>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Demo credentials buttons */}
        <div className="demo-section" style={{ 
          marginTop: "2rem", 
          borderTop: "1px solid #eee", 
          paddingTop: "1.5rem" 
        }}>
          <p style={{ 
            textAlign: "center", 
            color: "#666", 
            marginBottom: "1rem",
            fontWeight: "500"
          }}>
            Demo Login
          </p>
          
          <div style={{ 
            display: "flex", 
            gap: "1rem", 
            justifyContent: "center",
            flexWrap: "wrap"
          }}>
            <button
              type="button"
              onClick={fillAdminCredentials}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#c82333"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#dc3545"}
            >
              Login as Admin
            </button>
            
            <button
              type="button"
              onClick={fillUserCredentials}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#218838"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#28a745"}
            >
              Login as User
            </button>
          </div>

          {/* Credentials details */}
          <div style={{ 
            marginTop: "1.5rem",
            display: "flex",
            gap: "2rem",
            justifyContent: "center",
            fontSize: "0.85rem",
            color: "#666",
            flexWrap: "wrap"
          }}>
            <div>
              <p style={{ fontWeight: "600", color: "#dc3545", marginBottom: "0.5rem" }}>Admin</p>
              <p>Email: admin@pos.com</p>
              <p>Password: admin123</p>
            </div>
            <div>
              <p style={{ fontWeight: "600", color: "#28a745", marginBottom: "0.5rem" }}>User</p>
              <p>Email: user@pos.com</p>
              <p>Password: user123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;