// Define the ARDH flat constants

export type FlatInfo = {
  flatNumber: string;
  flatType: '1BHK' | '2BHK' | '3BHK' | 'penthouse';
  owner: string;
};

// Owners
export const OWNERS = [
  'Mohammed Afzal',
  'Ruksana Parveen',
  'Mohammed Ashraf',
  'Mohammed Anas',
  'Mohammed Abdurrahman'
];

// Flat maintenance fees
export const MAINTENANCE_FEES = {
  '1BHK': 1000,
  '2BHK': 1500,
  '3BHK': 2000,
  'penthouse': 2500
};

// All flats in the building with their type and owner
export const FLATS: FlatInfo[] = [
  // 1BHK flats (9 units)
  { flatNumber: '203', flatType: '1BHK', owner: 'Mohammed Afzal' },
  { flatNumber: '204', flatType: '1BHK', owner: 'Mohammed Afzal' },
  { flatNumber: '303', flatType: '1BHK', owner: 'Ruksana Parveen' },
  { flatNumber: '304', flatType: '1BHK', owner: 'Ruksana Parveen' },
  { flatNumber: '402', flatType: '1BHK', owner: 'Mohammed Ashraf' },
  { flatNumber: '403', flatType: '1BHK', owner: 'Mohammed Ashraf' },
  { flatNumber: '404', flatType: '1BHK', owner: 'Mohammed Anas' },
  { flatNumber: '503', flatType: '1BHK', owner: 'Mohammed Anas' },
  { flatNumber: '504', flatType: '1BHK', owner: 'Mohammed Abdurrahman' },
  
  // 2BHK flats (9 units)
  { flatNumber: '101', flatType: '2BHK', owner: 'Mohammed Afzal' },
  { flatNumber: '102', flatType: '2BHK', owner: 'Mohammed Afzal' },
  { flatNumber: '201', flatType: '2BHK', owner: 'Ruksana Parveen' },
  { flatNumber: '202', flatType: '2BHK', owner: 'Ruksana Parveen' },
  { flatNumber: '301', flatType: '2BHK', owner: 'Mohammed Ashraf' },
  { flatNumber: '302', flatType: '2BHK', owner: 'Mohammed Ashraf' },
  { flatNumber: '401', flatType: '2BHK', owner: 'Mohammed Anas' },
  { flatNumber: '501', flatType: '2BHK', owner: 'Mohammed Anas' },
  { flatNumber: '502', flatType: '2BHK', owner: 'Mohammed Abdurrahman' },
  
  // 3BHK flat (1 unit)
  { flatNumber: '103', flatType: '3BHK', owner: 'Mohammed Abdurrahman' }
  
  // Note: One penthouse can be added when required
];

// Helper function to get maintenance fee by flat number
export function getMaintenanceFeeByFlatNumber(flatNumber: string): number {
  const flat = FLATS.find(f => f.flatNumber === flatNumber);
  if (!flat) return 0;
  return MAINTENANCE_FEES[flat.flatType];
}

// Helper function to get flat type by flat number
export function getFlatTypeByFlatNumber(flatNumber: string): string | undefined {
  const flat = FLATS.find(f => f.flatNumber === flatNumber);
  return flat?.flatType;
}

// Helper function to get owner by flat number
export function getOwnerByFlatNumber(flatNumber: string): string | undefined {
  const flat = FLATS.find(f => f.flatNumber === flatNumber);
  return flat?.owner;
}