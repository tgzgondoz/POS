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
module.exports = router;
