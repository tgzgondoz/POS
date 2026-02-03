const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticate = require("../middleware/auth");

// Get all categories
router.get("/", authenticate, async (req, res) => {
  try {
    const [categories] = await pool.execute("SELECT * FROM pos_category ORDER BY name");
    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Add category
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    await pool.execute(
      "INSERT INTO pos_category (name, description) VALUES (?, ?)",
      [name, description]
    );
    res.json({ message: "Category added successfully" });
  } catch (error) {
    console.error("Add category error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update category
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    await pool.execute(
      "UPDATE pos_category SET name = ?, description = ? WHERE id = ?",
      [name, description, id]
    );
    
    res.json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete category
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has products
    const [products] = await pool.execute(
      "SELECT COUNT(*) as count FROM pos_product WHERE category_id = ?",
      [id]
    );
    
    if (products[0].count > 0) {
      return res.status(400).json({ 
        error: "Cannot delete category. It has products. Please reassign or delete products first." 
      });
    }
    
    await pool.execute("DELETE FROM pos_category WHERE id = ?", [id]);
    
    res.json({ 
      message: "Category deleted successfully",
      deletedId: id
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;