import { db } from './db';
import { users, properties, flatTypeEnum } from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Helper function to hash password
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Owner names from requirements
const ownerNames = [
  'Mohammed Afzal',
  'Ruksana Parveen',
  'Mohammed Ashraf',
  'Mohammed Anas',
  'Mohammed Abdurrahman'
];

// Get flat type based on flat number
function getFlatType(flatNumber: string): 'penthouse' | '3BHK' | '2BHK' | '1BHK' {
  const numPart = parseInt(flatNumber.substring(1));
  const floor = Math.floor(numPart / 100);
  const unitNumber = numPart % 100;
  
  // Special cases mentioned in requirements
  if (flatNumber === '103') return '3BHK';
  if (flatNumber === '402') return '1BHK';
  
  // Standard patterns
  if (unitNumber === 1) return '1BHK';
  if (unitNumber === 2 && flatNumber !== '402') return '2BHK';
  if (unitNumber === 3 || unitNumber === 4) return '1BHK';
  
  // Default (should not reach here)
  return '1BHK';
}

export async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // 1. Create admin and data entry users
    const adminExists = await db.select().from(users).where(eb => eb.eq(users.username, 'admin')).limit(1);
    
    if (adminExists.length === 0) {
      console.log('Creating admin user...');
      await db.insert(users).values({
        username: 'admin',
        password: await hashPassword('admin123'),
        name: 'Administrator',
        role: 'admin',
        email: 'admin@ardh.com',
        createdAt: new Date()
      });
    }
    
    const dataEntryExists = await db.select().from(users).where(eb => eb.eq(users.username, 'dataentry')).limit(1);
    
    if (dataEntryExists.length === 0) {
      console.log('Creating data entry user...');
      await db.insert(users).values({
        username: 'dataentry',
        password: await hashPassword('data123'),
        name: 'Data Entry User',
        role: 'data_entry',
        email: 'dataentry@ardh.com',
        createdAt: new Date()
      });
    }
    
    // 2. Create properties based on requirements
    const propertiesExist = await db.select().from(properties).limit(1);
    
    if (propertiesExist.length === 0) {
      console.log('Creating properties...');
      
      // All flat numbers based on requirements
      const flatNumbers = [
        '101', '102', '103',
        '201', '202', '203', '204',
        '301', '302', '303', '304',
        '401', '402', '403', '404',
        '501', '502', '503', '504'
      ];
      
      // Prepare property data
      const propertyData = flatNumbers.map((flatNumber, index) => {
        const flatType = getFlatType(flatNumber);
        const maintenanceFee = flatType === '1BHK' ? 1000 : 1500;
        const expectedRent = flatType === '1BHK' ? 15000 : 
                             flatType === '2BHK' ? 20000 : 
                             flatType === '3BHK' ? 30000 : 40000;
        
        // Assign owner in rotation (to distribute flats among owners)
        const ownerName = ownerNames[index % ownerNames.length];
        
        return {
          flatNumber,
          flatType: flatType as any,
          ownerName,
          expectedRent,
          maintenanceFee,
          isRented: Math.random() > 0.3, // 70% chance of being rented
          currentTenant: null,
          floorArea: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      // Insert all properties
      for (const property of propertyData) {
        await db.insert(properties).values(property);
      }
    }
    
    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}