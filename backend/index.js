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

let isSeeded = false; // Flag to track if database has been seeded

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
    
    // Check if database is already seeded
    const [userCount] = await pool.execute("SELECT COUNT(*) as count FROM pos_user");
    const [productCount] = await pool.execute("SELECT COUNT(*) as count FROM pos_product");
    
    // Only seed if database is empty
    if (userCount[0].count === 0 && productCount[0].count === 0) {
      console.log("📦 Database is empty, seeding initial data...");
      await seedDatabase(pool);
      isSeeded = true;
    } else {
      console.log("📊 Database already has data, skipping seed...");
      console.log(`   Users: ${userCount[0].count}, Products: ${productCount[0].count}`);
      isSeeded = false;
    }
    
    // Set pool as global for db.js
    global.dbPool = pool;
    
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
  console.log("✅ Database tables created/verified");
}

async function seedDatabase(pool) {
  try {
    console.log("🌱 Seeding database with car spare parts data...");
    
    // Hash passwords
    const adminPassword = await bcrypt.hash("admin123", 10);
    const cashierPassword = await bcrypt.hash("cashier123", 10);

    // Check if users already exist before inserting
    const [existingAdmin] = await pool.execute(
      "SELECT id FROM pos_user WHERE username = 'admin'"
    );
    
    if (existingAdmin.length === 0) {
      await pool.execute(
        `INSERT INTO pos_user (username, password, name, role) VALUES (?, ?, ?, 'admin')`,
        ["admin", adminPassword, "Admin User"]
      );
      console.log("👤 Admin user created");
    }
    
    const [existingCashier] = await pool.execute(
      "SELECT id FROM pos_user WHERE username = 'cashier'"
    );
    
    if (existingCashier.length === 0) {
      await pool.execute(
        `INSERT INTO pos_user (username, password, name, role) VALUES (?, ?, ?, 'cashier')`,
        ["cashier", cashierPassword, "John Cashier"]
      );
      console.log("👤 Cashier user created");
    }

    // Insert car spare parts categories if they don't exist
    const categoriesData = [
      ['Engine Parts', 'Engine components and accessories'],
      ['Brake System', 'Brake pads, discs, and hydraulic parts'],
      ['Suspension', 'Shocks, struts, and suspension components'],
      ['Electrical', 'Batteries, alternators, and wiring'],
      ['Filters & Fluids', 'Oil filters, air filters, and fluids'],
      ['Body Parts', 'Bumpers, lights, and exterior components']
    ];

    for (const [name, description] of categoriesData) {
      const [existingCategory] = await pool.execute(
        "SELECT id FROM pos_category WHERE name = ?",
        [name]
      );
      
      if (existingCategory.length === 0) {
        await pool.execute(
          "INSERT INTO pos_category (name, description) VALUES (?, ?)",
          [name, description]
        );
        console.log(`📁 Category created: ${name}`);
      }
    }

    // Get all categories
    const [categories] = await pool.execute("SELECT id, name FROM pos_category");
    
    // Define products for each category
    const productsByCategory = {
      'Engine Parts': [
        ['Spark Plugs (Set of 4)', 'NGK Iridium spark plugs', 49.99, 100],
        ['Engine Oil 5W-30', 'Synthetic engine oil 5L', 39.99, 50],
        ['Timing Belt Kit', 'Complete timing belt replacement kit', 129.99, 25],
        ['Water Pump', 'OEM replacement water pump', 89.99, 30]
      ],
      'Brake System': [
        ['Brake Pads (Front)', 'Ceramic brake pads - front', 59.99, 75],
        ['Brake Discs (Pair)', 'Vented brake discs - front', 119.99, 40],
        ['Brake Fluid', 'DOT 4 brake fluid 500ml', 12.99, 100],
        ['Brake Caliper', 'Remanufactured brake caliper', 149.99, 20]
      ],
      'Suspension': [
        ['Shock Absorbers (Pair)', 'Gas-filled shock absorbers', 199.99, 30],
        ['Strut Assembly', 'Complete strut assembly', 249.99, 25],
        ['Stabilizer Link', 'Stabilizer bar link kit', 29.99, 60],
        ['Control Arm', 'Front lower control arm', 89.99, 35]
      ],
      'Electrical': [
        ['Car Battery', '12V 60Ah maintenance-free battery', 129.99, 40],
        ['Alternator', '120A alternator replacement', 299.99, 20],
        ['Starter Motor', 'High-torque starter motor', 189.99, 25],
        ['Headlight Bulbs (Pair)', 'H7 LED headlight bulbs', 39.99, 80]
      ],
      'Filters & Fluids': [
        ['Oil Filter', 'Premium synthetic oil filter', 14.99, 120],
        ['Air Filter', 'High-flow air filter', 24.99, 90],
        ['Cabin Air Filter', 'Activated carbon cabin filter', 29.99, 70],
        ['Transmission Fluid', 'ATF fluid 1L', 19.99, 60]
      ],
      'Body Parts': [
        ['Headlight Assembly', 'LED headlight assembly', 349.99, 15],
        ['Front Bumper', 'Primed front bumper', 199.99, 10],
        ['Side Mirror', 'Heated electric side mirror', 89.99, 25],
        ['Windshield Wiper Blades', 'All-season wiper blades (pair)', 29.99, 100]
      ]
    };

    let totalProductsCreated = 0;
    
    for (const category of categories) {
      const products = productsByCategory[category.name];
      if (products) {
        for (const [name, description, price, stock] of products) {
          // Check if product already exists
          const [existingProduct] = await pool.execute(
            "SELECT id FROM pos_product WHERE name = ? AND category_id = ?",
            [name, category.id]
          );
          
          if (existingProduct.length === 0) {
            await pool.execute(
              "INSERT INTO pos_product (name, description, price, stock_quantity, category_id) VALUES (?, ?, ?, ?, ?)",
              [name, description, price, stock, category.id]
            );
            totalProductsCreated++;
          }
        }
      }
    }

    console.log(`\n✅ Database seeding completed!`);
    console.log(`📦 Created ${totalProductsCreated} products`);
    console.log("\n=== Default Login Credentials ===");
    console.log("Admin: admin / admin123");
    console.log("Cashier: cashier / cashier123");
    console.log("\n===========================\n");
    
  } catch (error) {
    console.error("❌ Seed error:", error.message);
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
      seeded: isSeeded,
      endpoints: {
        auth: "/api/auth",
        users: "/api/users",
        products: "/api/products",
        categories: "/api/categories",
        orders: "/api/orders",
        inventory_summary: "/api/inventory-summary",
        low_stock_alerts: "/api/low-stock-alerts",
        reseed: "POST /api/reseed"
      }
    });
  });

  app.get("/health", async (req, res) => {
    try {
      const pool = global.dbPool;
      const [result] = await pool.execute("SELECT 1 as db_status");
      res.json({ 
        status: "ok", 
        database: "connected",
        seeded: isSeeded,
        timestamp: new Date() 
      });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        database: "disconnected",
        error: error.message 
      });
    }
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

  // Manual reseed endpoint (for testing)
  app.post("/api/reseed", async (req, res) => {
    try {
      const { force } = req.body;
      const pool = global.dbPool;
      
      if (force === true) {
        // Truncate tables first
        await pool.execute("SET FOREIGN_KEY_CHECKS = 0");
        await pool.execute("TRUNCATE TABLE pos_order_item");
        await pool.execute("TRUNCATE TABLE pos_order");
        await pool.execute("TRUNCATE TABLE pos_product");
        await pool.execute("TRUNCATE TABLE pos_category");
        await pool.execute("TRUNCATE TABLE pos_user");
        await pool.execute("SET FOREIGN_KEY_CHECKS = 1");
        console.log("🗑️  All tables truncated");
      }
      
      await seedDatabase(pool);
      isSeeded = true;
      
      res.json({ 
        message: "Database reseeded successfully",
        force: force || false,
        timestamp: new Date() 
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get database status
  app.get("/api/database-status", async (req, res) => {
    try {
      const pool = global.dbPool;
      const [userCount] = await pool.execute("SELECT COUNT(*) as count FROM pos_user");
      const [productCount] = await pool.execute("SELECT COUNT(*) as count FROM pos_product");
      const [categoryCount] = await pool.execute("SELECT COUNT(*) as count FROM pos_category");
      const [orderCount] = await pool.execute("SELECT COUNT(*) as count FROM pos_order");
      
      res.json({
        users: userCount[0].count,
        products: productCount[0].count,
        categories: categoryCount[0].count,
        orders: orderCount[0].count,
        seeded: isSeeded,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Car Spare Parts POS Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Database status: http://localhost:${PORT}/api/database-status`);
    console.log(`📦 Inventory Summary: http://localhost:${PORT}/api/inventory-summary`);
    console.log(`⚠️  Low Stock Alerts: http://localhost:${PORT}/api/low-stock-alerts`);
    console.log(`🌱 Reseed database: POST http://localhost:${PORT}/api/reseed with {"force": true}`);
  });
});