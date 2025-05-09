import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  real,
  pgEnum,
  date,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "data_entry"]);
export const flatTypeEnum = pgEnum("flat_type", [
  "1BHK",
  "2BHK",
  "3BHK",
  "4BHK",
  "penthouse",
]);
export const incomeTypeEnum = pgEnum("income_type", [
  "rent",
  "maintenance",
  "tax_return",
  "rental_advance",
  "water_fee",
  "other",
]);
export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "inactive",
  "notice_period",
]);
export const leaseStatusEnum = pgEnum("lease_status", [
  "Leasable",
  "Non-Leasable",
]);
export const apartmentFloorEnum = pgEnum("apartment_floor", [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
]);
export const chargeTypeEnum = pgEnum("charge_type", [
  "rent",
  "maint_fee",
  "water_fee",
]);

// New expense category and subcategory enums based on Excel sheet
export const expenseCategoryEnum = pgEnum("expense_category", [
  "Utility",
  "Operational",
  "General Maintenance Works",
  "Government",
  "Capital Expense for Facilities",
  "Charity",
  "Guest Related",
]);

export const expenseSubcategoryEnum = pgEnum("expense_subcategory", [
  // Utility
  "Electrical Bill",
  "Sweet Water Bill",
  "WiFi Bill",
  "Trash Collection",
  "Generator Diesel",
  "General Building Maintenance",
  "Water Tanker",
  "Cleaning works",
  "Other",

  // Operational
  "Watchman Salary",
  "Manager Salary",
  "Other",

  // General Maintenance Works
  "Elevator Maintenance",
  "CCTV Maintenance",
  "Electrical works",
  "Plumbing works",
  "Carpenter works",
  "Painting works",
  "Gardening works",
  "Other",

  // Government
  "Income Tax",
  "Other",

  // Capital Expense for Facilities
  "Infrastructure",
  "Bore Work",
  "Major Electrical Facility",
  "Other",

  // Charity
  "Mosque",
  "Madarsa",
  "Mosque Donation",
  "Madarsa Donation",
  "Other misc Donation",
  "Other",

  // Guest Related
  "Guest Hospitality Exp / Meal",
  "Other",
]);
export const vendorServiceTypeEnum = pgEnum("service_type", [
  "CCTV",
  "Carpenter",
  "Cleaner",
  "Electrical",
  "Generator",
  "HVAC",
  "Landscaping",
  "Paint",
  "Pest Control",
  "Plumber",
  "Security",
  "Water",
  "WiFi",
  "Water Tanker",
  "Other",
]);
export const vendorProvisionTypeEnum = pgEnum("vendor_provision_type", [
  "Service Provider",
  "Product Supplier",
  "Service & Product",
]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("data_entry"),
  name: text("name").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Properties/Flats table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  flatNumber: text("flat_number").notNull().unique(),
  nestawayId: text("nestaway_id"),
  leaseStatus: leaseStatusEnum("lease_status").notNull().default("Leasable"),
  apartmentFloor: apartmentFloorEnum("apartment_floor").notNull(),
  flatType: flatTypeEnum("flat_type").notNull(),
  ownerName: text("owner_name").notNull(),
  //isRented: boolean("is_rented").default(false).notNull(),
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
  type: text("type").notNull(),
  description: text("description").notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  receivedFrom: text("received_from").notNull(),
  attachmentId: integer("attachment_id"),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  amount: integer("amount").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory").notNull(),
  description: text("description").notNull(),
  vendorId: integer("vendor"),
  propertyId: integer("property_id").references(() => properties.id),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),

  // Special fields for water tanker expenses
  tankerNumber: text("tanker_number"),
  liters: integer("liters"),
  personInCharge: text("person_in_charge"),
  time: text("time"),

  // Reference to attachment
  attachmentId: integer("attachment_id"),
  
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
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tenants table for managing tenant information
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  propertyId: integer("property_id")
    .references(() => properties.id)
    .notNull(),
  flatNumber: text("flat_number").notNull(), // Added flat_number field to sync with property
  leaseStartDate: date("lease_start_date").notNull(),
  leaseEndDate: date("lease_end_date").notNull(),
  status: tenantStatusEnum("status").notNull().default("active"),
  noticePeriodEndDate: date("notice_period_end_date"),
  notes: text("notes"),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Vendors table for managing vendor information
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  service_type: text("service_type").notNull(),
  provision_type: text("provision_type").notNull().default("service"),
  address: text("address"),
  notes: text("notes"),
  contact_person: text("contact_person"),
  is_active: boolean("is_active").default(true).notNull(),
  created_by: integer("created_by")
    .references(() => users.id)
    .notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
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
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tenant Charges table for tracking historical changes to tenant charges
export const tenantCharges = pgTable("tenant_charges", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  flatNumber: text("flat_number").notNull(),
  chargeType: chargeTypeEnum("charge_type").notNull(),
  amount: integer("amount").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Property Owners table for managing property owner information
export const propertyOwners = pgTable("property_owners", {
  id: varchar("id").primaryKey(), // Will be generated as full_name_phone
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  altPhone: text("alt_phone"),
  email: text("email"), // Newly added
  aadhar: text("aadhar"),
  bankAccount: text("bank_account"),
  bankIfsc: text("bank_ifsc"),
  bankName: text("bank_name"), // Newly added
  createdAt: timestamp("created_at").defaultNow().notNull(),
  modifiedAt: timestamp("modified_at").defaultNow().notNull(),
});

// Attachments table for storing file attachments
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  filetype: text("filetype").notNull(), // MIME type
  filesize: integer("filesize").notNull(),
  data: text("data").notNull(), // Base64 encoded file data
  uploadedBy: integer("uploaded_by")
    .references(() => users.id)
    .notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Maintenance records table for tracking maintenance activities
export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyid")
    .references(() => properties.id)
    .notNull(),
  flatNumber: text("flatnumber").notNull(),
  maintenanceType: text("maintenancetype").notNull(), // Maps to expense subcategory
  vendorId: integer("vendorid").references(() => vendors.id),
  date: date("date").notNull(),
  description: text("description"),
  createdBy: integer("createdby")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("createdat").defaultNow().notNull(),
  modifiedAt: timestamp("modifiedat").defaultNow().notNull(),
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
}).partial({
  attachmentId: true, // Make attachmentId optional
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  date: z.coerce.date(),
})
  .omit({
    id: true,
    createdAt: true,
  })
  .partial({
    attachmentId: true, // Make attachmentId optional
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
  created_at: true,
  updated_at: true,
});

export const insertPropertyChargeSchema = createInsertSchema(propertyCharges, {
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertTenantChargeSchema = createInsertSchema(tenantCharges, {
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyOwnerSchema = createInsertSchema(
  propertyOwners,
).omit({
  id: true, // ID will be generated on the server
  createdAt: true,
  modifiedAt: true,
});

export const insertMaintenanceRecordSchema = createInsertSchema(
  maintenanceRecords,
  {
    date: z.coerce.date(),
  },
).omit({
  id: true,
  createdAt: true,
  modifiedAt: true,
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
export type PropertyOwner = typeof propertyOwners.$inferSelect;
export type InsertPropertyOwner = z.infer<typeof insertPropertyOwnerSchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<
  typeof insertMaintenanceRecordSchema
>;
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
