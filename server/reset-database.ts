import { db, pool } from './db';
import { sql } from 'drizzle-orm';

async function resetDatabase() {
  console.log("Starting database reset and recreation...");
  
  try {
    // Start by dropping all tables (in reverse order to avoid foreign key constraints)
    console.log("Dropping existing tables...");
    await db.execute(sql`
      DROP TABLE IF EXISTS water_tanks CASCADE;
      DROP TABLE IF EXISTS expenses CASCADE;
      DROP TABLE IF EXISTS incomes CASCADE;
      DROP TABLE IF EXISTS tenants CASCADE;
      DROP TABLE IF EXISTS vendors CASCADE;
      DROP TABLE IF EXISTS properties CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS session CASCADE;
    `);
    
    // Now drop all enum types
    console.log("Dropping enum types...");
    await db.execute(sql`
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS flat_type CASCADE;
      DROP TYPE IF EXISTS income_type CASCADE;
      DROP TYPE IF EXISTS tenant_status CASCADE;
      DROP TYPE IF EXISTS expense_category CASCADE;
      DROP TYPE IF EXISTS expense_subcategory CASCADE;
      DROP TYPE IF EXISTS vendor_service_type CASCADE;
      DROP TYPE IF EXISTS vendor_provision_type CASCADE;
      DROP TYPE IF EXISTS lease_status CASCADE;
      DROP TYPE IF EXISTS apartment_floor CASCADE;
    `);
    
    console.log("Database reset completed successfully.");
  } catch (error) {
    console.error("Database reset failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log("Database reset process finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database reset process failed:", error);
    process.exit(1);
  });