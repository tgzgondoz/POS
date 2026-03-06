import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import "./POS.css";

const POS = ({ auth }) => {
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
        category: product.category_name
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
            body { font-family: monospace; padding: 20px; }
            .receipt { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .items { width: 100%; margin: 20px 0; }
            .items th, .items td { text-align: left; }
            .total { font-weight: bold; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>Store Name</h2>
              <p>${date}</p>
              <p>Receipt #${orderId}</p>
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
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </table>
            
            <div class="total">
              <p>Subtotal: $${calculateSubtotal().toFixed(2)}</p>
              ${discount > 0 ? `<p>Discount: -$${calculateDiscount().toFixed(2)}</p>` : ''}
              <p>Total: $${calculateTotal().toFixed(2)}</p>
              <p>Paid: $${parseFloat(amountPaid).toFixed(2)}</p>
              <p>Change: $${calculateChange().toFixed(2)}</p>
            </div>
            
            <div class="footer">
              <p>Thank you for your business!</p>
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
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || String(product.category_id) === String(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="loading">Loading POS...</div>;
  }

  return (
    <div className="pos-container">
      <div className="pos-header">
        <h1>Point of Sale</h1>
        {success && (
          <div className="success-message">
            {success}
            <button onClick={() => setSuccess("")}>×</button>
          </div>
        )}
      </div>

      <div className="pos-content">
        {/* Products Section */}
        <div className="products-section">
          <div className="products-header">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
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
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className={`product-card ${product.stock_quantity === 0 ? 'out-of-stock' : ''}`}
                onClick={() => product.stock_quantity > 0 && addToCart(product)}
              >
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-category">{product.category_name}</p>
                  <p className="product-price">${product.price.toFixed(2)}</p>
                  <p className="product-stock">
                    Stock: {product.stock_quantity}
                    {product.stock_quantity < 10 && product.stock_quantity > 0 && (
                      <span className="low-stock-badge">Low</span>
                    )}
                  </p>
                  <p className="product-profit">
                    Profit: ${((product.price - product.cost_price)).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="cart-section">
          <div className="cart-header">
            <h2>Shopping Cart</h2>
            {cart.length > 0 && (
              <button className="clear-cart-btn" onClick={clearCart}>
                Clear Cart
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <p>Cart is empty</p>
                <small>Click on products to add them</small>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p className="item-price">${item.price.toFixed(2)} each</p>
                    <p className="item-profit">Profit: ${((item.price - item.cost_price) * item.quantity).toFixed(2)}</p>
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
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="item-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <>
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="summary-row discount-row">
                  <span>Discount:</span>
                  <div className="discount-controls">
                    <select
                      value={discountType}
                      onChange={(e) => {
                        setDiscountType(e.target.value);
                        setDiscount(0);
                      }}
                      className="discount-type"
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
                      className="discount-input"
                    />
                  </div>
                </div>
                
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
                
                <div className="summary-row profit">
                  <span>Profit on this sale:</span>
                  <span className="profit-amount">${calculateProfit().toFixed(2)}</span>
                </div>
              </div>

              <button
                className="checkout-btn"
                onClick={() => setShowPaymentModal(true)}
                disabled={cart.length === 0}
              >
                Proceed to Payment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => !processing && setShowPaymentModal(false)}>
          <div className="modal payment-modal" onClick={e => e.stopPropagation()}>
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
                  <span>Total Amount:</span>
                  <span className="total-amount">${calculateTotal().toFixed(2)}</span>
                </div>
                <div className="summary-item profit">
                  <span>Profit:</span>
                  <span>${calculateProfit().toFixed(2)}</span>
                </div>
              </div>

              <div className="payment-methods">
                <h3>Payment Method</h3>
                <div className="method-grid">
                  {['cash', 'card', 'mobile'].map(method => (
                    <button
                      key={method}
                      className={`method-btn ${paymentMethod === method ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(method)}
                      disabled={processing}
                    >
                      {method === 'cash' && '💰 Cash'}
                      {method === 'card' && '💳 Card'}
                      {method === 'mobile' && '📱 Mobile'}
                    </button>
                  ))}
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
                      Next Whole
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
                    <label>Amount Paid:</label>
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
                      <span>Change:</span>
                      <span className="change-amount">${calculateChange().toFixed(2)}</span>
                    </div>
                  )}

                  {amountPaid && parseFloat(amountPaid) < calculateTotal() && (
                    <div className="insufficient-error">
                      Insufficient amount (needs ${(calculateTotal() - parseFloat(amountPaid)).toFixed(2)} more)
                    </div>
                  )}
                </div>
              )}

              {paymentMethod !== 'cash' && (
                <div className="other-payment">
                  <p>Process payment with {paymentMethod} terminal</p>
                  <div className="amount-display">
                    Amount: ${calculateTotal().toFixed(2)}
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
                  {processing ? 'Processing...' : 'Complete Sale'}
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