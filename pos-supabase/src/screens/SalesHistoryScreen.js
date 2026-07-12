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
  StatusBar
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

  const renderSaleItem = ({ item }) => {
    const profit = item.items?.reduce((sum, i) => sum + ((i.sellPrice - i.buyPrice) * i.quantity), 0) || 0;
    
    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => setSelectedSale(item)}
        activeOpacity={0.7}
      >
        <View style={styles.saleHeader}>
          <View style={styles.saleIdContainer}>
            <Icon name="receipt-outline" size={12} color="#0b1e1c" />
            <Text style={styles.saleId}>#{item.id?.slice(-8)}</Text>
          </View>
          <View style={styles.saleDateContainer}>
            <Icon name="time-outline" size={10} color="#0b1e1c" />
            <Text style={styles.saleDate}>{moment(item.timestamp).format('MM/DD/YY h:mm A')}</Text>
          </View>
        </View>
        
        <View style={styles.customerContainer}>
          <Icon name="person-outline" size={12} color="#0b1e1c" />
          <Text style={styles.saleCustomer}>{item.customerName || 'Walk-in Customer'}</Text>
        </View>
        
        <View style={styles.saleFooter}>
          <View>
            <Text style={styles.saleTotal}>{formatCurrency(item.total)}</Text>
            <View style={styles.profitContainer}>
              <Icon name="trending-up" size={10} color="#4caf50" />
              <Text style={styles.saleProfit}>Profit: +{formatCurrency(profit)}</Text>
            </View>
          </View>
          <View style={[
            styles.paymentBadge, 
            item.paymentMethod === 'cash' && styles.cashBadge,
            item.paymentMethod === 'card' && styles.cardBadge,
            item.paymentMethod === 'mobile' && styles.mobileBadge
          ]}>
            <Icon 
              name={
                item.paymentMethod === 'cash' ? 'cash-outline' :
                item.paymentMethod === 'card' ? 'card-outline' :
                'phone-portrait-outline'
              } 
              size={10} 
              color="#fff" 
            />
            <Text style={styles.paymentText}>{item.paymentMethod?.toUpperCase()}</Text>
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
              <Icon name="receipt-outline" size={24} color="#fff" />
              <Text style={styles.modalTitle}>Sale Details</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedSale(null)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Icon name="pricetag-outline" size={14} color="#0b1e1c" />
                <Text style={styles.detailLabel}>Sale ID</Text>
              </View>
              <Text style={styles.detailValue}>{selectedSale?.id}</Text>
              
              <View style={styles.detailRow}>
                <Icon name="calendar-outline" size={14} color="#0b1e1c" />
                <Text style={styles.detailLabel}>Date & Time</Text>
              </View>
              <Text style={styles.detailValue}>{moment(selectedSale?.timestamp).format('MMMM Do YYYY, h:mm:ss a')}</Text>
              
              <View style={styles.detailRow}>
                <Icon name="person-outline" size={14} color="#0b1e1c" />
                <Text style={styles.detailLabel}>Customer</Text>
              </View>
              <Text style={styles.detailValue}>{selectedSale?.customerName || 'Walk-in Customer'}</Text>
              
              <View style={styles.detailRow}>
                <Icon name="card-outline" size={14} color="#0b1e1c" />
                <Text style={styles.detailLabel}>Payment Method</Text>
              </View>
              <Text style={styles.detailValue}>{selectedSale?.paymentMethod?.toUpperCase()}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <View style={styles.sectionHeader}>
                <Icon name="cube-outline" size={16} color="#0d5335" />
                <Text style={styles.sectionTitle}>Items</Text>
              </View>
              {selectedSale?.items?.map((item, index) => {
                const profit = (item.sellPrice - item.buyPrice) * item.quantity;
                return (
                  <View key={index} style={styles.detailItem}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <View style={styles.itemPriceContainer}>
                        <Icon name="cash-outline" size={10} color="#0b1e1c" />
                        <Text style={styles.itemPrice}>
                          {formatCurrency(item.sellPrice)} × {item.quantity}
                        </Text>
                      </View>
                      <View style={styles.itemProfitContainer}>
                        <Icon name="trending-up" size={10} color="#4caf50" />
                        <Text style={styles.itemProfit}>Profit: +{formatCurrency(profit)}</Text>
                      </View>
                    </View>
                    <Text style={styles.itemTotal}>{formatCurrency(item.subtotal || item.sellPrice * item.quantity)}</Text>
                  </View>
                );
              })}
            </View>
            
            <View style={styles.detailSection}>
              <View style={styles.totalDetailRow}>
                <Text style={styles.totalDetailLabel}>Subtotal</Text>
                <Text style={styles.totalDetailValue}>{formatCurrency(selectedSale?.subtotal)}</Text>
              </View>
              <View style={[styles.totalDetailRow, styles.grandTotalDetail]}>
                <Text style={styles.grandTotalDetailLabel}>Total</Text>
                <Text style={styles.grandTotalDetailValue}>{formatCurrency(selectedSale?.total)}</Text>
              </View>
              {selectedSale?.paymentMethod === 'cash' && (
                <>
                  <View style={styles.totalDetailRow}>
                    <Text style={styles.totalDetailLabel}>Amount Received</Text>
                    <Text style={styles.totalDetailValue}>{formatCurrency(selectedSale?.amountReceived)}</Text>
                  </View>
                  <View style={styles.totalDetailRow}>
                    <Text style={styles.totalDetailLabel}>Change</Text>
                    <Text style={[styles.totalDetailValue, styles.changeText]}>{formatCurrency(selectedSale?.change)}</Text>
                  </View>
                </>
              )}
              <View style={styles.totalProfitRow}>
                <View style={styles.totalProfitLabelContainer}>
                  <Icon name="trending-up" size={16} color="#4caf50" />
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
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <ActivityIndicator size="large" color="#0d5335" />
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.miniHeader}>
        <View style={styles.miniHeaderTitleContainer}>
          <Icon name="bar-chart-outline" size={28} color="#0e0b05" />
          <Text style={styles.miniHeaderTitle}>Sales</Text>
        </View>
        <View style={styles.miniHeaderDateContainer}>
          <Icon name="calendar-outline" size={12} color="#0b1e1c" />
          <Text style={styles.miniHeaderDate}>{moment().format('MMM DD, YYYY')}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statCard}>
          <Icon name="cash-outline" size={20} color="#0d5335" />
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="trending-up" size={20} color="#4caf50" />
          <Text style={[styles.statValue, styles.profitColor]}>{formatCurrency(totalProfit)}</Text>
          <Text style={styles.statLabel}>Profit</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="cart-outline" size={20} color="#0d5335" />
          <Text style={styles.statValue}>{totalTransactions}</Text>
          <Text style={styles.statLabel}>Sales</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="stats-chart-outline" size={20} color="#0d5335" />
          <Text style={styles.statValue}>{formatCurrency(averageOrder)}</Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
      </ScrollView>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'today' && styles.filterButtonActive]}
          onPress={() => setFilter('today')}
        >
          <Icon name="today-outline" size={12} color={filter === 'today' ? "#fff" : "#0b1e1c"} />
          <Text style={[styles.filterText, filter === 'today' && styles.filterTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'week' && styles.filterButtonActive]}
          onPress={() => setFilter('week')}
        >
          <Icon name="calendar-outline" size={12} color={filter === 'week' ? "#fff" : "#0b1e1c"} />
          <Text style={[styles.filterText, filter === 'week' && styles.filterTextActive]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'month' && styles.filterButtonActive]}
          onPress={() => setFilter('month')}
        >
          <Icon name="calendar-number-outline" size={12} color={filter === 'month' ? "#fff" : "#0b1e1c"} />
          <Text style={[styles.filterText, filter === 'month' && styles.filterTextActive]}>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Icon name="list-outline" size={12} color={filter === 'all' ? "#fff" : "#0b1e1c"} />
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredSales}
        renderItem={renderSaleItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadSales} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt-outline" size={64} color="#0b1e1c" />
            <Text style={styles.emptyText}>No sales found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'today' ? 'No sales today' : 
               filter === 'week' ? 'No sales this week' :
               filter === 'month' ? 'No sales this month' : 
               'Start selling to see records'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {renderSaleDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#0b1e1c',
  },
  miniHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniHeaderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  miniHeaderDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniHeaderDate: {
    fontSize: 12,
    color: '#0b1e1c',
  },
  statsScroll: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statCard: {
    marginHorizontal: 4,
    minWidth: 80,
    alignItems: 'center',
    padding: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0e0b05',
    marginTop: 6,
    marginBottom: 2,
  },
  profitColor: {
    color: '#4caf50',
  },
  statLabel: {
    fontSize: 10,
    color: '#0b1e1c',
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#0d5335',
  },
  filterText: {
    color: '#0b1e1c',
    fontSize: 12,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  topProductBanner: {
    backgroundColor: '#0d533510',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0d533530',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  topProductText: {
    fontSize: 12,
    color: '#0d5335',
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 20,
  },
  saleCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
    gap: 4,
  },
  saleId: {
    fontSize: 11,
    color: '#0b1e1c',
  },
  saleDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saleDate: {
    fontSize: 10,
    color: '#999',
  },
  customerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  saleCustomer: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0e0b05',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleTotal: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0d5335',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  saleProfit: {
    fontSize: 10,
    color: '#4caf50',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cashBadge: {
    backgroundColor: '#4caf50',
  },
  cardBadge: {
    backgroundColor: '#0d5335',
  },
  mobileBadge: {
    backgroundColor: '#ff9800',
  },
  paymentText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0d5335',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: '#0b1e1c',
  },
  detailValue: {
    fontSize: 13,
    color: '#0e0b05',
    marginBottom: 10,
    marginLeft: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0e0b05',
  },
  itemPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 11,
    color: '#0b1e1c',
  },
  itemProfitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemProfit: {
    fontSize: 10,
    color: '#4caf50',
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0d5335',
  },
  totalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalDetailLabel: {
    fontSize: 13,
    color: '#0b1e1c',
  },
  totalDetailValue: {
    fontSize: 13,
    color: '#0e0b05',
  },
  grandTotalDetail: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  grandTotalDetailLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  grandTotalDetailValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0d5335',
  },
  changeText: {
    color: '#4caf50',
  },
  totalProfitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  totalProfitLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalProfitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0e0b05',
  },
  totalProfitValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b1e1c',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SalesHistoryScreen;