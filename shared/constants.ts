// Define the ARDH flat constants

export type FlatInfo = {
  flatNumber: string;
  flatType: '1BHK' | '2BHK' | '3BHK' | 'penthouse';
  owner: string;
  nestawayId?: string;
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
  { flatNumber: '203', flatType: '1BHK', owner: 'Mohammed Afzal', nestawayId: 'N35404' },
  { flatNumber: '204', flatType: '1BHK', owner: 'Mohammed Afzal', nestawayId: 'N35405' },
  { flatNumber: '303', flatType: '1BHK', owner: 'Ruksana Parveen', nestawayId: 'N35400' },
  { flatNumber: '304', flatType: '1BHK', owner: 'Ruksana Parveen', nestawayId: 'N35403' },
  { flatNumber: '402', flatType: '1BHK', owner: 'Mohammed Ashraf', nestawayId: 'N35407' },
  { flatNumber: '403', flatType: '1BHK', owner: 'Mohammed Ashraf', nestawayId: 'N35445' },
  { flatNumber: '404', flatType: '1BHK', owner: 'Mohammed Anas', nestawayId: 'N35401' },
  { flatNumber: '503', flatType: '1BHK', owner: 'Mohammed Anas', nestawayId: 'N35402' },
  { flatNumber: '504', flatType: '1BHK', owner: 'Mohammed Abdurrahman', nestawayId: 'N35468' },
  
  // 2BHK flats (9 units)
  { flatNumber: '101', flatType: '2BHK', owner: 'Mohammed Afzal', nestawayId: 'N35410' },
  { flatNumber: '102', flatType: '2BHK', owner: 'Mohammed Afzal', nestawayId: 'N35260' },
  { flatNumber: '201', flatType: '2BHK', owner: 'Ruksana Parveen', nestawayId: 'N35259' },
  { flatNumber: '202', flatType: '2BHK', owner: 'Ruksana Parveen', nestawayId: 'N35408' },
  { flatNumber: '301', flatType: '2BHK', owner: 'Mohammed Ashraf', nestawayId: 'N35261' },
  { flatNumber: '302', flatType: '2BHK', owner: 'Mohammed Ashraf', nestawayId: 'N35409' },
  { flatNumber: '401', flatType: '2BHK', owner: 'Mohammed Anas', nestawayId: 'N35262' },
  { flatNumber: '501', flatType: '2BHK', owner: 'Mohammed Anas', nestawayId: 'N35469' },
  { flatNumber: '502', flatType: '2BHK', owner: 'Mohammed Abdurrahman', nestawayId: 'N35411' },
  
  // 3BHK flat (1 unit)
  { flatNumber: '103', flatType: '3BHK', owner: 'Mohammed Abdurrahman', nestawayId: 'NA' },
  
  // Penthouse (non-leasable)
  { flatNumber: '601', flatType: 'penthouse', owner: 'Mohammed Abdurrahman', nestawayId: 'NA' }
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

// Helper function to get Nestaway ID by flat number
export function getNestawayIdByFlatNumber(flatNumber: string): string | undefined {
  const flat = FLATS.find(f => f.flatNumber === flatNumber);
  return flat?.nestawayId;
}