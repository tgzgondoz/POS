import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getDatabaseInstance, ref, onValue } from '../config/firebase';
import moment from 'moment';

const SalesHistoryScreen = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [filter, setFilter] = useState('today');

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = () => {
    const db = getDatabaseInstance();
    const salesRef = ref(db, 'sales');
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      const salesList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : [];
      setSales(salesList);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const getFilteredSales = () => {
    const now = moment();
    return sales.filter(sale => {
      const saleDate = moment(sale.timestamp);
      switch(filter) {
        case 'today':
          return saleDate.isSame(now, 'day');
        case 'week':
          return saleDate.isAfter(now.clone().subtract(7, 'days'));
        case 'month':
          return saleDate.isAfter(now.clone().subtract(30, 'days'));
        default:
          return true;
      }
    });
  };

  const getTotalRevenue = () => {
    return getFilteredSales().reduce((sum, sale) => sum + (sale.total || 0), 0);
  };

  const getTotalProfit = () => {
    return getFilteredSales().reduce((sum, sale) => {
      const saleProfit = sale.items?.reduce((itemSum, item) => {
        const profit = (item.sellPrice - item.buyPrice) * item.quantity;
        return itemSum + (profit || 0);
      }, 0);
      return sum + (saleProfit || 0);
    }, 0);
  };

  const getTotalTransactions = () => {
    return getFilteredSales().length;
  };

  const getAverageOrderValue = () => {
    const total = getTotalRevenue();
    const count = getTotalTransactions();
    return count > 0 ? total / count : 0;
  };

  const getTopProduct = () => {
    const productSales = {};
    getFilteredSales().forEach(sale => {
      sale.items?.forEach(item => {
        if (!productSales[item.name]) {
          productSales[item.name] = { quantity: 0, revenue: 0 };
        }
        productSales[item.name].quantity += item.quantity;
        productSales[item.name].revenue += item.subtotal || (item.sellPrice * item.quantity);
      });
    });
    
    let topProduct = null;
    let maxQuantity = 0;
    Object.entries(productSales).forEach(([name, data]) => {
      if (data.quantity > maxQuantity) {
        maxQuantity = data.quantity;
        topProduct = { name, ...data };
      }
    });
    return topProduct;
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const getPaymentMethodIcon = (method) => {
    switch(method) {
      case 'cash': return 'cash-outline';
      case 'card': return 'card-outline';
      case 'mobile': return 'phone-portrait-outline';
      default: return 'wallet-outline';
    }
  };

  const renderSaleItem = ({ item }) => {
    const profit = item.items?.reduce((sum, i) => sum + ((i.sellPrice - i.buyPrice) * i.quantity), 0) || 0;
    const itemCount = item.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
    
    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => setSelectedSale(item)}
        activeOpacity={0.7}
      >
        <View style={styles.saleHeader}>
          <View style={styles.saleIdContainer}>
            <Icon name="receipt-outline" size={14} color="#6B7280" />
            <Text style={styles.saleId}>#{item.id?.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={styles.saleDateContainer}>
            <Icon name="time-outline" size={12} color="#6B7280" />
            <Text style={styles.saleDate}>{moment(item.timestamp).format('MMM DD, h:mm A')}</Text>
          </View>
        </View>
        
        <View style={styles.saleMiddle}>
          <View style={styles.customerContainer}>
            <Icon name="person-outline" size={14} color="#6B7280" />
            <Text style={styles.saleCustomer}>{item.customerName || 'Walk-in Customer'}</Text>
          </View>
          <View style={styles.itemCountContainer}>
            <Icon name="cube-outline" size={12} color="#6B7280" />
            <Text style={styles.itemCount}>{itemCount} items</Text>
          </View>
        </View>
        
        <View style={styles.saleFooter}>
          <View style={styles.saleTotalContainer}>
            <Text style={styles.saleTotal}>{formatCurrency(item.total)}</Text>
            <View style={styles.profitContainer}>
              <Icon name="trending-up" size={12} color="#10B981" />
              <Text style={styles.saleProfit}>+{formatCurrency(profit)}</Text>
            </View>
          </View>
          <View style={[
            styles.paymentBadge,
            item.paymentMethod === 'cash' && styles.cashBadge,
            item.paymentMethod === 'card' && styles.cardBadge,
            item.paymentMethod === 'mobile' && styles.mobileBadge
          ]}>
            <Icon 
              name={getPaymentMethodIcon(item.paymentMethod)} 
              size={12} 
              color="#FFFFFF" 
            />
            <Text style={styles.paymentText}>
              {item.paymentMethod?.toUpperCase() || 'N/A'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSaleDetails = () => (
    <Modal
      visible={!!selectedSale}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setSelectedSale(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Icon name="receipt-outline" size={24} color="#FFFFFF" />
              <Text style={styles.modalTitle}>Sale Details</Text>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setSelectedSale(null)}
            >
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Sale Info */}
            <View style={styles.detailSection}>
              <View style={styles.detailItemRow}>
                <View style={styles.detailIconContainer}>
                  <Icon name="pricetag-outline" size={16} color="#B90D0B" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Sale ID</Text>
                  <Text style={styles.detailValue}>{selectedSale?.id}</Text>
                </View>
              </View>
              
              <View style={styles.detailItemRow}>
                <View style={styles.detailIconContainer}>
                  <Icon name="calendar-outline" size={16} color="#B90D0B" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>
                    {moment(selectedSale?.timestamp).format('MMMM Do YYYY, h:mm:ss a')}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailItemRow}>
                <View style={styles.detailIconContainer}>
                  <Icon name="person-outline" size={16} color="#B90D0B" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>
                    {selectedSale?.customerName || 'Walk-in Customer'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailItemRow}>
                <View style={styles.detailIconContainer}>
                  <Icon name="card-outline" size={16} color="#B90D0B" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>
                    {selectedSale?.paymentMethod?.toUpperCase() || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Items Section */}
            <View style={styles.detailSection}>
              <View style={styles.sectionHeader}>
                <Icon name="cube-outline" size={18} color="#B90D0B" />
                <Text style={styles.sectionTitle}>Items Purchased</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {selectedSale?.items?.length || 0}
                  </Text>
                </View>
              </View>
              
              {selectedSale?.items?.map((item, index) => {
                const profit = (item.sellPrice - item.buyPrice) * item.quantity;
                return (
                  <View key={index} style={styles.detailItem}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemPrice}>
                          {formatCurrency(item.sellPrice)} × {item.quantity}
                        </Text>
                        <View style={styles.itemProfitBadge}>
                          <Icon name="trending-up" size={10} color="#10B981" />
                          <Text style={styles.itemProfitText}>+{formatCurrency(profit)}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatCurrency(item.subtotal || item.sellPrice * item.quantity)}
                    </Text>
                  </View>
                );
              })}
            </View>
            
            {/* Totals Section */}
            <View style={[styles.detailSection, styles.totalsSection]}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(selectedSale?.subtotal)}</Text>
              </View>
              
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(selectedSale?.total)}</Text>
              </View>
              
              {selectedSale?.paymentMethod === 'cash' && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Amount Received</Text>
                    <Text style={styles.totalValue}>{formatCurrency(selectedSale?.amountReceived)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Change</Text>
                    <Text style={[styles.totalValue, styles.changeText]}>
                      {formatCurrency(selectedSale?.change)}
                    </Text>
                  </View>
                </>
              )}
              
              <View style={styles.totalProfitRow}>
                <View style={styles.totalProfitLabelContainer}>
                  <Icon name="trending-up" size={18} color="#10B981" />
                  <Text style={styles.totalProfitLabel}>Total Profit</Text>
                </View>
                <Text style={styles.totalProfitValue}>
                  +{formatCurrency(selectedSale?.items?.reduce((sum, i) => sum + ((i.sellPrice - i.buyPrice) * i.quantity), 0))}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <ActivityIndicator size="large" color="#B90D0B" />
        <Text style={styles.loadingText}>Loading sales history...</Text>
      </View>
    );
  }

  const filteredSales = getFilteredSales();
  const totalRevenue = getTotalRevenue();
  const totalProfit = getTotalProfit();
  const totalTransactions = getTotalTransactions();
  const averageOrder = getAverageOrderValue();
  const topProduct = getTopProduct();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Sales History</Text>
            <Text style={styles.headerSubtitle}>
              {filteredSales.length} transactions • {formatCurrency(totalRevenue)} revenue
            </Text>
          </View>
          <TouchableOpacity style={styles.headerAction} onPress={loadSales}>
            <Icon name="refresh-outline" size={22} color="#B90D0B" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.statsScroll}
          contentContainerStyle={styles.statsScrollContent}
        >
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.revenueIcon]}>
              <Icon name="cash-outline" size={20} color="#B90D0B" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.profitIcon]}>
              <Icon name="trending-up" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statValue, styles.profitColor]}>{formatCurrency(totalProfit)}</Text>
            <Text style={styles.statLabel}>Profit</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.salesIcon]}>
              <Icon name="cart-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{totalTransactions}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.averageIcon]}>
              <Icon name="stats-chart-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(averageOrder)}</Text>
            <Text style={styles.statLabel}>Average Order</Text>
          </View>
        </ScrollView>

        {/* Top Product Banner */}
        {topProduct && (
          <View style={styles.topProductBanner}>
            <Icon name="star" size={16} color="#F59E0B" />
            <Text style={styles.topProductText}>
              Best Seller: <Text style={styles.topProductName}>{topProduct.name}</Text>
              {' '}({topProduct.quantity} units)
            </Text>
          </View>
        )}

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {['today', 'week', 'month', 'all'].map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterButton,
                filter === filterOption && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterOption)}
            >
              <Icon 
                name={
                  filterOption === 'today' ? 'today-outline' :
                  filterOption === 'week' ? 'calendar-outline' :
                  filterOption === 'month' ? 'calendar-number-outline' :
                  'list-outline'
                } 
                size={14} 
                color={filter === filterOption ? '#FFFFFF' : '#6B7280'} 
              />
              <Text style={[
                styles.filterText,
                filter === filterOption && styles.filterTextActive
              ]}>
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sales List */}
        <FlatList
          data={filteredSales}
          renderItem={renderSaleItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={loadSales}
              colors={['#B90D0B']}
              tintColor="#B90D0B"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="receipt-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyText}>No sales found</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'today' ? 'No sales recorded for today' : 
                 filter === 'week' ? 'No sales recorded this week' :
                 filter === 'month' ? 'No sales recorded this month' : 
                 'Start selling to see transaction history'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        {renderSaleDetails()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsScroll: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsScrollContent: {
    paddingHorizontal: 16,
  },
  statCard: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    minWidth: 80,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  revenueIcon: {
    backgroundColor: '#B90D0B10',
  },
  profitIcon: {
    backgroundColor: '#10B98110',
  },
  salesIcon: {
    backgroundColor: '#3B82F610',
  },
  averageIcon: {
    backgroundColor: '#8B5CF610',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  profitColor: {
    color: '#10B981',
  },
  topProductBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  topProductText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  topProductName: {
    fontWeight: '700',
    color: '#78350F',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#B90D0B',
    borderColor: '#B90D0B',
  },
  filterText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  saleCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saleId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  saleDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saleDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  saleMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saleCustomer: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  itemCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleTotalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B90D0B',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saleProfit: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cashBadge: {
    backgroundColor: '#10B981',
  },
  cardBadge: {
    backgroundColor: '#B90D0B',
  },
  mobileBadge: {
    backgroundColor: '#F59E0B',
  },
  paymentText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '92%',
    maxHeight: '88%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#B90D0B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailItemRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#B90D0B10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionBadge: {
    backgroundColor: '#B90D0B10',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    color: '#B90D0B',
    fontWeight: '600',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemProfitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98110',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemProfitText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B90D0B',
  },
  totalsSection: {
    borderBottomWidth: 0,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B90D0B',
  },
  changeText: {
    color: '#10B981',
  },
  totalProfitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalProfitLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalProfitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalProfitValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SalesHistoryScreen;