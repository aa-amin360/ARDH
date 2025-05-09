import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Script to add attachment-related columns to the database
 */
async function migrateAttachmentSchema() {
  console.log("Running attachment schema migration...");
  
  try {
    // Create the attachments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        filetype TEXT NOT NULL,
        filesize INTEGER NOT NULL,
        data TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log("Created attachments table");

    // Add attachment_id to incomes table
    await db.execute(sql`
      ALTER TABLE incomes 
      ADD COLUMN IF NOT EXISTS attachment_id INTEGER;
    `);
    console.log("Added attachment_id to incomes table");

    // Add attachment_id to expenses table (replacing attachment_url if exists)
    await db.execute(sql`
      ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS attachment_id INTEGER;
    `);
    console.log("Added attachment_id to expenses table");

    console.log("Attachment schema migration completed successfully");
  } catch (error) {
    console.error("Error during attachment schema migration:", error);
    throw error;
  }
}

// Run the migration
migrateAttachmentSchema()
  .then(() => {
    console.log("Attachment schema migration complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Attachment schema migration failed:", error);
    process.exit(1);
  });