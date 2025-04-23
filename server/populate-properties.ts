import { db, pool } from './db';
import { properties } from '@shared/schema';
import { FLATS } from '@shared/constants';
import { sql } from 'drizzle-orm';

/**
 * Script to populate the properties table with data from the FLATS constant
 */
async function populateProperties() {
  try {
    console.log("Starting property population from constants...");
    
    // First, get all existing property flat numbers
    const existingProperties = await db.select({ flatNumber: properties.flatNumber })
      .from(properties)
      .execute();
    
    const existingFlatNumbers = new Set(existingProperties.map(p => p.flatNumber));
    
    // Add properties from the FLATS constant
    for (const flat of FLATS) {
      if (!existingFlatNumbers.has(flat.flatNumber)) {
        // Get floor from the flat number (first digit)
        const floor = flat.flatNumber.charAt(0);
        
        // Create the property
        await db.insert(properties).values({
          flatNumber: flat.flatNumber,
          nestawayId: flat.nestawayId || null,
          flatType: flat.flatType,
          ownerName: flat.owner,
          // Set default values for required fields
          apartmentFloor: floor as any,
          leaseStatus: 'Leasable',
          expectedRent: flat.flatType === '1BHK' ? 15000 : flat.flatType === '2BHK' ? 20000 : 30000,
          maintenanceFee: flat.flatType === '1BHK' ? 1000 : flat.flatType === '2BHK' ? 1500 : 2000,
          waterCost: flat.flatType === '1BHK' ? 500 : flat.flatType === '2BHK' ? 800 : 1000,
          isRented: false
        });
        
        console.log(`Added property: ${flat.flatNumber} - ${flat.flatType} (${flat.owner})`);
      } else {
        console.log(`Property already exists: ${flat.flatNumber}`);
      }
    }
    
    console.log("Property population completed successfully");
  } catch (error) {
    console.error("Property population failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
populateProperties()
  .then(() => {
    console.log("Property population process finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Property population process failed:", error);
    process.exit(1);
  });