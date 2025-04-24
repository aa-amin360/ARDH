import { db } from "./db";
import { vendors, vendorServiceTypeEnum } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Migrate vendor service types to lowercase
 */
async function migrateVendorEnum() {
  console.log("Starting vendor service type enum migration...");

  try {
    // Update vendor service types to lowercase
    await db.execute(sql`
      UPDATE vendors
      SET service_type = LOWER(service_type)
      WHERE service_type IS NOT NULL
    `);

    console.log("Vendor service type enum migration completed successfully");
  } catch (error) {
    console.error("Error during vendor enum migration:", error);
    throw error;
  }
}

// Execute migration when this script is run directly
if (require.main === module) {
  migrateVendorEnum()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateVendorEnum };