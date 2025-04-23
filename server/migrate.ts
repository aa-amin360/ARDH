import { db } from './db';
import * as schema from '../shared/schema';

async function runMigration() {
  console.log('Starting database migration...');
  try {
    // Skip enum creation as they probably already exist
    // Just focus on creating missing tables

    // Create tables based on schema
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" "user_role" NOT NULL,
        "email" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create vendors table (needs to be created before expenses for foreign key reference)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "vendors" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "contact" TEXT NOT NULL,
        "email" TEXT,
        "service_type" "vendor_service_type" NOT NULL,
        "provision_type" "vendor_provision_type" NOT NULL,
        "address" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER REFERENCES "users"("id")
      );
    `);

    // Create properties table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "properties" (
        "id" SERIAL PRIMARY KEY,
        "flat_number" TEXT NOT NULL UNIQUE,
        "flat_type" "flat_type" NOT NULL,
        "owner" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER REFERENCES "users"("id")
      );
    `);

    // Create incomes table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "incomes" (
        "id" SERIAL PRIMARY KEY,
        "date" DATE NOT NULL,
        "amount" NUMERIC(10, 2) NOT NULL,
        "property_id" INTEGER REFERENCES "properties"("id"),
        "type" "income_type" NOT NULL,
        "description" TEXT,
        "file_path" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER REFERENCES "users"("id")
      );
    `);

    // Create expenses table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "expenses" (
        "id" SERIAL PRIMARY KEY,
        "date" DATE NOT NULL,
        "amount" NUMERIC(10, 2) NOT NULL,
        "category" "expense_category" NOT NULL,
        "description" TEXT,
        "file_path" TEXT,
        "additional_info" JSONB,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER REFERENCES "users"("id"),
        "vendor_id" INTEGER REFERENCES "vendors"("id")
      );
    `);

    // Create water_tanks table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "water_tanks" (
        "id" SERIAL PRIMARY KEY,
        "date" DATE NOT NULL,
        "time" TIME NOT NULL,
        "tanker_number" TEXT NOT NULL,
        "liters" INTEGER NOT NULL,
        "person_in_charge" TEXT NOT NULL,
        "photo_path" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER REFERENCES "users"("id")
      );
    `);

    // Create tenants table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "contact" TEXT NOT NULL,
        "email" TEXT,
        "property_id" INTEGER REFERENCES "properties"("id"),
        "status" "tenant_status" NOT NULL,
        "start_date" DATE,
        "end_date" DATE,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER REFERENCES "users"("id")
      );
    `);

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

runMigration().catch(console.error);

export default runMigration;