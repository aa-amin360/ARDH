import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Add the created_by and created_at columns to the property_charges table
 */
async function migratePropertyChargesSchema() {
  console.log('Starting property_charges table migration...');

  // Check if the column exists before trying to add it
  const columnCheck = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'property_charges' 
    AND column_name = 'created_by';
  `);

  if (columnCheck.rows.length === 0) {
    console.log('Adding created_by column to property_charges table...');
    await db.execute(sql`
      ALTER TABLE property_charges
      ADD COLUMN created_by INTEGER REFERENCES users(id);
    `);
  } else {
    console.log('created_by column already exists in property_charges table.');
  }

  // Check if the created_at column exists
  const createdAtCheck = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'property_charges' 
    AND column_name = 'created_at';
  `);

  if (createdAtCheck.rows.length === 0) {
    console.log('Adding created_at column to property_charges table...');
    await db.execute(sql`
      ALTER TABLE property_charges
      ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
    `);
  } else {
    console.log('created_at column already exists in property_charges table.');
  }

  console.log('property_charges table migration completed successfully.');
}

// Execute the migration function
migratePropertyChargesSchema().then(() => {
  console.log('Migration completed.');
  process.exit(0);
}).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});