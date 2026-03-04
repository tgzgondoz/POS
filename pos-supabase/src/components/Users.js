import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import "./Users.css";

const Users = ({ auth }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "cashier"
  });

  useEffect(() => {
    if (auth.user?.role === 'admin') {
      fetchUsers();
    }
  }, [auth.user?.role]);

  const fetchUsers = async () => {
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
  };

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
    
    // Email validation
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!validateForm()) return;
    
    try {
      if (editingUser) {
        // Update existing user
        await handleUpdateUser();
      } else {
        // Create new user
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
      
      // Refresh users list
      await fetchUsers();
      
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      console.error("Error saving user:", error);
      
      // Handle specific error codes
      if (error.code === '23505') {
        setError("A user with this email already exists");
      } else if (error.code === '42501') {
        setError("Permission denied. You don't have access to modify users.");
      } else if (error.message) {
        setError(error.message);
      } else {
        setError("Failed to save user");
      }
    }
  };

  const handleCreateUser = async () => {
    // First, create auth user
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
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Failed to create user account");
    }

    console.log("Auth user created:", authData.user);

    // Then, create user record in public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        username: formData.username,
        name: formData.name,
        role: formData.role,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (userError) {
      console.error("User insert error:", userError);
      
      // If public.users insert fails, try to clean up auth user
      if (authData.user) {
        await supabase.auth.admin.deleteUser(authData.user.id).catch(console.error);
      }
      
      throw userError;
    }

    setSuccess(`User "${userData.name}" created successfully`);
  };

  const handleUpdateUser = async () => {
    // Update user in public.users table
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

    // If password is provided, update auth password
    if (formData.password) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (passwordError) {
        console.error("Password update error:", passwordError);
        // Don't throw here, user was still updated
        setSuccess(`User updated successfully, but password change failed: ${passwordError.message}`);
        return;
      }
    }

    setSuccess(`User "${userData.name}" updated successfully`);
  };

  const handleEdit = (user) => {
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

      // Get user info before deletion
      const userToDelete = users.find(u => u.id === id);
      
      // Delete from public.users table first
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

      // Try to delete from auth.users (requires admin privileges)
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
        if (authDeleteError) {
          console.warn("Could not delete auth user:", authDeleteError);
          // Don't throw, user record is already deleted
        }
      } catch (authError) {
        console.warn("Auth deletion error:", authError);
        // User record is already deleted, so we can still show success
      }

      setSuccess(`User "${userToDelete?.name || id}" deleted successfully`);
      
      // Refresh users list
      await fetchUsers();
      
      setTimeout(() => setSuccess(""), 3000);
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
        day: 'numeric'
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
                      {user.role}
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
            Admins: <strong>{users.filter(u => u.role === 'admin').length}</strong>
          </div>
          <div className="summary">
            Cashiers: <strong>{users.filter(u => u.role === 'cashier').length}</strong>
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
                >
                  {editingUser ? 'Update User' : 'Create User'}
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