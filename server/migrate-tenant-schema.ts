import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Add the flat_number column to the tenants table
 */
async function migrateTenantSchema() {
  console.log('Starting tenant schema migration...');
  
  try {
    // Check if the flat_number column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tenants' AND column_name='flat_number'
    `);
    
    // If the column doesn't exist, add it
    if (checkColumn.rowCount === 0) {
      console.log('Adding flat_number column to tenants table...');
      await db.execute(sql`
        ALTER TABLE tenants 
        ADD COLUMN flat_number TEXT
      `);
      
      // Update existing tenant records to set flat_number based on propertyId
      console.log('Updating existing tenant records with flat_number...');
      await db.execute(sql`
        UPDATE tenants
        SET flat_number = properties.flat_number
        FROM properties
        WHERE tenants.property_id = properties.id
      `);
      
      // Now make the column not null for future records
      console.log('Setting flat_number column to NOT NULL...');
      await db.execute(sql`
        ALTER TABLE tenants 
        ALTER COLUMN flat_number SET NOT NULL
      `);
      
      console.log('Tenant schema migration completed successfully');
    } else {
      console.log('flat_number column already exists in tenants table');
    }
  } catch (error) {
    console.error('Error migrating tenant schema:', error);
    throw error;
  }
}

// Run the migration
migrateTenantSchema()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });