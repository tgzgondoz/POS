import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProductService from '../services/ProductService';

const InventoryScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    totalRetailValue: 0,
    totalProfit: 0,
    lowStockItems: 0,
    outOfStock: 0,
    highStockItems: 0
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    ProductService.getProducts((productsList) => {
      setProducts(productsList);
      calculateStats(productsList);
      setLoading(false);
    });
  };

  const calculateStats = (productsList) => {
    const totalProducts = productsList.length;
    
    const totalValue = productsList.reduce((sum, p) => {
      const quantity = p.quantity || 0;
      const cost = p.buyPrice || p.cost || 0;
      return sum + (quantity * cost);
    }, 0);
    
    const totalRetailValue = productsList.reduce((sum, p) => {
      const quantity = p.quantity || 0;
      const sellPrice = p.sellPrice || 0;
      return sum + (quantity * sellPrice);
    }, 0);
    
    const totalProfit = totalRetailValue - totalValue;
    
    const lowStockItems = productsList.filter(p => p.quantity < 10 && p.quantity > 0).length;
    const outOfStock = productsList.filter(p => p.quantity === 0).length;
    const highStockItems = productsList.filter(p => p.quantity >= 50).length;
    
    setStats({ 
      totalProducts, 
      totalValue, 
      totalRetailValue, 
      totalProfit, 
      lowStockItems, 
      outOfStock, 
      highStockItems 
    });
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: '#EF4444', icon: 'close-circle', bgColor: '#EF444415' };
    if (quantity < 10) return { label: 'Critical', color: '#F59E0B', icon: 'alert-circle', bgColor: '#F59E0B15' };
    if (quantity < 50) return { label: 'Normal', color: '#3B82F6', icon: 'checkmark-circle', bgColor: '#3B82F615' };
    return { label: 'Well Stocked', color: '#10B981', icon: 'checkmark-done-circle', bgColor: '#10B98115' };
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const showProductDetails = (item) => {
    const costPrice = item.buyPrice || item.cost || 0;
    const sellPrice = item.sellPrice || 0;
    const profitPerUnit = sellPrice - costPrice;
    const totalValue = (item.quantity || 0) * costPrice;
    const totalProfit = (item.quantity || 0) * profitPerUnit;
    const status = getStockStatus(item.quantity);
    const margin = sellPrice > 0 ? ((profitPerUnit / sellPrice) * 100).toFixed(1) : 0;
    
    Alert.alert(
      `${item.name}`,
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 PRODUCT DETAILS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📝 Description: ${item.sku || 'No description'}\n` +
      `📂 Category: ${item.category || 'Uncategorized'}\n` +
      `📊 Status: ${status.label}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 PRICING\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💵 Cost Price: ${formatCurrency(costPrice)}\n` +
      `💲 Selling Price: ${formatCurrency(sellPrice)}\n` +
      `📈 Profit/Unit: ${formatCurrency(profitPerUnit)}\n` +
      `📊 Margin: ${margin}%\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 INVENTORY\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔢 Quantity: ${item.quantity || 0} units\n` +
      `💎 Total Value: ${formatCurrency(totalValue)}\n` +
      `🎯 Potential Revenue: ${formatCurrency((item.quantity || 0) * sellPrice)}\n` +
      `🏆 Potential Profit: ${formatCurrency(totalProfit)}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 Created: ${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}\n` +
      `🔄 Updated: ${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}`,
      [
        { text: 'Close', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  const renderInventoryItem = ({ item }) => {
    const status = getStockStatus(item.quantity);
    const costPrice = item.buyPrice || item.cost || 0;
    const sellPrice = item.sellPrice || 0;
    const itemValue = (item.quantity || 0) * costPrice;
    const itemProfit = (item.quantity || 0) * (sellPrice - costPrice);
    const description = item.sku || 'No description';
    
    return (
      <TouchableOpacity 
        style={styles.inventoryItem}
        onPress={() => showProductDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeftSection}>
          <View style={[styles.statusIndicator, { backgroundColor: status.bgColor }]}>
            <Icon name={status.icon} size={18} color={status.color} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemMetaRow}>
              <Icon name="document-text-outline" size={12} color="#9CA3AF" />
              <Text style={styles.itemDescription} numberOfLines={1}>
                {description}
              </Text>
            </View>
            <View style={styles.itemMetaRow}>
              <Icon name="folder-outline" size={12} color="#9CA3AF" />
              <Text style={styles.itemCategory}>{item.category || 'Uncategorized'}</Text>
            </View>
            <View style={styles.itemPriceRow}>
              <Icon name="cart-outline" size={12} color="#6B7280" />
              <Text style={styles.itemPriceInfo}>
                Cost: {formatCurrency(costPrice)} | Sell: {formatCurrency(sellPrice)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.itemStatus}>
          <View style={styles.quantityContainer}>
            <Icon name="layers-outline" size={14} color={status.color} />
            <Text style={[styles.itemQuantity, { color: status.color }]}>
              {item.quantity || 0}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Icon name={status.icon} size={10} color={status.color} />
            <Text style={[styles.itemStatusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <View style={styles.valueContainer}>
            <Icon name="cash-outline" size={12} color="#6B7280" />
            <Text style={styles.itemValue}>
              {formatCurrency(itemValue)}
            </Text>
          </View>
          <View style={styles.profitContainer}>
            <Icon name="trending-up" size={12} color="#10B981" />
            <Text style={styles.itemProfit}>
              +{formatCurrency(itemProfit)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <ActivityIndicator size="large" color="#B90D0B" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  const needsAttention = products.filter(p => p.quantity < 20).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Inventory</Text>
            <Text style={styles.headerSubtitle}>
              {stats.totalProducts} products in stock
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={loadProducts}>
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
            <View style={[styles.statIconContainer, styles.primaryIcon]}>
              <Icon name="cube-outline" size={20} color="#B90D0B" />
            </View>
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.primaryIcon]}>
              <Icon name="cash-outline" size={20} color="#B90D0B" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(stats.totalValue)}</Text>
            <Text style={styles.statLabel}>Inventory Value</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.successIcon]}>
              <Icon name="trending-up" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statValue, styles.successText]}>
              {formatCurrency(stats.totalProfit)}
            </Text>
            <Text style={styles.statLabel}>Potential Profit</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.warningIcon]}>
              <Icon name="alert-circle-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, styles.warningText]}>{stats.lowStockItems}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.dangerIcon]}>
              <Icon name="close-circle-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, styles.dangerText]}>{stats.outOfStock}</Text>
            <Text style={styles.statLabel}>Out of Stock</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.successIcon]}>
              <Icon name="checkmark-done-circle-outline" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statValue, styles.successText]}>{stats.highStockItems}</Text>
            <Text style={styles.statLabel}>Well Stocked</Text>
          </View>
        </ScrollView>

        {/* Inventory List */}
        <FlatList
          data={products.sort((a, b) => (a.quantity || 0) - (b.quantity || 0))}
          keyExtractor={(item) => item.id}
          renderItem={renderInventoryItem}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.listHeaderLeft}>
                <Icon name="list-outline" size={20} color="#B90D0B" />
                <View>
                  <Text style={styles.listHeaderTitle}>Inventory List</Text>
                  <Text style={styles.listHeaderSubtitle}>
                    {needsAttention > 0 ? `${needsAttention} items need attention` : 'All items are well stocked'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.headerActionButton} onPress={loadProducts}>
                <Icon name="refresh-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="cube-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyText}>No products in inventory</Text>
              <Text style={styles.emptySubtext}>Add products to see them here</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
  refreshButton: {
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
  primaryIcon: {
    backgroundColor: '#B90D0B10',
  },
  successIcon: {
    backgroundColor: '#10B98110',
  },
  warningIcon: {
    backgroundColor: '#F59E0B10',
  },
  dangerIcon: {
    backgroundColor: '#EF444410',
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
  successText: {
    color: '#10B981',
  },
  warningText: {
    color: '#F59E0B',
  },
  dangerText: {
    color: '#EF4444',
  },
  listContainer: {
    paddingBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  headerActionButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inventoryItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  itemLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  itemDescription: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  itemCategory: {
    fontSize: 11,
    color: '#B90D0B',
    fontWeight: '500',
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemPriceInfo: {
    fontSize: 11,
    color: '#6B7280',
  },
  itemStatus: {
    alignItems: 'flex-end',
    gap: 3,
    marginLeft: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  itemStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemValue: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemProfit: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
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
  },
});

export default InventoryScreen;