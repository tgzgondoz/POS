const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const authenticate = require("../middleware/auth");

// Get all users (admin only)
router.get("/", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const [users] = await pool.execute(
      "SELECT id, username, name, role, created_at FROM pos_user ORDER BY created_at DESC"
    );
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new user (admin only)
router.post("/", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { username, password, name, role } = req.body;
    
    // Validation
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    // Check if user exists
    const [existing] = await pool.execute(
      "SELECT * FROM pos_user WHERE username = ?",
      [username]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert user
    await pool.execute(
      "INSERT INTO pos_user (username, password, name, role) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, name, role]
    );
    
    res.json({ message: "User created successfully" });
    
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user (admin only)
router.put("/:id", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { id } = req.params;
    const { name, role, password } = req.body;
    
    let updateQuery = "UPDATE pos_user SET name = ?, role = ?";
    let params = [name, role];
    
    // If password is provided, update it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateQuery += ", password = ?";
      params.push(hashedPassword);
    }
    
    updateQuery += " WHERE id = ?";
    params.push(id);
    
    await pool.execute(updateQuery, params);
    
    res.json({ message: "User updated successfully" });
    
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete user (admin only)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { id } = req.params;
    
    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    
    // Check if user has orders
    const [orders] = await pool.execute(
      "SELECT COUNT(*) as count FROM pos_order WHERE user_id = ?",
      [id]
    );
    
    if (orders[0].count > 0) {
      return res.status(400).json({ 
        error: "Cannot delete user. They have order history. Consider deactivating instead." 
      });
    }
    
    await pool.execute("DELETE FROM pos_user WHERE id = ?", [id]);
    
    res.json({ 
      message: "User deleted successfully",
      deletedId: id
    });
    
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;