import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getDatabaseInstance, ref, onValue, update, push, set, remove } from '../config/firebase';

const ProductManagementScreen = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState(['Other']);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    buyPrice: '',
    sellPrice: '',
    category: '',
    quantity: '',
    sku: ''
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, selectedCategory, selectedSort]);

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
      setLoading(false);
      setRefreshing(false);
    });
  };

  const loadCategories = () => {
    const db = getDatabaseInstance();
    const categoriesRef = ref(db, 'categories');
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const categoriesList = Object.keys(data).map(key => data[key].name);
        setCategories(['Other', ...categoriesList]);
      } else {
        setCategories(['Other']);
      }
    });
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];
    
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    filtered.sort((a, b) => {
      switch(selectedSort) {
        case 'name':
          return a.name?.localeCompare(b.name || '') || 0;
        case 'sellPrice':
          return (b.sellPrice || 0) - (a.sellPrice || 0);
        case 'buyPrice':
          return (b.buyPrice || 0) - (a.buyPrice || 0);
        case 'profit':
          const profitA = (a.sellPrice || 0) - (a.buyPrice || 0);
          const profitB = (b.sellPrice || 0) - (b.buyPrice || 0);
          return profitB - profitA;
        case 'stock':
          return (a.quantity || 0) - (b.quantity || 0);
        case 'date':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });
    
    setFilteredProducts(filtered);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCategorySelect = (category) => {
    if (category === 'Other') {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: '' });
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: category });
    }
  };

  const handleCustomCategorySubmit = () => {
    if (customCategory.trim()) {
      setFormData({ ...formData, category: customCategory.trim() });
      setShowCustomCategory(false);
      setCustomCategory('');
    }
  };

  const calculateProfit = () => {
    const sellPrice = parseFloat(formData.sellPrice) || 0;
    const buyPrice = parseFloat(formData.buyPrice) || 0;
    return (sellPrice - buyPrice).toFixed(2);
  };

  const calculateMargin = () => {
    const sellPrice = parseFloat(formData.sellPrice) || 0;
    const buyPrice = parseFloat(formData.buyPrice) || 0;
    if (sellPrice === 0) return '0%';
    return `${((sellPrice - buyPrice) / sellPrice * 100).toFixed(1)}%`;
  };

  const calculateROI = () => {
    const buyPrice = parseFloat(formData.buyPrice) || 0;
    if (buyPrice === 0) return '0%';
    const profit = calculateProfit();
    return `${((parseFloat(profit) / buyPrice) * 100).toFixed(1)}%`;
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter product name');
      return false;
    }
    if (!formData.buyPrice || parseFloat(formData.buyPrice) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid cost price');
      return false;
    }
    if (!formData.sellPrice || parseFloat(formData.sellPrice) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid selling price');
      return false;
    }
    if (parseFloat(formData.buyPrice) > parseFloat(formData.sellPrice)) {
      Alert.alert('Validation Error', 'Cost price cannot be higher than selling price');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Validation Error', 'Please select or enter a category');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const db = getDatabaseInstance();
      const productData = {
        name: formData.name.trim(),
        buyPrice: parseFloat(formData.buyPrice),
        sellPrice: parseFloat(formData.sellPrice),
        category: formData.category,
        quantity: parseInt(formData.quantity) || 0,
        sku: formData.sku?.trim() || '',
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        const productRef = ref(db, `products/${editingProduct.id}`);
        await update(productRef, productData);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        const productsRef = ref(db, 'products');
        const newProductRef = push(productsRef);
        await set(newProductRef, {
          ...productData,
          createdAt: new Date().toISOString(),
          id: newProductRef.key
        });
        Alert.alert('Success', 'Product added successfully');
      }
      
      setModalVisible(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.name}?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getDatabaseInstance();
              const productRef = ref(db, `products/${product.id}`);
              await remove(productRef);
              Alert.alert('Success', 'Product deleted successfully');
              loadProducts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      buyPrice: product.buyPrice?.toString() || '',
      sellPrice: product.sellPrice?.toString() || '',
      category: product.category || '',
      quantity: product.quantity?.toString() || '',
      sku: product.sku || ''
    });
    setShowCustomCategory(false);
    setCustomCategory('');
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      buyPrice: '',
      sellPrice: '',
      category: '',
      quantity: '',
      sku: ''
    });
    setShowCustomCategory(false);
    setCustomCategory('');
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: '#ff4444', icon: 'close-circle' };
    if (quantity < 10) return { label: 'Low Stock', color: '#ff8800', icon: 'alert-circle' };
    if (quantity < 50) return { label: 'In Stock', color: '#b90d0b', icon: 'checkmark-circle' };
    return { label: 'Well Stocked', color: '#b90d0b', icon: 'checkmark-done-circle' };
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const renderProduct = ({ item }) => {
    const stockStatus = getStockStatus(item.quantity);
    const profit = (item.sellPrice || 0) - (item.buyPrice || 0);
    
    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productTitleContainer}>
            <Icon name="cube-outline" size={18} color="#020204" />
            <Text style={styles.productName}>{item.name}</Text>
          </View>
          <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + '20' }]}>
            <Icon name={stockStatus.icon} size={12} color={stockStatus.color} />
            <Text style={[styles.stockStatus, { color: stockStatus.color }]}>
              {stockStatus.label}
            </Text>
          </View>
        </View>
        
        <View style={styles.productSkuContainer}>
          <Icon name="pricetag-outline" size={12} color="#999" />
          <Text style={styles.productSku}>SKU: {item.sku || 'N/A'}</Text>
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={styles.productPrice}>{formatCurrency(item.sellPrice)}</Text>
            <View style={styles.costContainer}>
              <Icon name="cart-outline" size={10} color="#020204" />
              <Text style={styles.costText}>Cost: {formatCurrency(item.buyPrice)}</Text>
            </View>
          </View>
          
          <View style={styles.rightDetails}>
            <Text style={styles.quantityLabel}>Stock</Text>
            <Text style={styles.productQuantity}>{item.quantity || 0}</Text>
            <View style={styles.profitContainer}>
              <Icon name="trending-up" size={10} color="#4caf50" />
              <Text style={styles.profitText}>Profit: {formatCurrency(profit)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEdit(item)}
          >
            <Icon name="create-outline" size={16} color="#fff" />
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Icon name="trash-bin-outline" size={16} color="#fff" />
            <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getTotalStats = () => {
    const totalProducts = products.length;
    const totalInventoryValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.buyPrice || 0)), 0);
    const totalPotentialRevenue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.sellPrice || 0)), 0);
    const totalPotentialProfit = totalPotentialRevenue - totalInventoryValue;
    const lowStockCount = products.filter(p => p.quantity < 10 && p.quantity > 0).length;
    const outOfStockCount = products.filter(p => p.quantity === 0).length;
    
    return { totalProducts, totalInventoryValue, totalPotentialRevenue, totalPotentialProfit, lowStockCount, outOfStockCount };
  };

  const stats = getTotalStats();
  const categoriesList = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

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
     
      {/* Stats Cards - Smaller */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsScrollContent}>
          <View style={styles.statCard}>
            <Icon name="cube-outline" size={20} color="#b90d0b" />
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="cash-outline" size={20} color="#b90d0b" />
            <Text style={styles.statValue}>{formatCurrency(stats.totalInventoryValue)}</Text>
            <Text style={styles.statLabel}>Inventory</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="card-outline" size={20} color="#b90d0b" />
            <Text style={styles.statValue}>{formatCurrency(stats.totalPotentialRevenue)}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="trending-up" size={20} color="#b90d0b" />
            <Text style={styles.statValue}>{formatCurrency(stats.totalPotentialProfit)}</Text>
            <Text style={styles.statLabel}>Profit</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="alert-circle-outline" size={20} color="#ff8800" />
            <Text style={[styles.statValue, styles.warningText]}>{stats.lowStockCount}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="close-circle-outline" size={20} color="#ff4444" />
            <Text style={[styles.statValue, styles.dangerText]}>{stats.outOfStockCount}</Text>
            <Text style={styles.statLabel}>Out Stock</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Product FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Icon name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color="#020204" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#020204"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color="#020204" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name={showFilters ? "chevron-up" : "options-outline"} size={18} color="#b90d0b" />
          <Text style={styles.filterToggleText}>Filters & Sort</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterSection}>
            <Icon name="grid-outline" size={14} color="#020204" />
            <Text style={styles.filterTitle}>Categories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categoriesList.map(category => (
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
                ]}>{category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.filterSection}>
            <Icon name="funnel-outline" size={14} color="#020204" />
            <Text style={styles.filterTitle}>Sort By</Text>
          </View>
          <View style={styles.sortButtons}>
            {[
              { key: 'name', label: 'Name', icon: 'text-outline' },
              { key: 'sellPrice', label: 'Sell', icon: 'cash-outline' },
              { key: 'buyPrice', label: 'Cost', icon: 'cart-outline' },
              { key: 'profit', label: 'Profit', icon: 'trending-up' },
              { key: 'stock', label: 'Stock', icon: 'cube-outline' },
              { key: 'date', label: 'Date', icon: 'calendar-outline' }
            ].map((sort) => (
              <TouchableOpacity
                key={sort.key}
                style={[
                  styles.sortButton,
                  selectedSort === sort.key && styles.sortButtonActive
                ]}
                onPress={() => setSelectedSort(sort.key)}
              >
                <Icon name={sort.icon} size={12} color={selectedSort === sort.key ? "#fff" : "#020204"} />
                <Text style={[
                  styles.sortButtonText,
                  selectedSort === sort.key && styles.sortButtonTextActive
                ]}>
                  {sort.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadProducts} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cube-outline" size={60} color="#020204" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Tap + to add your first product'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Add/Edit Product Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Icon name={editingProduct ? "create-outline" : "add-circle-outline"} size={24} color="#fff" />
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalForm}>
            <View style={styles.inputContainer}>
              <Icon name="cube-outline" size={16} color="#020204" style={styles.inputIcon} />
              <Text style={styles.label}>Product Name *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter product name"
              placeholderTextColor="#020204"
            />

            <View style={styles.inputContainer}>
              <Icon name="pricetag-outline" size={16} color="#020204" style={styles.inputIcon} />
              <Text style={styles.label}>SKU (Stock Keeping Unit)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.sku}
              onChangeText={(text) => handleInputChange('sku', text)}
              placeholder="Enter unique SKU (optional)"
              placeholderTextColor="#020204"
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <View style={styles.inputContainer}>
                  <Icon name="cart-outline" size={14} color="#020204" style={styles.inputIcon} />
                  <Text style={styles.label}>Cost Price *</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={formData.buyPrice}
                  onChangeText={(text) => handleInputChange('buyPrice', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#020204"
                />
              </View>
              <View style={styles.halfWidth}>
                <View style={styles.inputContainer}>
                  <Icon name="cash-outline" size={14} color="#020204" style={styles.inputIcon} />
                  <Text style={styles.label}>Selling Price *</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={formData.sellPrice}
                  onChangeText={(text) => handleInputChange('sellPrice', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#020204"
                />
              </View>
            </View>

            {formData.buyPrice && formData.sellPrice && (
              <View style={styles.statsBox}>
                <View style={styles.statRow}>
                  <Icon name="trending-up" size={14} color="#b90d0b" />
                  <Text style={styles.statsText}>Profit: ${calculateProfit()}</Text>
                </View>
                <View style={styles.statRow}>
                  <Icon name="pie-chart" size={14} color="#b90d0b" />
                  <Text style={styles.statsText}>Margin: {calculateMargin()}</Text>
                </View>
                <View style={styles.statRow}>
                  <Icon name="stats-chart" size={14} color="#b90d0b" />
                  <Text style={styles.statsText}>ROI: {calculateROI()}</Text>
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Icon name="folder-outline" size={16} color="#020204" style={styles.inputIcon} />
              <Text style={styles.label}>Category *</Text>
            </View>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    formData.category === cat && styles.categoryButtonActive
                  ]}
                  onPress={() => handleCategorySelect(cat)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    formData.category === cat && styles.categoryButtonTextActive
                  ]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {showCustomCategory && (
              <View style={styles.customCategoryContainer}>
                <TextInput
                  style={[styles.input, styles.customCategoryInput]}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Enter custom category"
                  placeholderTextColor="#020204"
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.customCategorySubmit}
                  onPress={handleCustomCategorySubmit}
                >
                  <Icon name="add" size={16} color="#fff" />
                  <Text style={styles.customCategorySubmitText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}

            {formData.category && !categories.includes(formData.category) && (
              <View style={styles.customCategoryBadge}>
                <View style={styles.customCategoryBadgeContent}>
                  <Icon name="folder-open-outline" size={14} color="#020204" />
                  <Text style={styles.customCategoryBadgeText}>
                    Custom: {formData.category}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setFormData({ ...formData, category: '' })}>
                  <Icon name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Icon name="layers-outline" size={16} color="#020204" style={styles.inputIcon} />
              <Text style={styles.label}>Initial Quantity</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.quantity}
              onChangeText={(text) => handleInputChange('quantity', text)}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#020204"
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  statsScroll: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsScrollContent: {
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  statCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0e0b05',
    marginTop: 4,
    marginBottom: 2,
  },
  warningText: {
    color: '#ff8800',
  },
  dangerText: {
    color: '#ff4444',
  },
  statLabel: {
    fontSize: 10,
    color: '#020204',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#b90d0b',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 100,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  filterToggleText: {
    color: '#b90d0b',
    fontSize: 14,
    fontWeight: '500',
  },
  filtersPanel: {
    backgroundColor: '#fff',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
    gap: 6,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#020204',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#b90d0b',
  },
  categoryChipText: {
    color: '#020204',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  sortButtonActive: {
    backgroundColor: '#b90d0b',
  },
  sortButtonText: {
    color: '#020204',
    fontSize: 12,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 80,
  },
  productCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0e0b05',
    flex: 1,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  stockStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  productSkuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  productSku: {
    fontSize: 11,
    color: '#999',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceSection: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#020204',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b90d0b',
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  costText: {
    fontSize: 11,
    color: '#020204',
  },
  rightDetails: {
    alignItems: 'flex-end',
  },
  quantityLabel: {
    fontSize: 11,
    color: '#020204',
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b90d0b',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  profitText: {
    fontSize: 11,
    color: '#4caf50',
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  editButton: {
    backgroundColor: '#b90d0b',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButtonText: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#b90d0b',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  modalForm: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 12,
  },
  inputIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020204',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#0e0b05',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#b90d0b',
  },
  categoryButtonText: {
    color: '#020204',
    fontSize: 12,
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  customCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  customCategoryInput: {
    flex: 1,
  },
  customCategorySubmit: {
    backgroundColor: '#b90d0b',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customCategorySubmitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  customCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  customCategoryBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customCategoryBadgeText: {
    color: '#020204',
    fontWeight: '500',
    fontSize: 12,
  },
  statsBox: {
    backgroundColor: '#b90d0b10',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 13,
    color: '#b90d0b',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#b90d0b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#020204',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default ProductManagementScreen;