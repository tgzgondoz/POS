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
import { getDatabaseInstance, ref, push, set, update } from '../config/firebase';

const categories = [
  'Electronics', 'Clothing', 'Food & Beverage', 
  'Furniture', 'Tools', 'Accessories', 'Other'
];

const AddEditProductScreen = ({ route, navigation }) => {
  const { product, isEditing } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sellPrice: product?.sellPrice?.toString() || product?.price?.toString() || '',
    buyPrice: product?.buyPrice?.toString() || product?.cost?.toString() || '',
    category: product?.category || '',
    quantity: product?.quantity?.toString() || '',
    description: product?.description || '',
    sku: product?.sku || '',
    supplier: product?.supplier || ''
  });

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const calculateProfit = () => {
    const price = parseFloat(formData.sellPrice) || 0;
    const cost = parseFloat(formData.buyPrice) || 0;
    return (price - cost).toFixed(2);
  };

  const calculateMargin = () => {
    const price = parseFloat(formData.sellPrice) || 0;
    const cost = parseFloat(formData.buyPrice) || 0;
    if (price === 0) return '0%';
    return `${((price - cost) / price * 100).toFixed(1)}%`;
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return false;
    }
    if (!formData.sellPrice || parseFloat(formData.sellPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid selling price');
      return false;
    }
    if (!formData.buyPrice || parseFloat(formData.buyPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid cost price');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
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
        sellPrice: parseFloat(formData.sellPrice),
        buyPrice: parseFloat(formData.buyPrice),
        category: formData.category,
        quantity: parseInt(formData.quantity) || 0,
        description: formData.description.trim(),
        sku: formData.sku.trim(),
        supplier: formData.supplier.trim(),
        updatedAt: new Date().toISOString()
      };

      if (isEditing && product?.id) {
        const productRef = ref(db, `products/${product.id}`);
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
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
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
          value={formData.name}
          onChangeText={(text) => handleInputChange('name', text)}
          placeholder="Enter product name"
          placeholderTextColor="#020204"
        />

        <Text style={styles.label}>SKU</Text>
        <TextInput
          style={styles.input}
          value={formData.sku}
          onChangeText={(text) => handleInputChange('sku', text)}
          placeholder="Enter SKU"
          placeholderTextColor="#020204"
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Selling Price *</Text>
            <TextInput
              style={styles.input}
              value={formData.sellPrice}
              onChangeText={(text) => handleInputChange('sellPrice', text)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#020204"
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Cost Price *</Text>
            <TextInput
              style={styles.input}
              value={formData.buyPrice}
              onChangeText={(text) => handleInputChange('buyPrice', text)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#020204"
            />
          </View>
        </View>

        {formData.sellPrice && formData.buyPrice && (
          <View style={styles.statsBox}>
            <View style={styles.statsRow}>
              <Icon name="trending-up" size={16} color="#b90d0b" />
              <Text style={styles.statsText}> Profit: ${calculateProfit()}</Text>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsRow}>
              <Icon name="pie-chart" size={16} color="#b90d0b" />
              <Text style={styles.statsText}> Margin: {calculateMargin()}</Text>
            </View>
          </View>
        )}

        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                formData.category === cat && styles.categoryButtonActive
              ]}
              onPress={() => handleInputChange('category', cat)}
            >
              <Text style={[
                styles.categoryButtonText,
                formData.category === cat && styles.categoryButtonTextActive
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Initial Quantity</Text>
        <TextInput
          style={styles.input}
          value={formData.quantity}
          onChangeText={(text) => handleInputChange('quantity', text)}
          placeholder="0"
          keyboardType="numeric"
          placeholderTextColor="#020204"
        />

        <Text style={styles.label}>Supplier</Text>
        <TextInput
          style={styles.input}
          value={formData.supplier}
          onChangeText={(text) => handleInputChange('supplier', text)}
          placeholder="Enter supplier name"
          placeholderTextColor="#020204"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => handleInputChange('description', text)}
          placeholder="Enter product description"
          placeholderTextColor="#020204"
          multiline
          numberOfLines={4}
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
              <Icon name={isEditing ? "create" : "add-circle"} size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Update Product' : 'Add Product'}
              </Text>
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
    backgroundColor: '#b90d0b',
  },
  categoryButtonText: {
    color: '#020204',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  statsBox: {
    backgroundColor: '#b90d0b10',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#b90d0b30',
  },
  statsText: {
    fontSize: 14,
    color: '#b90d0b',
    fontWeight: '600',
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: '#b90d0b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddEditProductScreen;