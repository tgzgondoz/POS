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
  
  // Report state
  const [showReports, setShowReports] = useState(false);
  const [reportType, setReportType] = useState("sales");
  const [reportData, setReportData] = useState([]);
  const [reportSummary, setReportSummary] = useState({});
  const [reportLoading, setReportLoading] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
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

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
      }

      // Calculate statistics with profit
      const lowStockCount = products.filter(p => p.stock_quantity < 10).length;
      
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.created_at?.includes(today));
      const todaySales = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      
      // Calculate today's profit
      const todayOrderIds = todayOrders.map(o => o.id);
      const todayItems = (orderItems || []).filter(item => todayOrderIds.includes(item.order_id));
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
      const filteredItems = (orderItems || []).filter(item => filteredOrderIds.includes(item.order_id));
      
      const monthlySales = filteredOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      
      // Calculate profit for filtered period
      const monthlyProfit = filteredItems.reduce((sum, item) => {
        const costPrice = item.products?.cost_price || item.price * 0.7;
        const profit = (item.price - costPrice) * item.quantity;
        return sum + profit;
      }, 0);

      // Total revenue and profit (all time)
      const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      const totalProfit = (orderItems || []).reduce((sum, item) => {
        const costPrice = item.products?.cost_price || item.price * 0.7;
        const profit = (item.price - costPrice) * item.quantity;
        return sum + profit;
      }, 0);

      // Average profit margin
      const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Calculate top products by profit
      const productProfitMap = new Map();
      (orderItems || []).forEach(item => {
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
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Report Functions
  const getDateRangeForReport = () => {
    const end = new Date();
    let start = new Date();

    switch (dateRange) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
      case "quarter":
        start.setMonth(start.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          start = new Date(customStartDate);
          end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
      default:
        break;
    }

    return { start, end };
  };

  const fetchSalesReport = async (start, end) => {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:user_id (name)
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedOrders = orders.map(order => ({
      ...order,
      user_name: order.users?.name,
      total_amount: parseFloat(order.total_amount),
      profit_amount: parseFloat(order.profit_amount) || order.total_amount * 0.3
    }));

    const totalSales = formattedOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalProfit = formattedOrders.reduce((sum, o) => sum + o.profit_amount, 0);
    const avgOrderValue = formattedOrders.length > 0 ? totalSales / formattedOrders.length : 0;

    setReportData(formattedOrders);
    setReportSummary({
      totalOrders: formattedOrders.length,
      totalSales,
      totalProfit,
      avgOrderValue,
      profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0
    });
  };

  const fetchProductsReport = async (start, end) => {
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        *,
        products:product_id (name, category_id, categories (name)),
        orders!inner (created_at)
      `)
      .gte('orders.created_at', start.toISOString())
      .lte('orders.created_at', end.toISOString());

    if (error) throw error;

    const productMap = new Map();
    orderItems.forEach(item => {
      const productId = item.product_id;
      const productName = item.products?.name;
      const categoryName = item.products?.categories?.name;
      
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: productId,
          name: productName,
          category: categoryName,
          quantity: 0,
          revenue: 0,
          profit: 0,
          cost: 0
        });
      }
      
      const product = productMap.get(productId);
      product.quantity += item.quantity;
      product.revenue += item.price * item.quantity;
      product.profit += (item.price - item.cost_price) * item.quantity;
      product.cost += item.cost_price * item.quantity;
    });

    const products = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    const totalProfit = products.reduce((sum, p) => sum + p.profit, 0);

    setReportData(products);
    setReportSummary({
      totalProducts: products.length,
      totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0),
      totalRevenue,
      totalProfit,
      avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    });
  };

  const fetchCategoriesReport = async (start, end) => {
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        *,
        products:product_id (
          categories:category_id (id, name)
        ),
        orders!inner (created_at)
      `)
      .gte('orders.created_at', start.toISOString())
      .lte('orders.created_at', end.toISOString());

    if (error) throw error;

    const categoryMap = new Map();
    orderItems.forEach(item => {
      const categoryId = item.products?.categories?.id || 'uncategorized';
      const categoryName = item.products?.categories?.name || 'Uncategorized';
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          quantity: 0,
          revenue: 0,
          profit: 0,
          productCount: new Set()
        });
      }
      
      const category = categoryMap.get(categoryId);
      category.quantity += item.quantity;
      category.revenue += item.price * item.quantity;
      category.profit += (item.price - item.cost_price) * item.quantity;
      category.productCount.add(item.product_id);
    });

    const categories = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      productCount: cat.productCount.size
    }));

    const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);
    const totalProfit = categories.reduce((sum, c) => sum + c.profit, 0);

    setReportData(categories);
    setReportSummary({
      totalCategories: categories.length,
      totalRevenue,
      totalProfit,
      avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    });
  };

  const fetchProfitReport = async (start, end) => {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:user_id (name)
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const dailyProfit = {};
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString();
      if (!dailyProfit[date]) {
        dailyProfit[date] = {
          date,
          revenue: 0,
          profit: 0,
          orders: 0
        };
      }
      dailyProfit[date].revenue += parseFloat(order.total_amount);
      dailyProfit[date].profit += parseFloat(order.profit_amount) || order.total_amount * 0.3;
      dailyProfit[date].orders += 1;
    });

    const profitData = Object.values(dailyProfit).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    const totalRevenue = profitData.reduce((sum, d) => sum + d.revenue, 0);
    const totalProfit = profitData.reduce((sum, d) => sum + d.profit, 0);
    const totalOrders = profitData.reduce((sum, d) => sum + d.orders, 0);

    setReportData(profitData);
    setReportSummary({
      totalOrders,
      totalRevenue,
      totalProfit,
      avgDailyProfit: profitData.length > 0 ? totalProfit / profitData.length : 0,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    });
  };

  const fetchStaffReport = async (start, end) => {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:user_id (name, role)
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (error) throw error;

    const staffMap = new Map();
    orders.forEach(order => {
      const userId = order.user_id;
      const userName = order.users?.name || 'Unknown';
      
      if (!staffMap.has(userId)) {
        staffMap.set(userId, {
          id: userId,
          name: userName,
          role: order.users?.role,
          orders: 0,
          revenue: 0,
          profit: 0
        });
      }
      
      const staff = staffMap.get(userId);
      staff.orders += 1;
      staff.revenue += parseFloat(order.total_amount);
      staff.profit += parseFloat(order.profit_amount) || order.total_amount * 0.3;
    });

    const staffData = Array.from(staffMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = staffData.reduce((sum, s) => sum + s.revenue, 0);
    const totalProfit = staffData.reduce((sum, s) => sum + s.profit, 0);
    const totalOrders = staffData.reduce((sum, s) => sum + s.orders, 0);

    setReportData(staffData);
    setReportSummary({
      totalStaff: staffData.length,
      totalOrders,
      totalRevenue,
      totalProfit,
      avgPerStaff: staffData.length > 0 ? totalRevenue / staffData.length : 0
    });
  };

  const generateReport = async () => {
    setReportLoading(true);
    setError("");

    try {
      const { start, end } = getDateRangeForReport();

      switch (reportType) {
        case "sales":
          await fetchSalesReport(start, end);
          break;
        case "products":
          await fetchProductsReport(start, end);
          break;
        case "categories":
          await fetchCategoriesReport(start, end);
          break;
        case "profit":
          await fetchProfitReport(start, end);
          break;
        case "staff":
          await fetchStaffReport(start, end);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error generating report:", error);
      setError("Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = Object.keys(reportData[0]).filter(key => 
      !['id', 'users', 'products', 'categories'].includes(key)
    );
    
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
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
          <button onClick={() => setError("")}>×</button>
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
          {auth.user?.role === 'admin' && (
            <button
              onClick={() => setShowReports(!showReports)}
              className={`action-card ${showReports ? 'active' : ''}`}
              style={{ background: showReports ? '#4299e1' : '#f7fafc', cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <div className="action-icon">📊</div>
              <div className="action-content">
                <h3>{showReports ? 'Hide Reports' : 'Show Reports'}</h3>
                <p>Generate business reports</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Reports Section */}
      {auth.user?.role === 'admin' && showReports && (
        <div className="reports-section">
          <div className="reports-header">
            <h2>Reports & Analytics</h2>
            <div className="reports-controls">
              <button 
                className="export-btn"
                onClick={exportToCSV}
                disabled={reportData.length === 0 || reportLoading}
              >
                📥 Export CSV
              </button>
              <button 
                className="generate-btn"
                onClick={generateReport}
                disabled={reportLoading}
              >
                {reportLoading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          <div className="report-controls">
            <div className="control-group">
              <label>Report Type</label>
              <select 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
                className="report-select"
                disabled={reportLoading}
              >
                <option value="sales">Sales Report</option>
                <option value="products">Product Performance</option>
                <option value="categories">Category Analysis</option>
                <option value="profit">Profit Analysis</option>
                <option value="staff">Staff Performance</option>
              </select>
            </div>

            <div className="control-group">
              <label>Date Range</label>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="date-select"
                disabled={reportLoading}
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 90 Days</option>
                <option value="year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="custom-date-range">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="date-input"
                  disabled={reportLoading}
                />
                <span>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="date-input"
                  disabled={reportLoading}
                />
              </div>
            )}
          </div>

          {/* Report Summary Cards */}
          {Object.keys(reportSummary).length > 0 && (
            <div className="report-summary">
              {Object.entries(reportSummary).map(([key, value]) => (
                <div key={key} className="summary-card">
                  <h3>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h3>
                  <p className="summary-value">
                    {typeof value === 'number' 
                      ? key.includes('Margin') || key.includes('Percent')
                        ? formatPercent(value)
                        : key.includes('Revenue') || key.includes('Sales') || key.includes('Profit') || key.includes('Value')
                          ? formatCurrency(value)
                          : formatNumber(value)
                      : value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Report Data Table */}
          {reportLoading ? (
            <div className="report-loading">
              <div className="spinner"></div>
              <p>Generating report...</p>
            </div>
          ) : reportData.length > 0 ? (
            <div className="report-table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    {Object.keys(reportData[0])
                      .filter(key => !['id', 'users', 'products', 'categories'].includes(key))
                      .map(key => (
                        <th key={key}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index}>
                      {Object.entries(row)
                        .filter(([key]) => !['id', 'users', 'products', 'categories'].includes(key))
                        .map(([key, value], i) => {
                          let displayValue = value;
                          if (typeof value === 'number') {
                            if (key.includes('price') || key.includes('amount') || key.includes('revenue') || key.includes('profit') || key.includes('value') || key.includes('cost')) {
                              displayValue = formatCurrency(value);
                            } else if (key.includes('margin') || key.includes('percent')) {
                              displayValue = formatPercent(value);
                            } else {
                              displayValue = formatNumber(value);
                            }
                          }
                          
                          let cellClass = '';
                          if (key.includes('profit') || key.includes('margin')) {
                            cellClass = value >= 0 ? 'positive' : 'negative';
                          }
                          
                          return (
                            <td key={i} className={cellClass}>
                              {displayValue?.toString() || '-'}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">
              <p>Select report type and date range, then click Generate Report</p>
            </div>
          )}

          {reportData.length > 0 && (
            <div className="report-footer">
              <p>
                <strong>Report Period:</strong> {new Date(getDateRangeForReport().start).toLocaleDateString()} - {new Date(getDateRangeForReport().end).toLocaleDateString()}
              </p>
              <p>
                <strong>Total Records:</strong> {reportData.length}
              </p>
            </div>
          )}
        </div>
      )}

      {auth.user?.role === 'admin' && (
        <>
          {/* Profit Leaders Section */}
          <div className="profit-leaders-section">
            <div className="section-header">
              <h2>Top Profit Generators</h2>
              <button 
                onClick={() => {
                  setShowReports(true);
                  setReportType("products");
                  generateReport();
                }} 
                className="view-all"
              >
                View Full Report →
              </button>
            </div>
            <div className="profit-leaders-grid">
              {profitLeaders.length > 0 ? (
                profitLeaders.map((product, index) => (
                  <div key={product.id || index} className="profit-leader-card">
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
                <button 
                  onClick={() => {
                    setShowReports(true);
                    setReportType("sales");
                    generateReport();
                  }} 
                  className="view-all"
                >
                  View All →
                </button>
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
                <button 
                  onClick={() => {
                    setShowReports(true);
                    setReportType("products");
                    generateReport();
                  }} 
                  className="view-all"
                >
                  View Inventory →
                </button>
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