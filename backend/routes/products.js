const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticate = require("../middleware/auth");

// Get all products
router.get("/", authenticate, async (req, res) => {
  try {
    const [products] = await pool.execute(`
      SELECT 
        p.*, 
        c.name as category_name,
        CAST(p.price AS DECIMAL(10,2)) as price
      FROM pos_product p 
      LEFT JOIN pos_category c ON p.category_id = c.id
      ORDER BY p.name
    `);
    
    // Convert to proper types
    const convertedProducts = products.map(product => ({
      ...product,
      price: parseFloat(product.price),
      stock_quantity: parseInt(product.stock_quantity)
    }));
    
    res.json(convertedProducts);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Add product
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, description, price, stock_quantity, category_id } = req.body;
    
    await pool.execute(
      "INSERT INTO pos_product (name, description, price, stock_quantity, category_id) VALUES (?, ?, ?, ?, ?)",
      [name, description, price, stock_quantity, category_id]
    );
    
    res.json({ message: "Product added successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update product
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity, category_id } = req.body;
    
    await pool.execute(
      "UPDATE pos_product SET name = ?, description = ?, price = ?, stock_quantity = ?, category_id = ? WHERE id = ?",
      [name, description, price, stock_quantity, category_id, id]
    );
    
    res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete product
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists in any orders
    const [orderItems] = await pool.execute(
      "SELECT COUNT(*) as count FROM pos_order_item WHERE product_id = ?",
      [id]
    );
    
    if (orderItems[0].count > 0) {
      return res.status(400).json({ 
        error: "Cannot delete product. It exists in orders. Consider marking as discontinued instead." 
      });
    }
    
    await pool.execute("DELETE FROM pos_product WHERE id = ?", [id]);
    
    res.json({ 
      message: "Product deleted successfully",
      deletedId: id
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Soft delete (mark as inactive)
router.patch("/:id/deactivate", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Add a discontinued flag (you'd need to add this column to your table)
    // For now, we'll set stock to 0
    await pool.execute(
      "UPDATE pos_product SET stock_quantity = 0 WHERE id = ?",
      [id]
    );
    
    res.json({ message: "Product deactivated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;