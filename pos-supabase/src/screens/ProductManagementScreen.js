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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
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
    if (quantity <= 0) return { label: 'Out of Stock', color: '#EF4444', icon: 'close-circle' };
    if (quantity < 10) return { label: 'Low Stock', color: '#F59E0B', icon: 'alert-circle' };
    if (quantity < 50) return { label: 'In Stock', color: '#10B981', icon: 'checkmark-circle' };
    return { label: 'Well Stocked', color: '#059669', icon: 'checkmark-done-circle' };
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
            <Icon name="cube-outline" size={20} color="#6B7280" />
            <Text style={styles.productName}>{item.name}</Text>
          </View>
          <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + '15' }]}>
            <Icon name={stockStatus.icon} size={14} color={stockStatus.color} />
            <Text style={[styles.stockStatus, { color: stockStatus.color }]}>
              {stockStatus.label}
            </Text>
          </View>
        </View>
        
        <View style={styles.productSkuContainer}>
          <Icon name="pricetag-outline" size={14} color="#9CA3AF" />
          <Text style={styles.productSku}>Product Description: {item.sku || 'N/A'}</Text>
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={styles.productPrice}>{formatCurrency(item.sellPrice)}</Text>
            <View style={styles.costContainer}>
              <Icon name="cart-outline" size={12} color="#6B7280" />
              <Text style={styles.costText}>Cost: {formatCurrency(item.buyPrice)}</Text>
            </View>
          </View>
          
          <View style={styles.rightDetails}>
            <Text style={styles.quantityLabel}>Stock</Text>
            <Text style={styles.productQuantity}>{item.quantity || 0}</Text>
            <View style={styles.profitContainer}>
              <Icon name="trending-up" size={12} color="#10B981" />
              <Text style={styles.profitText}>Profit: {formatCurrency(profit)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEdit(item)}
          >
            <Icon name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Icon name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Delete</Text>
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
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <ActivityIndicator size="large" color="#B90D0B" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  // Render the fixed header content
  const renderFixedHeader = () => (
    <View style={styles.fixedHeaderContainer}>
      {/* Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.statsScroll}
        contentContainerStyle={styles.statsScrollContent}
      >
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="cube-outline" size={20} color="#B90D0B" />
          </View>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="cash-outline" size={20} color="#B90D0B" />
          </View>
          <Text style={styles.statValue}>{formatCurrency(stats.totalInventoryValue)}</Text>
          <Text style={styles.statLabel}>Inventory</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="card-outline" size={20} color="#B90D0B" />
          </View>
          <Text style={styles.statValue}>{formatCurrency(stats.totalPotentialRevenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="trending-up" size={20} color="#B90D0B" />
          </View>
          <Text style={styles.statValue}>{formatCurrency(stats.totalPotentialProfit)}</Text>
          <Text style={styles.statLabel}>Profit</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, styles.warningIcon]}>
            <Icon name="alert-circle-outline" size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, styles.warningText]}>{stats.lowStockCount}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, styles.dangerIcon]}>
            <Icon name="close-circle-outline" size={20} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, styles.dangerText]}>{stats.outOfStockCount}</Text>
          <Text style={styles.statLabel}>Out Stock</Text>
        </View>
      </ScrollView>

      {/* Search and Filters */}
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
        
        <TouchableOpacity 
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name={showFilters ? "chevron-up-outline" : "options-outline"} size={20} color="#B90D0B" />
          <Text style={styles.filterToggleText}>Filters & Sort</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterSection}>
            <Icon name="grid-outline" size={16} color="#6B7280" />
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
            <Icon name="funnel-outline" size={16} color="#6B7280" />
            <Text style={styles.filterTitle}>Sort By</Text>
          </View>
          <View style={styles.sortButtons}>
            {[
              { key: 'name', label: 'Name', icon: 'text-outline' },
              { key: 'sellPrice', label: 'Price', icon: 'cash-outline' },
              { key: 'buyPrice', label: 'Cost', icon: 'cart-outline' },
              { key: 'profit', label: 'Profit', icon: 'trending-up-outline' },
              { key: 'stock', label: 'Stock', icon: 'layers-outline' },
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
                <Icon name={sort.icon} size={14} color={selectedSort === sort.key ? "#FFFFFF" : "#6B7280"} />
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
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      {/* Fixed Header Container */}
      {renderFixedHeader()}

      {/* Scrollable Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={loadProducts}
            colors={['#B90D0B']}
            tintColor="#B90D0B"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cube-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Tap + to add your first product'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Product FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Icon name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add/Edit Product Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Icon name={editingProduct ? "create-outline" : "add-circle-outline"} size={24} color="#FFFFFF" />
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalForm}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalFormContent}
          >
            {/* Product Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Product Name</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Icon name="cube-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  placeholder="Enter product name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Product Description (formerly SKU) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Description</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.sku}
                  onChangeText={(text) => handleInputChange('sku', text)}
                  placeholder="Enter product description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Price Row */}
            <View style={styles.row}>
              <View style={[styles.halfWidth, styles.inputGroup]}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Cost Price</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={formData.buyPrice}
                    onChangeText={(text) => handleInputChange('buyPrice', text)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              
              <View style={[styles.halfWidth, styles.inputGroup]}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Selling Price</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={formData.sellPrice}
                    onChangeText={(text) => handleInputChange('sellPrice', text)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {/* Profit Stats */}
            {formData.buyPrice && formData.sellPrice && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Icon name="trending-up" size={18} color="#059669" />
                  <Text style={styles.statLabel}>Profit</Text>
                  <Text style={styles.statValue}>${calculateProfit()}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Icon name="pie-chart" size={18} color="#059669" />
                  <Text style={styles.statLabel}>Margin</Text>
                  <Text style={styles.statValue}>{calculateMargin()}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Icon name="stats-chart" size={18} color="#059669" />
                  <Text style={styles.statLabel}>ROI</Text>
                  <Text style={styles.statValue}>{calculateROI()}</Text>
                </View>
              </View>
            )}

            {/* Category */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Category</Text>
                <Text style={styles.required}>*</Text>
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
            </View>

            {showCustomCategory && (
              <View style={styles.customCategoryContainer}>
                <TextInput
                  style={[styles.input, styles.customCategoryInput]}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Enter custom category"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.customCategorySubmit}
                  onPress={handleCustomCategorySubmit}
                >
                  <Icon name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {formData.category && !categories.includes(formData.category) && (
              <View style={styles.customCategoryBadge}>
                <View style={styles.customCategoryBadgeContent}>
                  <Icon name="folder-open-outline" size={16} color="#6B7280" />
                  <Text style={styles.customCategoryBadgeText}>
                    Custom: {formData.category}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setFormData({ ...formData, category: '' })}>
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}

            {/* Quantity */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Quantity</Text>
              <View style={styles.inputWrapper}>
                <Icon name="layers-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.quantity}
                  onChangeText={(text) => handleInputChange('quantity', text)}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name={editingProduct ? "checkmark-circle" : "add-circle"} size={22} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  fixedHeaderContainer: {
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
  statsScroll: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsScrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  statCard: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#B90D0B10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
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
  warningText: {
    color: '#F59E0B',
  },
  dangerText: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#B90D0B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#B90D0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: '#111827',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  filterToggleText: {
    color: '#B90D0B',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersPanel: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
    gap: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 12,
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
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortButtonActive: {
    backgroundColor: '#B90D0B',
    borderColor: '#B90D0B',
  },
  sortButtonText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
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
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  productSkuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  productSku: {
    fontSize: 12,
    color: '#6B7280',
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
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B90D0B',
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  costText: {
    fontSize: 12,
    color: '#6B7280',
  },
  rightDetails: {
    alignItems: 'flex-end',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  profitText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
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
    backgroundColor: '#B90D0B',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#B90D0B',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalForm: {
    flex: 1,
  },
  modalFormContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#EF4444',
    fontSize: 16,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  currencySymbol: {
    paddingLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  priceInput: {
    paddingLeft: 4,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    height: 100,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
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
    marginTop: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#B90D0B',
    borderColor: '#B90D0B',
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    backgroundColor: '#B90D0B',
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customCategoryBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customCategoryBadgeText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#D1D5DB',
  },
  saveButton: {
    backgroundColor: '#B90D0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 40,
    gap: 8,
    shadowColor: '#B90D0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
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

export default ProductManagementScreen;