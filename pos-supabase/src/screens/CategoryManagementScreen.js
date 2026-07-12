import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getDatabaseInstance, ref, onValue, push, set, remove, update } from '../config/firebase';

const CategoryManagementScreen = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [productCount, setProductCount] = useState({});

  useEffect(() => {
    loadCategories();
    loadProductCategories();
  }, []);

  const loadCategories = () => {
    const db = getDatabaseInstance();
    const categoriesRef = ref(db, 'categories');
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      const categoriesList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setCategories(categoriesList);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const loadProductCategories = () => {
    const db = getDatabaseInstance();
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const products = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      
      const counts = {};
      products.forEach(product => {
        if (product.category) {
          counts[product.category] = (counts[product.category] || 0) + 1;
        }
      });
      setProductCount(counts);
    });
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === categoryName.trim().toLowerCase())) {
      Alert.alert('Error', 'Category already exists');
      return;
    }

    setLoading(true);
    try {
      const db = getDatabaseInstance();
      const categoriesRef = ref(db, 'categories');
      const newCategoryRef = push(categoriesRef);
      
      const categoryData = {
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        id: newCategoryRef.key
      };
      
      await set(newCategoryRef, categoryData);
      Alert.alert('Success', 'Category added successfully');
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (categories.some(cat => cat.id !== editingCategory.id && 
        cat.name.toLowerCase() === categoryName.trim().toLowerCase())) {
      Alert.alert('Error', 'Category already exists');
      return;
    }

    setLoading(true);
    try {
      const db = getDatabaseInstance();
      const categoryRef = ref(db, `categories/${editingCategory.id}`);
      
      const categoryData = {
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        updatedAt: new Date().toISOString()
      };
      
      await update(categoryRef, categoryData);
      Alert.alert('Success', 'Category updated successfully');
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = (category) => {
    const productCountInCategory = productCount[category.name] || 0;
    
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?\n\n${productCountInCategory} product(s) are using this category. Deleting will remove the category assignment from these products.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const db = getDatabaseInstance();
              const categoryRef = ref(db, `categories/${category.id}`);
              await remove(categoryRef);
              
              const productsRef = ref(db, 'products');
              onValue(productsRef, async (snapshot) => {
                const data = snapshot.val();
                if (data) {
                  for (const [productId, product] of Object.entries(data)) {
                    if (product.category === category.name) {
                      const productRef = ref(db, `products/${productId}`);
                      await update(productRef, { category: 'Other' });
                    }
                  }
                }
              }, { onlyOnce: true });
              
              Alert.alert('Success', 'Category deleted successfully');
              loadCategories();
              loadProductCategories();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setModalVisible(false);
  };

  const renderCategoryItem = ({ item }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryInfo}>
        <View style={styles.categoryIconContainer}>
          <Icon name="folder-open-outline" size={24} color="#b90d0b" />
        </View>
        <View style={styles.categoryDetails}>
          <Text style={styles.categoryName}>{item.name}</Text>
          {item.description ? (
            <View style={styles.descriptionContainer}>
              <Icon name="document-text-outline" size={12} color="#020204" />
              <Text style={styles.categoryDescription}>{item.description}</Text>
            </View>
          ) : null}
          <View style={styles.productCountContainer}>
            <Icon name="cube-outline" size={12} color="#020204" />
            <Text style={styles.productCount}>
              {productCount[item.name] || 0} product(s)
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => handleEditCategory(item)}
        >
          <Icon name="create-outline" size={14} color="#fff" />
          <Text style={[styles.actionBtnText, styles.editBtnText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDeleteCategory(item)}
        >
          <Icon name="trash-bin-outline" size={14} color="#fff" />
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && categories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <ActivityIndicator size="large" color="#b90d0b" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* FAB Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Icon name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="albums-outline" size={24} color="#b90d0b" />
          <Text style={styles.statValue}>{categories.length}</Text>
          <Text style={styles.statLabel}>Total Categories</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="checkmark-circle-outline" size={24} color="#b90d0b" />
          <Text style={styles.statValue}>
            {Object.keys(productCount).length}
          </Text>
          <Text style={styles.statLabel}>Active Categories</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="cube-outline" size={24} color="#b90d0b" />
          <Text style={styles.statValue}>
            {Object.values(productCount).reduce((a, b) => a + b, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadCategories} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="folder-open-outline" size={64} color="#020204" />
            <Text style={styles.emptyText}>No categories found</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first category</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Add/Edit Category Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <Icon 
                  name={editingCategory ? "create-outline" : "add-circle-outline"} 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.modalTitle}>
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </Text>
              </View>
              <TouchableOpacity onPress={resetForm}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputContainer}>
                <Icon name="pricetag-outline" size={16} color="#020204" />
                <Text style={styles.label}>Category Name *</Text>
              </View>
              <TextInput
                style={styles.input}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="Enter category name"
                placeholderTextColor="#020204"
              />

              <View style={styles.inputContainer}>
                <Icon name="document-text-outline" size={16} color="#020204" />
                <Text style={styles.label}>Description (Optional)</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={categoryDescription}
                onChangeText={setCategoryDescription}
                placeholder="Enter category description"
                placeholderTextColor="#020204"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingCategory ? handleUpdateCategory : handleAddCategory}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {editingCategory ? 'Update Category' : 'Add Category'}
                    </Text>
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
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0e0b05',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#020204',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0e0b05',
    marginBottom: 4,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#020204',
    flex: 1,
  },
  productCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productCount: {
    fontSize: 11,
    color: '#b90d0b',
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    backgroundColor: '#b90d0b',
  },
  deleteBtn: {
    backgroundColor: '#ff4444',
  },
  actionBtnText: {
    fontWeight: '600',
    fontSize: 12,
  },
  editBtnText: {
    color: '#fff',
  },
  deleteBtnText: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#b90d0b',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
    gap: 6,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#b90d0b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
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
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020204',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
});

export default CategoryManagementScreen;