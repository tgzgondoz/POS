import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./POS.css";

const POS = ({ auth }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("percentage");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cartNote, setCartNote] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

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
        price: parseFloat(product.price),
        cost_price: parseFloat(product.cost_price) || product.price * 0.7
      }));

      setProducts(formattedProducts);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products");
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
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
      setError(`${product.name} is out of stock`);
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
          setError(`Cannot add more ${product.name} - insufficient stock`);
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...prevCart, {
        id: product.id,
        name: product.name,
        price: product.price,
        cost_price: product.cost_price,
        quantity: 1,
        stock: product.stock_quantity,
        category: product.category_name,
        sku: product.sku,
        description: product.description,
        image_url: product.image_url
      }];
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (newQuantity > product.stock_quantity) {
      setError(`Cannot add more than ${product.stock_quantity} units`);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm("Clear all items from cart?")) {
      setCart([]);
      setDiscount(0);
      setCartNote("");
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === "percentage") {
      return (subtotal * discount) / 100;
    } else {
      return discount;
    }
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const calculateProfit = () => {
    return cart.reduce((sum, item) => {
      const profit = (item.price - item.cost_price) * item.quantity;
      return sum + profit;
    }, 0) - calculateDiscount();
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const paid = parseFloat(amountPaid) || 0;
    return paid - total;
  };

  const handleQuickAmount = (amount) => {
    setAmountPaid(amount.toString());
  };

  const processSale = async () => {
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const total = calculateTotal();
      const profit = calculateProfit();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: auth.user.id,
          total_amount: total,
          profit_amount: profit,
          payment_method: paymentMethod,
          discount: calculateDiscount(),
          status: 'completed',
          notes: cartNote,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items and update stock
      for (const item of cart) {
        const { error: itemError } = await supabase
          .from('order_items')
          .insert([{
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
            cost_price: item.cost_price,
            profit: (item.price - item.cost_price) * item.quantity
          }]);

        if (itemError) throw itemError;

        // Update stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: item.stock - item.quantity 
          })
          .eq('id', item.id);

        if (stockError) throw stockError;
      }

      // Print receipt (optional)
      if (window.confirm("Print receipt?")) {
        printReceipt(order.id);
      }

      setSuccess("Sale completed successfully!");
      setCart([]);
      setDiscount(0);
      setAmountPaid("");
      setCartNote("");
      setShowPaymentModal(false);
      
      // Refresh products to update stock
      fetchProducts();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error processing sale:", error);
      setError("Failed to process sale");
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = (orderId) => {
    const receiptWindow = window.open('', '_blank');
    const date = new Date().toLocaleString();
    
    receiptWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${orderId}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; margin: 0; background: #fff; }
            .receipt { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #333; padding-bottom: 10px; }
            .header h2 { margin: 0; color: #333; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; font-size: 12px; }
            .items { width: 100%; margin: 20px 0; border-collapse: collapse; }
            .items th { text-align: left; border-bottom: 1px solid #333; padding: 5px 0; font-size: 12px; }
            .items td { padding: 5px 0; font-size: 12px; }
            .total { margin-top: 20px; border-top: 2px dashed #333; padding-top: 10px; }
            .total p { display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; }
            .total .grand-total { font-weight: bold; font-size: 16px; border-top: 1px solid #333; padding-top: 5px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; border-top: 1px dashed #333; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>YOUR STORE</h2>
              <p>123 Main Street, City</p>
              <p>Tel: (555) 123-4567</p>
              <p>${date}</p>
              <p>Receipt #${orderId.toString().padStart(6, '0')}</p>
              <p>Cashier: ${auth.user.email}</p>
            </div>
            
            <table class="items">
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
              ${cart.map(item => `
                <tr>
                  <td>${item.name.substring(0, 20)}${item.name.length > 20 ? '...' : ''}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </table>
            
            <div class="total">
              <p><span>Subtotal:</span> <span>$${calculateSubtotal().toFixed(2)}</span></p>
              ${discount > 0 ? `<p><span>Discount (${discountType === 'percentage' ? discount + '%' : '$' + discount}):</span> <span>-$${calculateDiscount().toFixed(2)}</span></p>` : ''}
              <p class="grand-total"><span>TOTAL:</span> <span>$${calculateTotal().toFixed(2)}</span></p>
              <p><span>Paid:</span> <span>$${parseFloat(amountPaid).toFixed(2)}</span></p>
              <p><span>Change:</span> <span>$${calculateChange().toFixed(2)}</span></p>
            </div>
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Please come again</p>
              <p>*** Returns accepted within 7 days ***</p>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    
    receiptWindow.document.close();
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || String(product.category_id) === String(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading POS System...</p>
      </div>
    );
  }

  return (
    <div className="pos-container">
      {/* Header */}
      <div className="pos-header">
        <div className="header-left">
          <button onClick={() => navigate(-1)} className="back-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            Point of Sale
          </h1>
        </div>
        <div className="header-right">
          <div className="date-time">{new Date().toLocaleString()}</div>
          <div className="user-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {auth.user?.email}
          </div>
        </div>
      </div>

      {success && (
        <div className="success-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {success}
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <div className="pos-content">
        {/* Products Section */}
        <div className="products-section">
          <div className="products-header">
            <div className="search-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="products-grid">
            {filteredProducts.length === 0 ? (
              <div className="no-products">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>No products found</p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <div
                  key={product.id}
                  className={`product-card ${product.stock_quantity === 0 ? 'out-of-stock' : ''}`}
                  onClick={() => product.stock_quantity > 0 && addToCart(product)}
                >
                  <div className="product-badge" data-status={
                    product.stock_quantity === 0 ? 'out' :
                    product.stock_quantity < 10 ? 'low' : 'in'
                  }>
                    {product.stock_quantity === 0 ? 'Out of Stock' : 
                     product.stock_quantity < 10 ? 'Low Stock' : 'In Stock'}
                  </div>
                  
                  {product.image_url && (
                    <div className="product-image">
                      <img src={product.image_url} alt={product.name} />
                    </div>
                  )}
                  
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    
                    <div className="product-details">
                      {product.sku && (
                        <div className="detail-chip">
                          <span>SKU: {product.sku}</span>
                        </div>
                      )}
                      <div className="detail-chip">
                        <span>{product.category_name || 'Uncategorized'}</span>
                      </div>
                    </div>
                    
                    {product.description && (
                      <div className="product-description">
                        {product.description}
                      </div>
                    )}
                    
                    <div className="product-price">
                      ${product.price.toFixed(2)}
                    </div>
                    
                    <div className="product-stock">
                      <div className="stock-bar">
                        <div 
                          className={`stock-fill ${product.stock_quantity < 10 ? 'low' : ''}`}
                          style={{ width: `${Math.min((product.stock_quantity / 100) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="stock-count">{product.stock_quantity} units available</span>
                    </div>
                    
                    {product.stock_quantity > 0 && (
                      <button className="add-to-cart-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="9" cy="21" r="1"/>
                          <circle cx="20" cy="21" r="1"/>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="cart-section">
          <div className="cart-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              Shopping Cart
              {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
            </h2>
            {cart.length > 0 && (
              <button className="clear-cart-btn" onClick={clearCart}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <p>Your cart is empty</p>
                <small>Click on products to add them</small>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <div className="item-meta">
                        <span className="item-price">${item.price.toFixed(2)} ea</span>
                        <span className="item-category">{item.category}</span>
                      </div>
                    </div>
                    
                    <div className="item-controls">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="qty-btn"
                      >
                        -
                      </button>
                      <span className="item-quantity">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="qty-btn"
                        disabled={item.quantity >= item.stock}
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="remove-btn"
                        title="Remove item"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}

                <div className="cart-note">
                  <input
                    type="text"
                    placeholder="Add order note..."
                    value={cartNote}
                    onChange={(e) => setCartNote(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {cart.length > 0 && (
            <div className="cart-footer">
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="summary-row discount-row">
                  <span>Discount</span>
                  <div className="discount-controls">
                    <select
                      value={discountType}
                      onChange={(e) => {
                        setDiscountType(e.target.value);
                        setDiscount(0);
                      }}
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">$</option>
                    </select>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      min="0"
                      max={discountType === "percentage" ? 100 : calculateSubtotal()}
                      step={discountType === "percentage" ? "1" : "0.01"}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="summary-row total">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
                
                <div className="summary-row profit">
                  <span>Est. Profit</span>
                  <span className="profit-amount">+${calculateProfit().toFixed(2)}</span>
                </div>
              </div>

              <button
                className="checkout-btn"
                onClick={() => setShowPaymentModal(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="5" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Proceed to Payment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => !processing && setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Complete Payment</h2>
              <button 
                className="close-btn"
                onClick={() => !processing && setShowPaymentModal(false)}
                disabled={processing}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="payment-summary">
                <div className="summary-item">
                  <span>Total Amount</span>
                  <span className="total-amount">${calculateTotal().toFixed(2)}</span>
                </div>
                <div className="summary-item profit">
                  <span>Profit on this sale</span>
                  <span>+${calculateProfit().toFixed(2)}</span>
                </div>
              </div>

              <div className="payment-methods">
                <h3>Payment Method</h3>
                <div className="method-grid">
                  <button
                    className={`method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                    disabled={processing}
                  >
                    <span className="method-icon">💰</span>
                    <span className="method-name">Cash</span>
                  </button>
                  <button
                    className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                    disabled={processing}
                  >
                    <span className="method-icon">💳</span>
                    <span className="method-name">Card</span>
                  </button>
                  <button
                    className={`method-btn ${paymentMethod === 'mobile' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('mobile')}
                    disabled={processing}
                  >
                    <span className="method-icon">📱</span>
                    <span className="method-name">Mobile</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div className="cash-payment">
                  <h3>Cash Payment</h3>
                  
                  <div className="quick-amounts">
                    <button onClick={() => handleQuickAmount(calculateTotal())} disabled={processing}>
                      Exact
                    </button>
                    <button onClick={() => handleQuickAmount(Math.ceil(calculateTotal()))} disabled={processing}>
                      Round Up
                    </button>
                    <button onClick={() => handleQuickAmount(calculateTotal() + 10)} disabled={processing}>
                      +$10
                    </button>
                    <button onClick={() => handleQuickAmount(calculateTotal() + 20)} disabled={processing}>
                      +$20
                    </button>
                    <button onClick={() => handleQuickAmount(calculateTotal() + 50)} disabled={processing}>
                      +$50
                    </button>
                  </div>

                  <div className="amount-input">
                    <label>Amount Paid</label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      min={calculateTotal()}
                      step="0.01"
                      placeholder="Enter amount"
                      disabled={processing}
                      autoFocus
                    />
                  </div>

                  {amountPaid && parseFloat(amountPaid) >= calculateTotal() && (
                    <div className="change-display">
                      <span>Change Due</span>
                      <span className="change-amount">${calculateChange().toFixed(2)}</span>
                    </div>
                  )}

                  {amountPaid && parseFloat(amountPaid) < calculateTotal() && (
                    <div className="insufficient-error">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      Insufficient amount (needs ${(calculateTotal() - parseFloat(amountPaid)).toFixed(2)} more)
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="card-payment">
                  <div className="payment-instruction">
                    <div className="instruction-icon">💳</div>
                    <h3>Swipe or Insert Card</h3>
                    <p>Please use the card terminal to complete payment</p>
                    <div className="amount-display">
                      Amount: ${calculateTotal().toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'mobile' && (
                <div className="mobile-payment">
                  <div className="payment-instruction">
                    <div className="instruction-icon">📱</div>
                    <h3>Mobile Payment</h3>
                    <p>Scan QR code or use mobile money</p>
                    <div className="amount-display">
                      Amount: ${calculateTotal().toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  className="complete-btn"
                  onClick={processSale}
                  disabled={
                    processing ||
                    (paymentMethod === 'cash' && 
                     (!amountPaid || parseFloat(amountPaid) < calculateTotal()))
                  }
                >
                  {processing ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : (
                    'Complete Sale'
                  )}
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