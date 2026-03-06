import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import "./Products.css";

const Products = ({ auth }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    cost_price: "",
    stock_quantity: "",
    category_id: ""
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id (
            id,
            name
          )
        `)
        .order('name');

      if (error) throw error;

      const formattedProducts = data.map(product => ({
        ...product,
        category_name: product.categories?.name || 'Uncategorized',
        price: parseFloat(product.price) || 0,
        cost_price: parseFloat(product.cost_price) || 0,
        stock_quantity: parseInt(product.stock_quantity) || 0
      }));

      setProducts(formattedProducts);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products: " + error.message);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError("Failed to load categories: " + error.message);
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
    
    // Validation
    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Valid selling price is required");
      return;
    }
    
    if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
      setError("Valid stock quantity is required");
      return;
    }

    // If cost price is not provided, set default (70% of selling price)
    const costPrice = formData.cost_price 
      ? parseFloat(formData.cost_price) 
      : parseFloat(formData.price) * 0.7;
    
    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        cost_price: costPrice,
        stock_quantity: parseInt(formData.stock_quantity),
        category_id: formData.category_id || null,
        updated_at: new Date().toISOString()
      };

      console.log("Saving product data:", productData);
      
      if (editingProduct) {
        // Update existing product
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .select(`
            *,
            categories:category_id (
              name
            )
          `)
          .single();

        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        
        setSuccess(`Product "${data.name}" updated successfully`);
      } else {
        // Create new product
        const { data, error } = await supabase
          .from('products')
          .insert([{
            ...productData,
            created_at: new Date().toISOString()
          }])
          .select(`
            *,
            categories:category_id (
              name
            )
          `)
          .single();

        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        
        setSuccess(`Product "${data.name}" added successfully`);
      }
      
      // Close modal and reset form
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        cost_price: "",
        stock_quantity: "",
        category_id: ""
      });
      
      // Refresh products list
      await fetchProducts();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      console.error("Error saving product:", error);
      
      // Handle specific error codes
      if (error.code === '23505') {
        setError("A product with this name already exists");
      } else if (error.code === '42501') {
        setError("Permission denied. You don't have access to modify products.");
      } else {
        setError(error.message || "Failed to save product");
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      cost_price: product.cost_price?.toString() || "",
      stock_quantity: product.stock_quantity?.toString() || "",
      category_id: product.category_id || ""
    });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
    setError("");
    setSuccess("");
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) {
        console.error("Delete error:", error);
        
        if (error.code === '42501') {
          throw new Error("Permission denied. You don't have access to delete products.");
        } else if (error.code === '23503') {
          throw new Error("Cannot delete product because it has existing orders.");
        } else {
          throw error;
        }
      }
      
      setSuccess(`Product "${productToDelete.name}" deleted successfully`);
      setShowDeleteConfirm(false);
      setProductToDelete(null);
      
      // Refresh products list
      await fetchProducts();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.message || "Failed to delete product");
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  const calculateProfit = (product) => {
    const sellingPrice = parseFloat(product.price) || 0;
    const costPrice = parseFloat(product.cost_price) || (sellingPrice * 0.7);
    return sellingPrice - costPrice;
  };

  const calculateMargin = (product) => {
    const sellingPrice = parseFloat(product.price) || 0;
    const profit = calculateProfit(product);
    return sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <div className="products-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>Products Management</h1>
        <div className="header-right">
          {success && (
            <div className="success-message">
              {success}
              <button onClick={clearMessages} className="clear-message-btn">×</button>
            </div>
          )}
          {auth.user?.role === 'admin' && (
            <button 
              className="add-product-btn"
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: "",
                  description: "",
                  price: "",
                  cost_price: "",
                  stock_quantity: "",
                  category_id: ""
                });
                setShowModal(true);
                clearMessages();
              }}
            >
              + Add Product
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={clearMessages} className="clear-message-btn">×</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="products-summary">
        <div className="summary-card">
          <h3>Total Products</h3>
          <p className="summary-number">{products.length}</p>
        </div>
        <div className="summary-card">
          <h3>Total Stock</h3>
          <p className="summary-number">
            {products.reduce((sum, p) => sum + p.stock_quantity, 0)} units
          </p>
        </div>
        <div className="summary-card">
          <h3>Inventory Value</h3>
          <p className="summary-number">
            {formatCurrency(products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0))}
          </p>
        </div>
        <div className="summary-card profit-card">
          <h3>Total Cost</h3>
          <p className="summary-number">
            {formatCurrency(products.reduce((sum, p) => sum + ((p.cost_price || p.price * 0.7) * p.stock_quantity), 0))}
          </p>
        </div>
        <div className="summary-card profit-card">
          <h3>Potential Profit</h3>
          <p className="summary-number profit">
            {formatCurrency(products.reduce((sum, p) => {
              const profit = (p.price - (p.cost_price || p.price * 0.7)) * p.stock_quantity;
              return sum + profit;
            }, 0))}
          </p>
        </div>
      </div>

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Selling Price</th>
              <th>Cost Price</th>
              <th>Profit</th>
              <th>Margin</th>
              <th>Stock</th>
              <th>Status</th>
              {auth.user?.role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={auth.user?.role === 'admin' ? 10 : 9} className="no-data">
                  No products found. Add your first product!
                </td>
              </tr>
            ) : (
              products.map(product => {
                const profit = calculateProfit(product);
                const margin = calculateMargin(product);
                const profitColor = profit >= 0 ? '#38a169' : '#e53e3e';
                
                return (
                  <tr key={product.id}>
                    <td>#{product.id}</td>
                    <td className="product-name">{product.name}</td>
                    <td>{product.category_name || "Uncategorized"}</td>
                    <td className="price-cell">{formatCurrency(product.price)}</td>
                    <td className="cost-cell">{formatCurrency(product.cost_price || product.price * 0.7)}</td>
                    <td className="profit-cell" style={{ color: profitColor, fontWeight: 'bold' }}>
                      {formatCurrency(profit)}
                    </td>
                    <td className="margin-cell">
                      <span className={`margin-badge ${margin >= 30 ? 'high' : margin >= 15 ? 'medium' : 'low'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={`stock-badge ${
                        product.stock_quantity === 0 ? 'out-of-stock' : 
                        product.stock_quantity < 10 ? 'low-stock' : ''
                      }`}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td>
                      {product.stock_quantity === 0 ? (
                        <span className="status out-of-stock">Out of Stock</span>
                      ) : product.stock_quantity < 10 ? (
                        <span className="status low-stock">Low Stock</span>
                      ) : (
                        <span className="status in-stock">In Stock</span>
                      )}
                    </td>
                    {auth.user?.role === 'admin' && (
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="edit-btn"
                            onClick={() => handleEdit(product)}
                            title="Edit product"
                          >
                            Edit
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDeleteClick(product)}
                            title="Delete product"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        <div className="table-footer">
          <div className="summary">
            Total Products: <strong>{products.length}</strong>
          </div>
          <div className="summary">
            Low Stock (&lt;10): <strong className="low-stock-count">
              {products.filter(p => p.stock_quantity < 10 && p.stock_quantity > 0).length}
            </strong>
          </div>
          <div className="summary">
            Out of Stock: <strong className="out-of-stock-count">
              {products.filter(p => p.stock_quantity === 0).length}
            </strong>
          </div>
          <div className="summary profit-summary">
            Avg Margin: <strong>
              {(products.reduce((sum, p) => sum + calculateMargin(p), 0) / products.length || 0).toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal product-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="product-form">
              {error && <div className="form-error">{error}</div>}
              
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter product name"
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Enter product description (optional)"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Selling Price ($) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                  />
                </div>
                
                <div className="form-group">
                  <label>Cost Price ($)</label>
                  <input
                    type="number"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00 (defaults to 70% of selling price)"
                  />
                  {!formData.cost_price && formData.price && (
                    <small className="field-hint">
                      Default: {formatCurrency(parseFloat(formData.price) * 0.7)}
                    </small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stock Quantity *</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    min="0"
                    required
                    placeholder="0"
                  />
                </div>
                
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Category (Optional)</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Profit Preview */}
              {formData.price && (
                <div className="profit-preview">
                  <h4>Profit Preview</h4>
                  <div className="preview-grid">
                    <div>
                      <span>Selling Price:</span>
                      <strong>{formatCurrency(parseFloat(formData.price) || 0)}</strong>
                    </div>
                    <div>
                      <span>Cost Price:</span>
                      <strong>{formatCurrency(
                        formData.cost_price 
                          ? parseFloat(formData.cost_price)
                          : (parseFloat(formData.price) * 0.7)
                      )}</strong>
                    </div>
                    <div>
                      <span>Profit per Unit:</span>
                      <strong className="profit-amount">
                        {formatCurrency(
                          (parseFloat(formData.price) || 0) - 
                          (formData.cost_price 
                            ? parseFloat(formData.cost_price)
                            : (parseFloat(formData.price) * 0.7)
                          )
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Margin:</span>
                      <strong className="margin-percent">
                        {(
                          ((parseFloat(formData.price) || 0) - 
                          (formData.cost_price 
                            ? parseFloat(formData.cost_price)
                            : (parseFloat(formData.price) * 0.7)
                          )) / (parseFloat(formData.price) || 1) * 100
                        ).toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>
              )}
              
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
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && productToDelete && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button 
                className="close-btn"
                onClick={cancelDelete}
              >
                ×
              </button>
            </div>
            
            <div className="delete-confirm-content">
              <div className="warning-icon">⚠️</div>
              <h3>Delete "{productToDelete.name}"?</h3>
              <p>Are you sure you want to delete this product?</p>
              
              <div className="product-details">
                <p><strong>Product ID:</strong> #{productToDelete.id}</p>
                <p><strong>Category:</strong> {productToDelete.category_name || "Uncategorized"}</p>
                <p><strong>Selling Price:</strong> {formatCurrency(productToDelete.price)}</p>
                <p><strong>Cost Price:</strong> {formatCurrency(productToDelete.cost_price || productToDelete.price * 0.7)}</p>
                <p><strong>Profit per Unit:</strong> {formatCurrency(productToDelete.price - (productToDelete.cost_price || productToDelete.price * 0.7))}</p>
                <p><strong>Current Stock:</strong> {productToDelete.stock_quantity} units</p>
                <p><strong>Total Value:</strong> {formatCurrency(productToDelete.price * productToDelete.stock_quantity)}</p>
              </div>
              
              <p className="warning-text">
                <strong>Warning:</strong> This action cannot be undone. 
                {productToDelete.stock_quantity > 0 && " The product will be removed from inventory and all profit calculations."}
              </p>
            </div>
            
            <div className="delete-confirm-actions">
              <button 
                className="cancel-delete-btn"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn"
                onClick={confirmDelete}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;