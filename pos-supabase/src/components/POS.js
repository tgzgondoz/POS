import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import "./POS.css";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "card", label: "Card", icon: "💳" },
  { value: "mobile", label: "Mobile", icon: "📱" }
];

const TAX_RATE = 0.08;

const safeNumber = (value) => parseFloat(value) || 0;
const formatPrice = (price) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
}).format(safeNumber(price));

const POS = ({ auth }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState("percentage");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("products");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [userVerified, setUserVerified] = useState(false);

  // Check and verify user at component mount
  useEffect(() => {
    checkAndVerifyUser();
  }, []);

  // Fetch products and categories after user is verified
  useEffect(() => {
    if (userVerified) {
      fetchProducts();
      fetchCategories();
    }
  }, [userVerified]);

  const checkAndVerifyUser = async () => {
    try {
      setError("");
      console.log("Starting user verification...");
      
      // Method 1: Get from auth prop
      if (auth?.user) {
        console.log("User from auth prop:", auth.user);
        const verified = await verifyAndCreateUser(auth.user);
        if (verified) {
          setCurrentUser(auth.user);
          setUserVerified(true);
          return;
        }
      }

      // Method 2: Get from localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const localUser = JSON.parse(userStr);
        console.log("User from localStorage:", localUser);
        const verified = await verifyAndCreateUser(localUser);
        if (verified) {
          setCurrentUser(localUser);
          setUserVerified(true);
          return;
        }
      }

      // Method 3: Get from Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("Failed to get session");
      }
      
      console.log("Current session:", session);
      
      if (session?.user) {
        console.log("Auth user ID:", session.user.id);
        const sessionUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          role: session.user.email?.includes('admin') ? 'admin' : 'user'
        };
        
        const verified = await verifyAndCreateUser(sessionUser);
        if (verified) {
          setCurrentUser(sessionUser);
          setUserVerified(true);
          
          // Update localStorage
          localStorage.setItem("user", JSON.stringify(sessionUser));
          return;
        }
      } else {
        console.log("No active session");
        setError("Please log in to use POS");
      }
    } catch (error) {
      console.error("Error in user verification:", error);
      setError("User verification failed. Please log in again.");
    }
  };

  const verifyAndCreateUser = async (user) => {
    try {
      if (!user || !user.id) {
        console.error("Invalid user object:", user);
        return false;
      }

      console.log("Verifying user in database:", user.id);

      // Check if user exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error("Error checking user:", userError);
        return false;
      }

      // If user doesn't exist, create them
      if (!userData) {
        console.log("User not found in database, creating...");
        const created = await createUserInDatabase(user);
        return created;
      }

      console.log("User found in database:", userData);
      
      // Update current user with database info
      setCurrentUser(userData);
      return true;
      
    } catch (error) {
      console.error("Error in verifyAndCreateUser:", error);
      return false;
    }
  };

  const createUserInDatabase = async (user) => {
    try {
      const newUser = {
        id: user.id,
        username: user.email || user.username || `user_${Date.now()}`,
        name: user.name || user.email?.split('@')[0] || 'User',
        role: user.role || (user.email?.includes('admin') ? 'admin' : 'user'),
        created_at: new Date().toISOString()
      };

      console.log("Creating user with data:", newUser);

      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (error) {
        console.error("Error creating user:", error);
        
        // Check if it's a duplicate key error (user was created by another process)
        if (error.code === '23505') {
          console.log("User might have been created by another process, trying to fetch...");
          
          // Try to fetch the user again
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!fetchError && existingUser) {
            console.log("Found existing user:", existingUser);
            setCurrentUser(existingUser);
            return true;
          }
        }
        
        return false;
      }

      console.log("User created successfully:", data);
      setCurrentUser(data);
      return true;
      
    } catch (error) {
      console.error("Error in createUserInDatabase:", error);
      return false;
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id (
            name
          )
        `)
        .order('name');

      if (error) throw error;

      const formattedProducts = data.map(product => ({
        ...product,
        category_name: product.categories?.name,
        price: safeNumber(product.price),
        stock_quantity: safeNumber(product.stock_quantity)
      }));

      setProducts(formattedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products");
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
    }
  };

  const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
      setError("Product out of stock");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          setError("Not enough stock");
          setTimeout(() => setError(""), 3000);
          return prev;
        }
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      setSuccess(`Added ${product.name} to cart`);
      setTimeout(() => setSuccess(""), 2000);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId, change) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      const item = prev.find(i => i.id === productId);
      if (!item) return prev;
      
      const newQty = item.quantity + change;
      if (newQty < 1) {
        removeFromCart(productId);
        return prev;
      }
      if (newQty > product.stock_quantity) {
        setError("Not enough stock");
        setTimeout(() => setError(""), 3000);
        return prev;
      }
      
      return prev.map(i => 
        i.id === productId ? { ...i, quantity: newQty } : i
      );
    });
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm("Clear all items?")) {
      setCart([]);
      setDiscountPercentage(0);
      setDiscountAmount(0);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const discount = discountType === "percentage" 
    ? subtotal * (discountPercentage / 100)
    : Math.min(discountAmount, subtotal);
  const total = Math.max(0, subtotal + tax - discount);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }

    if (!currentUser) {
      setError("User not authenticated. Please log in again.");
      return;
    }
    
    setIsCheckingOut(true);
    setError("");
    
    try {
      console.log("Processing order for user:", currentUser);

      // Double-check user exists in database before creating order
      const { data: userExists, error: userCheckError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (userCheckError) {
        console.error("User check error:", userCheckError);
        throw new Error("Error verifying user account");
      }

      if (!userExists) {
        console.log("User not found, attempting to create...");
        const created = await createUserInDatabase(currentUser);
        if (!created) {
          throw new Error("Failed to verify/create user account");
        }
      }

      // Prepare order data
      const orderData = {
        user_id: currentUser.id,
        total_amount: total,
        discount: discount,
        discount_type: discountType,
        discount_value: discountType === "percentage" ? discountPercentage : discountAmount,
        payment_method: paymentMethod,
        status: 'completed',
        created_at: new Date().toISOString()
      };

      console.log("Creating order with data:", orderData);

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error details:", orderError);
        
        if (orderError.code === '23503') {
          throw new Error(`User account issue. Please log out and log in again.`);
        }
        
        throw orderError;
      }

      console.log("Order created:", order);

      // Create order items - WITHOUT subtotal column
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
        // subtotal is removed - calculate it when needed or add column to database
      }));

      console.log("Creating order items:", orderItems);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error("Order items error:", itemsError);
        throw itemsError;
      }

      // Update product stock
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: item.stock_quantity - item.quantity 
          })
          .eq('id', item.id);

        if (stockError) {
          console.error(`Error updating stock for product ${item.id}:`, stockError);
        }
      }

      setSuccess("Order completed successfully!");
      setCart([]);
      setDiscountPercentage(0);
      setDiscountAmount(0);
      
      // Refresh products to get updated stock
      await fetchProducts();
      
      setTimeout(() => {
        setSuccess("");
        setActiveTab("products");
      }, 3000);
      
    } catch (error) {
      console.error("Checkout error:", error);
      setError(error.message || "Error processing order.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category_id == selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Show login required message if user not verified
  if (!userVerified) {
    return (
      <div className="pos-container">
        <div className="login-required" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
          <h2>Login Required</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>{error || "Please log in to access the POS system"}</p>
          <button 
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-container">
      <header className="pos-header">
        <div className="header-brand">
          <h1>Point of Sale</h1>
          <p className="subtitle">Welcome, {currentUser?.name || auth.user?.name || 'User'}</p>
          <p className="user-role" style={{ fontSize: '0.85rem', color: '#666' }}>
            Role: {currentUser?.role || 'staff'}
          </p>
        </div>
        
        <div className="header-actions">
          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}
          <div className="cart-summary">
            <div className="summary-item">
              <span className="label">Products</span>
              <span className="value">{products.length}</span>
            </div>
            <div className="summary-item highlight">
              <span className="label">Cart Total</span>
              <span className="value">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="pos-nav">
        <button 
          className={`nav-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab("products")}
        >
          <span className="nav-icon">📦</span>
          <span className="nav-text">Products</span>
          <span className="nav-badge">{filteredProducts.length}</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'cart' ? 'active' : ''}`}
          onClick={() => setActiveTab("cart")}
        >
          <span className="nav-icon">🛒</span>
          <span className="nav-text">Cart</span>
          {cart.length > 0 && <span className="nav-badge alert">{cart.length}</span>}
        </button>
      </nav>

      <main className="pos-main">
        {activeTab === "products" && (
          <div className="tab-content">
            <div className="products-header">
              <div className="search-box">
                <input
                  type="search"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="products-grid">
              {filteredProducts.length === 0 ? (
                <div className="no-products">No products found</div>
              ) : (
                filteredProducts.map(product => (
                  <div key={product.id} className="product-card">
                    <div className="product-header">
                      <h3 className="product-name">{product.name}</h3>
                      <div className="product-price">{formatPrice(product.price)}</div>
                    </div>
                    
                    <div className="product-meta">
                      <span className="category">{product.category_name || 'General'}</span>
                      <span className={`stock ${product.stock_quantity < 5 ? 'low' : 'good'}`}>
                        {product.stock_quantity} in stock
                      </span>
                    </div>
                    
                    {product.description && (
                      <p className="product-description">{product.description}</p>
                    )}
                    
                    <button 
                      className={`add-to-cart-btn ${product.stock_quantity === 0 ? 'disabled' : ''}`}
                      onClick={() => addToCart(product)}
                      disabled={product.stock_quantity === 0}
                    >
                      {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart +'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "cart" && (
          <div className="tab-content cart-tab">
            <div className="cart-header">
              <h2 className="cart-title">
                <span className="title-icon">🛒</span>
                Order Summary
                {cart.length > 0 && (
                  <span className="cart-count">({cart.length} items)</span>
                )}
              </h2>
              
              <div className="cart-controls">
                {cart.length > 0 && (
                  <>
                    <button 
                      className="control-btn discount"
                      onClick={() => setShowDiscountModal(true)}
                    >
                      <span className="btn-icon">🎯</span>
                      <span className="btn-text">Discount</span>
                    </button>
                    <button 
                      className="control-btn clear"
                      onClick={clearCart}
                    >
                      <span className="btn-icon">🗑️</span>
                      <span className="btn-text">Clear</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {discount > 0 && (
              <div className="discount-banner">
                <div className="banner-content">
                  <span className="banner-text">
                    <strong>Discount:</strong> {formatPrice(discount)}
                    {discountType === "percentage" && ` (${discountPercentage}%)`}
                  </span>
                  <button 
                    onClick={() => {
                      setDiscountPercentage(0);
                      setDiscountAmount(0);
                    }}
                    className="banner-close"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="cart-items-section">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <div className="empty-icon">🛒</div>
                  <h3>Your cart is empty</h3>
                  <p>Add products to get started</p>
                  <button 
                    className="browse-btn"
                    onClick={() => setActiveTab("products")}
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <div className="cart-items-grid">
                  {cart.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="item-header">
                        <h4 className="item-name">{item.name}</h4>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="remove-btn"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className="item-details">
                        <span className="item-price">{formatPrice(item.price)} each</span>
                        <span className="item-category">{item.category_name}</span>
                      </div>
                      
                      <div className="item-controls">
                        <div className="quantity-control">
                          <button 
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="qty-btn minus"
                          >
                            −
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button 
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="qty-btn plus"
                            disabled={item.quantity >= item.stock_quantity}
                          >
                            +
                          </button>
                        </div>
                        <div className="item-total">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax (8%):</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                {discount > 0 && (
                  <div className="summary-row discount">
                    <span>Discount:</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>{formatPrice(total)}</span>
                </div>

                <div className="payment-section">
                  <h4>Payment Method</h4>
                  <div className="payment-options">
                    {PAYMENT_METHODS.map(method => (
                      <label key={method.value} className="payment-option">
                        <input
                          type="radio"
                          name="payment"
                          value={method.value}
                          checked={paymentMethod === method.value}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <div className={`payment-method ${paymentMethod === method.value ? 'selected' : ''}`}>
                          <span className="method-icon">{method.icon}</span>
                          <span className="method-label">{method.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleCheckout}
                  className="checkout-btn"
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="checkout-icon">✓</span>
                      Complete Order · {formatPrice(total)}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {showDiscountModal && (
        <div className="modal-overlay" onClick={() => setShowDiscountModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Apply Discount</h3>
              <button className="modal-close" onClick={() => setShowDiscountModal(false)}>✕</button>
            </div>
            <div className="modal-content">
              <div className="modal-tabs">
                <button 
                  className={`tab ${discountType === 'percentage' ? 'active' : ''}`}
                  onClick={() => setDiscountType('percentage')}
                >
                  Percentage
                </button>
                <button 
                  className={`tab ${discountType === 'amount' ? 'active' : ''}`}
                  onClick={() => setDiscountType('amount')}
                >
                  Fixed Amount
                </button>
              </div>
              
              <div className="modal-input">
                {discountType === "percentage" ? (
                  <>
                    <label>Discount Percentage</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(safeNumber(e.target.value))}
                      placeholder="0.0"
                    />
                    <div className="input-hint">
                      Amount: {formatPrice(subtotal * (discountPercentage / 100))}
                    </div>
                  </>
                ) : (
                  <>
                    <label>Discount Amount</label>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      step="0.01"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(safeNumber(e.target.value))}
                      placeholder="0.00"
                    />
                    <div className="input-hint">
                      Max: {formatPrice(subtotal)}
                    </div>
                  </>
                )}
              </div>
              
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowDiscountModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    if (discountType === "percentage" && (discountPercentage < 0 || discountPercentage > 100)) {
                      alert("Percentage must be 0-100");
                      return;
                    }
                    if (discountType === "amount" && discountAmount < 0) {
                      alert("Amount cannot be negative");
                      return;
                    }
                    setShowDiscountModal(false);
                  }}
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Product Details</h3>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
            </div>
            <div className="modal-content">
              <div className="product-detail-header">
                <h4>{selectedProduct.name}</h4>
                <div className="product-detail-price">{formatPrice(selectedProduct.price)}</div>
              </div>
              
              <div className="product-detail-info">
                <div className="info-row">
                  <span>Category:</span>
                  <span>{selectedProduct.category_name || 'General'}</span>
                </div>
                <div className="info-row">
                  <span>Stock:</span>
                  <span className={selectedProduct.stock_quantity < 5 ? 'stock-warning' : 'stock-good'}>
                    {selectedProduct.stock_quantity} units
                  </span>
                </div>
                {selectedProduct.description && (
                  <div className="info-row description">
                    <span>Description:</span>
                    <p>{selectedProduct.description}</p>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setSelectedProduct(null)}>
                  Close
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock_quantity === 0}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;