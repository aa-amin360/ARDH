import { db, pool } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log("Starting database migration...");
  
  try {
    // Create enums first
    console.log("Creating enum types...");
    await db.execute(sql`
      -- Create role enum
      CREATE TYPE user_role AS ENUM ('admin', 'data_entry');
      
      -- Create flat type enum
      CREATE TYPE flat_type AS ENUM ('1BHK', '2BHK', '3BHK', '4BHK', 'penthouse');
      
      -- Create income type enum
      CREATE TYPE income_type AS ENUM ('rent', 'maintenance', 'tax_return', 'other');
      
      -- Create tenant status enum
      CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'notice_period');
      
      -- Create updated expense category enum
      CREATE TYPE expense_category AS ENUM (
        'Utility', 'Operational', 'General Maintenance Works', 'Government',
        'Capital Expense for Facilities', 'Charity', 'Guest Related'
      );
      
      -- Create expense subcategory enum
      CREATE TYPE expense_subcategory AS ENUM (
        'Electrical Bill', 'Water Tanker', 'Generator Diesel', 'CCTV Maintenance',
        'WiFi Bill', 'Elevator Maintenance', 'General Building Maintenance',
        'Other misc Donation', 'Cleaning works', 'Guest Hospitality Exp / Meal',
        'Other'
      );
      
      -- Create vendor service type enum
      CREATE TYPE vendor_service_type AS ENUM (
        'electricity', 'plumbing', 'carpenter', 'painting', 'cleaning',
        'security', 'maintenance', 'other'
      );
      
      -- Create vendor provision type enum
      CREATE TYPE vendor_provision_type AS ENUM ('service', 'product', 'both');
      
      -- Create lease status enum
      CREATE TYPE lease_status AS ENUM ('Leasable', 'Non-Leasable');
      
      -- Create apartment floor enum
      CREATE TYPE apartment_floor AS ENUM ('1', '2', '3', '4', '5', '6');
    `);
    
    // Create users table
    console.log("Creating users table...");
    await db.execute(sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role user_role NOT NULL,
        email TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create properties table with new fields
    console.log("Creating properties table...");
    await db.execute(sql`
      CREATE TABLE properties (
        id SERIAL PRIMARY KEY,
        flat_number TEXT NOT NULL UNIQUE,
        nestaway_id TEXT,
        lease_status lease_status NOT NULL DEFAULT 'Leasable',
        apartment_floor apartment_floor NOT NULL,
        flat_type flat_type NOT NULL,
        owner_name TEXT NOT NULL,
        expected_rent INTEGER NOT NULL,
        maintenance_fee INTEGER NOT NULL,
        water_cost INTEGER,
        is_rented BOOLEAN NOT NULL DEFAULT FALSE,
        current_tenant TEXT,
        floor_area REAL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create incomes table
    console.log("Creating incomes table...");
    await db.execute(sql`
      CREATE TABLE incomes (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        amount INTEGER NOT NULL,
        type income_type NOT NULL,
        description TEXT NOT NULL,
        property_id INTEGER REFERENCES properties(id),
        received_from TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create expenses table with new fields
    console.log("Creating expenses table...");
    await db.execute(sql`
      CREATE TABLE expenses (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        amount INTEGER NOT NULL,
        category expense_category NOT NULL,
        subcategory expense_subcategory NOT NULL,
        description TEXT NOT NULL,
        vendor TEXT,
        property_id INTEGER REFERENCES properties(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        
        tanker_number TEXT,
        liters INTEGER,
        person_in_charge TEXT,
        time TEXT,
        attachment_url TEXT,
        
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create water tanks table
    console.log("Creating water tanks table...");
    await db.execute(sql`
      CREATE TABLE water_tanks (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        liters INTEGER NOT NULL,
        tanker_number TEXT NOT NULL,
        person_in_charge TEXT NOT NULL,
        cost INTEGER NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create tenants table
    console.log("Creating tenants table...");
    await db.execute(sql`
      CREATE TABLE tenants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        property_id INTEGER NOT NULL REFERENCES properties(id),
        rent_amount INTEGER NOT NULL,
        security_deposit INTEGER NOT NULL,
        lease_start_date DATE NOT NULL,
        lease_end_date DATE NOT NULL,
        status tenant_status NOT NULL DEFAULT 'active',
        notice_period_end_date DATE,
        aadhar_number TEXT,
        pan_number TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create vendors table
    console.log("Creating vendors table...");
    await db.execute(sql`
      CREATE TABLE vendors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        service_type vendor_service_type NOT NULL,
        provision_type vendor_provision_type NOT NULL DEFAULT 'service',
        address TEXT,
        notes TEXT,
        contact_person TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create session table for auth
    console.log("Creating session table...");
    await db.execute(sql`
      CREATE TABLE "session" (
        "sid" varchar NOT NULL PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
    `);
    
    console.log("Database migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("Migration process finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration process failed:", error);
    process.exit(1);
  });