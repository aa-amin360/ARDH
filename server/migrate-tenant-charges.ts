
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateTenantCharges() {
  try {
    console.log("Starting tenant charges migration...");
    
    // Drop existing tenant_charges table if it exists
    await db.execute(sql`DROP TABLE IF EXISTS tenant_charges`);
    
    // Create tenant_charges table with correct column names
    await db.execute(sql`
      CREATE TABLE tenant_charges (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id),
        flat_number TEXT NOT NULL,
        charge_type charge_type NOT NULL,
        amount INTEGER NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

migrateTenantCharges().catch(console.error);
