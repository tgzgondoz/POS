import React, { useState, useEffect } from "react";
import { usersApi } from "../lib/api";
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
      const data = await usersApi.getAll();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users");
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
    
    if (!validateForm()) return;
    
    try {
      const dataToSend = {
        username: formData.username,
        name: formData.name,
        role: formData.role
      };
      
      if (formData.password) {
        dataToSend.password = formData.password;
      }
      
      if (editingUser) {
        await usersApi.update(editingUser.id, dataToSend);
        setSuccess("User updated successfully");
      } else {
        await usersApi.create(dataToSend);
        setSuccess("User created successfully");
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
      
      setTimeout(() => setSuccess(""), 3000);
      fetchUsers();
      
    } catch (error) {
      setError(error.message || "Failed to save user");
    }
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
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await usersApi.delete(id);
        setSuccess("User deleted successfully");
        setTimeout(() => setSuccess(""), 3000);
        fetchUsers();
      } catch (error) {
        setError(error.message || "Failed to delete user");
      }
    }
  };

  if (auth.user?.role !== 'admin') {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You need administrator privileges to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading users...</div>;
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
              <th>Username</th>
              <th>Name</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>#{user.id.slice(0, 8)}...</td>
                <td>{user.username}</td>
                <td>{user.name}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </button>
                    {user.id !== auth.user?.id && (
                      <button 
                        className="delete-btn"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
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
                  disabled={editingUser}
                  placeholder="Enter email"
                />
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
              
              {(!editingUser || formData.password) && (
                <>
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
                      placeholder="Enter password"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Confirm Password *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required={!editingUser}
                      placeholder="Confirm password"
                    />
                  </div>
                </>
              )}
              
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
                  {editingUser ? 'Update' : 'Create'}
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