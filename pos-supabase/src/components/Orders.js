import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
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
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          users:user_id (
            name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (auth.user?.role === 'cashier') {
        query = query.eq('user_id', auth.user.id);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      const formattedOrders = ordersData.map(order => ({
        ...order,
        user_name: order.users?.name,
        total_amount: parseFloat(order.total_amount)
      }));

      setOrders(formattedOrders);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to load orders");
      setLoading(false);
    }
  }, [auth.user?.id, auth.user?.role]);

  const fetchUsers = useCallback(async () => {
    if (auth.user?.role !== 'admin') return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [auth.user?.role]);

  const filterOrders = useCallback(() => {
    let filtered = [...orders];

    if (selectedUserId !== "all") {
      filtered = filtered.filter(order => order.user_id === selectedUserId);
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
  }, [orders, selectedUserId, dateFilter, paymentFilter]);

  useEffect(() => {
    fetchOrders();
    fetchUsers();
  }, [fetchOrders, fetchUsers]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const viewOrderDetails = async (order) => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          users:user_id (
            name,
            username
          )
        `)
        .eq('id', order.id)
        .single();

      if (orderError) throw orderError;

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            name
          )
        `)
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      setSelectedOrder({
        order: {
          ...orderData,
          user_name: orderData.users?.name,
          total_amount: parseFloat(orderData.total_amount)
        },
        items: items.map(item => ({
          ...item,
          product_name: item.products?.name,
          price: parseFloat(item.price)
        }))
      });
      
      setShowOrderDetails(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
      setError("Failed to load order details");
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
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id}>
                  <td className="order-id">#{order.id}</td>
                  {auth.user?.role === 'admin' && (
                    <td className="customer-cell">
                      {order.user_name || "Walk-in Customer"}
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
              <h2>Order #{selectedOrder.order.id} Details</h2>
              <button 
                className="close-btn"
                onClick={() => setShowOrderDetails(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="order-info">
                <p><strong>Customer:</strong> {selectedOrder.order.user_name || "Walk-in Customer"}</p>
                <p><strong>Date:</strong> {formatDate(selectedOrder.order.created_at)}</p>
                <p><strong>Payment Method:</strong> {selectedOrder.order.payment_method}</p>
                <p><strong>Status:</strong> {selectedOrder.order.status}</p>
              </div>

              <div className="order-items">
                <h3>Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>${(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="order-totals">
                {selectedOrder.order.discount > 0 && (
                  <p><strong>Discount:</strong> -${selectedOrder.order.discount.toFixed(2)}</p>
                )}
                <p><strong>Total:</strong> ${selectedOrder.order.total_amount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;