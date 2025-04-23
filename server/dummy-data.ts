import { storage } from './storage';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { db } from './db';
import { users, incomes, expenses } from '@shared/schema';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Seed database with dummy data for the dashboard
 */
export async function seedDummyData() {
  console.log('Seeding dummy data for visualizations...');
  
  try {
    // Get admin user
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    if (adminUsers.length === 0) {
      console.error('Admin user not found. Cannot seed dummy data.');
      return;
    }
    const adminUser = adminUsers[0];
    
    // Check if we already have income data
    const existingIncomes = await db.select().from(incomes).limit(1);
    if (existingIncomes.length > 0) {
      console.log('Income data already exists, skipping income seeding.');
      return;
    }
    
    // Create income records (rent payments)
    const currentDate = new Date();
    const monthsToAdd = 6; // Add 6 months of data
    
    // Existing properties for reference
    const properties = await storage.getProperties();
    
    // Add income records (rent payments)
    for (let i = 0; i < monthsToAdd; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      // Format date as YYYY-MM-DD string
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      // Add rent payments for different properties
      for (const property of properties) {
        // Calculate rent based on flat type
        let rentAmount = 0;
        switch (property.flatType) {
          case '1BHK':
            rentAmount = 15000 + Math.floor(Math.random() * 2000); // Randomize slightly
            break;
          case '2BHK':
            rentAmount = 22000 + Math.floor(Math.random() * 3000);
            break;
          case '3BHK':
            rentAmount = 35000 + Math.floor(Math.random() * 5000);
            break;
          case 'penthouse':
            rentAmount = 60000 + Math.floor(Math.random() * 10000);
            break;
          default:
            rentAmount = 20000;
        }
        
        // Add rent income
        await db.insert(incomes).values({
          type: 'rent',
          amount: rentAmount,
          date: new Date(formattedDate),
          description: `Rent for ${property.flatNumber} (${property.flatType})`,
          propertyId: property.id,
          receivedFrom: 'Nestaway',
          createdBy: adminUser.id,
          createdAt: new Date(),
        });
        
        // Add maintenance income (only once a month for each property)
        if (i === 0 || Math.random() > 0.7) { // Add maintenance for current month and some random months
          const maintenanceAmount = property.flatType === '1BHK' ? 1000 : 
                                    property.flatType === '2BHK' ? 1500 : 
                                    property.flatType === '3BHK' ? 2000 : 3000;
          
          await db.insert(incomes).values({
            type: 'maintenance',
            amount: maintenanceAmount,
            date: new Date(formattedDate),
            description: `Maintenance fee for ${property.flatNumber} (${property.flatType})`,
            propertyId: property.id,
            receivedFrom: 'Resident',
            createdBy: adminUser.id,
            createdAt: new Date(),
          });
        }
      }
      
      // Add a few tax return entries (once every 3 months)
      if (i % 3 === 0) {
        await db.insert(incomes).values({
          type: 'tax_return',
          amount: 15000 + Math.floor(Math.random() * 5000),
          date: new Date(formattedDate),
          description: 'Property tax return',
          propertyId: null,
          receivedFrom: 'Income Tax Department',
          createdBy: adminUser.id,
          createdAt: new Date(),
        });
      }
    }
    
    // Add expense records
    const expenseCategories = [
      'electricity', 
      'water', 
      'maintenance', 
      'repair', 
      'property_tax', 
      'insurance', 
      'legal', 
      'management',
      'water_tank'
    ];
    
    for (let i = 0; i < monthsToAdd; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      // Format date as YYYY-MM-DD string
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      // Add standard monthly expenses
      await db.insert(expenses).values({
        category: 'electricity',
        amount: 12000 + Math.floor(Math.random() * 3000),
        date: new Date(formattedDate),
        description: 'Common area electricity bill',
        propertyId: null,
        vendor: 'City Power Corp',
        createdBy: adminUser.id,
        createdAt: new Date(),
      });
      
      await db.insert(expenses).values({
        category: 'water_tank',
        amount: 8000 + Math.floor(Math.random() * 2000),
        date: new Date(formattedDate),
        description: 'Building water charges',
        propertyId: null,
        vendor: 'City Water Supply',
        createdBy: adminUser.id,
        createdAt: new Date(),
      });
      
      await db.insert(expenses).values({
        category: 'water_tank',
        amount: 2500 + Math.floor(Math.random() * 800),
        date: new Date(formattedDate),
        description: 'Water tank cleaning and maintenance',
        propertyId: null,
        vendor: 'Clean Tank Services',
        createdBy: adminUser.id,
        createdAt: new Date(),
      });
      
      // Add random repairs and maintenance expenses
      if (Math.random() > 0.6) {
        const randomProperty = properties[Math.floor(Math.random() * properties.length)];
        
        await db.insert(expenses).values({
          category: 'general_building_maintenance',
          amount: 5000 + Math.floor(Math.random() * 15000),
          date: new Date(formattedDate),
          description: `Plumbing repair for ${randomProperty.flatNumber}`,
          propertyId: randomProperty.id,
          vendor: 'Fix-It Plumbing',
          createdBy: adminUser.id,
          createdAt: new Date(),
        });
      }
      
      // Add quarterly maintenance
      if (i % 3 === 0) {
        await db.insert(expenses).values({
          category: 'general_building_maintenance',
          amount: 30000 + Math.floor(Math.random() * 10000),
          date: new Date(formattedDate),
          description: 'Quarterly building maintenance',
          propertyId: null,
          vendor: 'BuildMaintain Inc.',
          createdBy: adminUser.id,
          createdAt: new Date(),
        });
      }
      
      // Add annual expenses
      if (i === 0) {
        await db.insert(expenses).values({
          category: 'misc',
          amount: 120000,
          date: new Date(formattedDate),
          description: 'Annual property tax',
          propertyId: null,
          vendor: 'Municipal Corporation',
          createdBy: adminUser.id,
          createdAt: new Date(),
        });
        
        await db.insert(expenses).values({
          category: 'misc',
          amount: 75000,
          date: new Date(formattedDate),
          description: 'Building insurance premium',
          propertyId: null,
          vendor: 'SecureProperty Insurance',
          createdBy: adminUser.id,
          createdAt: new Date(),
        });
      }
    }
    
    console.log('Dummy data seeded successfully!');
  } catch (error) {
    console.error('Error seeding dummy data:', error);
  }
}