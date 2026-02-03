const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticate = require("../middleware/auth");

// Create new order
router.post("/", authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { user_id, items, total_amount, payment_method } = req.body;
    
    // Insert order
    const [orderResult] = await connection.execute(
      "INSERT INTO pos_order (user_id, total_amount, payment_method) VALUES (?, ?, ?)",
      [user_id, total_amount, payment_method]
    );
    
    const orderId = orderResult.insertId;
    
    // Insert order items and update stock
    for (const item of items) {
      await connection.execute(
        "INSERT INTO pos_order_item (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, item.product_id, item.quantity, item.price]
      );
      
      // Update product stock
      await connection.execute(
        "UPDATE pos_product SET stock_quantity = stock_quantity - ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }
    
    await connection.commit();
    res.json({ message: "Order created successfully", orderId });
    
  } catch (error) {
    await connection.rollback();
    console.error("Create order error:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    connection.release();
  }
});

// Get all orders
router.get("/", authenticate, async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT o.*, u.name as user_name 
      FROM pos_order o 
      LEFT JOIN pos_user u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `);
    res.json(orders);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get order details
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [order] = await pool.execute(
      "SELECT * FROM pos_order WHERE id = ?",
      [id]
    );
    
    const [items] = await pool.execute(`
      SELECT oi.*, p.name as product_name 
      FROM pos_order_item oi 
      LEFT JOIN pos_product p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `, [id]);
    
    res.json({ order: order[0], items });
  } catch (error) {
    console.error("Get order details error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete order (with stock restoration)
router.delete("/:id", authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Get order items to restore stock
    const [items] = await connection.execute(
      "SELECT product_id, quantity FROM pos_order_item WHERE order_id = ?",
      [id]
    );
    
    // Restore stock for each item
    for (const item of items) {
      await connection.execute(
        "UPDATE pos_product SET stock_quantity = stock_quantity + ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }
    
    // Delete order items first (due to foreign key)
    await connection.execute(
      "DELETE FROM pos_order_item WHERE order_id = ?",
      [id]
    );
    
    // Delete order
    await connection.execute(
      "DELETE FROM pos_order WHERE id = ?",
      [id]
    );
    
    await connection.commit();
    
    res.json({ 
      message: "Order deleted successfully. Stock has been restored.",
      deletedId: id,
      restoredItems: items.length
    });
    
  } catch (error) {
    await connection.rollback();
    console.error("Delete order error:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    connection.release();
  }
});

module.exports = router;