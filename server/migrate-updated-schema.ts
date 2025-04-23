import { db, pool } from './db';
import { properties, expenses } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function migrateDatabase() {
  console.log("Starting schema migration...");
  
  try {
    // Start a transaction
    await db.execute(sql`BEGIN`);
    
    // Create new enum types first
    console.log("Creating new enum types...");
    await db.execute(sql`
      -- Create lease status enum
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lease_status') THEN
          CREATE TYPE lease_status AS ENUM ('Leasable', 'Non-Leasable');
        END IF;
      END$$;
      
      -- Create apartment floor enum
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'apartment_floor') THEN
          CREATE TYPE apartment_floor AS ENUM ('1', '2', '3', '4', '5', '6');
        END IF;
      END$$;
      
      -- Create expense subcategory enum
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_subcategory') THEN
          CREATE TYPE expense_subcategory AS ENUM (
            'Electrical Bill', 'Water Tanker', 'Generator Diesel', 'CCTV Maintenance',
            'WiFi Bill', 'Elevator Maintenance', 'General Building Maintenance',
            'Other misc Donation', 'Cleaning works', 'Guest Hospitality Exp / Meal',
            'Other'
          );
        END IF;
      END$$;
      
      -- Check if we need to update the expense_category enum
      DO $$
      BEGIN
        -- Drop and recreate if it exists
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
          -- Create a temporary table to store existing data
          CREATE TEMP TABLE temp_expenses AS SELECT * FROM expenses;
          
          -- Drop existing table and type
          DROP TABLE expenses;
          DROP TYPE expense_category;
          
          -- Create the new enum type
          CREATE TYPE expense_category AS ENUM (
            'Utility', 'Operational', 'General Maintenance Works', 'Government',
            'Capital Expense for Facilities', 'Charity', 'Guest Related'
          );
          
          -- Recreate expenses table with updated enum
          CREATE TABLE expenses (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP NOT NULL,
            amount INTEGER NOT NULL,
            category expense_category NOT NULL,
            description TEXT NOT NULL,
            vendor TEXT,
            property_id INTEGER REFERENCES properties(id),
            created_by INTEGER NOT NULL REFERENCES users(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            
            -- New fields
            subcategory expense_subcategory,
            tanker_number TEXT,
            liters INTEGER,
            person_in_charge TEXT,
            time TEXT,
            attachment_url TEXT
          );
          
          -- Reinsert data with default mappings for new categories
          INSERT INTO expenses (
            id, date, amount, description, vendor, property_id, created_by, created_at,
            category, subcategory
          )
          SELECT 
            id, date, amount, description, vendor, property_id, created_by, created_at,
            CASE 
              WHEN category::TEXT IN ('electricity', 'water_tank', 'generator_fuel', 'internet', 'drainage_cleaning', 'general_building_maintenance') THEN 'Utility'
              WHEN category::TEXT IN ('cctv_maintenance', 'elevator_maintenance') THEN 'General Maintenance Works'
              WHEN category::TEXT = 'donation' THEN 'Charity'
              WHEN category::TEXT = 'guest_expense' THEN 'Guest Related'
              ELSE 'Utility'
            END::expense_category,
            CASE 
              WHEN category::TEXT = 'electricity' THEN 'Electrical Bill'
              WHEN category::TEXT = 'water_tank' THEN 'Water Tanker'
              WHEN category::TEXT = 'generator_fuel' THEN 'Generator Diesel'
              WHEN category::TEXT = 'cctv_maintenance' THEN 'CCTV Maintenance'
              WHEN category::TEXT = 'internet' THEN 'WiFi Bill'
              WHEN category::TEXT = 'elevator_maintenance' THEN 'Elevator Maintenance'
              WHEN category::TEXT = 'general_building_maintenance' THEN 'General Building Maintenance'
              WHEN category::TEXT = 'donation' THEN 'Other misc Donation'
              WHEN category::TEXT = 'drainage_cleaning' THEN 'Cleaning works'
              WHEN category::TEXT = 'guest_expense' THEN 'Guest Hospitality Exp / Meal'
              ELSE 'Other'
            END::expense_subcategory
          FROM temp_expenses;
          
          -- Drop temporary table
          DROP TABLE temp_expenses;
        END IF;
      END$$;
    `);
    
    // Add new fields to properties table
    console.log("Updating properties table...");
    await db.execute(sql`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS nestaway_id TEXT,
      ADD COLUMN IF NOT EXISTS lease_status lease_status NOT NULL DEFAULT 'Leasable',
      ADD COLUMN IF NOT EXISTS apartment_floor apartment_floor NOT NULL DEFAULT '1',
      ADD COLUMN IF NOT EXISTS water_cost INTEGER
    `);
    
    // Update existing expenses categories to match new enum values
    // For enums, we need to be more careful. First add all required enums
    console.log("Creating the new enum values if they don't exist...");
    await db.execute(sql`
      -- Update the expense_category enum type
      ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Utility';
      ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Operational';
      ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'General Maintenance Works';
      ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Government';
      ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Capital Expense for Facilities';
      ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Charity';
      ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Guest Related';
      
      -- Update the expense_subcategory enum type
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'Electrical Bill';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'Water Tanker';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'Generator Diesel';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'CCTV Maintenance';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'WiFi Bill';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'Elevator Maintenance';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'General Building Maintenance';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'Other misc Donation';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'Cleaning works';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'Guest Hospitality Exp / Meal';
      ALTER TYPE expense_subcategory ADD VALUE IF NOT EXISTS 'Other';
    `);
    
    // Since we can't cast directly, let's create a temporary category column
    console.log("Creating temporary columns for the migration...");
    await db.execute(sql`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS temp_category TEXT;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS temp_subcategory TEXT;
    `);
    
    // Update the temporary column
    console.log("Setting temporary column values...");
    await db.execute(sql`
      UPDATE expenses 
      SET temp_category = CASE 
        WHEN category::TEXT = 'electricity' THEN 'Utility'
        WHEN category::TEXT = 'water_tank' THEN 'Utility'
        WHEN category::TEXT = 'generator_fuel' THEN 'Utility'
        WHEN category::TEXT = 'cctv_maintenance' THEN 'General Maintenance Works'
        WHEN category::TEXT = 'internet' THEN 'Utility'
        WHEN category::TEXT = 'elevator_maintenance' THEN 'General Maintenance Works'
        WHEN category::TEXT = 'general_building_maintenance' THEN 'Utility'
        WHEN category::TEXT = 'donation' THEN 'Charity'
        WHEN category::TEXT = 'drainage_cleaning' THEN 'Utility'
        WHEN category::TEXT = 'guest_expense' THEN 'Guest Related'
        WHEN category::TEXT = 'misc' THEN 'Utility'
        ELSE 'Utility'
      END,
      temp_subcategory = CASE 
        WHEN category::TEXT = 'electricity' THEN 'Electrical Bill'
        WHEN category::TEXT = 'water_tank' THEN 'Water Tanker'
        WHEN category::TEXT = 'generator_fuel' THEN 'Generator Diesel'
        WHEN category::TEXT = 'cctv_maintenance' THEN 'CCTV Maintenance'
        WHEN category::TEXT = 'internet' THEN 'WiFi Bill'
        WHEN category::TEXT = 'elevator_maintenance' THEN 'Elevator Maintenance'
        WHEN category::TEXT = 'general_building_maintenance' THEN 'General Building Maintenance'
        WHEN category::TEXT = 'donation' THEN 'Other misc Donation'
        WHEN category::TEXT = 'drainage_cleaning' THEN 'Cleaning works'
        WHEN category::TEXT = 'guest_expense' THEN 'Guest Hospitality Exp / Meal'
        WHEN category::TEXT = 'misc' THEN 'Other'
        ELSE 'Other'
      END
    `);
      
    // Now update the actual enum columns
    console.log("Updating the actual enum columns...");
    await db.execute(sql`
      UPDATE expenses 
      SET 
        category = temp_category::expense_category,
        subcategory = temp_subcategory::expense_subcategory
    `);
      
    // Remove the temporary columns
    console.log("Removing temporary columns...");
    await db.execute(sql`
      ALTER TABLE expenses DROP COLUMN temp_category;
      ALTER TABLE expenses DROP COLUMN temp_subcategory;
    `);
    
    // Update properties with their floors based on flat numbers
    console.log("Setting apartment floors based on flat numbers...");
    await db.execute(sql`
      UPDATE properties
      SET apartment_floor = SUBSTRING(flat_number, 1, 1)
    `);
    
    // Import property data from Excel export (optional here - this is handled with frontend UI)
    
    // Commit the transaction
    await db.execute(sql`COMMIT`);
    
    console.log("Schema migration completed successfully!");
  } catch (error) {
    // Rollback in case of error
    await db.execute(sql`ROLLBACK`);
    console.error("Migration failed:", error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration
migrateDatabase()
  .then(() => {
    console.log("Migration process finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration process failed:", error);
    process.exit(1);
  });