import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Login.css";

const Login = ({ setAuth }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(""); // Added missing setSuccess state
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(""); // Clear any previous success messages
    setLoading(true);

    try {
      console.log("Attempting login with email:", email);

      // Step 1: Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        console.error("Auth error:", authError);
        
        // Handle specific auth errors
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password");
        } else if (authError.message.includes("Email not confirmed")) {
          throw new Error("Please verify your email before logging in");
        } else {
          throw new Error(authError.message);
        }
      }

      console.log("Auth successful, user ID:", authData.user.id);

      // Step 2: Try to get user data from users table with timeout
      let userData = null;
      let userError = null;

      try {
        // Set a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Database query timeout")), 5000)
        );

        // Query promise
        const queryPromise = supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid PGRST116

        // Race between query and timeout
        const result = await Promise.race([queryPromise, timeoutPromise]);
        
        if (result && result.data) {
          userData = result.data;
        } else if (result && result.error) {
          userError = result.error;
        }
      } catch (err) {
        console.warn("Error fetching user data:", err);
        userError = err;
      }

      // Step 3: Handle user data
      if (userError || !userData) {
        console.log("Using fallback user data due to:", userError?.message || "No user data found");
        
        // Determine role based on email
        let role = 'cashier';
        if (email === 'admin@pos.com' || email.includes('admin') || email === 'tgzgondozz@gmail.com') {
          role = 'admin';
        }

        // Create fallback user object
        const fallbackUser = {
          id: authData.user.id,
          username: authData.user.email,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || email.split('@')[0] || 'User',
          role: role,
          created_at: new Date().toISOString()
        };

        console.log("Using fallback user:", fallbackUser);

        // Store in localStorage
        localStorage.setItem("token", authData.session.access_token);
        localStorage.setItem("user", JSON.stringify(fallbackUser));
        localStorage.setItem("auth_time", new Date().toISOString());

        // Update auth state
        setAuth({ 
          isAuthenticated: true, 
          user: fallbackUser,
          usingFallback: true 
        });

        // Show success message with fallback notice
        setSuccess("Logged in successfully (using offline mode)");
        
        // Navigate to dashboard
        setTimeout(() => {
          navigate("/dashboard");
        }, 100);
        
        return;
      }

      console.log("User data retrieved successfully:", userData);

      // Step 4: Success - store user data
      localStorage.setItem("token", authData.session.access_token);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("auth_time", new Date().toISOString());

      setAuth({ isAuthenticated: true, user: userData });
      
      // Show success message
      setSuccess("Logged in successfully!");
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 100);
      
    } catch (err) {
      console.error("Login error:", err);
      
      // Handle specific error messages
      if (err.message.includes("Failed to fetch")) {
        setError("Network error. Please check your internet connection.");
      } else if (err.message.includes("timeout")) {
        setError("Database connection timeout. Please try again.");
      } else if (err.message.includes("schema")) {
        setError("Database schema error. Using offline mode...");
        
        // Attempt offline login with fallback
        await handleOfflineLogin();
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineLogin = async () => {
    try {
      // Try to authenticate with Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        // Check if it's the demo credentials
        if ((email === 'admin@pos.com' && password === 'admin123') ||
            (email === 'cashier@pos.com' && password === 'cashier123') ||
            (email === 'tgzgondozz@gmail.com' && password === 'admin123')) {
          
          // Use hardcoded demo users
          const demoUser = {
            id: email === 'admin@pos.com' ? 'admin-001' : 
                email === 'cashier@pos.com' ? 'cashier-001' : 'admin-002',
            username: email,
            email: email,
            name: email === 'admin@pos.com' ? 'Admin User' : 
                  email === 'cashier@pos.com' ? 'Cashier User' : 'Super Admin',
            role: email.includes('admin') ? 'admin' : 'cashier',
            created_at: new Date().toISOString()
          };

          localStorage.setItem("token", "demo-token-" + Date.now());
          localStorage.setItem("user", JSON.stringify(demoUser));
          localStorage.setItem("auth_time", new Date().toISOString());
          localStorage.setItem("offline_mode", "true");

          setAuth({ 
            isAuthenticated: true, 
            user: demoUser,
            offlineMode: true 
          });

          setSuccess("Logged in successfully (offline mode)");
          navigate("/dashboard");
          return;
        }
        throw new Error("Invalid credentials");
      }

      // If we have auth data but schema error, use auth data
      if (authData) {
        const fallbackUser = {
          id: authData.user.id,
          username: authData.user.email,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || email.split('@')[0],
          role: email.includes('admin') ? 'admin' : 'cashier',
          created_at: new Date().toISOString()
        };

        localStorage.setItem("token", authData.session.access_token);
        localStorage.setItem("user", JSON.stringify(fallbackUser));
        localStorage.setItem("offline_mode", "true");

        setAuth({ 
          isAuthenticated: true, 
          user: fallbackUser,
          offlineMode: true 
        });

        setSuccess("Logged in successfully (offline mode)");
        navigate("/dashboard");
      }
    } catch (error) {
      setError(error.message || "Login failed");
    }
  };

  // Quick fill for demo users
  const fillAdminCredentials = () => {
    setEmail("admin@pos.com");
    setPassword("admin123");
  };

  const fillCashierCredentials = () => {
    setEmail("cashier@pos.com");
    setPassword("cashier123");
  };

  const fillCustomCredentials = () => {
    setEmail("tgzgondozz@gmail.com");
    setPassword("admin123");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>POS System</h2>
          <p>Sign in to your account</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="success-message" style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            border: "1px solid #c3e6cb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{success}</span>
            <button 
              onClick={() => setSuccess("")}
              style={{
                background: "none",
                border: "none",
                color: "#155724",
                fontSize: "1.2rem",
                cursor: "pointer",
                padding: "0 0.5rem"
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message" style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            border: "1px solid #f5c6cb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{error}</span>
            <button 
              onClick={() => setError("")}
              style={{
                background: "none",
                border: "none",
                color: "#721c24",
                fontSize: "1.2rem",
                cursor: "pointer",
                padding: "0 0.5rem"
              }}
            >
              ×
            </button>
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
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ced4da",
                borderRadius: "6px",
                fontSize: "1rem"
              }}
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
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ced4da",
                borderRadius: "6px",
                fontSize: "1rem"
              }}
            />
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.2s"
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

      
      </div>
    </div>
  );
};

export default Login;