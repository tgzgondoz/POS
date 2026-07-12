class Product {
  constructor(id, name, price, cost, category, quantity, description, sku, supplier) {
    this.id = id;
    this.name = name || '';
    this.price = parseFloat(price) || 0;
    this.cost = parseFloat(cost) || 0;
    this.category = category || '';
    this.quantity = parseInt(quantity) || 0;
    this.description = description || '';
    this.sku = sku || '';
    this.supplier = supplier || '';
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
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
    switch(status) {
      case 'Out of Stock': return '#ff4444';
      case 'Low Stock': return '#ff8800';
      case 'Normal Stock': return '#ffcc00';
      default: return '#4caf50';
    }
  }
}

export default Product;