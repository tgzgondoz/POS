const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticate = require("../middleware/auth");

// Get all products with category
router.get("/", authenticate, async (req, res) => {
  try {
    const [products] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM pos_product p 
      LEFT JOIN pos_category c ON p.category_id = c.id
      ORDER BY p.name
    `);
    res.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Add new product
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, description, price, stock_quantity, category_id } = req.body;
    
    await pool.execute(
      "INSERT INTO pos_product (name, description, price, stock_quantity, category_id) VALUES (?, ?, ?, ?, ?)",
      [name, description, price, stock_quantity, category_id]
    );
    
    res.json({ message: "Product added successfully" });
  } catch (error) {
    console.error("Add product error:", error);
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
    console.error("Update product error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete product
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute("DELETE FROM pos_product WHERE id = ?", [id]);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
