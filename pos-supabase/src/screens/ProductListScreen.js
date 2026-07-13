import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProductService from '../services/ProductService';

const ProductListScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    ProductService.getProducts((productsList) => {
      setProducts(productsList);
      filterProducts(productsList, searchQuery, selectedCategory);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const filterProducts = (productsList, query, category) => {
    let filtered = [...productsList];
    
    if (query) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (category !== 'All') {
      filtered = filtered.filter(p => p.category === category);
    }
    
    setFilteredProducts(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterProducts(products, text, selectedCategory);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    filterProducts(products, searchQuery, category);
  };

  const handleDeleteProduct = (productId, productName) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductService.deleteProduct(productId);
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

  const handleRestock = (product) => {
    Alert.alert(
      'Restock Product',
      `Enter quantity to add to ${product.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restock',
          onPress: async (quantity) => {
            if (quantity && !isNaN(quantity) && parseInt(quantity) > 0) {
              try {
                await ProductService.updateInventory(product.id, parseInt(quantity), 'restock');
                Alert.alert('Success', 'Inventory updated successfully');
                loadProducts();
              } catch (error) {
                Alert.alert('Error', 'Failed to update inventory');
              }
            } else {
              Alert.alert('Error', 'Please enter a valid quantity');
            }
          }
        }
      ],
      'plain-text'
    );
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

  const renderProduct = ({ item }) => {
    const status = getStockStatus(item.quantity);
    const profit = (item.sellPrice || 0) - (item.buyPrice || 0);
    
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetails', { product: item })}
        activeOpacity={0.7}
      >
        <View style={styles.productHeader}>
          <View style={styles.productTitleContainer}>
            <View style={styles.productIconContainer}>
              <Icon name="cube-outline" size={20} color="#B90D0B" />
            </View>
            <Text style={styles.productName}>{item.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>
        
        <View style={styles.productSkuContainer}>
          <Icon name="document-text-outline" size={14} color="#9CA3AF" />
          <Text style={styles.productSku}>
            Product Description: {item.sku || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={styles.price}>{formatCurrency(item.sellPrice)}</Text>
            <View style={styles.costContainer}>
              <Icon name="cart-outline" size={12} color="#6B7280" />
              <Text style={styles.costText}>Cost: {formatCurrency(item.buyPrice)}</Text>
            </View>
          </View>
          
          <View style={styles.rightDetails}>
            <Text style={styles.quantityLabel}>Stock</Text>
            <Text style={styles.quantity}>{item.quantity || 0}</Text>
            <View style={styles.profitContainer}>
              <Icon name="trending-up" size={12} color="#10B981" />
              <Text style={styles.profitText}>Profit: {formatCurrency(profit)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.restockButton]}
            onPress={() => handleRestock(item)}
          >
            <Icon name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.restockButtonText}>Restock</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProduct(item.id, item.name)}
          >
            <Icon name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <ActivityIndicator size="large" color="#B90D0B" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <Text style={styles.headerSubtitle}>
          {filteredProducts.length} products available
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Icon name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.categorySection}>
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
              onPress={() => handleCategoryFilter(category)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive
              ]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
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
            <View style={styles.emptyIconContainer}>
              <Icon name="cube-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search or filters' : 'Tap + to add your first product'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
        activeOpacity={0.8}
      >
        <Icon name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
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
  categorySection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryScroll: {
    paddingVertical: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 18,
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
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
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
    flex: 1,
  },
  productIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#B90D0B10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
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
  productSkuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingLeft: 46,
  },
  productSku: {
    fontSize: 12,
    color: '#6B7280',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 46,
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
  price: {
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
  quantity: {
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingLeft: 46,
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
  restockButton: {
    backgroundColor: '#B90D0B',
  },
  restockButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
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

export default ProductListScreen;