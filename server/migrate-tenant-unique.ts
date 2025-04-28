
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateTenantUnique() {
  try {
    console.log('Starting tenant unique constraint migration...');
    
    // Drop the unique constraint if it exists
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'unique_tenant_id'
        ) THEN
          ALTER TABLE tenants DROP CONSTRAINT unique_tenant_id;
        END IF;
      END $$;
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateTenantUnique()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
