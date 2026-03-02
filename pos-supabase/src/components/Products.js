import React, { useState, useEffect } from "react";
import { productsApi, categoriesApi } from "../lib/api";
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
    stock_quantity: "",
    category_id: ""
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products");
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
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
      setError("Product name is required");
      return;
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Valid price is required");
      return;
    }
    
    if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
      setError("Valid stock quantity is required");
      return;
    }
    
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        category_id: formData.category_id || null
      };
      
      if (editingProduct) {
        await productsApi.update(editingProduct.id, productData);
        setSuccess("Product updated successfully");
      } else {
        await productsApi.create(productData);
        setSuccess("Product added successfully");
      }
      
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        stock_quantity: "",
        category_id: ""
      });
      
      setTimeout(() => setSuccess(""), 3000);
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      setError(error.message || "Failed to save product");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price,
      stock_quantity: product.stock_quantity,
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
      await productsApi.delete(productToDelete.id);
      setSuccess(`Product "${productToDelete.name}" deleted successfully`);
      setShowDeleteConfirm(false);
      setProductToDelete(null);
      
      setTimeout(() => setSuccess(""), 3000);
      fetchProducts();
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

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
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

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              {auth.user?.role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={auth.user?.role === 'admin' ? 7 : 6} className="no-data">
                  No products found. Add your first product!
                </td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product.id}>
                  <td>#{product.id}</td>
                  <td className="product-name">{product.name}</td>
                  <td>{product.category_name || "Uncategorized"}</td>
                  <td>${parseFloat(product.price).toFixed(2)}</td>
                  <td>
                    <span className={`stock-badge ${product.stock_quantity < 10 ? 'low-stock' : product.stock_quantity === 0 ? 'out-of-stock' : ''}`}>
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
              ))
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
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
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
                  <label>Price ($) *</label>
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

      {showDeleteConfirm && productToDelete && (
        <div className="modal-overlay">
          <div className="modal delete-confirm-modal">
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
                <p><strong>Price:</strong> ${parseFloat(productToDelete.price).toFixed(2)}</p>
                <p><strong>Current Stock:</strong> {productToDelete.stock_quantity} units</p>
              </div>
              
              <p className="warning-text">
                <strong>Warning:</strong> This action cannot be undone. 
                {productToDelete.stock_quantity > 0 && " The product will be removed from inventory."}
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