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
  StatusBar
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
    if (quantity <= 0) return { label: 'Out of Stock', color: '#ff4444', icon: 'close-circle', bgColor: '#ff444420' };
    if (quantity < 10) return { label: 'Critical', color: '#ff8800', icon: 'alert-circle', bgColor: '#ff880020' };
    if (quantity < 50) return { label: 'Normal', color: '#0d5335', icon: 'checkmark-circle', bgColor: '#0d533520' };
    return { label: 'Good', color: '#4caf50', icon: 'checkmark-done-circle', bgColor: '#4caf5020' };
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
    const margin = costPrice > 0 ? ((profitPerUnit / costPrice) * 100).toFixed(1) : 0;
    
    Alert.alert(
      `${item.name}`,
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 PRODUCT INFORMATION\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔖 SKU: ${item.sku || 'N/A'}\n` +
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
    
    return (
      <TouchableOpacity 
        style={styles.inventoryItem}
        onPress={() => showProductDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeftSection}>
          <View style={[styles.statusIndicator, { backgroundColor: status.bgColor }]}>
            <Icon name={status.icon} size={16} color={status.color} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemMetaRow}>
              <Icon name="pricetag-outline" size={10} color="#999" />
              <Text style={styles.itemSku}>SKU: {item.sku || 'N/A'}</Text>
            </View>
            <View style={styles.itemMetaRow}>
              <Icon name="folder-outline" size={10} color="#999" />
              <Text style={styles.itemCategory}>{item.category || 'Uncategorized'}</Text>
            </View>
            <View style={styles.itemPriceRow}>
              <Icon name="cart-outline" size={10} color="#0b1e1c" />
              <Text style={styles.itemPriceInfo}>
                Cost: {formatCurrency(costPrice)} | Sell: {formatCurrency(sellPrice)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.itemStatus}>
          <View style={styles.quantityContainer}>
            <Icon name="cube-outline" size={12} color={status.color} />
            <Text style={[styles.itemQuantity, { color: status.color }]}>
              {item.quantity || 0} units
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Icon name={status.icon} size={10} color={status.color} />
            <Text style={[styles.itemStatusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <View style={styles.valueContainer}>
            <Icon name="cash-outline" size={10} color="#666" />
            <Text style={styles.itemValue}>
              Value: {formatCurrency(itemValue)}
            </Text>
          </View>
          <View style={styles.profitContainer}>
            <Icon name="trending-up" size={10} color="#4caf50" />
            <Text style={styles.itemProfit}>
              Profit: {formatCurrency(itemProfit)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <ActivityIndicator size="large" color="#0d5335" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  const needsAttention = products.filter(p => p.quantity < 20).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statCard}>
          <Icon name="cube-outline" size={20} color="#0d5335" />
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="cash-outline" size={20} color="#0d5335" />
          <Text style={styles.statValue}>{formatCurrency(stats.totalValue)}</Text>
          <Text style={styles.statLabel}>Inventory Value</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="card-outline" size={20} color="#0d5335" />
          <Text style={styles.statValue}>{formatCurrency(stats.totalRetailValue)}</Text>
          <Text style={styles.statLabel}>Retail Value</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="trending-up" size={20} color="#4caf50" />
          <Text style={[styles.statValue, styles.success]}>{formatCurrency(stats.totalProfit)}</Text>
          <Text style={styles.statLabel}>Potential Profit</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="alert-circle-outline" size={20} color="#ff8800" />
          <Text style={[styles.statValue, styles.warning]}>{stats.lowStockItems}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="close-circle-outline" size={20} color="#ff4444" />
          <Text style={[styles.statValue, styles.danger]}>{stats.outOfStock}</Text>
          <Text style={styles.statLabel}>Out of Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="checkmark-done-circle-outline" size={20} color="#4caf50" />
          <Text style={[styles.statValue, styles.success]}>{stats.highStockItems}</Text>
          <Text style={styles.statLabel}>Well Stocked</Text>
        </View>
      </ScrollView>

      <FlatList
        data={products.sort((a, b) => (a.quantity || 0) - (b.quantity || 0))}
        keyExtractor={(item) => item.id}
        renderItem={renderInventoryItem}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <Icon name="list-outline" size={20} color="#0d5335" />
              <View>
                <Text style={styles.listHeaderTitle}>Inventory List</Text>
                <Text style={styles.listHeaderSubtitle}>
                  {needsAttention} items need attention
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={loadProducts}>
              <Icon name="refresh-outline" size={18} color="#0b1e1c" />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cube-outline" size={64} color="#0b1e1c" />
            <Text style={styles.emptyText}>No products in inventory</Text>
            <Text style={styles.emptySubtext}>Add products to see them here</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
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
  statsScroll: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statCard: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0e0b05',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#0b1e1c',
    fontWeight: '500',
  },
  warning: {
    color: '#ff8800',
  },
  danger: {
    color: '#ff4444',
  },
  success: {
    color: '#4caf50',
  },
  listContainer: {
    paddingBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  listHeaderSubtitle: {
    fontSize: 11,
    color: '#0b1e1c',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  inventoryItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    color: '#0e0b05',
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  itemSku: {
    fontSize: 11,
    color: '#999',
  },
  itemCategory: {
    fontSize: 11,
    color: '#0d5335',
    fontWeight: '500',
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemPriceInfo: {
    fontSize: 10,
    color: '#0b1e1c',
  },
  itemStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemQuantity: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontSize: 10,
    color: '#666',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemProfit: {
    fontSize: 10,
    color: '#4caf50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b1e1c',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
});

export default InventoryScreen;