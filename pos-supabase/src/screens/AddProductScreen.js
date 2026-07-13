import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProductService from '../services/ProductService';

const categories = [
  'Electronics',
  'Clothing',
  'Food & Beverage',
  'Furniture',
  'Tools',
  'Accessories',
  'Other'
];

const AddProductScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState({
    name: '',
    price: '',
    cost: '',
    category: '',
    quantity: '',
    description: '',
    sku: '',
    supplier: ''
  });

  const handleInputChange = (field, value) => {
    setProduct({ ...product, [field]: value });
  };

  const calculateProfit = () => {
    const price = parseFloat(product.price) || 0;
    const cost = parseFloat(product.cost) || 0;
    return (price - cost).toFixed(2);
  };

  const calculateMargin = () => {
    const price = parseFloat(product.price) || 0;
    const cost = parseFloat(product.cost) || 0;
    if (price === 0) return '0%';
    return `${((price - cost) / price * 100).toFixed(1)}%`;
  };

  const validateForm = () => {
    if (!product.name.trim()) {
      Alert.alert('Validation Error', 'Please enter product name');
      return false;
    }
    if (!product.price || isNaN(product.price) || parseFloat(product.price) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return false;
    }
    if (!product.cost || isNaN(product.cost) || parseFloat(product.cost) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid cost');
      return false;
    }
    if (!product.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const newProduct = {
        name: product.name.trim(),
        sellPrice: parseFloat(product.price),
        buyPrice: parseFloat(product.cost),
        category: product.category,
        quantity: parseInt(product.quantity) || 0,
        description: product.description.trim(),
        sku: product.sku.trim(),
        supplier: product.supplier.trim(),
      };
      
      await ProductService.addProduct(newProduct);
      Alert.alert('Success', 'Product added successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add New Product</Text>
          <Text style={styles.headerSubtitle}>Fill in the details below</Text>
        </View>

        <View style={styles.form}>
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
                value={product.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholder="Enter product name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Product Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Description</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={product.sku}
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
                <Text style={styles.label}>Selling Price</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={product.price}
                  onChangeText={(text) => handleInputChange('price', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            
            <View style={[styles.halfWidth, styles.inputGroup]}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Cost Price</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={product.cost}
                  onChangeText={(text) => handleInputChange('cost', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Profit Stats */}
          {product.price && product.cost && (
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
                    product.category === cat && styles.categoryButtonActive
                  ]}
                  onPress={() => handleInputChange('category', cat)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    product.category === cat && styles.categoryButtonTextActive
                  ]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Initial Quantity</Text>
            <View style={styles.inputWrapper}>
              <Icon name="layers-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={product.quantity}
                onChangeText={(text) => handleInputChange('quantity', text)}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Supplier */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Supplier</Text>
            <View style={styles.inputWrapper}>
              <Icon name="business-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={product.supplier}
                onChangeText={(text) => handleInputChange('supplier', text)}
                placeholder="Enter supplier name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Additional Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Notes</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={product.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Add any additional notes about this product"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Add Product</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    padding: 20,
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
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#D1D5DB',
  },
  submitButton: {
    backgroundColor: '#B90D0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
    shadowColor: '#B90D0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default AddProductScreen;