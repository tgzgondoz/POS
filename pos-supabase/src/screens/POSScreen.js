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
  StatusBar,
  SafeAreaView,
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
  const [cartVisible, setCartVisible] = useState(false);

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
    
    // Show cart automatically when items are added
    if (!cartVisible && cart.length === 0) {
      setCartVisible(true);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
    if (cart.length <= 1) {
      setCartVisible(false);
    }
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

  const getItemCount = () => {
    return cart.reduce((sum, item) => sum + item.cartQuantity, 0);
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
        '✅ Success!',
        `Sale completed!\n\nTotal: $${totalAmount.toFixed(2)}\nItems: ${getItemCount()}\n\nThank you for your purchase!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              setCheckoutModal(false);
              setCustomerName('');
              setCartVisible(false);
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
        { text: 'Clear', style: 'destructive', onPress: () => {
          setCart([]);
          setCartVisible(false);
        }}
      ]
    );
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: '#EF4444' };
    if (quantity < 10) return { label: 'Low Stock', color: '#F59E0B' };
    return { label: 'In Stock', color: '#10B981' };
  };

  const renderProduct = ({ item }) => {
    const status = getStockStatus(item.quantity);
    const isOutOfStock = item.quantity <= 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isOutOfStock && styles.outOfStockCard
        ]}
        onPress={() => addToCart(item)}
        disabled={isOutOfStock}
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
          <View style={styles.productDescriptionContainer}>
            <Icon name="document-text-outline" size={10} color="#9CA3AF" />
            <Text style={styles.productDescription} numberOfLines={1}>
              {item.sku || 'No description'}
            </Text>
          </View>
          <Text style={styles.productPrice}>${item.sellPrice?.toFixed(2)}</Text>
          <View style={styles.stockContainer}>
            <View style={[styles.stockDot, { backgroundColor: status.color }]} />
            <Text style={styles.stockStatus}>{item.quantity} left</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addButton, isOutOfStock && styles.disabledButton]}
          onPress={() => addToCart(item)}
          disabled={isOutOfStock}
        >
          <Icon name="add-circle" size={42} color={isOutOfStock ? '#D1D5DB' : '#B90D0B'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderCartItem = ({ item }) => {
    const itemTotal = item.sellPrice * item.cartQuantity;
    
    return (
      <View style={styles.cartItem}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>
            ${item.sellPrice?.toFixed(2)} × {item.cartQuantity}
          </Text>
        </View>
        <View style={styles.cartItemControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.cartQuantity - 1)}
          >
            <Icon name="remove" size={14} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.cartItemQuantity}>{item.cartQuantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.cartQuantity + 1)}
          >
            <Icon name="add" size={14} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.cartItemTotal}>${itemTotal.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromCart(item.id)}
          >
            <Icon name="trash-outline" size={18} color="#EF4444" />
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
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <ActivityIndicator size="large" color="#B90D0B" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Point of Sale</Text>
          <View style={styles.headerBadge}>
            <Icon name="cash-outline" size={20} color="#B90D0B" />
          </View>
        </View>

        {/* Search and Categories */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="cube-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try adjusting your search' : 'Add products to get started'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.productsList}
        />

        {/* Cart Summary - Always visible when cart has items */}
        {cart.length > 0 && (
          <View style={styles.cartSummary}>
            <TouchableOpacity 
              style={styles.cartToggle}
              onPress={() => setCartVisible(!cartVisible)}
            >
              <View style={styles.cartToggleLeft}>
                <Icon name="cart-outline" size={20} color="#B90D0B" />
                <Text style={styles.cartToggleText}>
                  {getItemCount()} item{getItemCount() !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.cartToggleRight}>
                <Text style={styles.cartToggleTotal}>${getTotal().toFixed(2)}</Text>
                <Icon name={cartVisible ? "chevron-down" : "chevron-up"} size={20} color="#6B7280" />
              </View>
            </TouchableOpacity>

            {cartVisible && (
              <>
                <View style={styles.cartHeader}>
                  <View>
                    <Text style={styles.cartTitle}>Current Order</Text>
                    <Text style={styles.cartSubtitle}>{cart.length} product{cart.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={clearCart} style={styles.clearCartBtn}>
                    <Icon name="trash-outline" size={16} color="#EF4444" />
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
                    activeOpacity={0.8}
                  >
                    <Icon name="card-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.checkoutButtonText}>Checkout</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* Checkout Modal */}
        <Modal
          visible={checkoutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCheckoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Icon name="checkmark-circle-outline" size={24} color="#B90D0B" />
                  <Text style={styles.modalTitle}>Checkout</Text>
                </View>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setCheckoutModal(false)}
                >
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                    placeholderTextColor="#9CA3AF"
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Payment Method</Text>
                  <View style={styles.paymentMethods}>
                    {['cash', 'card', 'mobile'].map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.paymentMethod,
                          paymentMethod === method && styles.paymentMethodActive
                        ]}
                        onPress={() => setPaymentMethod(method)}
                      >
                        <Icon 
                          name={
                            method === 'cash' ? 'cash-outline' :
                            method === 'card' ? 'card-outline' :
                            'phone-portrait-outline'
                          } 
                          size={20} 
                          color={paymentMethod === method ? '#FFFFFF' : '#6B7280'} 
                        />
                        <Text style={[
                          styles.paymentMethodText,
                          paymentMethod === method && styles.paymentMethodTextActive
                        ]}>
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmModalButton]}
                  onPress={processCheckout}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Icon name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.confirmButtonText}>Pay ${getTotal().toFixed(2)}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B90D0B10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15,
    color: '#111827',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryScrollContent: {
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#B90D0B',
    borderColor: '#B90D0B',
  },
  categoryChipText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  productsList: {
    paddingHorizontal: 8,
    paddingBottom: 200,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 6,
    marginVertical: 6,
    width: '47%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outOfStockCard: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
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
    color: '#111827',
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  lowStockBadgeText: {
    fontSize: 8,
    color: '#F59E0B',
    fontWeight: '600',
  },
  productDescriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 10,
    color: '#6B7280',
    flex: 1,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B90D0B',
    marginBottom: 4,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockStatus: {
    fontSize: 10,
    color: '#6B7280',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cartSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    maxHeight: '60%',
  },
  cartToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cartToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cartToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartToggleTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B90D0B',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cartSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444410',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  clearCartText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  cartList: {
    maxHeight: 200,
  },
  cartItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  cartItemInfo: {
    marginBottom: 6,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#B90D0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    minWidth: 25,
    textAlign: 'center',
  },
  cartItemTotal: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#B90D0B',
    textAlign: 'right',
  },
  removeButton: {
    padding: 4,
  },
  totalContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
    color: '#111827',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B90D0B',
  },
  checkoutButton: {
    backgroundColor: '#B90D0B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#B90D0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
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
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 18,
  },
  orderSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderItemName: {
    fontSize: 13,
    color: '#374151',
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  moreItems: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  orderTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  orderTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B90D0B',
  },
  modalSection: {
    marginBottom: 18,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  paymentMethod: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentMethodActive: {
    backgroundColor: '#B90D0B',
    borderColor: '#B90D0B',
  },
  paymentMethodText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 13,
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  paymentInfo: {
    backgroundColor: '#B90D0B10',
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
    color: '#374151',
  },
  paymentInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B90D0B',
  },
  changeText: {
    color: '#10B981',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelModalButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmModalButton: {
    backgroundColor: '#B90D0B',
    shadowColor: '#B90D0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
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

export default POSScreen;