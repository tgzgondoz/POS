import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProductService from '../services/ProductService';

const ProductDetailsScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const [transactions, setTransactions] = useState([]);
  const [restockModal, setRestockModal] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [currentProduct, setCurrentProduct] = useState(product);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    ProductService.getInventoryTransactions(product.id, (transactionsList) => {
      setTransactions(transactionsList);
    });
  };

  const handleRestock = async () => {
    if (!restockQuantity || isNaN(restockQuantity) || parseInt(restockQuantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      await ProductService.updateInventory(product.id, parseInt(restockQuantity), 'restock');
      Alert.alert('Success', 'Inventory updated successfully');
      setRestockModal(false);
      setRestockQuantity('');
      loadTransactions();
      setCurrentProduct({
        ...currentProduct,
        quantity: currentProduct.quantity + parseInt(restockQuantity)
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update inventory');
    }
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: '#EF4444' };
    if (quantity < 10) return { label: 'Low Stock', color: '#F59E0B' };
    if (quantity < 50) return { label: 'In Stock', color: '#10B981' };
    return { label: 'Well Stocked', color: '#059669' };
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const profit = (currentProduct.sellPrice || 0) - (currentProduct.buyPrice || 0);
  const margin = ((currentProduct.sellPrice || 0) - (currentProduct.buyPrice || 0)) / (currentProduct.sellPrice || 1) * 100;
  const status = getStockStatus(currentProduct.quantity);
  const statusColor = status.color;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#B90D0B" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Product Details</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Product Header Card */}
        <View style={styles.productHeaderCard}>
          <View style={styles.productIconContainer}>
            <Icon name="cube-outline" size={32} color="#B90D0B" />
          </View>
          <View style={styles.productHeaderInfo}>
            <Text style={styles.productName}>{currentProduct.name}</Text>
            <View style={styles.productMeta}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {status.label}
                </Text>
              </View>
              <Text style={styles.productCategory}>
                <Icon name="folder-outline" size={12} color="#6B7280" /> {currentProduct.category || 'Uncategorized'}
              </Text>
            </View>
          </View>
        </View>

        {/* Product Description Section */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text-outline" size={20} color="#B90D0B" />
            <Text style={styles.sectionTitle}>Product Description</Text>
          </View>
          <Text style={styles.descriptionText}>
            {currentProduct.sku || 'No description available'}
          </Text>
        </View>

        {/* Pricing Information */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Icon name="cash-outline" size={20} color="#B90D0B" />
            <Text style={styles.sectionTitle}>Pricing Information</Text>
          </View>
          
          <View style={styles.priceGrid}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Selling Price</Text>
              <Text style={styles.sellPrice}>{formatCurrency(currentProduct.sellPrice)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Cost Price</Text>
              <Text style={styles.costPrice}>{formatCurrency(currentProduct.buyPrice)}</Text>
            </View>
          </View>

          <View style={styles.profitMetrics}>
            <View style={styles.metricItem}>
              <Icon name="trending-up" size={16} color="#10B981" />
              <Text style={styles.metricLabel}>Profit/Unit</Text>
              <Text style={styles.metricValue}>{formatCurrency(profit)}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Icon name="pie-chart" size={16} color="#10B981" />
              <Text style={styles.metricLabel}>Margin</Text>
              <Text style={styles.metricValue}>{margin.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Inventory Information */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Icon name="layers-outline" size={20} color="#B90D0B" />
            <Text style={styles.sectionTitle}>Inventory Information</Text>
          </View>
          
          <View style={styles.inventoryGrid}>
            <View style={styles.inventoryItem}>
              <Text style={styles.inventoryLabel}>Current Stock</Text>
              <Text style={styles.inventoryValue}>{currentProduct.quantity || 0}</Text>
            </View>
            <View style={styles.inventoryItem}>
              <Text style={styles.inventoryLabel}>Total Value</Text>
              <Text style={styles.inventoryValue}>
                {formatCurrency((currentProduct.quantity || 0) * (currentProduct.buyPrice || 0))}
              </Text>
            </View>
          </View>
          
          <View style={styles.inventoryItem}>
            <Text style={styles.inventoryLabel}>Potential Revenue</Text>
            <Text style={[styles.inventoryValue, styles.revenueValue]}>
              {formatCurrency((currentProduct.quantity || 0) * (currentProduct.sellPrice || 0))}
            </Text>
          </View>

          {currentProduct.supplier && (
            <View style={styles.supplierInfo}>
              <Icon name="business-outline" size={14} color="#6B7280" />
              <Text style={styles.supplierText}>Supplier: {currentProduct.supplier}</Text>
            </View>
          )}
        </View>

        {/* Restock Button */}
        <TouchableOpacity
          style={styles.restockButton}
          onPress={() => setRestockModal(true)}
          activeOpacity={0.8}
        >
          <Icon name="add-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.restockButtonText}>Restock Product</Text>
        </TouchableOpacity>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.sectionHeader}>
              <Icon name="time-outline" size={20} color="#B90D0B" />
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>
            {transactions.slice(0, 5).map((transaction, index) => (
              <View key={index} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={[
                    styles.transactionIcon,
                    transaction.type === 'restock' ? styles.restockIcon : styles.saleIcon
                  ]}>
                    <Icon 
                      name={transaction.type === 'restock' ? "arrow-down" : "arrow-up"} 
                      size={14} 
                      color={transaction.type === 'restock' ? '#10B981' : '#EF4444'} 
                    />
                  </View>
                  <Text style={[
                    styles.transactionType,
                    transaction.type === 'restock' ? styles.restockText : styles.saleText
                  ]}>
                    {transaction.type === 'restock' ? '+' : '-'}{transaction.quantity} units
                  </Text>
                </View>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Restock Modal */}
      <Modal
        visible={restockModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setRestockModal(false);
          setRestockQuantity('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Icon name="add-circle" size={28} color="#B90D0B" />
              </View>
              <Text style={styles.modalTitle}>Restock Product</Text>
              <Text style={styles.modalSubtitle}>{currentProduct.name}</Text>
            </View>
            
            <Text style={styles.modalLabel}>Quantity to add</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter quantity"
              keyboardType="numeric"
              value={restockQuantity}
              onChangeText={setRestockQuantity}
              placeholderTextColor="#9CA3AF"
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleRestock}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRestockModal(false);
                  setRestockQuantity('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRestock}
                activeOpacity={0.7}
              >
                <Icon name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Restock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#B90D0B',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 44,
  },
  productHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B90D0B10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productHeaderInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productCategory: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    paddingVertical: 4,
  },
  priceGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  priceDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  sellPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B90D0B',
  },
  costPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
  },
  profitMetrics: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  inventoryGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inventoryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  inventoryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  inventoryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  revenueValue: {
    color: '#059669',
  },
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 6,
  },
  supplierText: {
    fontSize: 13,
    color: '#6B7280',
  },
  restockButton: {
    backgroundColor: '#B90D0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#B90D0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  restockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transactionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restockIcon: {
    backgroundColor: '#10B98115',
  },
  saleIcon: {
    backgroundColor: '#EF444415',
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
  },
  restockText: {
    color: '#10B981',
  },
  saleText: {
    color: '#EF4444',
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B90D0B10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#B90D0B',
    shadowColor: '#B90D0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default ProductDetailsScreen;