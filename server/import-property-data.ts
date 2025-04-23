import { db, pool } from './db';
import { properties } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Use pandas to read the Excel file (ensure pandas and openpyxl are installed)
async function importPropertyData() {
  try {
    console.log("Starting property data import...");
    
    // Run Python script to extract data
    const { spawnSync } = require('child_process');
    const pythonProcess = spawnSync('python3', ['-c', `
import pandas as pd
import json

try:
    # Read the Excel file
    df = pd.read_excel('attached_assets/PropertyDetails.xlsx', sheet_name='Sheet1')
    
    # Convert to JSON
    json_data = df.to_json(orient='records')
    
    # Print the JSON to be captured by Node.js
    print(json_data)
except Exception as e:
    print(f"Error: {str(e)}")
    exit(1)
`]);
    
    if (pythonProcess.status !== 0) {
      throw new Error(`Python process failed: ${pythonProcess.stderr.toString()}`);
    }
    
    // Parse the JSON output from Python
    const jsonOutput = pythonProcess.stdout.toString().trim();
    const propertyData = JSON.parse(jsonOutput);
    
    console.log(`Found ${propertyData.length} properties in Excel file`);
    
    // Import properties into database
    for (const property of propertyData) {
      // Skip rows with missing flat number
      if (!property['Apartment Number']) {
        continue;
      }
      
      const flatNumber = String(property['Apartment Number']);
      
      // Check if property already exists
      const existingProperty = await db.select()
        .from(properties)
        .where(eq(properties.flatNumber, flatNumber))
        .execute();
      
      if (existingProperty.length > 0) {
        // Update existing property
        await db.update(properties)
          .set({
            nestawayId: property['Nestaway-ID'] || null,
            leaseStatus: property['Lease Status'] || 'Leasable',
            apartmentFloor: String(property['Apartment Floor'] || '1'),
            flatType: property['Apartment Type'] || '2BHK',
            ownerName: property['Rent Income Beneficiary'] || 'Unknown',
            expectedRent: property['Rent Receivable'] || 0,
            maintenanceFee: property['Maintenance Cost'] || 0,
            waterCost: property['Water Cost'] || 0,
          })
          .where(eq(properties.flatNumber, flatNumber))
          .execute();
          
        console.log(`Updated property ${flatNumber}`);
      } else {
        // Insert new property
        await db.insert(properties)
          .values({
            flatNumber,
            nestawayId: property['Nestaway-ID'] || null,
            leaseStatus: property['Lease Status'] || 'Leasable',
            apartmentFloor: String(property['Apartment Floor'] || '1'),
            flatType: property['Apartment Type'] || '2BHK',
            ownerName: property['Rent Income Beneficiary'] || 'Unknown',
            expectedRent: property['Rent Receivable'] || 0,
            maintenanceFee: property['Maintenance Cost'] || 0,
            waterCost: property['Water Cost'] || 0,
            isRented: false,
          })
          .execute();
          
        console.log(`Added new property ${flatNumber}`);
      }
    }
    
    console.log("Property data import completed successfully");
  } catch (error) {
    console.error("Property import failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the import
importPropertyData()
  .then(() => {
    console.log("Property import process finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Property import process failed:", error);
    process.exit(1);
  });