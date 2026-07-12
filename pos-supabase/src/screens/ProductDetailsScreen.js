import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal
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

  const profit = ProductService.calculateProfit(currentProduct);
  const margin = ProductService.calculateProfitMargin(currentProduct);
  const status = ProductService.getInventoryStatus(currentProduct.quantity);
  const statusColor = ProductService.getStatusColor(status);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="cube" size={24} color="#b90d0b" />
          <Text style={styles.productName}>{currentProduct.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.sectionHeader}>
          <Icon name="information-circle" size={20} color="#b90d0b" />
          <Text style={styles.sectionTitle}> Product Information</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>SKU:</Text>
          <Text style={styles.value}>{currentProduct.sku || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Category:</Text>
          <Text style={styles.value}>{currentProduct.category}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Supplier:</Text>
          <Text style={styles.value}>{currentProduct.supplier || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{currentProduct.description || 'No description'}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.sectionHeader}>
          <Icon name="cash" size={20} color="#b90d0b" />
          <Text style={styles.sectionTitle}> Pricing Information</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Selling Price:</Text>
          <Text style={[styles.value, styles.price]}>${currentProduct.sellPrice?.toFixed(2)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Cost Price:</Text>
          <Text style={styles.value}>${currentProduct.buyPrice?.toFixed(2)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Profit per unit:</Text>
          <Text style={[styles.value, styles.profit]}>${profit.toFixed(2)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Profit Margin:</Text>
          <Text style={[styles.value, styles.profit]}>{margin.toFixed(1)}%</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.sectionHeader}>
          <Icon name="cube-outline" size={20} color="#b90d0b" />
          <Text style={styles.sectionTitle}> Inventory Information</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Current Quantity:</Text>
          <Text style={[styles.value, styles.quantity]}>{currentProduct.quantity || 0}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Total Value:</Text>
          <Text style={styles.value}>${((currentProduct.quantity || 0) * (currentProduct.buyPrice || 0)).toFixed(2)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Potential Revenue:</Text>
          <Text style={styles.value}>${((currentProduct.quantity || 0) * (currentProduct.sellPrice || 0)).toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.restockButton}
        onPress={() => setRestockModal(true)}
      >
        <Icon name="add-circle" size={20} color="#fff" />
        <Text style={styles.buttonText}> Restock Product</Text>
      </TouchableOpacity>

      {transactions.length > 0 && (
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Icon name="time" size={20} color="#b90d0b" />
            <Text style={styles.sectionTitle}> Recent Transactions</Text>
          </View>
          {transactions.slice(0, 5).map((transaction, index) => (
            <View key={index} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <Icon 
                  name={transaction.type === 'restock' ? "arrow-down" : "arrow-up"} 
                  size={14} 
                  color={transaction.type === 'restock' ? '#4caf50' : '#ff4444'} 
                />
                <Text style={[
                  styles.transactionType,
                  transaction.type === 'restock' ? styles.restockText : styles.saleText
                ]}>
                  {transaction.type === 'restock' ? '+' : '-'}{transaction.quantity}
                </Text>
              </View>
              <Text style={styles.transactionDate}>
                {new Date(transaction.timestamp).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={restockModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRestockModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="add-circle" size={24} color="#b90d0b" />
              <Text style={styles.modalTitle}>Restock Product</Text>
            </View>
            <Text style={styles.modalSubtitle}>{currentProduct.name}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter quantity to add"
              keyboardType="numeric"
              value={restockQuantity}
              onChangeText={setRestockQuantity}
              placeholderTextColor="#020204"
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRestockModal(false);
                  setRestockQuantity('');
                }}
              >
                <Icon name="close" size={16} color="#fff" />
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRestock}
              >
                <Icon name="checkmark" size={16} color="#fff" />
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Restock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0e0b05',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#b90d0b',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#020204',
  },
  value: {
    fontSize: 14,
    color: '#0e0b05',
    fontWeight: '500',
  },
  price: {
    color: '#b90d0b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profit: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b90d0b',
  },
  restockButton: {
    backgroundColor: '#b90d0b',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  restockText: {
    color: '#4caf50',
  },
  saleText: {
    color: '#ff4444',
  },
  transactionDate: {
    fontSize: 12,
    color: '#020204',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0e0b05',
    marginLeft: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#020204',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#0e0b05',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  confirmButton: {
    backgroundColor: '#b90d0b',
  },
  confirmButtonText: {
    color: '#fff',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ProductDetailsScreen;