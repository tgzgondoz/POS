import React, { useState, useEffect, useCallback } from "react";
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
    monthlySales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    todayProfit: 0,
    monthlyProfit: 0,
    averageProfitMargin: 0,
    topProfitProducts: []
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [profitLeaders, setProfitLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("month");
  
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    try {
      setError("");
      
      // Fetch products and orders
      const [products, orders] = await Promise.all([
        productsApi.getAll().catch(err => {
          console.error("Error fetching products:", err);
          return [];
        }),
        ordersApi.getAll().catch(err => {
          console.error("Error fetching orders:", err);
          return [];
        })
      ]);

      // Fetch all order items to calculate profit
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            name,
            price,
            cost_price
          )
        `);

      if (itemsError) throw itemsError;

      // Calculate statistics with profit
      const lowStockCount = products.filter(p => p.stock_quantity < 10).length;
      
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.created_at?.includes(today));
      const todaySales = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      
      // Calculate today's profit
      const todayOrderIds = todayOrders.map(o => o.id);
      const todayItems = orderItems.filter(item => todayOrderIds.includes(item.order_id));
      const todayProfit = todayItems.reduce((sum, item) => {
        const costPrice = item.products?.cost_price || item.price * 0.7;
        const profit = (item.price - costPrice) * item.quantity;
        return sum + profit;
      }, 0);

      // Date range calculations
      const startDate = new Date();
      if (dateRange === "week") startDate.setDate(startDate.getDate() - 7);
      else if (dateRange === "month") startDate.setDate(startDate.getDate() - 30);
      else if (dateRange === "quarter") startDate.setMonth(startDate.getMonth() - 3);
      else if (dateRange === "year") startDate.setFullYear(startDate.getFullYear() - 1);
      
      const filteredOrders = orders.filter(o => new Date(o.created_at) >= startDate);
      const filteredOrderIds = filteredOrders.map(o => o.id);
      const filteredItems = orderItems.filter(item => filteredOrderIds.includes(item.order_id));
      
      const monthlySales = filteredOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      
      // Calculate profit for filtered period
      const monthlyProfit = filteredItems.reduce((sum, item) => {
        const costPrice = item.products?.cost_price || item.price * 0.7;
        const profit = (item.price - costPrice) * item.quantity;
        return sum + profit;
      }, 0);

      // Total revenue and profit (all time)
      const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      const totalProfit = orderItems.reduce((sum, item) => {
        const costPrice = item.products?.cost_price || item.price * 0.7;
        const profit = (item.price - costPrice) * item.quantity;
        return sum + profit;
      }, 0);

      // Average profit margin
      const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Calculate top products by profit
      const productProfitMap = new Map();
      orderItems.forEach(item => {
        const productId = item.product_id;
        const productName = item.products?.name || 'Unknown';
        const costPrice = item.products?.cost_price || item.price * 0.7;
        const profit = (item.price - costPrice) * item.quantity;
        
        if (!productProfitMap.has(productId)) {
          productProfitMap.set(productId, {
            id: productId,
            name: productName,
            totalProfit: 0,
            totalRevenue: 0,
            quantity: 0
          });
        }
        
        const product = productProfitMap.get(productId);
        product.totalProfit += profit;
        product.totalRevenue += item.price * item.quantity;
        product.quantity += item.quantity;
      });

      const topProfitProducts = Array.from(productProfitMap.values())
        .sort((a, b) => b.totalProfit - a.totalProfit)
        .slice(0, 5)
        .map(p => ({
          ...p,
          margin: p.totalRevenue > 0 ? (p.totalProfit / p.totalRevenue) * 100 : 0
        }));

      // Calculate top products by stock value
      const topProductsByValue = products
        .map(p => ({
          ...p,
          stock_value: (p.stock_quantity || 0) * (p.price || 0),
          potential_profit: (p.stock_quantity || 0) * ((p.price || 0) - (p.cost_price || p.price * 0.7))
        }))
        .sort((a, b) => b.stock_value - a.stock_value)
        .slice(0, 5);

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        todaySales,
        lowStock: lowStockCount,
        monthlySales,
        totalRevenue,
        totalProfit,
        todayProfit,
        monthlyProfit,
        averageProfitMargin: avgMargin,
        topProfitProducts
      });

      setRecentOrders(orders.slice(0, 5));
      setTopProducts(topProductsByValue);
      setProfitLeaders(topProfitProducts);
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load some dashboard data");
    } finally {
      setLoading(false);
    }
  }, [dateRange]); // Add dateRange as dependency

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]); // Now includes fetchDashboardData in dependencies

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setAuth({ isAuthenticated: false, user: null });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
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
          to: "/categories",
          title: "Categories",
          description: "Manage product categories",
          icon: "🏷️",
          primary: false
        },
        {
          to: "/inventory",
          title: "Inventory",
          description: "Stock levels & costs",
          icon: "📊",
          primary: false
        },
        {
          to: "/orders",
          title: "Orders",
          description: "View history & profits",
          icon: "🛒",
          primary: false
        },
        {
          to: "/reports",
          title: "Reports",
          description: "Profit & sales analysis",
          icon: "📈",
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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
          <h1>{getGreeting()}, {auth.user?.name || 'User'}!</h1>
          <p className="welcome-text">
            {auth.user?.role === 'admin' 
              ? "Here's what's happening with your store today." 
              : "Ready to process your next sale?"}
          </p>
        </div>
        <div className="header-right">
          <div className="date-range-selector">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="date-range-select"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <div className="user-profile">
            <div className="profile-info">
              <span className="profile-name">{auth.user?.name || 'User'}</span>
              <span className="profile-role">{auth.user?.role || 'staff'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="error-message" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Key Metrics */}
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
            <div className="stat-card profit-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Today's Sales</h3>
                <p className="stat-number">{formatCurrency(stats.todaySales)}</p>
                <small className="profit-indicator">
                  Profit: {formatCurrency(stats.todayProfit)}
                </small>
              </div>
            </div>
            
            <div className="stat-card profit-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>Period Sales</h3>
                <p className="stat-number">{formatCurrency(stats.monthlySales)}</p>
                <small className="profit-indicator">
                  Profit: {formatCurrency(stats.monthlyProfit)}
                </small>
              </div>
            </div>
          </>
        )}
        
        {auth.user?.role === 'admin' && (
          <div className="stat-card profit-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>Avg. Margin</h3>
              <p className="stat-number">{stats.averageProfitMargin.toFixed(1)}%</p>
              <small className="profit-indicator">
                Total Profit: {formatCurrency(stats.totalProfit)}
              </small>
            </div>
          </div>
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

      {/* Quick Actions */}
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
        <>
          {/* Profit Leaders Section */}
          <div className="profit-leaders-section">
            <div className="section-header">
              <h2>Top Profit Generators</h2>
              <Link to="/reports" className="view-all">View Full Report →</Link>
            </div>
            <div className="profit-leaders-grid">
              {profitLeaders.length > 0 ? (
                profitLeaders.map((product, index) => (
                  <div key={product.id} className="profit-leader-card">
                    <div className="leader-rank">#{index + 1}</div>
                    <div className="leader-info">
                      <h4>{product.name}</h4>
                      <div className="leader-stats">
                        <div className="stat">
                          <span>Profit</span>
                          <strong>{formatCurrency(product.totalProfit)}</strong>
                        </div>
                        <div className="stat">
                          <span>Margin</span>
                          <strong>{product.margin.toFixed(1)}%</strong>
                        </div>
                        <div className="stat">
                          <span>Sold</span>
                          <strong>{product.quantity} units</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">No profit data available</div>
              )}
            </div>
          </div>

          <div className="bottom-content-row">
            {/* Recent Orders */}
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
                      <th>Profit</th>
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
                          <td className="amount">{formatCurrency(parseFloat(order.total_amount || 0))}</td>
                          <td className="profit-amount">
                            {formatCurrency(order.profit || order.total_amount * 0.3)}
                          </td>
                          <td>
                            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </td>
                          <td>
                            <span className="status completed">Completed</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="no-data">
                          No orders yet. Start selling!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Products by Value */}
            <div className="top-products">
              <div className="section-header">
                <h2>Inventory Value</h2>
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
                        <div>Stock: <strong>{product.stock_quantity || 0}</strong></div>
                        <div>Value: <strong>{formatCurrency(product.stock_value)}</strong></div>
                        <div className="potential-profit">
                          Potential Profit: {formatCurrency(product.potential_profit)}
                        </div>
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
        </>
      )}
    </div>
  );
};

export default Dashboard;