const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Initialize database and seed
async function initializeApp() {
  try {
    // Create database connection pool
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log("✅ Database connected");

    // Create tables if they don't exist
    await createTables(pool);
    
    // Seed database with car spare parts data
    await seedDatabase(pool);
    
    // Set pool as global for db.js
    global.dbPool = pool;
    
    console.log("✅ Database initialized and seeded with car spare parts");
    
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    process.exit(1);
  }
}

async function createTables(pool) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS pos_user (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role ENUM('admin', 'cashier') DEFAULT 'cashier',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS pos_category (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS pos_product (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      stock_quantity INT DEFAULT 0,
      category_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES pos_category(id) ON DELETE SET NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS pos_order (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES pos_user(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS pos_order_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES pos_order(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES pos_product(id)
    )`
  ];

  for (const sql of tables) {
    await pool.execute(sql);
  }
}

async function seedDatabase(pool) {
  try {
    // Hash passwords
    const adminPassword = await bcrypt.hash("admin123", 10);
    const cashierPassword = await bcrypt.hash("cashier123", 10);

    // Insert users
    await pool.execute(
      `INSERT IGNORE INTO pos_user (username, password, name, role) VALUES 
       (?, ?, ?, 'admin'),
       (?, ?, ?, 'cashier')`,
      ["admin", adminPassword, "Admin User", "cashier", cashierPassword, "John Cashier"]
    );

    // Insert car spare parts categories
    await pool.execute(
      `INSERT IGNORE INTO pos_category (name, description) VALUES 
       ('Engine Parts', 'Engine components and accessories'),
       ('Brake System', 'Brake pads, discs, and hydraulic parts'),
       ('Suspension', 'Shocks, struts, and suspension components'),
       ('Electrical', 'Batteries, alternators, and wiring'),
       ('Filters & Fluids', 'Oil filters, air filters, and fluids'),
       ('Body Parts', 'Bumpers, lights, and exterior components')`
    );

    // Get categories and insert car spare parts products
    const [categories] = await pool.execute("SELECT id, name FROM pos_category");
    
    for (const category of categories) {
      if (category.name === 'Engine Parts') {
        await pool.execute(
          `INSERT IGNORE INTO pos_product (name, description, price, stock_quantity, category_id) VALUES 
           ('Spark Plugs (Set of 4)', 'NGK Iridium spark plugs', 49.99, 100, ?),
           ('Engine Oil 5W-30', 'Synthetic engine oil 5L', 39.99, 50, ?),
           ('Timing Belt Kit', 'Complete timing belt replacement kit', 129.99, 25, ?),
           ('Water Pump', 'OEM replacement water pump', 89.99, 30, ?)`,
          [category.id, category.id, category.id, category.id]
        );
      } else if (category.name === 'Brake System') {
        await pool.execute(
          `INSERT IGNORE INTO pos_product (name, description, price, stock_quantity, category_id) VALUES 
           ('Brake Pads (Front)', 'Ceramic brake pads - front', 59.99, 75, ?),
           ('Brake Discs (Pair)', 'Vented brake discs - front', 119.99, 40, ?),
           ('Brake Fluid', 'DOT 4 brake fluid 500ml', 12.99, 100, ?),
           ('Brake Caliper', 'Remanufactured brake caliper', 149.99, 20, ?)`,
          [category.id, category.id, category.id, category.id]
        );
      } else if (category.name === 'Suspension') {
        await pool.execute(
          `INSERT IGNORE INTO pos_product (name, description, price, stock_quantity, category_id) VALUES 
           ('Shock Absorbers (Pair)', 'Gas-filled shock absorbers', 199.99, 30, ?),
           ('Strut Assembly', 'Complete strut assembly', 249.99, 25, ?),
           ('Stabilizer Link', 'Stabilizer bar link kit', 29.99, 60, ?),
           ('Control Arm', 'Front lower control arm', 89.99, 35, ?)`,
          [category.id, category.id, category.id, category.id]
        );
      } else if (category.name === 'Electrical') {
        await pool.execute(
          `INSERT IGNORE INTO pos_product (name, description, price, stock_quantity, category_id) VALUES 
           ('Car Battery', '12V 60Ah maintenance-free battery', 129.99, 40, ?),
           ('Alternator', '120A alternator replacement', 299.99, 20, ?),
           ('Starter Motor', 'High-torque starter motor', 189.99, 25, ?),
           ('Headlight Bulbs (Pair)', 'H7 LED headlight bulbs', 39.99, 80, ?)`,
          [category.id, category.id, category.id, category.id]
        );
      } else if (category.name === 'Filters & Fluids') {
        await pool.execute(
          `INSERT IGNORE INTO pos_product (name, description, price, stock_quantity, category_id) VALUES 
           ('Oil Filter', 'Premium synthetic oil filter', 14.99, 120, ?),
           ('Air Filter', 'High-flow air filter', 24.99, 90, ?),
           ('Cabin Air Filter', 'Activated carbon cabin filter', 29.99, 70, ?),
           ('Transmission Fluid', 'ATF fluid 1L', 19.99, 60, ?)`,
          [category.id, category.id, category.id, category.id]
        );
      } else if (category.name === 'Body Parts') {
        await pool.execute(
          `INSERT IGNORE INTO pos_product (name, description, price, stock_quantity, category_id) VALUES 
           ('Headlight Assembly', 'LED headlight assembly', 349.99, 15, ?),
           ('Front Bumper', 'Primed front bumper', 199.99, 10, ?),
           ('Side Mirror', 'Heated electric side mirror', 89.99, 25, ?),
           ('Windshield Wiper Blades', 'All-season wiper blades (pair)', 29.99, 100, ?)`,
          [category.id, category.id, category.id, category.id]
        );
      }
    }

    console.log("\n=== Car Spare Parts POS System ===");
    console.log("✅ Database seeded with car spare parts inventory");
    console.log("\n=== Default Login Credentials ===");
    console.log("Admin:");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("\nCashier:");
    console.log("  Username: cashier");
    console.log("  Password: cashier123");
    console.log("\n=== Categories Added ===");
    console.log("1. Engine Parts");
    console.log("2. Brake System");
    console.log("3. Suspension");
    console.log("4. Electrical");
    console.log("5. Filters & Fluids");
    console.log("6. Body Parts");
    console.log("===========================\n");
    
  } catch (error) {
    console.error("Seed error:", error.message);
  }
}

// Initialize app before starting server
initializeApp().then(() => {
  // Import routes (after db is initialized)
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/users", require("./routes/users"));
  app.use("/api/products", require("./routes/products"));
  app.use("/api/categories", require("./routes/categories"));
  app.use("/api/orders", require("./routes/orders"));

  // Test routes
  app.get("/", (req, res) => {
    res.json({ 
      message: "Car Spare Parts POS Backend API",
      endpoints: {
        auth: "/api/auth",
        users: "/api/users",
        products: "/api/products",
        categories: "/api/categories",
        orders: "/api/orders"
      }
    });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
  });

  // Get inventory summary
  app.get("/api/inventory-summary", async (req, res) => {
    try {
      const pool = global.dbPool;
      const [summary] = await pool.execute(`
        SELECT 
          c.name as category,
          COUNT(p.id) as product_count,
          SUM(p.stock_quantity) as total_stock,
          AVG(p.price) as avg_price
        FROM pos_category c
        LEFT JOIN pos_product p ON c.id = p.category_id
        GROUP BY c.id, c.name
        ORDER BY c.name
      `);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get low stock alerts
  app.get("/api/low-stock-alerts", async (req, res) => {
    try {
      const pool = global.dbPool;
      const [alerts] = await pool.execute(`
        SELECT 
          p.id,
          p.name,
          p.stock_quantity,
          p.price,
          c.name as category
        FROM pos_product p
        LEFT JOIN pos_category c ON p.category_id = c.id
        WHERE p.stock_quantity < 10
        ORDER BY p.stock_quantity ASC
        LIMIT 10
      `);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Car Spare Parts POS Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`📊 Inventory Summary: http://localhost:${PORT}/api/inventory-summary`);
    console.log(`⚠️  Low Stock Alerts: http://localhost:${PORT}/api/low-stock-alerts`);
  });
});