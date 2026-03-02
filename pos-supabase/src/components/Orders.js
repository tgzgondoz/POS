import React, { useState, useEffect } from "react";
import { ordersApi, usersApi } from "../lib/api";
import "./Orders.css";

const Orders = ({ auth }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
    if (auth.user?.role === 'admin') {
      fetchUsers();
    }
  }, []);

  useEffect(() => {
    filterOrders();
  }, [selectedUserId, dateFilter, paymentFilter, orders]);

  const fetchOrders = async () => {
    try {
      const data = await ordersApi.getAll();
      
      if (auth.user?.role === 'cashier') {
        const userOrders = data.filter(order => 
          order.user_id === auth.user?.id
        );
        setOrders(userOrders);
      } else {
        setOrders(data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (selectedUserId !== "all") {
      filtered = filtered.filter(order => order.user_id == selectedUserId);
    }

    if (dateFilter !== "all") {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      switch (dateFilter) {
        case "today":
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= startOfDay && orderDate <= endOfDay;
          });
          break;
        case "yesterday":
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
          const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= startOfYesterday && orderDate <= endOfYesterday;
          });
          break;
        case "week":
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          filtered = filtered.filter(order => new Date(order.created_at) >= weekAgo);
          break;
        case "month":
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          filtered = filtered.filter(order => new Date(order.created_at) >= monthAgo);
          break;
        default:
          break;
      }
    }

    if (paymentFilter !== "all") {
      filtered = filtered.filter(order => order.payment_method === paymentFilter);
    }

    setFilteredOrders(filtered);
  };

  const viewOrderDetails = async (order) => {
    try {
      const data = await ordersApi.getById(order.id);
      setSelectedOrder(data);
      setShowOrderDetails(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatShortDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getOrderStats = () => {
    const total = orders.length;
    const todayCount = orders.filter(o => 
      new Date(o.created_at).toDateString() === new Date().toDateString()
    ).length;
    
    const totalAmount = orders.reduce((sum, order) => 
      sum + parseFloat(order.total_amount), 0
    );
    
    const todayAmount = orders
      .filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

    return { total, todayCount, totalAmount, todayAmount };
  };

  const stats = getOrderStats();

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1>Orders History</h1>
        <div className="orders-stats">
          <div className="stat-item">
            <span className="stat-label">Total Orders</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Today's Orders</span>
            <span className="stat-value">{stats.todayCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">${stats.totalAmount.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Today's Revenue</span>
            <span className="stat-value">${stats.todayAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="orders-filters">
        {auth.user?.role === 'admin' && (
          <div className="filter-group">
            <label>Filter by User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label>Filter by Date</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Filter by Payment</label>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile">Mobile</option>
          </select>
        </div>

        <div className="filter-info">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              {auth.user?.role === 'admin' && <th>Customer</th>}
              <th>Amount</th>
              <th>Payment</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={auth.user?.role === 'admin' ? 6 : 5} className="no-data">
                  No orders found matching your filters
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id}>
                  <td className="order-id">#{order.id}</td>
                  {auth.user?.role === 'admin' && (
                    <td className="customer-cell">
                      <div className="customer-info">
                        <span className="customer-name">{order.user_name || "Walk-in Customer"}</span>
                      </div>
                    </td>
                  )}
                  <td className="order-amount">${parseFloat(order.total_amount).toFixed(2)}</td>
                  <td>
                    <span className={`payment-badge ${order.payment_method}`}>
                      {order.payment_method}
                    </span>
                  </td>
                  <td className="order-date">{formatShortDate(order.created_at)}</td>
                  <td>
                    <button 
                      className="view-details-btn"
                      onClick={() => viewOrderDetails(order)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showOrderDetails && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal order-details-modal">
            <div className="modal-header">
              <h2>Receipt - Order #{selectedOrder.order.id}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowOrderDetails(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="receipt-header">
                <h3>Car Spare Parts POS</h3>
                <p className="store-info">
                  <span>📞 Phone: (123) 456-7890</span>
                </p>
                <div className="receipt-divider"></div>
              </div>

              <div className="receipt-info">
                <div className="info-row">
                  <span className="info-label">Order ID:</span>
                  <span className="info-value">#{selectedOrder.order.id}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Customer:</span>
                  <span className="info-value">
                    {selectedOrder.order.user_name || "Walk-in Customer"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Date:</span>
                  <span className="info-value">{formatDate(selectedOrder.order.created_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Payment:</span>
                  <span className={`payment-type ${selectedOrder.order.payment_method}`}>
                    {selectedOrder.order.payment_method.toUpperCase()}
                  </span>
                </div>
                <div className="receipt-divider"></div>
              </div>

              <div className="receipt-items">
                <h4>Items Purchased:</h4>
                <table className="receipt-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td className="product-name">{item.product_name}</td>
                        <td className="text-right">{item.quantity}</td>
                        <td className="text-right">${parseFloat(item.price).toFixed(2)}</td>
                        <td className="text-right">${(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="receipt-summary">
                <div className="receipt-divider"></div>
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${(parseFloat(selectedOrder.order.total_amount) / 1.08).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax (8%):</span>
                  <span>${(parseFloat(selectedOrder.order.total_amount) * 0.08 / 1.08).toFixed(2)}</span>
                </div>
                {selectedOrder.order.discount > 0 && (
                  <div className="summary-row discount">
                    <span>Discount:</span>
                    <span>-${parseFloat(selectedOrder.order.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Grand Total:</span>
                  <span>${parseFloat(selectedOrder.order.total_amount).toFixed(2)}</span>
                </div>
                <div className="receipt-divider"></div>
              </div>

              <div className="receipt-footer">
                <p className="thank-you">Thank you for your purchase!</p>
              </div>

              <div className="modal-actions">
                <button 
                  className="print-btn"
                  onClick={() => window.print()}
                >
                  🖨️ Print Receipt
                </button>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowOrderDetails(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;