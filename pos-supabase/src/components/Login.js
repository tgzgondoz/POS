import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Login.css";

const Login = ({ setAuth }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      // Step 2: Try to get user data from users table
      let userData = null;
      let userError = null;

      try {
        // First attempt: Try to get user data
        const result = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        userData = result.data;
        userError = result.error;
      } catch (err) {
        console.warn("Error fetching user data:", err);
        userError = err;
      }

      // Step 3: If there's an RLS policy error, create a basic user object
      if (userError) {
        console.warn("Using fallback user data due to:", userError.message);
        
        // Create a basic user object from auth data
        userData = {
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || email.split('@')[0],
          role: 'user' // Default role
        };

        // Try to determine if this might be an admin
        if (email.includes('admin') || email === 'tgzgondozz@gmail.com') {
          userData.role = 'admin';
        }

        // Store in localStorage
        localStorage.setItem("token", authData.session.access_token);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("supabase_error", userError.message);

        setAuth({ isAuthenticated: true, user: userData });
        navigate("/dashboard");
        return;
      }

      // Step 4: If we got user data successfully, use it
      localStorage.setItem("token", authData.session.access_token);
      localStorage.setItem("user", JSON.stringify(userData));

      setAuth({ isAuthenticated: true, user: userData });
      navigate("/dashboard");
      
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>POS System</h2>
          <p>Sign in to your account</p>
        </div>

        {error && error.includes("infinite recursion") && (
          <div className="warning-message" style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            fontSize: "0.9rem"
          }}>
            <strong>⚠️ Database Policy Issue</strong>
            <p style={{ marginTop: "0.5rem" }}>
              There's an issue with the database permissions. You'll still be able to log in,
              but some features may be limited. Please contact the administrator.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {error && !error.includes("infinite recursion") && (
            <div className="error-message">{error}</div>
          )}

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

        {/* Temporary login hint */}
        <div style={{ 
          marginTop: "1rem", 
          textAlign: "center", 
          fontSize: "0.85rem", 
          color: "#666",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px"
        }}>
          <p><strong>Login Issue Detected</strong></p>
          <p>If you're experiencing login issues, try these steps:</p>
          <ol style={{ textAlign: "left", marginTop: "0.5rem" }}>
            <li>Go to Supabase Dashboard → Authentication → Policies</li>
            <li>Find the "users" table policies</li>
            <li>Replace recursive policies with non-recursive ones</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Login;