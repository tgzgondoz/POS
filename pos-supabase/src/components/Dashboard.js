import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { productsApi, ordersApi } from "../lib/api";
import "./Dashboard.css";

const Dashboard = ({ auth, setAuth }) => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    todaySales: 0,
    lowStock: 0,
    totalCustomers: 2,
    monthlySales: 0
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [products, orders] = await Promise.all([
        productsApi.getAll(),
        ordersApi.getAll()
      ]);

      const lowStockCount = products.filter(p => p.stock_quantity < 10).length;
      
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.created_at.includes(today));
      const todaySales = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const monthlyOrders = orders.filter(o => new Date(o.created_at) >= thirtyDaysAgo);
      const monthlySales = monthlyOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
      
      const topProductsByValue = products
        .map(p => ({
          ...p,
          stock_value: p.stock_quantity * p.price
        }))
        .sort((a, b) => b.stock_value - a.stock_value)
        .slice(0, 5);

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        todaySales,
        lowStock: lowStockCount,
        totalCustomers: 2,
        monthlySales
      });

      setRecentOrders(orders.slice(0, 5));
      setTopProducts(topProductsByValue);
      setLoading(false);
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth({ isAuthenticated: false, user: null });
    navigate("/login");
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getQuickActions = () => {
    const baseActions = [
      {
        to: "/pos",
        title: "New Sale",
        description: "Process customer purchase",
        icon: "💰",
        primary: true
      }
    ];

    if (auth.user?.role === 'admin') {
      return [
        ...baseActions,
        {
          to: "/products",
          title: "Products",
          description: "Manage inventory",
          icon: "📦",
          primary: false
        },
        {
          to: "/inventory",
          title: "Inventory",
          description: "Stock levels",
          icon: "📊",
          primary: false
        },
        {
          to: "/orders",
          title: "Orders",
          description: "View history",
          icon: "🛒",
          primary: false
        },
        {
          to: "/users",
          title: "Users",
          description: "Manage access",
          icon: "👥",
          primary: false
        }
      ];
    } else {
      return [
        ...baseActions,
        {
          to: "/orders",
          title: "Orders",
          description: "View history",
          icon: "🛒",
          primary: false
        }
      ];
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>{getGreeting()}, {auth.user?.name}!</h1>
          <p className="welcome-text">
            {auth.user?.role === 'admin' 
              ? "Here's what's happening with your store today." 
              : "Ready to process your next sale?"}
          </p>
        </div>
        <div className="header-right">
          <div className="user-profile">
            <div className="profile-info">
              <span className="profile-name">{auth.user?.name}</span>
              <span className="profile-role">{auth.user?.role}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Total Products</h3>
            <p className="stat-number">{stats.totalProducts}</p>
          </div>
        </div>
        
        {auth.user?.role === 'admin' && (
          <>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Today's Sales</h3>
                <p className="stat-number">${stats.todaySales.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🛒</div>
              <div className="stat-content">
                <h3>Total Orders</h3>
                <p className="stat-number">{stats.totalOrders}</p>
              </div>
            </div>
          </>
        )}
        
        {auth.user?.role === 'admin' && (
          <div className="stat-card warning">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <h3>Low Stock Items</h3>
              <p className="stat-number">{stats.lowStock}</p>
            </div>
          </div>
        )}
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          {getQuickActions().map((action, index) => (
            <Link 
              key={index} 
              to={action.to} 
              className={`action-card ${action.primary ? 'primary' : ''}`}
            >
              <div className="action-icon">{action.icon}</div>
              <div className="action-content">
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {auth.user?.role === 'admin' && (
        <div className="bottom-content-row">
          <div className="recent-orders">
            <div className="section-header">
              <h2>Recent Orders</h2>
              <Link to="/orders" className="view-all">View All →</Link>
            </div>
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? (
                    recentOrders.map(order => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{order.user_name || "Walk-in Customer"}</td>
                        <td className="amount">${parseFloat(order.total_amount).toFixed(2)}</td>
                        <td>
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td>
                          <span className="status completed">Completed</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-data">
                        No orders yet. Start selling!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="top-products">
            <div className="section-header">
              <h2>Top Products by Value</h2>
              <Link to="/inventory" className="view-all">View Inventory →</Link>
            </div>
            <div className="products-list">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={product.id} className="product-item">
                    <div className="product-rank">{index + 1}</div>
                    <div className="product-details">
                      <h4>{product.name}</h4>
                      <p>{product.category_name || "Uncategorized"}</p>
                    </div>
                    <div className="product-meta">
                      <div>Stock: <strong>{product.stock_quantity}</strong></div>
                      <div>Value: <strong>${(product.stock_quantity * product.price).toFixed(2)}</strong></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">
                  No products available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;