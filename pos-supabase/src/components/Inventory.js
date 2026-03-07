import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { productsApi, categoriesApi } from "../lib/api";
import logo from "../images/logo.png"; // Import the logo
import "./Inventory.css";

const Inventory = ({ auth }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [categories, setCategories] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockUpdate, setStockUpdate] = useState("");
  const [updateType, setUpdateType] = useState("add");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      setError("Failed to load inventory");
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

  const handleStockUpdateClick = (product) => {
    setSelectedProduct(product);
    setStockUpdate("");
    setUpdateType("add");
    setError("");
    setSuccess("");
    setShowUpdateModal(true);
  };

  const handleUpdateStock = async () => {
    if (!stockUpdate || parseInt(stockUpdate) <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    const quantity = parseInt(stockUpdate);
    const newStock = updateType === "add" 
      ? selectedProduct.stock_quantity + quantity
      : selectedProduct.stock_quantity - quantity;

    if (newStock < 0) {
      setError("Cannot have negative stock");
      return;
    }

    try {
      await productsApi.update(selectedProduct.id, {
        ...selectedProduct,
        stock_quantity: newStock
      });

      setSuccess(
        `${updateType === "add" ? "Added" : "Removed"} ${quantity} units of "${
          selectedProduct.name
        }"`
      );
      
      setTimeout(() => setSuccess(""), 3000);
      setShowUpdateModal(false);
      fetchProducts();
    } catch (error) {
      console.error("Error updating stock:", error);
      setError("Failed to update stock");
    }
  };

  const handleQuickAction = async (productId, action) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      let newStock = product.stock_quantity;

      switch (action) {
        case "restock":
          newStock += 10;
          break;
        case "low":
          newStock = Math.max(0, product.stock_quantity - 5);
          break;
        case "zero":
          newStock = 0;
          break;
        default:
          return;
      }

      await productsApi.update(productId, {
        ...product,
        stock_quantity: newStock
      });

      setSuccess(`Stock updated for ${product.name}`);
      setTimeout(() => setSuccess(""), 2000);
      fetchProducts();
    } catch (error) {
      console.error("Error in quick action:", error);
      setError("Failed to update stock");
    }
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { status: "out", label: "Out of Stock", color: "#e53e3e" };
    if (quantity < 10) return { status: "low", label: "Low Stock", color: "#d69e2e" };
    if (quantity < 30) return { status: "medium", label: "Medium Stock", color: "#3182ce" };
    return { status: "high", label: "High Stock", color: "#38a169" };
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === "all" || 
                           String(product.category_id) === String(filterCategory);
    
    const matchesStock = filterStock === "all" ||
                        (filterStock === "out" && product.stock_quantity === 0) ||
                        (filterStock === "low" && product.stock_quantity < 10 && product.stock_quantity > 0) ||
                        (filterStock === "medium" && product.stock_quantity >= 10 && product.stock_quantity < 30) ||
                        (filterStock === "high" && product.stock_quantity >= 30);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const inventoryStats = {
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + p.stock_quantity, 0),
    totalValue: products.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0),
    outOfStock: products.filter(p => p.stock_quantity === 0).length,
    lowStock: products.filter(p => p.stock_quantity < 10 && p.stock_quantity > 0).length,
    highStock: products.filter(p => p.stock_quantity >= 30).length
  };

  if (loading) {
    return (
      <div className="inventory-container">
        <div className="loading-screen">
          <img 
            src={logo} 
            alt="Nitrogo Auto Spare Parts" 
            className="loading-logo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          <p>Loading inventory...</p>
      
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      {/* Back Button Section */}
      <div className="back-section">
        <button onClick={() => navigate(-1)} className="back-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
      </div>

      <div className="inventory-header">
        <div className="header-title">
          <img 
            src={logo} 
            alt="Nitrogo Auto Spare Parts" 
            className="header-logo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          <h1>Inventory Management</h1>
        </div>
        <div className="header-actions">
          {success && (
            <div className="success-message">
              {success}
              <button onClick={() => setSuccess("")} className="clear-message-btn">×</button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")} className="clear-message-btn">×</button>
        </div>
      )}

      <div className="inventory-summary">
        <div className="summary-card">
          <div className="summary-icon">📦</div>
          <div className="summary-content">
            <h3>Total Products</h3>
            <p className="summary-number">{inventoryStats.totalProducts}</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h3>Total Stock</h3>
            <p className="summary-number">{inventoryStats.totalStock} units</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>Inventory Value</h3>
            <p className="summary-number">${inventoryStats.totalValue.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="summary-card warning">
          <div className="summary-icon">⚠️</div>
          <div className="summary-content">
            <h3>Out of Stock</h3>
            <p className="summary-number">{inventoryStats.outOfStock}</p>
          </div>
        </div>
        
        <div className="summary-card alert">
          <div className="summary-icon">🔔</div>
          <div className="summary-content">
            <h3>Low Stock</h3>
            <p className="summary-number">{inventoryStats.lowStock}</p>
          </div>
        </div>
      </div>

      <div className="inventory-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Stock Levels</option>
            <option value="out">Out of Stock</option>
            <option value="low">Low Stock (&lt; 10)</option>
            <option value="medium">Medium Stock (10-29)</option>
            <option value="high">High Stock (30+)</option>
          </select>
        </div>
        
        <div className="filter-info">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Status</th>
              <th>Unit Price</th>
              <th>Stock Value</th>
              <th>Quick Actions</th>
              <th>Manage</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No products match your filters
                </td>
              </tr>
            ) : (
              filteredProducts.map(product => {
                const stockStatus = getStockStatus(product.stock_quantity);
                const stockValue = product.stock_quantity * product.price;
                
                return (
                  <tr key={product.id} className={`stock-${stockStatus.status}`}>
                    <td>
                      <div className="product-info">
                        <strong>{product.name}</strong>
                        {product.description && (
                          <small>{product.description}</small>
                        )}
                      </div>
                    </td>
                    <td>{product.category_name || "Uncategorized"}</td>
                    <td>
                      <div className="stock-display">
                        <span className="stock-quantity">{product.stock_quantity}</span>
                        <span className="stock-unit">units</span>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="stock-status"
                        style={{ backgroundColor: stockStatus.color }}
                      >
                        {stockStatus.label}
                      </span>
                    </td>
                    <td>${parseFloat(product.price).toFixed(2)}</td>
                    <td>
                      <div className="stock-value">
                        ${stockValue.toFixed(2)}
                        <div className="value-percent">
                          {inventoryStats.totalValue > 0 
                            ? ((stockValue / inventoryStats.totalValue) * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="quick-actions">
                        <button
                          className="quick-btn restock"
                          onClick={() => handleQuickAction(product.id, "restock")}
                          title="Add 10 units"
                        >
                          +10
                        </button>
                        <button
                          className="quick-btn reduce"
                          onClick={() => handleQuickAction(product.id, "low")}
                          title="Reduce 5 units"
                          disabled={product.stock_quantity === 0}
                        >
                          -5
                        </button>
                        <button
                          className="quick-btn clear"
                          onClick={() => handleQuickAction(product.id, "zero")}
                          title="Set to zero"
                          disabled={product.stock_quantity === 0}
                        >
                          0
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        className="manage-stock-btn"
                        onClick={() => handleStockUpdateClick(product)}
                      >
                        Manage Stock
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="inventory-reports">
        <div className="report-card">
          <h3>Stock Alerts</h3>
          <div className="alert-list">
            {products
              .filter(p => p.stock_quantity < 10)
              .sort((a, b) => a.stock_quantity - b.stock_quantity)
              .slice(0, 5)
              .map(product => (
                <div key={product.id} className="alert-item">
                  <span className="alert-product">{product.name}</span>
                  <span className="alert-stock">{product.stock_quantity} units</span>
                  <button
                    className="alert-action"
                    onClick={() => handleStockUpdateClick(product)}
                  >
                    Restock
                  </button>
                </div>
              ))
            }
            {products.filter(p => p.stock_quantity < 10).length === 0 && (
              <p className="no-alerts">No stock alerts at this time</p>
            )}
          </div>
        </div>
        
        <div className="report-card">
          <h3>Top 5 by Value</h3>
          <div className="top-list">
            {products
              .sort((a, b) => (b.stock_quantity * b.price) - (a.stock_quantity * a.price))
              .slice(0, 5)
              .map(product => (
                <div key={product.id} className="top-item">
                  <span className="top-product">{product.name}</span>
                  <span className="top-value">
                    ${(product.stock_quantity * product.price).toFixed(2)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {showUpdateModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal stock-update-modal">
            <div className="modal-header">
              <div className="modal-header-title">
                <img 
                  src={logo} 
                  alt="Nitrogo" 
                  className="modal-logo"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
                <h2>Update Stock: {selectedProduct.name}</h2>
              </div>
              <button 
                className="close-btn"
                onClick={() => setShowUpdateModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="current-stock-info">
                <p><strong>Current Stock:</strong> {selectedProduct.stock_quantity} units</p>
                <p><strong>Category:</strong> {selectedProduct.category_name || "Uncategorized"}</p>
                <p><strong>Unit Price:</strong> ${parseFloat(selectedProduct.price).toFixed(2)}</p>
              </div>
              
              <div className="update-controls">
                <div className="update-type">
                  <label>
                    <input
                      type="radio"
                      value="add"
                      checked={updateType === "add"}
                      onChange={() => setUpdateType("add")}
                    />
                    Add Stock
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="subtract"
                      checked={updateType === "subtract"}
                      onChange={() => setUpdateType("subtract")}
                    />
                    Remove Stock
                  </label>
                </div>
                
                <div className="quantity-input">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    value={stockUpdate}
                    onChange={(e) => setStockUpdate(e.target.value)}
                    min="1"
                    placeholder="Enter quantity"
                  />
                </div>
                
                <div className="preview">
                  <p>
                    New stock will be:{" "}
                    <strong>
                      {updateType === "add"
                        ? selectedProduct.stock_quantity + (parseInt(stockUpdate) || 0)
                        : selectedProduct.stock_quantity - (parseInt(stockUpdate) || 0)}
                    </strong>{" "}
                    units
                  </p>
                </div>
              </div>
              
              {error && <div className="form-error">{error}</div>}
              
              <div className="modal-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="update-btn"
                  onClick={handleUpdateStock}
                >
                  Update Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;