import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
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
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          value={product.name}
          onChangeText={(text) => handleInputChange('name', text)}
          placeholder="Enter product name"
          placeholderTextColor="#0b1e1c"
        />

        <Text style={styles.label}>SKU</Text>
        <TextInput
          style={styles.input}
          value={product.sku}
          onChangeText={(text) => handleInputChange('sku', text)}
          placeholder="Enter SKU (optional)"
          placeholderTextColor="#0b1e1c"
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Selling Price *</Text>
            <TextInput
              style={styles.input}
              value={product.price}
              onChangeText={(text) => handleInputChange('price', text)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#0b1e1c"
            />
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Cost Price *</Text>
            <TextInput
              style={styles.input}
              value={product.cost}
              onChangeText={(text) => handleInputChange('cost', text)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#0b1e1c"
            />
          </View>
        </View>

        {product.price && product.cost && (
          <View style={styles.statsContainer}>
            <Icon name="trending-up" size={16} color="#0d5335" />
            <Text style={styles.statsText}> Profit: ${calculateProfit()}</Text>
            <View style={styles.statsDivider} />
            <Icon name="pie-chart" size={16} color="#0d5335" />
            <Text style={styles.statsText}> Margin: {calculateMargin()}</Text>
          </View>
        )}

        <Text style={styles.label}>Category *</Text>
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

        <Text style={styles.label}>Initial Quantity</Text>
        <TextInput
          style={styles.input}
          value={product.quantity}
          onChangeText={(text) => handleInputChange('quantity', text)}
          placeholder="0"
          keyboardType="numeric"
          placeholderTextColor="#0b1e1c"
        />

        <Text style={styles.label}>Supplier</Text>
        <TextInput
          style={styles.input}
          value={product.supplier}
          onChangeText={(text) => handleInputChange('supplier', text)}
          placeholder="Enter supplier name (optional)"
          placeholderTextColor="#0b1e1c"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={product.description}
          onChangeText={(text) => handleInputChange('description', text)}
          placeholder="Enter product description (optional)"
          placeholderTextColor="#0b1e1c"
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="add-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Add Product</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#0e0b05',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#0e0b05',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#0d5335',
  },
  categoryButtonText: {
    color: '#0b1e1c',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: '#0d533510',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statsText: {
    fontSize: 14,
    color: '#0d5335',
    fontWeight: '600',
    marginVertical: 2,
    marginRight: 12,
  },
  statsDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#0d533530',
    marginHorizontal: 8,
  },
  submitButton: {
    backgroundColor: '#0d5335',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddProductScreen;