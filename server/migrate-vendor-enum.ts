import { db } from "./db";
import { vendors, vendorServiceTypeEnum } from "@shared/schema";
import { sql } from "drizzle-orm";
import { fileURLToPath } from 'url';
import path from 'path';

// Get the current file URL and path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migrate vendor service types to lowercase
 */
async function migrateVendorEnum() {
  console.log("Starting vendor service type enum migration...");

  try {
    // Update vendor service types to lowercase
    await db.execute(sql`
      UPDATE vendors SET service_type = 'electrical' WHERE service_type = 'Electrical';
      UPDATE vendors SET service_type = 'plumbing' WHERE service_type = 'Plumbing';
      UPDATE vendors SET service_type = 'wood_work' WHERE service_type = 'Wood_work';
      UPDATE vendors SET service_type = 'paint_job' WHERE service_type = 'Paint_Job';
      UPDATE vendors SET service_type = 'water' WHERE service_type = 'Water';
      UPDATE vendors SET service_type = 'other' WHERE service_type = 'Other';
    `);

    console.log("Vendor service type enum migration completed successfully");
  } catch (error) {
    console.error("Error during vendor enum migration:", error);
    throw error;
  }
}

// Execute migration
migrateVendorEnum()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });

export { migrateVendorEnum };