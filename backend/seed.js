const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

async function seedDatabase() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log("Connected to database");

    // Hash passwords
    const adminPassword = await bcrypt.hash("admin123", 10);
    const cashierPassword = await bcrypt.hash("cashier123", 10);

    // Insert admin user
    await connection.execute(
      `INSERT INTO pos_user (username, password, name, role) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE password = ?`,
      ["admin", adminPassword, "Admin User", "admin", adminPassword]
    );

    // Insert cashier user
    await connection.execute(
      `INSERT INTO pos_user (username, password, name, role) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE password = ?`,
      ["cashier", cashierPassword, "John Cashier", "cashier", cashierPassword]
    );

    // Insert sample categories if they don't exist
    await connection.execute(
      `INSERT IGNORE INTO pos_category (name, description) VALUES 
       ('Electronics', 'Electronic devices and accessories'),
       ('Groceries', 'Food and household items'),
       ('Clothing', 'Apparel and accessories')`
    );

    // Get category IDs
    const [categories] = await connection.execute("SELECT id, name FROM pos_category");

    // Insert sample products
    for (const category of categories) {
      if (category.name === 'Electronics') {
        await connection.execute(
          `INSERT IGNORE INTO pos_product (name, description, price, stock_quantity, category_id) VALUES 
           ('Laptop', 'High performance laptop', 999.99, 10, ?),
           ('Smartphone', 'Latest smartphone model', 699.99, 25, ?),
           ('Headphones', 'Wireless noise-cancelling headphones', 199.99, 15, ?)`,
          [category.id, category.id, category.id]
        );
      } else if (category.name === 'Groceries') {
        await connection.execute(
          `INSERT IGNORE INTO pos_product (name, description, price, stock_quantity, category_id) VALUES 
           ('Milk', 'Fresh dairy milk', 3.99, 100, ?),
           ('Bread', 'Whole wheat bread', 2.99, 50, ?),
           ('Eggs', 'Farm fresh eggs (dozen)', 4.99, 75, ?)`,
          [category.id, category.id, category.id]
        );
      } else if (category.name === 'Clothing') {
        await connection.execute(
          `INSERT IGNORE INTO pos_product (name, description, price, stock_quantity, category_id) VALUES 
           ('T-Shirt', 'Cotton t-shirt', 19.99, 50, ?),
           ('Jeans', 'Blue denim jeans', 49.99, 30, ?),
           ('Jacket', 'Winter jacket', 89.99, 20, ?)`,
          [category.id, category.id, category.id]
        );
      }
    }

    console.log("Database seeded successfully!");
    console.log("\n=== Default Login Credentials ===");
    console.log("Admin:");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("\nCashier:");
    console.log("  Username: cashier");
    console.log("  Password: cashier123");
    console.log("\n===============================");

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();