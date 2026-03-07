import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import logo from "../images/logo.png"; // Import the logo
import "./Login.css";

const Login = ({ setAuth }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      console.log("Attempting login with email:", email);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        console.error("Auth error:", authError);
        
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password");
        } else if (authError.message.includes("Email not confirmed")) {
          throw new Error("Please verify your email before logging in");
        } else {
          throw new Error(authError.message);
        }
      }

      console.log("Auth successful, user ID:", authData.user.id);

      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (userError || !userData) {
        console.log("Using fallback user data");
        
        // Determine role based on email
        let role = 'cashier';
        if (email === 'admin@pos.com' || email.includes('admin') || email === 'tgzgondozz@gmail.com') {
          role = 'admin';
        }

        const fallbackUser = {
          id: authData.user.id,
          username: authData.user.email,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || email.split('@')[0] || 'User',
          role: role,
          created_at: new Date().toISOString()
        };

        localStorage.setItem("token", authData.session.access_token);
        localStorage.setItem("user", JSON.stringify(fallbackUser));

        setAuth({ 
          isAuthenticated: true, 
          user: fallbackUser
        });

        setSuccess("Logged in successfully");
        navigate("/dashboard");
        return;
      }

      localStorage.setItem("token", authData.session.access_token);
      localStorage.setItem("user", JSON.stringify(userData));

      setAuth({ isAuthenticated: true, user: userData });
      setSuccess("Logged in successfully!");
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
          {/* Nitrogo Logo - Using import */}
          <img 
            src={logo} 
            alt="Nitrogo Auto Spare Parts" 
            className="logo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
       
          <span className="login-subtitle">Sign in to your account</span>
        </div>

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Demo credentials section */}
        <div className="demo-credentials">
          <p>Power by oneGondo +263 78 3242 506</p>
        </div>
      </div>
    </div>
  );
};

export default Login;