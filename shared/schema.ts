import { pgTable, text, serial, integer, boolean, timestamp, real, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'data_entry']);
export const flatTypeEnum = pgEnum('flat_type', ['1BHK', '2BHK', '3BHK', '4BHK', 'penthouse']);
export const incomeTypeEnum = pgEnum('income_type', ['rent', 'maintenance', 'tax_return', 'rental_advance', 'other']);
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'inactive', 'notice_period']);
export const leaseStatusEnum = pgEnum('lease_status', ['Leasable', 'Non-Leasable']);
export const apartmentFloorEnum = pgEnum('apartment_floor', ['1', '2', '3', '4', '5', '6']);
export const chargeTypeEnum = pgEnum('charge_type', ['rent', 'maint_fee', 'water_fee']);

// New expense category and subcategory enums based on Excel sheet
export const expenseCategoryEnum = pgEnum('expense_category', [
  'Utility',
  'Operational',
  'General Maintenance Works',
  'Government',
  'Capital Expense for Facilities',
  'Charity',
  'Guest Related'
]);

export const expenseSubcategoryEnum = pgEnum('expense_subcategory', [
  // Utility
  'Electrical Bill',
  'Sweet Water Bill',
  'WiFi Bill',
  'Trash Collection',
  'Generator Diesel',
  'General Building Maintenance',
  'Water Tanker',
  'Cleaning works',
  'Other',
  
  // Operational
  'Watchman Salary',
  'Manager Salary',
  'Other',
  
  // General Maintenance Works
  'Elevator Maintenance',
  'CCTV Maintenance',
  'Electrical works',
  'Plumbing works',
  'Carpenter works',
  'Painting works',
  'Gardening works',
  'Other',
  
  // Government
  'Income Tax',
  'Other',
  
  // Capital Expense for Facilities
  'Infrastructure',
  'Bore Work', 
  'Major Electrical Facility',
  'Other',
  
  // Charity
  'Mosque',
  'Madarsa',
  'Mosque Donation',
  'Madarsa Donation',
  'Other misc Donation',
  'Other',
  
  // Guest Related
  'Guest Hospitality Exp / Meal',
  'Other'
]);
export const vendorServiceTypeEnum = pgEnum('vendor_service_type', [
  // Utility vendors
  'electrical',
  'plumbing',
  'water',
  'wifi',
  'trash_collection',
  // Maintenance vendors
  'paint_job',
  'wood_work',
  'cleaning',
  'pest_control', 
  'hvac',
  'security', 
  'landscaping',
  // Others
  'other'
]);
export const vendorProvisionTypeEnum = pgEnum('vendor_provision_type', [
  'service',
  'product',
  'both'
]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default('data_entry'),
  name: text("name").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Properties/Flats table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  flatNumber: text("flat_number").notNull().unique(),
  nestawayId: text("nestaway_id"),
  leaseStatus: leaseStatusEnum("lease_status").notNull().default('Leasable'),
  apartmentFloor: apartmentFloorEnum("apartment_floor").notNull(),
  flatType: flatTypeEnum("flat_type").notNull(),
  ownerName: text("owner_name").notNull(),
  expectedRent: integer("expected_rent").notNull(),
  maintenanceFee: integer("maintenance_fee").notNull(),
  waterCost: integer("water_cost"),
  isRented: boolean("is_rented").default(false).notNull(),
  currentTenant: text("current_tenant"),
  floorArea: real("floor_area"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Income table
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  amount: integer("amount").notNull(),
  type: incomeTypeEnum("type").notNull(),
  description: text("description").notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  receivedFrom: text("received_from").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  amount: integer("amount").notNull(),
  category: expenseCategoryEnum("category").notNull(),
  subcategory: expenseSubcategoryEnum("subcategory").notNull(),
  description: text("description").notNull(),
  vendor: text("vendor"),
  propertyId: integer("property_id").references(() => properties.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  
  // Special fields for water tanker expenses
  tankerNumber: text("tanker_number"),
  liters: integer("liters"),
  personInCharge: text("person_in_charge"),
  time: text("time"),
  
  // Attachment URL for receipt/documentation
  attachmentUrl: text("attachment_url"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Water Tank Tracking
export const waterTanks = pgTable("water_tanks", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  liters: integer("liters").notNull(),
  tankerNumber: text("tanker_number").notNull(),
  personInCharge: text("person_in_charge").notNull(),
  cost: integer("cost").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tenants table for managing tenant information
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  flatNumber: text("flat_number").notNull(), // Added flat_number field to sync with property
  rentAmount: integer("rent_amount").notNull(),
  securityDeposit: integer("security_deposit").notNull(),
  leaseStartDate: date("lease_start_date").notNull(),
  leaseEndDate: date("lease_end_date").notNull(),
  status: tenantStatusEnum("status").notNull().default('active'),
  noticePeriodEndDate: date("notice_period_end_date"),
  aadharNumber: text("aadhar_number"),
  panNumber: text("pan_number"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Vendors table for service providers
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  serviceType: vendorServiceTypeEnum("service_type").notNull(),
  provisionType: vendorProvisionTypeEnum("provision_type").notNull().default('service'),
  address: text("address"),
  notes: text("notes"),
  contactPerson: text("contact_person"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Property Charges table for tracking historical changes to property charges
export const propertyCharges = pgTable("property_charges", {
  id: serial("id").primaryKey(),
  flatNumber: text("flat_number").notNull(),
  nestawayId: text("nestaway_id"),
  chargeType: chargeTypeEnum("charge_type").notNull(),
  amount: integer("amount").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
});

// Tenant Charges table for tracking historical changes to tenant charges
export const tenantCharges = pgTable("tenant_charges", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  flatNumber: text("flat_number").notNull(),
  chargeType: chargeTypeEnum("charge_type").notNull(),
  amount: integer("amount").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIncomeSchema = createInsertSchema(incomes, {
  date: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  date: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
}).partial({ 
  attachmentUrl: true // Make attachmentUrl optional
});

export const insertWaterTankSchema = createInsertSchema(waterTanks).omit({
  id: true,
  createdAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyChargeSchema = createInsertSchema(propertyCharges, {
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
});

export const insertTenantChargeSchema = createInsertSchema(tenantCharges, {
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

// Create extended schemas for login
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Income = typeof incomes.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type WaterTank = typeof waterTanks.$inferSelect;
export type InsertWaterTank = z.infer<typeof insertWaterTankSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type PropertyCharge = typeof propertyCharges.$inferSelect;
export type InsertPropertyCharge = z.infer<typeof insertPropertyChargeSchema>;
export type TenantCharge = typeof tenantCharges.$inferSelect;
export type InsertTenantCharge = z.infer<typeof insertTenantChargeSchema>;
export type Login = z.infer<typeof loginSchema>;

// Summary types for dashboard
export type IncomeSummary = {
  total: number;
  byType: {
    type: string;
    amount: number;
  }[];
  byMonth: {
    month: string;
    amount: number;
  }[];
};

export type ExpenseSummary = {
  total: number;
  byCategory: {
    category: string;
    amount: number;
  }[];
  byMonth: {
    month: string;
    amount: number;
  }[];
};

export type PropertySummary = {
  total: number;
  byType: {
    type: string;
    count: number;
  }[];
  occupancyRate: number;
  totalMonthlyRent: number;
  totalMaintenanceCollection: number;
};
