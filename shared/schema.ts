import { pgTable, text, serial, integer, boolean, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'data_entry']);
export const flatTypeEnum = pgEnum('flat_type', ['1BHK', '2BHK', '3BHK', 'penthouse']);
export const incomeTypeEnum = pgEnum('income_type', ['rent', 'maintenance', 'tax_return', 'other']);
export const expenseCategoryEnum = pgEnum('expense_category', [
  'electricity',
  'generator_fuel',
  'cctv_maintenance',
  'internet',
  'elevator_maintenance',
  'general_building_maintenance',
  'water_tank',
  'donation',
  'drainage_cleaning',
  'guest_expense',
  'misc'
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
  flatType: flatTypeEnum("flat_type").notNull(),
  ownerName: text("owner_name").notNull(),
  expectedRent: integer("expected_rent").notNull(),
  maintenanceFee: integer("maintenance_fee").notNull(),
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
  description: text("description").notNull(),
  vendor: text("vendor"),
  propertyId: integer("property_id").references(() => properties.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
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

export const insertIncomeSchema = createInsertSchema(incomes).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertWaterTankSchema = createInsertSchema(waterTanks).omit({
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
