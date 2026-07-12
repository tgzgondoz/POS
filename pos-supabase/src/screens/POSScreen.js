import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getDatabaseInstance, ref, onValue, update, push, set } from '../config/firebase';
import moment from 'moment';

const POSScreen = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [categories, setCategories] = useState(['All']);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    const db = getDatabaseInstance();
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const productsList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setProducts(productsList);
      const uniqueCategories = ['All', ...new Set(productsList.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
      setLoading(false);
    });
  };

  const addToCart = (product) => {
    if (product.quantity <= 0) {
      Alert.alert('Out of Stock', `${product.name} is out of stock!`);
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.cartQuantity + 1 > product.quantity) {
        Alert.alert('Limit Reached', `Only ${product.quantity} units available in stock`);
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, cartQuantity: item.cartQuantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    const product = products.find(p => p.id === productId);
    if (newQuantity > product.quantity) {
      Alert.alert('Limit Reached', `Only ${product.quantity} units available`);
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, cartQuantity: newQuantity }
          : item
      ));
    }
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.sellPrice * item.cartQuantity), 0);
  };

  const getTotal = () => {
    return getSubtotal();
  };

  const processCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to the cart');
      return;
    }

    setProcessing(true);
    try {
      const db = getDatabaseInstance();
      const salesRef = ref(db, 'sales');
      const newSaleRef = push(salesRef);
      const totalAmount = getTotal();
      
      const saleData = {
        id: newSaleRef.key,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          sellPrice: item.sellPrice,
          buyPrice: item.buyPrice,
          quantity: item.cartQuantity,
          subtotal: item.sellPrice * item.cartQuantity
        })),
        subtotal: getSubtotal(),
        total: totalAmount,
        paymentMethod: paymentMethod,
        amountReceived: totalAmount,
        change: 0,
        customerName: customerName || 'Walk-in Customer',
        timestamp: new Date().toISOString(),
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss')
      };
      
      await set(newSaleRef, saleData);
      
      for (const item of cart) {
        const productRef = ref(db, `products/${item.id}`);
        const newQuantity = item.quantity - item.cartQuantity;
        await update(productRef, { quantity: newQuantity });
      }
      
      Alert.alert(
        'Success',
        `Sale completed!\nTotal: $${totalAmount.toFixed(2)}\nThank you for your purchase!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              setCheckoutModal(false);
              setCustomerName('');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setCart([]) }
      ]
    );
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={[styles.productCard, item.quantity === 0 && styles.outOfStockCard]}
      onPress={() => addToCart(item)}
      disabled={item.quantity === 0}
      activeOpacity={0.7}
    >
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          {item.quantity < 10 && item.quantity > 0 && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockBadgeText}>Low</Text>
            </View>
          )}
        </View>
        <Text style={styles.productSku}>{item.sku || 'No SKU'}</Text>
        <Text style={styles.productPrice}>${item.sellPrice?.toFixed(2)}</Text>
        <View style={styles.stockContainer}>
          <Icon name="cube-outline" size={10} color="#020204" />
          <Text style={styles.stockStatus}>{item.quantity} left</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.addButton, item.quantity === 0 && styles.disabledButton]}
        onPress={() => addToCart(item)}
        disabled={item.quantity === 0}
      >
        <Icon name="add-circle" size={42} color={item.quantity === 0 ? '#ccc' : '#b90d0b'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }) => {
    const itemTotal = item.sellPrice * item.cartQuantity;
    
    return (
      <View style={styles.cartItem}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>
            ${item.sellPrice?.toFixed(2)} × {item.cartQuantity}
          </Text>
        </View>
        <View style={styles.cartItemControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.cartQuantity - 1)}
          >
            <Icon name="remove" size={14} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cartItemQuantity}>{item.cartQuantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.cartQuantity + 1)}
          >
            <Icon name="add" size={14} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cartItemTotal}>${itemTotal.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromCart(item.id)}
          >
            <Icon name="trash-bin" size={18} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <ActivityIndicator size="large" color="#b90d0b" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color="#020204" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color="#020204" />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() => {
            Alert.alert(
              'Current Cart',
              `You have ${cart.length} item(s) in cart\nTotal: $${getTotal().toFixed(2)}`,
              [
                { text: 'Continue Shopping', style: 'cancel' },
                { text: 'View Cart', onPress: () => {
                  let cartDetails = cart.map(item => 
                    `${item.name} x${item.cartQuantity} - $${(item.sellPrice * item.cartQuantity).toFixed(2)}`
                  ).join('\n');
                  Alert.alert(
                    'Cart Details',
                    `${cartDetails}\n\nTotal: $${getTotal().toFixed(2)}`,
                    [
                      { text: 'Clear Cart', onPress: clearCart, style: 'destructive' },
                      { text: 'Checkout', onPress: () => setCheckoutModal(true) },
                      { text: 'Close', style: 'cancel' }
                    ]
                  );
                }}
              ]
            );
          }}
        >
          <Icon name="cart" size={24} color="#fff" />
          <Text style={styles.floatingCartCount}>{cart.length}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cube-outline" size={60} color="#020204" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
        contentContainerStyle={styles.productsList}
      />

      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartHeader}>
            <View>
              <Text style={styles.cartTitle}>Current Order</Text>
              <Text style={styles.cartSubtitle}>{cart.length} item(s)</Text>
            </View>
            <TouchableOpacity onPress={clearCart} style={styles.clearCartBtn}>
              <Icon name="trash-outline" size={18} color="#ff4444" />
              <Text style={styles.clearCartText}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            style={styles.cartList}
            showsVerticalScrollIndicator={false}
          />
          
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>${getTotal().toFixed(2)}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => setCheckoutModal(true)}
            >
              <Icon name="card-outline" size={20} color="#fff" />
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={checkoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Checkout</Text>
              <TouchableOpacity onPress={() => setCheckoutModal(false)}>
                <Icon name="close" size={24} color="#020204" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.orderSummary}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                {cart.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <Text style={styles.orderItemName}>
                      {item.name} × {item.cartQuantity}
                    </Text>
                    <Text style={styles.orderItemPrice}>
                      ${(item.sellPrice * item.cartQuantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                {cart.length > 3 && (
                  <Text style={styles.moreItems}>+{cart.length - 3} more item(s)</Text>
                )}
                <View style={styles.orderTotal}>
                  <Text style={styles.orderTotalLabel}>Total Amount</Text>
                  <Text style={styles.orderTotalAmount}>${getTotal().toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Customer Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter customer name"
                  placeholderTextColor="#999"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Payment Method</Text>
                <View style={styles.paymentMethods}>
                  <TouchableOpacity
                    style={[styles.paymentMethod, paymentMethod === 'cash' && styles.paymentMethodActive]}
                    onPress={() => setPaymentMethod('cash')}
                  >
                    <Icon name="cash-outline" size={20} color={paymentMethod === 'cash' ? '#fff' : '#020204'} />
                    <Text style={[styles.paymentMethodText, paymentMethod === 'cash' && styles.paymentMethodTextActive]}>Cash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentMethod, paymentMethod === 'card' && styles.paymentMethodActive]}
                    onPress={() => setPaymentMethod('card')}
                  >
                    <Icon name="card-outline" size={20} color={paymentMethod === 'card' ? '#fff' : '#020204'} />
                    <Text style={[styles.paymentMethodText, paymentMethod === 'card' && styles.paymentMethodTextActive]}>Card</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentMethod, paymentMethod === 'mobile' && styles.paymentMethodActive]}
                    onPress={() => setPaymentMethod('mobile')}
                  >
                    <Icon name="phone-portrait-outline" size={20} color={paymentMethod === 'mobile' ? '#fff' : '#020204'} />
                    <Text style={[styles.paymentMethodText, paymentMethod === 'mobile' && styles.paymentMethodTextActive]}>Mobile</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.paymentInfo}>
                <View style={styles.paymentInfoRow}>
                  <Text style={styles.paymentInfoLabel}>Amount to Pay</Text>
                  <Text style={styles.paymentInfoValue}>${getTotal().toFixed(2)}</Text>
                </View>
                {paymentMethod === 'cash' && (
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Change</Text>
                    <Text style={[styles.paymentInfoValue, styles.changeText]}>$0.00</Text>
                  </View>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setCheckoutModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={processCheckout}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name="checkmark" size={18} color="#fff" />
                    <Text style={styles.modalButtonText}>Pay ${getTotal().toFixed(2)}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    color: '#020204',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15,
    color: '#0e0b05',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#b90d0b',
  },
  categoryChipText: {
    color: '#020204',
    fontSize: 12,
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  productsList: {
    paddingBottom: 120,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    margin: 6,
    width: '47%',
    elevation: 2,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  outOfStockCard: {
    opacity: 0.5,
    backgroundColor: '#fafafa',
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0e0b05',
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: '#b90d0b20',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  lowStockBadgeText: {
    fontSize: 8,
    color: '#b90d0b',
    fontWeight: '600',
  },
  productSku: {
    fontSize: 9,
    color: '#020204',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#b90d0b',
    marginBottom: 4,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockStatus: {
    fontSize: 9,
    color: '#020204',
    marginLeft: 3,
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#b90d0b',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 100,
  },
  floatingCartCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  cartSummary: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: '55%',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  cartSubtitle: {
    fontSize: 11,
    color: '#020204',
    marginTop: 2,
  },
  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff444410',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  clearCartText: {
    color: '#ff4444',
    marginLeft: 4,
    fontSize: 12,
  },
  cartList: {
    maxHeight: 180,
  },
  cartItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  cartItemInfo: {
    marginBottom: 6,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0e0b05',
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#020204',
    marginTop: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#b90d0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemQuantity: {
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0e0b05',
    minWidth: 25,
    textAlign: 'center',
  },
  cartItemTotal: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#b90d0b',
    textAlign: 'right',
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  totalContainer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0e0b05',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b90d0b',
  },
  checkoutButton: {
    backgroundColor: '#b90d0b',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
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
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  modalBody: {
    padding: 18,
  },
  orderSummary: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0e0b05',
    marginBottom: 10,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderItemName: {
    fontSize: 13,
    color: '#020204',
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0e0b05',
  },
  moreItems: {
    fontSize: 12,
    color: '#020204',
    marginTop: 4,
    fontStyle: 'italic',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  orderTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  orderTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b90d0b',
  },
  modalSection: {
    marginBottom: 18,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0e0b05',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8f8f8',
    color: '#0e0b05',
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  paymentMethodActive: {
    backgroundColor: '#b90d0b',
  },
  paymentMethodText: {
    marginLeft: 6,
    color: '#020204',
    fontWeight: '500',
    fontSize: 13,
  },
  paymentMethodTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  paymentInfo: {
    backgroundColor: '#b90d0b10',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  paymentInfoLabel: {
    fontSize: 14,
    color: '#020204',
  },
  paymentInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#b90d0b',
  },
  changeText: {
    color: '#4caf50',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#ff4444',
  },
  confirmModalButton: {
    backgroundColor: '#b90d0b',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: '#020204',
    marginTop: 12,
  },
});

export default POSScreen;