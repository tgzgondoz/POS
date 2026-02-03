const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

async function resetDatabase() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log("📊 Connected to database");
    console.log("⚠️  WARNING: This will delete ALL data from all tables!");
    console.log("   Tables to be truncated:");
    console.log("   - pos_order_item");
    console.log("   - pos_order");
    console.log("   - pos_product");
    console.log("   - pos_category");
    console.log("   - pos_user");

    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Are you sure? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        try {
          // Disable foreign key checks
          await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
          
          // Truncate tables in correct order (child tables first)
          await connection.execute("TRUNCATE TABLE pos_order_item");
          console.log("✅ Truncated pos_order_item");
          
          await connection.execute("TRUNCATE TABLE pos_order");
          console.log("✅ Truncated pos_order");
          
          await connection.execute("TRUNCATE TABLE pos_product");
          console.log("✅ Truncated pos_product");
          
          await connection.execute("TRUNCATE TABLE pos_category");
          console.log("✅ Truncated pos_category");
          
          await connection.execute("TRUNCATE TABLE pos_user");
          console.log("✅ Truncated pos_user");
          
          // Re-enable foreign key checks
          await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
          
          console.log("\n✅ All tables have been truncated successfully!");
          
          // Show table counts
          const [counts] = await connection.execute(`
            SELECT 
              'pos_user' as table_name, COUNT(*) as row_count FROM pos_user
            UNION ALL
            SELECT 
              'pos_category', COUNT(*) FROM pos_category
            UNION ALL
            SELECT 
              'pos_product', COUNT(*) FROM pos_product
            UNION ALL
            SELECT 
              'pos_order', COUNT(*) FROM pos_order
            UNION ALL
            SELECT 
              'pos_order_item', COUNT(*) FROM pos_order_item
          `);
          
          console.log("\n📊 Current table row counts:");
          counts.forEach(row => {
            console.log(`   ${row.table_name}: ${row.row_count} rows`);
          });
          
        } catch (error) {
          console.error("❌ Error truncating tables:", error.message);
        }
      } else {
        console.log("❌ Operation cancelled.");
      }
      
      readline.close();
      await connection.end();
      process.exit(0);
    });
    
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

resetDatabase();