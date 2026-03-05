import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import "./Users.css";

const Users = ({ auth }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "cashier"
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        if (error.code === '42501') {
          throw new Error("Permission denied. Please check RLS policies.");
        }
        throw error;
      }

      setUsers(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(error.message || "Failed to load users");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.user?.role === 'admin') {
      fetchUsers();
    }
  }, [auth.user?.role, fetchUsers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.username || !formData.name || !formData.role) {
      setError("Please fill all required fields");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.username)) {
      setError("Please enter a valid email address");
      return false;
    }
    
    if (!editingUser && (!formData.password || !formData.confirmPassword)) {
      setError("Password is required for new users");
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    if (formData.password && formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    
    return true;
  };

  const checkRateLimit = () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < 16000) {
      const secondsLeft = Math.ceil((16000 - timeSinceLastRequest) / 1000);
      setError(`Please wait ${secondsLeft} seconds before trying again.`);
      return false;
    }
    
    setLastRequestTime(now);
    return true;
  };

  const handleCreateUser = async () => {
    try {
      console.log("Starting user creation process for:", formData.username);
      
      const { data: existingUsers, error: searchError } = await supabase
        .from('users')
        .select('username')
        .eq('username', formData.username)
        .maybeSingle();

      if (searchError) {
        console.error("Error checking existing user:", searchError);
      }

      if (existingUsers) {
        throw new Error("A user with this email already exists in the system");
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.username,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role
          }
        }
      });

      if (authError) {
        console.error("Auth error:", authError);
        
        if (authError.message?.includes("rate limit") || authError.message?.includes("Rate limit")) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          const retryResult = await supabase.auth.signUp({
            email: formData.username,
            password: formData.password,
            options: {
              data: {
                name: formData.name,
                role: formData.role
              }
            }
          });
          
          if (retryResult.error) throw retryResult.error;
          authData = retryResult.data;
        } else {
          throw authError;
        }
      }

      if (!authData?.user) {
        throw new Error("Failed to create user account");
      }

      console.log("Auth user created successfully with ID:", authData.user.id);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const userRecord = {
        id: authData.user.id,
        username: formData.username,
        name: formData.name,
        role: formData.role,
        created_at: new Date().toISOString()
      };

      console.log("Creating user record:", userRecord);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([userRecord])
        .select()
        .single();

      if (userError) {
        console.error("User insert error:", userError);
        
        if (userError.code === '23503') {
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .insert([userRecord])
            .select()
            .single();

          if (retryError) throw retryError;
          
          setSuccess(`User "${retryData.name}" created successfully`);
          return;
        }
        
        throw userError;
      }

      console.log("User created successfully:", userData);
      setSuccess(`User "${userData.name}" created successfully`);
      
    } catch (error) {
      console.error("Error in create user function:", error);
      throw error;
    }
  };

  const handleUpdateUser = async () => {
    try {
      console.log("Updating user:", editingUser.id);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          role: formData.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)
        .select()
        .single();

      if (userError) {
        console.error("User update error:", userError);
        throw userError;
      }

      if (formData.password) {
        console.log("Updating password...");
        
        if (!checkRateLimit()) {
          setSuccess(`User "${userData.name}" updated successfully, but password was not changed due to rate limiting.`);
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.password
        });

        if (passwordError) {
          console.error("Password update error:", passwordError);
          
          if (passwordError.message?.includes("16 seconds")) {
            setSuccess(`User "${userData.name}" updated successfully, but password change requires waiting a few seconds.`);
          } else {
            setSuccess(`User "${userData.name}" updated successfully, but password change failed: ${passwordError.message}`);
          }
          return;
        }
        
        console.log("Password updated successfully");
      }

      setSuccess(`User "${userData.name}" updated successfully`);
    } catch (error) {
      console.error("Error in update user:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!validateForm()) return;
    
    if (!editingUser && !checkRateLimit()) {
      return;
    }
    
    try {
      if (editingUser) {
        await handleUpdateUser();
      } else {
        await handleCreateUser();
      }
      
      setShowModal(false);
      setEditingUser(null);
      setFormData({
        username: "",
        password: "",
        confirmPassword: "",
        name: "",
        role: "cashier"
      });
      
      await fetchUsers();
      
      setTimeout(() => setSuccess(""), 5000);
      
    } catch (error) {
      console.error("Error saving user:", error);
      
      if (error.code === '23505') {
        setError("A user with this email already exists");
      } else if (error.code === '42501') {
        setError("Permission denied. You don't have access to modify users.");
      } else if (error.message?.includes("16 seconds")) {
        setError("Please wait a few seconds before trying again. This is a security measure.");
      } else if (error.message) {
        setError(error.message);
      } else {
        setError("Failed to save user");
      }
    }
  };

  const handleEdit = (user) => {
    console.log("Editing user:", user);
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      confirmPassword: "",
      name: user.name,
      role: user.role
    });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    
    try {
      setError("");
      setSuccess("");

      const userToDelete = users.find(u => u.id === id);
      console.log("Deleting user:", userToDelete);
      
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        
        if (deleteError.code === '42501') {
          throw new Error("Permission denied. You don't have access to delete users.");
        } else if (deleteError.code === '23503') {
          throw new Error("Cannot delete user because they have existing orders.");
        } else {
          throw deleteError;
        }
      }

      setSuccess(`User "${userToDelete?.name || id}" deleted successfully.`);
      
      await fetchUsers();
      
      setTimeout(() => setSuccess(""), 5000);
    } catch (error) {
      console.error("Error deleting user:", error);
      setError(error.message || "Failed to delete user");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (auth.user?.role !== 'admin') {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You need administrator privileges to access this page.</p>
        <button 
          onClick={() => window.history.back()}
          className="back-btn"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="users-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <h1>User Management</h1>
        <div className="header-right">
          {success && (
            <div className="success-message">
              {success}
              <button onClick={() => setSuccess("")} className="clear-message-btn">×</button>
            </div>
          )}
          <button 
            className="add-user-btn"
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: "",
                password: "",
                confirmPassword: "",
                name: "",
                role: "cashier"
              });
              setShowModal(true);
              setError("");
              setSuccess("");
            }}
          >
            + Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")} className="clear-message-btn">×</button>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  No users found. Add your first user!
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td className="user-id">#{user.id.slice(0, 8)}...</td>
                  <td>{user.username}</td>
                  <td>{user.name}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? '👑 Admin' : '💼 Cashier'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-btn"
                        onClick={() => handleEdit(user)}
                        title="Edit user"
                      >
                        Edit
                      </button>
                      {user.id !== auth.user?.id && (
                        <button 
                          className="delete-btn"
                          onClick={() => handleDelete(user.id)}
                          title="Delete user"
                        >
                          Delete
                        </button>
                      )}
                      {user.id === auth.user?.id && (
                        <span className="current-user-badge">Current User</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        <div className="table-footer">
          <div className="summary">
            Total Users: <strong>{users.length}</strong>
          </div>
          <div className="summary">
            <span style={{ color: '#dc3545' }}>👑 Admins:</span> <strong>{users.filter(u => u.role === 'admin').length}</strong>
          </div>
          <div className="summary">
            <span style={{ color: '#28a745' }}>💼 Cashiers:</span> <strong>{users.filter(u => u.role === 'cashier').length}</strong>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="user-form">
              {error && <div className="form-error">{error}</div>}
              
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingUser}
                  placeholder="Enter email address"
                  className={editingUser ? 'disabled-input' : ''}
                />
                {editingUser && (
                  <small className="input-hint">Email cannot be changed</small>
                )}
              </div>
              
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter full name"
                />
              </div>
              
              <div className="form-group">
                <label>
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                  placeholder={editingUser ? "Enter new password" : "Enter password"}
                  minLength="6"
                />
                <small className="input-hint">Minimum 6 characters</small>
              </div>
              
              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!editingUser || formData.password}
                  placeholder="Confirm password"
                />
              </div>
              
              <div className="form-group">
                <label>Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : (editingUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;