import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import logo from "../images/logo.png"; // Import the logo
import "./Categories.css";

const Categories = ({ auth }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState({});

  useEffect(() => {
    console.log("Auth in Categories:", auth);
    fetchCategories();
  }, [auth]);

  const fetchCategories = async () => {
    console.log("Fetching categories...");
    try {
      setLoading(true);
      setError("");
      
      console.log("Supabase URL:", process.env.REACT_APP_SUPABASE_URL);
      
      // Test connection first
      const { error: testError } = await supabase
        .from('categories')
        .select('count', { count: 'exact', head: true });
      
      if (testError) {
        console.error("Test query failed:", testError);
        throw testError;
      }

      // Fetch categories
      console.log("Fetching categories data...");
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      console.log("Categories data received:", categoriesData);
      
      if (categoriesError) {
        console.error("Categories fetch error:", categoriesError);
        throw categoriesError;
      }

      setCategories(categoriesData || []);

      // Fetch products for stats
      console.log("Fetching products for stats...");
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('category_id, price, stock_quantity, cost_price');

      if (productsError) {
        console.error("Products fetch error:", productsError);
      }

      // Calculate stats for each category
      const categoryStats = {};
      if (categoriesData) {
        categoriesData.forEach(cat => {
          const catProducts = (productsData || []).filter(p => p.category_id === cat.id);
          const productCount = catProducts.length;
          const totalStock = catProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
          const totalValue = catProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.stock_quantity || 0)), 0);
          const totalCost = catProducts.reduce((sum, p) => sum + (((p.cost_price || p.price * 0.7) || 0) * (p.stock_quantity || 0)), 0);
          const potentialProfit = totalValue - totalCost;

          categoryStats[cat.id] = {
            productCount,
            totalStock,
            totalValue,
            potentialProfit,
            avgMargin: totalValue > 0 ? (potentialProfit / totalValue) * 100 : 0
          };
        });
      }

      console.log("Category stats calculated:", categoryStats);
      setStats(categoryStats);
      
    } catch (error) {
      console.error("Error in fetchCategories:", error);
      setError(error.message || "Failed to load categories. Please check your connection.");
    } finally {
      console.log("Setting loading to false");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        setSuccess(`Category "${formData.name}" updated successfully`);
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert([{
            name: formData.name.trim()
          }]);

        if (error) throw error;
        setSuccess(`Category "${formData.name}" added successfully`);
      }

      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: "" });
      fetchCategories();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving category:", error);
      if (error.code === '23505') {
        setError("A category with this name already exists");
      } else {
        setError(error.message || "Failed to save category");
      }
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name
    });
    setShowModal(true);
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete "${category.name}"? This will not delete products but they will become uncategorized.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;

      setSuccess(`Category "${category.name}" deleted successfully`);
      fetchCategories();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting category:", error);
      setError("Failed to delete category");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="categories-container">
        <div className="loading">
          <img 
            src={logo} 
            alt="Nitrogo Auto Spare Parts" 
            style={{ 
              height: '60px', 
              width: 'auto',
              objectFit: 'contain',
              marginBottom: '20px'
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          <div className="spinner"></div>
          <p>Loading categories...</p>
          <p style={{ fontSize: '0.9rem', color: '#718096', marginTop: '1rem' }}>
            If this takes too long, check the browser console (F12) for errors
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="categories-container">
      {/* Back Button Section */}
      <div className="back-section">
        <button onClick={() => navigate(-1)} className="back-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
      </div>

      <div className="categories-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src={logo} 
            alt="Nitrogo Auto Spare Parts" 
            style={{ 
              height: '40px', 
              width: 'auto',
              objectFit: 'contain'
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          <h1>Product Categories</h1>
        </div>
        <div className="header-actions">
          {success && (
            <div className="success-message">
              {success}
              <button onClick={() => setSuccess("")} className="clear-message-btn">×</button>
            </div>
          )}
          {auth?.user?.role === 'admin' && (
            <button 
              className="add-category-btn"
              onClick={() => {
                setEditingCategory(null);
                setFormData({ name: "" });
                setShowModal(true);
              }}
            >
              + Add Category
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")} className="clear-message-btn">×</button>
        </div>
      )}

      {/* Show message if no categories */}
      {categories.length === 0 ? (
        <div className="no-data" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>No categories found. Add your first category!</p>
          {auth?.user?.role === 'admin' && (
            <button 
              onClick={() => {
                setEditingCategory(null);
                setFormData({ name: "" });
                setShowModal(true);
              }}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              + Add Category
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="categories-summary">
            <div className="summary-card">
              <h3>Total Categories</h3>
              <p className="summary-number">{categories.length}</p>
            </div>
            <div className="summary-card">
              <h3>Total Products</h3>
              <p className="summary-number">
                {Object.values(stats).reduce((sum, s) => sum + (s.productCount || 0), 0)}
              </p>
            </div>
            <div className="summary-card">
              <h3>Inventory Value</h3>
              <p className="summary-number">
                {formatCurrency(Object.values(stats).reduce((sum, s) => sum + (s.totalValue || 0), 0))}
              </p>
            </div>
            <div className="summary-card profit-card">
              <h3>Potential Profit</h3>
              <p className="summary-number profit">
                {formatCurrency(Object.values(stats).reduce((sum, s) => sum + (s.potentialProfit || 0), 0))}
              </p>
            </div>
          </div>

          <div className="categories-grid">
            {categories.map(category => (
              <div key={category.id} className="category-card">
                <div className="category-header">
                  <h3>{category.name}</h3>
                  {auth?.user?.role === 'admin' && (
                    <div className="category-actions">
                      <button 
                        className="edit-btn"
                        onClick={() => handleEdit(category)}
                        title="Edit category"
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDelete(category)}
                        title="Delete category"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                <div className="category-stats">
                  <div className="stat-item">
                    <span className="stat-label">Products</span>
                    <span className="stat-value">{stats[category.id]?.productCount || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Stock</span>
                    <span className="stat-value">{stats[category.id]?.totalStock || 0} units</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Value</span>
                    <span className="stat-value">{formatCurrency(stats[category.id]?.totalValue || 0)}</span>
                  </div>
                  <div className="stat-item profit">
                    <span className="stat-label">Potential Profit</span>
                    <span className="stat-value">{formatCurrency(stats[category.id]?.potentialProfit || 0)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Avg Margin</span>
                    <span className="stat-value">
                      {stats[category.id]?.avgMargin?.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>

                <div className="category-footer">
                  <span className="created-date">
                    Added: {new Date(category.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src={logo} 
                  alt="Nitrogo" 
                  style={{ 
                    height: '30px', 
                    width: 'auto',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
                <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              </div>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="category-form">
              {error && <div className="form-error">{error}</div>}
              
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Electronics, Clothing, etc."
                  autoFocus
                />
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
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;