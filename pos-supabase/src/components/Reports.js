import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import "./Reports.css";

const Reports = ({ auth }) => {
  const [reportType, setReportType] = useState("sales");
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange, customStartDate, customEndDate]);

  const getDateRange = () => {
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

  const fetchReportData = async () => {
    setLoading(true);
    setError("");

    try {
      const { start, end } = getDateRange();

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
      console.error("Error fetching report:", error);
      setError("Failed to load report data");
    } finally {
      setLoading(false);
    }
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

    setData(formattedOrders);
    setSummary({
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

    setData(products);
    setSummary({
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

    setData(categories);
    setSummary({
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

    setData(profitData);
    setSummary({
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

    setData(staffData);
    setSummary({
      totalStaff: staffData.length,
      totalOrders,
      totalRevenue,
      totalProfit,
      avgPerStaff: staffData.length > 0 ? totalRevenue / staffData.length : 0
    });
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]).filter(key => 
      !['id', 'users', 'products', 'categories'].includes(key)
    );
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
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
      <div className="reports-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Reports & Analytics</h1>
        <button 
          className="export-btn"
          onClick={exportToCSV}
          disabled={data.length === 0}
        >
          📥 Export CSV
        </button>
      </div>

      <div className="report-controls">
        <div className="control-group">
          <label>Report Type</label>
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)}
            className="report-select"
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
            />
            <span>to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="date-input"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="report-summary">
        {Object.entries(summary).map(([key, value]) => (
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

      {/* Data Table */}
      <div className="report-table-container">
        <table className="report-table">
          <thead>
            <tr>
              {data.length > 0 && Object.keys(data[0])
                .filter(key => !['id', 'users', 'products', 'categories'].includes(key))
                .map(key => (
                  <th key={key}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="100%" className="no-data">
                  No data available for this period
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index}>
                  {Object.entries(row)
                    .filter(([key]) => !['id', 'users', 'products', 'categories'].includes(key))
                    .map(([key, value], i) => {
                      // Format the value based on key name
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
                      
                      // Add class for profit/loss
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      {data.length > 0 && (
        <div className="report-footer">
          <p>
            <strong>Report Period:</strong> {new Date(getDateRange().start).toLocaleDateString()} - {new Date(getDateRange().end).toLocaleDateString()}
          </p>
          <p>
            <strong>Total Records:</strong> {data.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;