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
  Vendor,
  InsertVendor,
  Tenant,
  InsertTenant,
  PropertyCharge,
  InsertPropertyCharge,
  TenantCharge,
  InsertTenantCharge,
  IncomeSummary,
  ExpenseSummary,
  PropertySummary,
  users,
  properties,
  incomes,
  expenses,
  waterTanks,
  vendors,
  tenants,
  propertyCharges,
  tenantCharges,
} from "@shared/schema";
import { and, eq, desc, sql, count, isNull, gte } from "drizzle-orm";
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
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        ...user,
        createdAt: new Date(),
      })
      .returning();
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Property methods
  async getProperty(id: number): Promise<Property | undefined> {
    try {
      console.log(`Getting property with ID: ${id}`);
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, id));
      return property;
    } catch (error) {
      console.error(`Error fetching property: ${error}`);
      throw error;
    }
  }

  async getProperties(): Promise<Property[]> {
    try {
      console.log("Getting all properties");
      const propertyList = await db.select().from(properties);
      console.log(`Retrieved ${propertyList.length} properties`);
      return propertyList;
    } catch (error) {
      console.error(`Error fetching properties: ${error}`);
      throw error;
    }
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    try {
      console.log("Creating new property:", property);
      const now = new Date();
      const [newProperty] = await db
        .insert(properties)
        .values({
          ...property,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // If property creation was successful and we have rent, maintenance fee, or water fee data,
      // create property charges records
      if (property.flatNumber) {
        const today = new Date();
        // Default to admin user (id=1) if no createdBy is provided
        const createdBy = property.createdBy || 1;

        // These would come from the form but are not in the property table anymore
        if (property.rentAmount !== undefined) {
          console.log(
            `Adding rent charge of ${property.rentAmount} for flat ${property.flatNumber}`,
          );
          try {
            await this.createPropertyCharge({
              flatNumber: property.flatNumber,
              nestawayId: property.nestawayId || null,
              chargeType: "rent",
              amount: property.rentAmount,
              effectiveFrom: today,
              effectiveTo: null,
              createdBy,
            });
          } catch (error) {
            console.error(`Failed to create rent charge: ${error}`);
          }
        }

        if (property.maintenanceFee !== undefined) {
          console.log(
            `Adding maintenance fee charge of ${property.maintenanceFee} for flat ${property.flatNumber}`,
          );
          try {
            await this.createPropertyCharge({
              flatNumber: property.flatNumber,
              nestawayId: property.nestawayId || null,
              chargeType: "maint_fee",
              amount: property.maintenanceFee,
              effectiveFrom: today,
              effectiveTo: null,
              createdBy,
            });
          } catch (error) {
            console.error(`Failed to create maintenance fee charge: ${error}`);
          }
        }

        if (property.waterFee !== undefined) {
          console.log(
            `Adding water fee charge of ${property.waterFee} for flat ${property.flatNumber}`,
          );
          try {
            await this.createPropertyCharge({
              flatNumber: property.flatNumber,
              nestawayId: property.nestawayId || null,
              chargeType: "water_fee",
              amount: property.waterFee,
              effectiveFrom: today,
              effectiveTo: null,
              createdBy,
            });
          } catch (error) {
            console.error(`Failed to create water fee charge: ${error}`);
          }
        }
      }

      return newProperty;
    } catch (error) {
      console.error(`Error creating property: ${error}`);
      throw error;
    }
  }

  async updateProperty(
    id: number,
    updates: Partial<InsertProperty>,
  ): Promise<Property | undefined> {
    try {
      console.log(`Updating property with ID: ${id}`, updates);

      // Extract the property charge related fields that are not in the properties table
      const { rentAmount, maintenanceFee, waterFee, ...propertyUpdates } =
        updates as any;

      const [updatedProperty] = await db
        .update(properties)
        .set({
          ...propertyUpdates,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, id))
        .returning();

      // Get the property to access its flatNumber
      const property = await this.getProperty(id);

      if (property && property.flatNumber) {
        const today = new Date();
        // Default to the user who made the update or admin (id=1) if not provided
        const createdBy = updates.createdBy || 1;

        // Update property charges if they were provided
        if (rentAmount !== undefined) {
          console.log(
            `Updating rent charge to ${rentAmount} for flat ${property.flatNumber}`,
          );
          try {
            await this.createPropertyCharge({
              flatNumber: property.flatNumber,
              nestawayId: property.nestawayId || null,
              chargeType: "rent",
              amount: rentAmount,
              effectiveFrom: today,
              effectiveTo: null,
              createdBy,
            });
          } catch (error) {
            console.error(`Failed to update rent charge: ${error}`);
          }
        }

        if (maintenanceFee !== undefined) {
          console.log(
            `Updating maintenance fee charge to ${maintenanceFee} for flat ${property.flatNumber}`,
          );
          try {
            await this.createPropertyCharge({
              flatNumber: property.flatNumber,
              nestawayId: property.nestawayId || null,
              chargeType: "maint_fee",
              amount: maintenanceFee,
              effectiveFrom: today,
              effectiveTo: null,
              createdBy,
            });
          } catch (error) {
            console.error(`Failed to update maintenance fee charge: ${error}`);
          }
        }

        if (waterFee !== undefined) {
          console.log(
            `Updating water fee charge to ${waterFee} for flat ${property.flatNumber}`,
          );
          try {
            await this.createPropertyCharge({
              flatNumber: property.flatNumber,
              nestawayId: property.nestawayId || null,
              chargeType: "water_fee",
              amount: waterFee,
              effectiveFrom: today,
              effectiveTo: null,
              createdBy,
            });
          } catch (error) {
            console.error(`Failed to update water fee charge: ${error}`);
          }
        }
      }

      return updatedProperty;
    } catch (error) {
      console.error(`Error updating property: ${error}`);
      throw error;
    }
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
    const [newIncome] = await db
      .insert(incomes)
      .values({
        ...income,
        createdAt: new Date(),
      })
      .returning();
    return newIncome;
  }

  async updateIncome(
    id: number,
    updates: Partial<InsertIncome>,
  ): Promise<Income | undefined> {
    const [updatedIncome] = await db
      .update(incomes)
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
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return expense;
  }

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values({
        ...expense,
        createdAt: new Date(),
      })
      .returning();
    return newExpense;
  }

  async updateExpense(
    id: number,
    updates: Partial<InsertExpense>,
  ): Promise<Expense | undefined> {
    const [updatedExpense] = await db
      .update(expenses)
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
    const [waterTank] = await db
      .select()
      .from(waterTanks)
      .where(eq(waterTanks.id, id));
    return waterTank;
  }

  async getWaterTanks(): Promise<WaterTank[]> {
    return await db.select().from(waterTanks);
  }

  async createWaterTank(waterTank: InsertWaterTank): Promise<WaterTank> {
    const [newWaterTank] = await db
      .insert(waterTanks)
      .values({
        ...waterTank,
        createdAt: new Date(),
      })
      .returning();
    return newWaterTank;
  }

  async updateWaterTank(
    id: number,
    updates: Partial<InsertWaterTank>,
  ): Promise<WaterTank | undefined> {
    const [updatedWaterTank] = await db
      .update(waterTanks)
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
    const totalResult = await db
      .select({
        total: sql<number>`sum(${incomes.amount})`,
      })
      .from(incomes);

    const total = totalResult[0]?.total || 0;

    // Group by type
    const byTypeResult = await db
      .select({
        type: incomes.type,
        amount: sql<number>`sum(${incomes.amount})`,
      })
      .from(incomes)
      .groupBy(incomes.type);

    const byType = byTypeResult.map((item) => ({
      type: item.type,
      amount: item.amount || 0,
    }));

    // Group by month
    const byMonthResult = await db
      .select({
        month: sql<string>`to_char(${incomes.date}, 'YYYY-MM')`,
        amount: sql<number>`sum(${incomes.amount})`,
      })
      .from(incomes)
      .groupBy(sql`to_char(${incomes.date}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${incomes.date}, 'YYYY-MM')`);

    const byMonth = byMonthResult.map((item) => ({
      month: item.month,
      amount: item.amount || 0,
    }));

    return {
      total,
      byType,
      byMonth,
    };
  }

  async getExpenseSummary(): Promise<ExpenseSummary> {
    // Get total expenses
    const totalResult = await db
      .select({
        total: sql<number>`sum(${expenses.amount})`,
      })
      .from(expenses);

    const total = totalResult[0]?.total || 0;

    // Group by category
    const byCategoryResult = await db
      .select({
        category: expenses.category,
        amount: sql<number>`sum(${expenses.amount})`,
      })
      .from(expenses)
      .groupBy(expenses.category);

    const byCategory = byCategoryResult.map((item) => ({
      category: item.category,
      amount: item.amount || 0,
    }));

    // Group by month
    const byMonthResult = await db
      .select({
        month: sql<string>`to_char(${expenses.date}, 'YYYY-MM')`,
        amount: sql<number>`sum(${expenses.amount})`,
      })
      .from(expenses)
      .groupBy(sql`to_char(${expenses.date}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${expenses.date}, 'YYYY-MM')`);

    const byMonth = byMonthResult.map((item) => ({
      month: item.month,
      amount: item.amount || 0,
    }));

    return {
      total,
      byCategory,
      byMonth,
    };
  }

  async getPropertySummary(): Promise<PropertySummary> {
    try {
      // Get total properties
      const totalResult = await db
        .select({
          total: count(),
        })
        .from(properties);

      const total = totalResult[0]?.total || 0;

      // Group by flat type
      const byTypeResult = await db
        .select({
          type: properties.flatType,
          count: count(),
        })
        .from(properties)
        .groupBy(properties.flatType);

      const byType = byTypeResult.map((item) => ({
        type: item.type,
        count: item.count,
      }));

      // Calculate occupancy rate
      const rentedCountResult = await db
        .select({
          count: count(),
        })
        .from(properties)
        .where(eq(properties.isRented, true));

      const rentedCount = rentedCountResult[0]?.count || 0;
      const occupancyRate = total > 0 ? (rentedCount / total) * 100 : 0;

      // Calculate total monthly rent from property_charges instead of properties table
      const totalRentResult = await db
        .select({
          total: sql<number>`sum(${propertyCharges.amount})`,
        })
        .from(propertyCharges)
        .where(eq(propertyCharges.chargeType, "rent"))
        .where(sql`${propertyCharges.effectiveTo} IS NULL`);

      const totalMonthlyRent = totalRentResult[0]?.total || 0;

      // Calculate total maintenance collection from property_charges
      const totalMaintenanceResult = await db
        .select({
          total: sql<number>`sum(${propertyCharges.amount})`,
        })
        .from(propertyCharges)
        .where(eq(propertyCharges.chargeType, "maint_fee"))
        .where(sql`${propertyCharges.effectiveTo} IS NULL`);

      const totalMaintenanceCollection = totalMaintenanceResult[0]?.total || 0;

      return {
        total,
        byType,
        occupancyRate,
        totalMonthlyRent,
        totalMaintenanceCollection,
      };
    } catch (error) {
      console.error(`Error getting property summary: ${error}`);
      return {
        total: 0,
        byType: [],
        occupancyRate: 0,
        totalMonthlyRent: 0,
        totalMaintenanceCollection: 0,
      };
    }
  }

  async getRecentTransactions(limit: number): Promise<(Income | Expense)[]> {
    // Get recent incomes
    const recentIncomes = await db
      .select({
        id: incomes.id,
        date: incomes.date,
        createdAt: incomes.createdAt,
        description: incomes.description,
        amount: incomes.amount,
        type: incomes.type,
        receivedFrom: incomes.receivedFrom,
        propertyId: incomes.propertyId,
        createdBy: incomes.createdBy,
        transactionType: sql<"income">`'income'`.as("transactionType"),
      })
      .from(incomes)
      .orderBy(desc(incomes.date))
      .limit(limit);

    // Get recent expenses
    const recentExpenses = await db
      .select({
        id: expenses.id,
        date: expenses.date,
        createdAt: expenses.createdAt,
        description: expenses.description,
        amount: expenses.amount,
        category: expenses.category,
        vendor: expenses.vendor,
        propertyId: expenses.propertyId,
        createdBy: expenses.createdBy,
        transactionType: sql<"expense">`'expense'`.as("transactionType"),
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

  // Vendor methods
  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getVendorsByServiceType(serviceType: string): Promise<Vendor[]> {
    return await db
      .select()
      .from(vendors)
      .where(eq(vendors.serviceType, serviceType as any));
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const now = new Date();
    const [newVendor] = await db
      .insert(vendors)
      .values({
        ...vendor,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return newVendor;
  }

  async updateVendor(
    id: number,
    updates: Partial<InsertVendor>,
  ): Promise<Vendor | undefined> {
    const [updatedVendor] = await db
      .update(vendors)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id))
      .returning();
    return updatedVendor;
  }

  async deleteVendor(id: number): Promise<boolean> {
    await db.delete(vendors).where(eq(vendors.id, id));
    return true;
  }

  // Tenant methods
  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenantsByProperty(propertyId: number): Promise<Tenant[]> {
    return await db
      .select()
      .from(tenants)
      .where(eq(tenants.propertyId, propertyId));
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    console.log("Creating tenant:", tenant);

    // Create the tenant first
    const newTenant = await db.insert(tenants).values(tenant).returning();
    const createdTenant = newTenant[0];

    // Get current property charges for the flat
    const currentCharges = await db
      .select()
      .from(propertyCharges)
      .where(eq(propertyCharges.flatNumber, tenant.flatNumber))
      .where(sql`${propertyCharges.effectiveTo} IS NULL`);

    console.log(`Found ${currentCharges.length} current charges for flat ${tenant.flatNumber}`);

    // Create tenant charges for each charge type
    for (const chargeType of ["rent", "maint_fee", "water_fee"]) {
      const propertyCharge = currentCharges.find(
        (c) => c.chargeType === chargeType,
      );

      if (propertyCharge) {
        console.log(`Creating tenant charge for ${chargeType}`);
        await db.insert(tenantCharges).values({
          tenantId: createdTenant.id,
          flatNumber: tenant.flatNumber,
          chargeType: chargeType as any,
          amount: propertyCharge.amount,
          effectiveFrom: tenant.leaseStartDate,
          effectiveTo: null,
          createdBy: tenant.createdBy,
        });
      }
    }

    return createdTenant;
  }

  async updateTenant(
    id: number,
    updates: Partial<InsertTenant>,
  ): Promise<Tenant | undefined> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant;
  }

  async deleteTenant(id: number): Promise<boolean> {
    await db.delete(tenants).where(eq(tenants.id, id));
    return true;
  }

  // Property Charge methods
  async getPropertyCharge(id: number): Promise<PropertyCharge | undefined> {
    const [charge] = await db
      .select()
      .from(propertyCharges)
      .where(eq(propertyCharges.id, id));
    return charge;
  }

  async getPropertyCharges(): Promise<PropertyCharge[]> {
    return await db.select().from(propertyCharges);
  }

  async getPropertyChargesByFlat(
    flatNumber: string,
  ): Promise<PropertyCharge[]> {
    return await db
      .select()
      .from(propertyCharges)
      .where(eq(propertyCharges.flatNumber, flatNumber));
  }

  async getCurrentPropertyCharges(
    flatNumber: string,
  ): Promise<PropertyCharge[]> {
    try {
      console.log(`Getting current property charges for flat: ${flatNumber}`);
      const results = await db
        .select()
        .from(propertyCharges)
        .where(eq(propertyCharges.flatNumber, flatNumber))
        .where(sql`${propertyCharges.effectiveTo} IS NULL`);
      console.log(
        `Found ${results.length} current charges for flat ${flatNumber}`,
      );
      return results;
    } catch (error) {
      console.error(`Error getting current property charges: ${error}`);
      return [];
    }
  }

  async getPropertyChargeHistory(
    flatNumber: string,
    chargeType: string,
  ): Promise<PropertyCharge[]> {
    return await db
      .select()
      .from(propertyCharges)
      .where(eq(propertyCharges.flatNumber, flatNumber))
      .where(eq(propertyCharges.chargeType, chargeType as any))
      .orderBy(desc(propertyCharges.effectiveFrom));
  }

  async createPropertyCharge(
    charge: InsertPropertyCharge,
  ): Promise<PropertyCharge> {
    // Create the property charge
    const newCharge = await db
      .insert(propertyCharges)
      .values(charge)
      .returning();
    const createdCharge = newCharge[0];

    // Check if property is occupied
    const currentTenants = await this.getCurrentTenantsForFlat(
      charge.flatNumber,
    );

    if (currentTenants.length > 0) {
      console.log(
        `Property ${charge.flatNumber} is occupied. Syncing with tenant charges.`,
      );

      // For each current tenant, update their charges
      for (const tenant of currentTenants) {
        // First close any existing tenant charges of this type
        await db
          .update(tenantCharges)
          .set({ effectiveTo: charge.effectiveFrom })
          .where(eq(tenantCharges.tenantId, tenant.id))
          .where(eq(tenantCharges.chargeType, charge.chargeType))
          .where(sql`${tenantCharges.effectiveTo} IS NULL`);

        // Create new tenant charge
        await db.insert(tenantCharges).values({
          tenantId: tenant.id,
          flatNumber: charge.flatNumber,
          chargeType: charge.chargeType,
          amount: charge.amount,
          effectiveFrom: charge.effectiveFrom,
          effectiveTo: null,
          createdBy: charge.createdBy,
        });
      }
    }

    return createdCharge;
  }
  async findActiveCharge(
    flatNumber: string,
    chargeType: string,
  ): Promise<PropertyCharge | null> {
    const result = await db
      .select()
      .from(propertyCharges)
      .where(eq(propertyCharges.flatNumber, flatNumber))
      .where(eq(propertyCharges.chargeType, chargeType))
      .where(sql`${propertyCharges.effectiveTo} IS NULL`)
      .limit(1);

    return result[0] || null;
  }

  async closeActiveCharge(
    flatNumber: string,
    chargeType: "rent" | "maint_fee" | "water_fee",
  ) {
    const today = new Date().toISOString(); // Format as ISO string

    await db
      .update(propertyCharges)
      .set({ effectiveTo: today })
      .where(
        and(
          eq(propertyCharges.flatNumber, flatNumber),
          eq(propertyCharges.chargeType, chargeType),
          isNull(propertyCharges.effectiveTo),
        ),
      );
  }

  // ADD a new charge (simple insert)
  async addNewCharge(data: InsertPropertyCharge) {
    console.log("Adding new charge with data:", data);
    const chargeData = {
      ...data,
      effectiveFrom: new Date(data.effectiveFrom).toISOString(),
      effectiveTo: data.effectiveTo
        ? new Date(data.effectiveTo).toISOString()
        : null,
    };
    console.log("Formatted charge data:", chargeData);

    try {
      const result = await db
        .insert(propertyCharges)
        .values(chargeData)
        .returning();
      console.log("Insert result:", result);
      return result[0]; // Return the first (and only) inserted row
    } catch (error) {
      console.error("Error in addNewCharge:", error);
      throw error;
    }
  }

  async updatePropertyCharge(
    id: number,
    updates: Partial<InsertPropertyCharge>,
  ): Promise<PropertyCharge | undefined> {
    // Format dates properly
    const formattedUpdates: any = { ...updates };

    if (updates.effectiveFrom) {
      formattedUpdates.effectiveFrom =
        typeof updates.effectiveFrom === "string"
          ? updates.effectiveFrom
          : updates.effectiveFrom.toISOString();
    }

    if (updates.effectiveTo) {
      formattedUpdates.effectiveTo =
        typeof updates.effectiveTo === "string"
          ? updates.effectiveTo
          : updates.effectiveTo.toISOString();
    }

    const [updatedCharge] = await db
      .update(propertyCharges)
      .set(formattedUpdates)
      .where(eq(propertyCharges.id, id))
      .returning();
    return updatedCharge;
  }

  async deletePropertyCharge(id: number): Promise<boolean> {
    await db.delete(propertyCharges).where(eq(propertyCharges.id, id));
    return true;
  }

  // Tenant Charge methods
  async getTenantCharge(id: number): Promise<TenantCharge | undefined> {
    const [charge] = await db
      .select()
      .from(tenantCharges)
      .where(eq(tenantCharges.id, id));
    return charge;
  }

  async getTenantCharges(): Promise<TenantCharge[]> {
    return await db.select().from(tenantCharges);
  }

  async getTenantChargesByTenant(tenantId: number): Promise<TenantCharge[]> {
    return await db
      .select()
      .from(tenantCharges)
      .where(eq(tenantCharges.tenantId, tenantId));
  }

  async getCurrentTenantCharges(tenantId: number): Promise<TenantCharge[]> {
    return await db
      .select()
      .from(tenantCharges)
      .where(eq(tenantCharges.tenantId, tenantId))
      .where(sql`${tenantCharges.effectiveTo} IS NULL`);
  }

  async getTenantChargeHistory(
    tenantId: number,
    chargeType: string,
  ): Promise<TenantCharge[]> {
    return await db
      .select()
      .from(tenantCharges)
      .where(eq(tenantCharges.tenantId, tenantId))
      .where(eq(tenantCharges.chargeType, chargeType as any))
      .orderBy(desc(tenantCharges.effectiveFrom));
  }

  async createTenantCharge(charge: InsertTenantCharge): Promise<TenantCharge> {
    // Check if there's an existing active charge of this type for the tenant
    const currentCharges = await db
      .select()
      .from(tenantCharges)
      .where(eq(tenantCharges.tenantId, charge.tenantId))
      .where(eq(tenantCharges.chargeType, charge.chargeType))
      .where(sql`${tenantCharges.effectiveTo} IS NULL`);

    console.log(
      `Found ${currentCharges.length} current tenant charges for tenant ${charge.tenantId} with charge type ${charge.chargeType}`,
    );

    // If there are existing charges, update ALL of their effectiveTo dates
    if (currentCharges.length > 0) {
      // Update only the charges that match this specific tenant + charge type combination
      for (const currentCharge of currentCharges) {
        const today = new Date();

        console.log(
          `Updating tenant charge ID ${currentCharge.id} to set effectiveTo to ${today.toISOString()}`,
        );

        await db
          .update(tenantCharges)
          .set({ effectiveTo: today.toISOString() })
          .where(eq(tenantCharges.id, currentCharge.id));

        console.log(
          `Updated existing tenant charge with effectiveTo: ${today.toISOString()}`,
        );
      }
    }

    // Create the new charge record with proper date formatting
    const formattedCharge = {
      ...charge,
      effectiveFrom:
        typeof charge.effectiveFrom === "string"
          ? charge.effectiveFrom
          : charge.effectiveFrom.toISOString(),
      effectiveTo: charge.effectiveTo
        ? typeof charge.effectiveTo === "string"
          ? charge.effectiveTo
          : charge.effectiveTo.toISOString()
        : null,
    };

    const [newCharge] = await db
      .insert(tenantCharges)
      .values(formattedCharge)
      .returning();

    return newCharge;
  }

  async updateTenantCharge(
    id: number,
    updates: Partial<InsertTenantCharge>,
  ): Promise<TenantCharge | undefined> {
    // Format dates properly
    const formattedUpdates: any = { ...updates };

    if (updates.effectiveFrom) {
      formattedUpdates.effectiveFrom =
        typeof updates.effectiveFrom === "string"
          ? updates.effectiveFrom
          : updates.effectiveFrom.toISOString();
    }

    if (updates.effectiveTo) {
      formattedUpdates.effectiveTo =
        typeof updates.effectiveTo === "string"
          ? updates.effectiveTo
          : updates.effectiveTo.toISOString();
    }

    const [updatedCharge] = await db
      .update(tenantCharges)
      .set(formattedUpdates)
      .where(eq(tenantCharges.id, id))
      .returning();
    return updatedCharge;
  }

  async deleteTenantCharge(id: number): Promise<boolean> {
    await db.delete(tenantCharges).where(eq(tenantCharges.id, id));
    return true;
  }

  // Helper method to find the current tenant(s for a flat
  async getCurrentTenantsForFlat(flatNumber: string): Promise<Tenant[]> {
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    return await db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.flatNumber, flatNumber),
          gte(tenants.leaseEndDate, today),
        ),
      )
      .execute();
  }

  // Check if a flat has active tenants (for property occupancy status)
  async hasActiveTenants(flatNumber: string): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD" format

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(
        and(
          eq(tenants.flatNumber, flatNumber),
          sql`${tenants.leaseEndDate} >= ${today}`,
        ),
      )
      .execute();

    return result[0]?.count > 0;
  }

  // Helper method to sync property charges with tenant charges when a property charge is updated
  async syncPropertyChargeWithTenant(
    flatNumber: string,
    chargeType: string,
    amount: number,
    effectiveFrom: Date,
    createdBy: number,
  ): Promise<void> {
    try {
      // Find current tenants for this flat
      const currentTenants = await this.getCurrentTenantsForFlat(flatNumber);
      console.log(
        `Found ${currentTenants.length} current tenants for flat ${flatNumber}`,
      );

      // If there are current tenants, update their charges too
      for (const tenant of currentTenants) {
        console.log(
          `Syncing charges for tenant ${tenant.name} (ID: ${tenant.id})`,
        );

        try {
          // Find current tenant charge of this type
          const currentCharges = await db
            .select()
            .from(tenantCharges)
            .where(eq(tenantCharges.tenantId, tenant.id))
            .where(eq(tenantCharges.chargeType, chargeType as any))
            .where(sql`${tenantCharges.effectiveTo} IS NULL`);

          // If there's an existing charge, mark it as ended
          if (currentCharges.length > 0) {
            console.log(
              `Updating existing tenant charge ID ${currentCharges[0].id} with effectiveTo date`,
            );
            await db
              .update(tenantCharges)
              .set({
                effectiveTo: effectiveFrom.toISOString(), // Convert Date to string
              })
              .where(eq(tenantCharges.id, currentCharges[0].id));
          }

          // Create a new tenant charge
          console.log(
            `Creating new tenant charge for tenant ${tenant.id}, charge type ${chargeType}, amount ${amount}`,
          );
          await db.insert(tenantCharges).values({
            tenantId: tenant.id,
            flatNumber,
            chargeType: chargeType as any,
            amount,
            effectiveFrom: effectiveFrom.toISOString(), // Convert Date to string
            effectiveTo: null,
            createdBy,
          });
        } catch (err) {
          console.error(`Error updating charges for tenant ${tenant.id}:`, err);
          // Continue with other tenants even if one fails
        }
      }
    } catch (error) {
      console.error("Error in syncPropertyChargeWithTenant:", error);
      throw error;
    }
  }
}