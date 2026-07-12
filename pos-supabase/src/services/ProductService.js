import { getDatabaseInstance, ref, set, push, onValue, remove, update } from '../config/firebase';

class ProductService {
  static async addProduct(product) {
    try {
      const db = getDatabaseInstance();
      const productsRef = ref(db, 'products');
      const newProductRef = push(productsRef);
      await set(newProductRef, {
        ...product,
        id: newProductRef.key,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return newProductRef.key;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  static async updateProduct(productId, productData) {
    try {
      const db = getDatabaseInstance();
      const productRef = ref(db, `products/${productId}`);
      await update(productRef, {
        ...productData,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(productId) {
    try {
      const db = getDatabaseInstance();
      const productRef = ref(db, `products/${productId}`);
      await remove(productRef);
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  static getProducts(callback) {
    const db = getDatabaseInstance();
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const products = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      callback(products);
    });
  }

  static async updateInventory(productId, quantityChange, type = 'sale') {
    try {
      const db = getDatabaseInstance();
      const productRef = ref(db, `products/${productId}`);
      
      // Get current product data
      let currentProduct = null;
      await new Promise((resolve) => {
        onValue(productRef, (snapshot) => {
          currentProduct = snapshot.val();
          resolve();
        }, { onlyOnce: true });
      });
      
      if (currentProduct) {
        let newQuantity = currentProduct.quantity || 0;
        
        if (type === 'sale') {
          newQuantity = Math.max(0, newQuantity - quantityChange);
        } else if (type === 'restock') {
          newQuantity = newQuantity + quantityChange;
        }
        
        await update(productRef, { 
          quantity: newQuantity,
          updatedAt: new Date().toISOString()
        });
        
        await this.recordInventoryTransaction(productId, quantityChange, type, newQuantity);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  }

  static async recordInventoryTransaction(productId, quantity, type, newQuantity) {
    try {
      const db = getDatabaseInstance();
      const transactionsRef = ref(db, 'inventoryTransactions');
      const newTransactionRef = push(transactionsRef);
      await set(newTransactionRef, {
        productId,
        quantity: parseInt(quantity),
        type,
        newQuantity: parseInt(newQuantity),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error recording transaction:', error);
    }
  }

  static getInventoryTransactions(productId, callback) {
    const db = getDatabaseInstance();
    const transactionsRef = ref(db, 'inventoryTransactions');
    onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val();
      const transactions = data ? Object.keys(data)
        .filter(key => data[key].productId === productId)
        .map(key => ({
          id: key,
          ...data[key]
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : [];
      callback(transactions);
    });
  }

  static calculateProfit(product) {
    if (!product) return 0;
    return (product.price || 0) - (product.cost || 0);
  }

  static calculateProfitMargin(product) {
    if (!product || !product.price || product.price === 0) return 0;
    return ((product.price - product.cost) / product.price) * 100;
  }

  static getInventoryStatus(quantity) {
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) return 'Out of Stock';
    if (qty < 10) return 'Low Stock';
    if (qty < 50) return 'Normal Stock';
    return 'High Stock';
  }

  static getStatusColor(status) {
    const colors = {
      'Out of Stock': '#ff4444',
      'Low Stock': '#ff8800',
      'Normal Stock': '#ffcc00',
      'High Stock': '#4caf50'
    };
    return colors[status] || '#666';
  }
}

export default ProductService;