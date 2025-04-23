import {
  User,
  InsertUser,
  Property,
  InsertProperty,
  Income,
  InsertIncome,
  Expense,
  InsertExpense,
  WaterTank,
  InsertWaterTank,
  IncomeSummary,
  ExpenseSummary,
  PropertySummary,
  users,
  properties,
  incomes,
  expenses,
  waterTanks
} from "@shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { db, pool } from "./db";
import { IStorage } from "./storage";
import connectPg from "connect-pg-simple";
import session from "express-session";

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values({
      ...user,
      createdAt: new Date()
    }).returning();
    return newUser;
  }
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  // Property methods
  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }
  
  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }
  
  async createProperty(property: InsertProperty): Promise<Property> {
    const now = new Date();
    const [newProperty] = await db.insert(properties).values({
      ...property,
      createdAt: now,
      updatedAt: now
    }).returning();
    return newProperty;
  }
  
  async updateProperty(id: number, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updatedProperty] = await db.update(properties)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(properties.id, id))
      .returning();
    return updatedProperty;
  }
  
  async deleteProperty(id: number): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id));
    return true; // In Drizzle, the result doesn't directly tell us if something was deleted
  }
  
  // Income methods
  async getIncome(id: number): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income;
  }
  
  async getIncomes(): Promise<Income[]> {
    return await db.select().from(incomes);
  }
  
  async createIncome(income: InsertIncome): Promise<Income> {
    const [newIncome] = await db.insert(incomes).values({
      ...income,
      createdAt: new Date()
    }).returning();
    return newIncome;
  }
  
  async updateIncome(id: number, updates: Partial<InsertIncome>): Promise<Income | undefined> {
    const [updatedIncome] = await db.update(incomes)
      .set(updates)
      .where(eq(incomes.id, id))
      .returning();
    return updatedIncome;
  }
  
  async deleteIncome(id: number): Promise<boolean> {
    await db.delete(incomes).where(eq(incomes.id, id));
    return true;
  }
  
  // Expense methods
  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }
  
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values({
      ...expense,
      createdAt: new Date()
    }).returning();
    return newExpense;
  }
  
  async updateExpense(id: number, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updatedExpense] = await db.update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    await db.delete(expenses).where(eq(expenses.id, id));
    return true;
  }
  
  // Water tank methods
  async getWaterTank(id: number): Promise<WaterTank | undefined> {
    const [waterTank] = await db.select().from(waterTanks).where(eq(waterTanks.id, id));
    return waterTank;
  }
  
  async getWaterTanks(): Promise<WaterTank[]> {
    return await db.select().from(waterTanks);
  }
  
  async createWaterTank(waterTank: InsertWaterTank): Promise<WaterTank> {
    const [newWaterTank] = await db.insert(waterTanks).values({
      ...waterTank,
      createdAt: new Date()
    }).returning();
    return newWaterTank;
  }
  
  async updateWaterTank(id: number, updates: Partial<InsertWaterTank>): Promise<WaterTank | undefined> {
    const [updatedWaterTank] = await db.update(waterTanks)
      .set(updates)
      .where(eq(waterTanks.id, id))
      .returning();
    return updatedWaterTank;
  }
  
  async deleteWaterTank(id: number): Promise<boolean> {
    await db.delete(waterTanks).where(eq(waterTanks.id, id));
    return true;
  }
  
  // Summary methods
  async getIncomeSummary(): Promise<IncomeSummary> {
    // Get total income
    const totalResult = await db.select({
      total: sql<number>`sum(${incomes.amount})`
    }).from(incomes);
    
    const total = totalResult[0]?.total || 0;
    
    // Group by type
    const byTypeResult = await db.select({
      type: incomes.type,
      amount: sql<number>`sum(${incomes.amount})`
    })
    .from(incomes)
    .groupBy(incomes.type);
    
    const byType = byTypeResult.map(item => ({
      type: item.type,
      amount: item.amount || 0
    }));
    
    // Group by month
    const byMonthResult = await db.select({
      month: sql<string>`to_char(${incomes.date}, 'YYYY-MM')`,
      amount: sql<number>`sum(${incomes.amount})`
    })
    .from(incomes)
    .groupBy(sql`to_char(${incomes.date}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${incomes.date}, 'YYYY-MM')`);
    
    const byMonth = byMonthResult.map(item => ({
      month: item.month,
      amount: item.amount || 0
    }));
    
    return {
      total,
      byType,
      byMonth
    };
  }
  
  async getExpenseSummary(): Promise<ExpenseSummary> {
    // Get total expenses
    const totalResult = await db.select({
      total: sql<number>`sum(${expenses.amount})`
    }).from(expenses);
    
    const total = totalResult[0]?.total || 0;
    
    // Group by category
    const byCategoryResult = await db.select({
      category: expenses.category,
      amount: sql<number>`sum(${expenses.amount})`
    })
    .from(expenses)
    .groupBy(expenses.category);
    
    const byCategory = byCategoryResult.map(item => ({
      category: item.category,
      amount: item.amount || 0
    }));
    
    // Group by month
    const byMonthResult = await db.select({
      month: sql<string>`to_char(${expenses.date}, 'YYYY-MM')`,
      amount: sql<number>`sum(${expenses.amount})`
    })
    .from(expenses)
    .groupBy(sql`to_char(${expenses.date}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${expenses.date}, 'YYYY-MM')`);
    
    const byMonth = byMonthResult.map(item => ({
      month: item.month,
      amount: item.amount || 0
    }));
    
    return {
      total,
      byCategory,
      byMonth
    };
  }
  
  async getPropertySummary(): Promise<PropertySummary> {
    // Get total properties
    const totalResult = await db.select({
      total: count()
    }).from(properties);
    
    const total = totalResult[0]?.total || 0;
    
    // Group by flat type
    const byTypeResult = await db.select({
      type: properties.flatType,
      count: count()
    })
    .from(properties)
    .groupBy(properties.flatType);
    
    const byType = byTypeResult.map(item => ({
      type: item.type,
      count: item.count
    }));
    
    // Calculate occupancy rate
    const rentedCountResult = await db.select({
      count: count()
    })
    .from(properties)
    .where(eq(properties.isRented, true));
    
    const rentedCount = rentedCountResult[0]?.count || 0;
    const occupancyRate = total > 0 ? (rentedCount / total) * 100 : 0;
    
    // Calculate total monthly rent
    const totalRentResult = await db.select({
      total: sql<number>`sum(${properties.expectedRent})`
    })
    .from(properties)
    .where(eq(properties.isRented, true));
    
    const totalMonthlyRent = totalRentResult[0]?.total || 0;
    
    // Calculate total maintenance collection
    const totalMaintenanceResult = await db.select({
      total: sql<number>`sum(${properties.maintenanceFee})`
    })
    .from(properties)
    .where(eq(properties.isRented, true));
    
    const totalMaintenanceCollection = totalMaintenanceResult[0]?.total || 0;
    
    return {
      total,
      byType,
      occupancyRate,
      totalMonthlyRent,
      totalMaintenanceCollection
    };
  }
  
  async getRecentTransactions(limit: number): Promise<(Income | Expense)[]> {
    // Get recent incomes
    const recentIncomes = await db.select({
      id: incomes.id,
      date: incomes.date,
      createdAt: incomes.createdAt,
      description: incomes.description,
      amount: incomes.amount,
      type: incomes.type,
      receivedFrom: incomes.receivedFrom,
      propertyId: incomes.propertyId,
      createdBy: incomes.createdBy,
      transactionType: sql<'income'>`'income'`.as('transactionType')
    })
    .from(incomes)
    .orderBy(desc(incomes.date))
    .limit(limit);
    
    // Get recent expenses
    const recentExpenses = await db.select({
      id: expenses.id,
      date: expenses.date,
      createdAt: expenses.createdAt,
      description: expenses.description,
      amount: expenses.amount,
      category: expenses.category,
      vendor: expenses.vendor,
      propertyId: expenses.propertyId,
      createdBy: expenses.createdBy,
      transactionType: sql<'expense'>`'expense'`.as('transactionType')
    })
    .from(expenses)
    .orderBy(desc(expenses.date))
    .limit(limit);
    
    // Combine and sort
    const combined = [...recentIncomes, ...recentExpenses]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
    
    return combined;
  }
}