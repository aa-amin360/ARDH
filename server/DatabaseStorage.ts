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
  PropertyOwner,
  InsertPropertyOwner,
  MaintenanceRecord,
  InsertMaintenanceRecord,
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
  propertyOwners,
  maintenanceRecords,
} from "@shared/schema";
import { and, eq, desc, sql, count, isNull, gte, like, or } from "drizzle-orm";
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
      .where(eq(vendors.service_type, serviceType as any));
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const now = new Date();
    const [newVendor] = await db
      .insert(vendors)
      .values({
        ...vendor,
        created_at: now,
        updated_at: now,
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
        updated_at: new Date(),
      })
      .where(eq(vendors.id, id))
      .returning();
    return updatedVendor;
  }

  async deleteVendor(id: number): Promise<boolean> {
    await db.delete(vendors).where(eq(vendors.id, id));
    return true;
  }

  // Added methods for expense categories and vendor types
  async getDistinctExpenseCategories() {
    const result = await db.execute(sql`
      SELECT DISTINCT expense_category FROM expense_categories;
    `);
    return result.rows;
  }

  async getExpenseSubcategories(category: string) {
    const result = await db.execute(sql`
      SELECT DISTINCT expense_sub_category FROM expense_categories 
      WHERE expense_category = ${category};
    `);
    return result.rows;
  }
  
  async getMaintenanceTypes() {
    try {
      console.log("Getting maintenance types from expense subcategories");
      const result = await db.execute(sql`
        SELECT DISTINCT expense_sub_category FROM expense_categories 
        WHERE expense_category = 'General Maintenance Works'
        ORDER BY expense_sub_category;
      `);
      console.log(`Found ${result.rows.length} maintenance types`);
      
      // Map the result to return just the strings, not objects
      return result.rows.map(row => row.expense_sub_category);
    } catch (error) {
      console.error(`Error getting maintenance types: ${error}`);
      return [];
    }
  }

  async getDistinctVendorServiceTypes() {
    const result = await db.execute(sql`
      SELECT DISTINCT vendor_type 
      FROM vendor_categories 
      ORDER BY vendor_type;
    `);
    return result.rows;
  }

  async getVendorsByExpenseSubcategory(subcategory: string) {
    const result = await db.execute(sql`
      SELECT v.* FROM vendors v
      JOIN vendor_categories vc ON v.service_type::text = vc.vendor_type::text
      WHERE vc.expense_sub_category = ${subcategory};
    `);
    return result.rows;
  }
  
  async getVendorsByMaintenanceType(maintenanceType: string) {
    try {
      console.log(`Getting vendors for maintenance type: ${maintenanceType}`);
      
      // First, look up the vendor type for this maintenance type (which is an expense subcategory)
      const vendorCategoryResult = await db.execute(sql`
        SELECT vendor_type FROM vendor_categories 
        WHERE expense_sub_category = ${maintenanceType}
        LIMIT 1;
      `);
      
      if (vendorCategoryResult.rows.length === 0) {
        console.log(`No vendor category found for maintenance type: ${maintenanceType}`);
        return [];
      }
      
      const vendorType = vendorCategoryResult.rows[0].vendor_type;
      console.log(`Found vendor type ${vendorType} for maintenance type ${maintenanceType}`);
      
      // Then, get all vendors of that type
      const vendorsResult = await db.execute(sql`
        SELECT * FROM vendors 
        WHERE service_type::text = ${vendorType}::text
        ORDER BY name;
      `);
      
      return vendorsResult.rows;
    } catch (error) {
      console.error(`Error getting vendors by maintenance type: ${error}`);
      return [];
    }
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

    const newTenant = await db.insert(tenants).values(tenant).returning();
    const createdTenant = newTenant[0];

    if (!createdTenant || !createdTenant.id) {
      throw new Error("Failed to create tenant.");
    }

    const currentCharges = await db
      .select()
      .from(propertyCharges)
      .where(
        and(
          eq(propertyCharges.flatNumber, tenant.flatNumber),
          isNull(propertyCharges.effectiveTo),
        ),
      );

    console.log(
      `Found ${currentCharges.length} current charges for flat ${tenant.flatNumber}`,
    );

    for (const charge of currentCharges) {
      await db.insert(tenantCharges).values({
        tenantId: createdTenant.id,
        flatNumber: tenant.flatNumber,
        chargeType: charge.chargeType as any,
        amount: charge.amount,
        effectiveFrom: tenant.leaseStartDate,
        effectiveTo: null,
        createdBy: tenant.createdBy ?? 1, // Safe fallback here too
      });
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

  // ADD a new charge (simple insert) + also check if any tenant exists to add new rent for them
  async addNewCharge(data: InsertPropertyCharge) {
    console.log("Adding new charge with data:", data);
    const chargeData = {
      ...data,
      effectiveFrom: new Date(data.effectiveFrom).toISOString(),
      effectiveTo: data.effectiveTo
        ? new Date(data.effectiveTo).toISOString()
        : null,
    };

    const currentTenants = await this.getCurrentTenantsForFlat(
      chargeData.flatNumber,
    );
    console.log("Formatted charge data:", chargeData);

    if (currentTenants.length > 0) {
      console.log(
        `Property ${chargeData.flatNumber} is occupied. Syncing with tenant charges.`,
      );
      for (const tenant of currentTenants) {
        await db
          .update(tenantCharges)
          .set({ effectiveTo: chargeData.effectiveFrom })
          .where(
            and(
              eq(tenantCharges.tenantId, tenant.id),
              eq(tenantCharges.chargeType, chargeData.chargeType),
              isNull(tenantCharges.effectiveTo),
            ),
          );

        await db.insert(tenantCharges).values({
          tenantId: tenant.id ?? 0, // fallback if tenant.id is null/undefined
          flatNumber: chargeData.flatNumber,
          chargeType: chargeData.chargeType,
          amount: chargeData.amount,
          effectiveFrom: chargeData.effectiveFrom,
          effectiveTo: null,
          createdBy: chargeData.createdBy ?? 1, // fallback to 1 if needed
        });
      }
    }

    try {
      const result = await db
        .insert(propertyCharges)
        .values(chargeData)
        .returning();
      console.log("Insert result:", result);
      return result[0];
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.flatNumber, flatNumber));

    // Filter tenants whose lease end date is today or in the future
    return currentTenants.filter((tenant) => {
      const leaseEndDate = new Date(tenant.leaseEndDate);
      leaseEndDate.setHours(0, 0, 0, 0);
      return leaseEndDate >= today;
    });
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

  // Property Owner methods
  async getPropertyOwner(id: string): Promise<PropertyOwner | undefined> {
    try {
      console.log(`Getting property owner with ID: ${id}`);
      const [owner] = await db
        .select()
        .from(propertyOwners)
        .where(eq(propertyOwners.id, id));
      return owner;
    } catch (error) {
      console.error(`Error fetching property owner: ${error}`);
      throw error;
    }
  }

  async getPropertyOwners(): Promise<PropertyOwner[]> {
    try {
      console.log("Getting all property owners");
      const ownersList = await db.select().from(propertyOwners);
      console.log(`Retrieved ${ownersList.length} property owners`);
      return ownersList;
    } catch (error) {
      console.error(`Error fetching property owners: ${error}`);
      throw error;
    }
  }

  async searchPropertyOwners(searchTerm: string): Promise<PropertyOwner[]> {
    try {
      console.log(`Searching property owners with term: ${searchTerm}`);
      const searchPattern = `%${searchTerm}%`;
      const ownersList = await db
        .select()
        .from(propertyOwners)
        .where(
          or(
            like(propertyOwners.fullName, searchPattern),
            like(propertyOwners.phone, searchPattern),
            like(propertyOwners.altPhone || '', searchPattern),
            like(propertyOwners.bankAccount || '', searchPattern)
          )
        );
      console.log(`Found ${ownersList.length} property owners matching search criteria`);
      return ownersList;
    } catch (error) {
      console.error(`Error searching property owners: ${error}`);
      throw error;
    }
  }

  async createPropertyOwner(owner: InsertPropertyOwner): Promise<PropertyOwner> {
    try {
      console.log("Creating new property owner:", owner);
      const now = new Date();
      
      // Generate ID as "fullName_phone"
      const cleanFullName = owner.fullName.toLowerCase().replace(/\s+/g, '_');
      const generatedId = `${cleanFullName}_${owner.phone}`;
      
      const [newOwner] = await db
        .insert(propertyOwners)
        .values({
          ...owner,
          id: generatedId,
          createdAt: now,
          modifiedAt: now
        })
        .returning();
      
      return newOwner;
    } catch (error) {
      console.error(`Error creating property owner: ${error}`);
      throw error;
    }
  }

  async updatePropertyOwner(
    id: string,
    updates: Partial<InsertPropertyOwner>
  ): Promise<PropertyOwner | undefined> {
    try {
      console.log(`Updating property owner with ID: ${id}`, updates);
      
      const [updatedOwner] = await db
        .update(propertyOwners)
        .set({
          ...updates,
          modifiedAt: new Date()
        })
        .where(eq(propertyOwners.id, id))
        .returning();
      
      return updatedOwner;
    } catch (error) {
      console.error(`Error updating property owner: ${error}`);
      throw error;
    }
  }

  async deletePropertyOwner(id: string): Promise<boolean> {
    try {
      // First check if this owner is linked to properties
      const isLinked = await this.isPropertyOwnerLinked(id);
      
      if (isLinked) {
        console.log(`Cannot delete property owner ${id} because they are linked to properties`);
        return false;
      }
      
      await db.delete(propertyOwners).where(eq(propertyOwners.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting property owner: ${error}`);
      throw error;
    }
  }

  async getPropertyOwnerLinkedFlats(ownerName: string): Promise<Property[]> {
    try {
      console.log(`Getting properties linked to owner: ${ownerName}`);
      const linkedProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.ownerName, ownerName));
      
      return linkedProperties;
    } catch (error) {
      console.error(`Error fetching linked properties: ${error}`);
      throw error;
    }
  }

  async isPropertyOwnerLinked(id: string): Promise<boolean> {
    try {
      // Get the owner first to get their fullName
      const owner = await this.getPropertyOwner(id);
      
      if (!owner) {
        console.log(`Property owner with ID ${id} not found`);
        return false;
      }
      
      // Check if any properties are linked to this owner's name
      const linkedProperties = await this.getPropertyOwnerLinkedFlats(owner.fullName);
      
      return linkedProperties.length > 0;
    } catch (error) {
      console.error(`Error checking if property owner is linked: ${error}`);
      throw error;
    }
  }

  // Maintenance record methods
  async getMaintenanceRecord(id: number): Promise<MaintenanceRecord | undefined> {
    try {
      console.log(`Getting maintenance record with ID: ${id}`);
      const [record] = await db
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, id));
      return record;
    } catch (error) {
      console.error(`Error fetching maintenance record: ${error}`);
      throw error;
    }
  }

  async getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    try {
      console.log("Getting all maintenance records");
      // Use raw SQL to avoid column name issues and join with properties and vendors
      const records = await db.execute(sql`
        SELECT 
          mr.id,
          mr.propertyid as "propertyId",
          p.flat_number as "flatNumber",
          mr.date as "maintenanceDate", 
          mr.maintenance_type as "maintenanceType",
          mr.vendorid as "vendorId",
          COALESCE(v.name, '') as "vendorName",
          mr.description,
          mr.created_by as "createdBy",
          mr.created_at as "createdAt",
          mr.modified_at as "modifiedAt"
        FROM 
          maintenance_records mr
        LEFT JOIN
          properties p ON mr.propertyid = p.id
        LEFT JOIN
          vendors v ON mr.vendorid = v.id
        ORDER BY 
          mr.date DESC
      `);
      console.log(`Retrieved ${records.rows.length} maintenance records`);
      return records.rows as any[];
    } catch (error) {
      console.error(`Error fetching maintenance records: ${error}`);
      return [];
    }
  }

  async getMaintenanceRecordsByProperty(propertyId: number): Promise<MaintenanceRecord[]> {
    try {
      console.log(`Getting maintenance records for property ID: ${propertyId}`);
      const records = await db.execute(sql`
        SELECT 
          mr.id,
          mr.propertyid as "propertyId",
          p.flat_number as "flatNumber",
          mr.date as "maintenanceDate", 
          mr.maintenance_type as "maintenanceType",
          mr.vendorid as "vendorId",
          COALESCE(v.name, '') as "vendorName",
          mr.description,
          mr.created_by as "createdBy",
          mr.created_at as "createdAt",
          mr.modified_at as "modifiedAt"
        FROM 
          maintenance_records mr
        LEFT JOIN
          properties p ON mr.propertyid = p.id
        LEFT JOIN
          vendors v ON mr.vendorid = v.id
        WHERE 
          mr.propertyid = ${propertyId}
        ORDER BY 
          mr.date DESC
      `);
      return records.rows as any[];
    } catch (error) {
      console.error(`Error fetching maintenance records for property: ${error}`);
      return [];
    }
  }

  async getMaintenanceRecordsByType(type: string): Promise<MaintenanceRecord[]> {
    try {
      console.log(`Getting maintenance records for type: ${type}`);
      const records = await db.execute(sql`
        SELECT 
          mr.id,
          mr.propertyid as "propertyId",
          p.flat_number as "flatNumber",
          mr.date as "maintenanceDate", 
          mr.maintenance_type as "maintenanceType",
          mr.vendorid as "vendorId",
          COALESCE(v.name, '') as "vendorName",
          mr.description,
          mr.created_by as "createdBy",
          mr.created_at as "createdAt",
          mr.modified_at as "modifiedAt"
        FROM 
          maintenance_records mr
        LEFT JOIN
          properties p ON mr.propertyid = p.id
        LEFT JOIN
          vendors v ON mr.vendorid = v.id
        WHERE 
          mr.maintenance_type = ${type}
        ORDER BY 
          mr.date DESC
      `);
      return records.rows as any[];
    } catch (error) {
      console.error(`Error fetching maintenance records by type: ${error}`);
      return [];
    }
  }

  async getLastMaintenanceDate(propertyId: number, type: string): Promise<Date | null> {
    try {
      console.log(`Getting last maintenance date for property ID: ${propertyId} and type: ${type}`);
      const result = await db.execute(sql`
        SELECT date FROM maintenance_records
        WHERE propertyid = ${propertyId}
        AND maintenance_type = ${type}
        ORDER BY date DESC
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        // Parse the date string into a Date object
        return new Date(result.rows[0].date);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching last maintenance date: ${error}`);
      throw error;
    }
  }

  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    try {
      console.log("Creating new maintenance record:", record);
      const now = new Date().toISOString();
      
      // Format the date if it's a Date object
      const formattedDate = record.date instanceof Date ? 
        record.date.toISOString() : record.date;
      
      const result = await db.execute(sql`
        INSERT INTO maintenance_records (
          date, 
          flat_number, 
          propertyid, 
          maintenance_type, 
          description, 
          vendorid,
          created_by,
          created_at,
          modified_at
        ) VALUES (
          ${formattedDate},
          ${record.flatNumber},
          ${record.propertyId},
          ${record.maintenanceType},
          ${record.description},
          ${record.vendorId},
          ${record.createdBy},
          ${now},
          ${now}
        )
        RETURNING *
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error creating maintenance record: ${error}`);
      throw error;
    }
  }

  async updateMaintenanceRecord(
    id: number,
    updates: Partial<InsertMaintenanceRecord>
  ): Promise<MaintenanceRecord | undefined> {
    try {
      console.log(`Updating maintenance record with ID: ${id}`, updates);
      
      // Create SQL SET parts dynamically based on the updates provided
      const sets: string[] = [];
      const values: any[] = [id]; // First parameter is always the ID
      let paramIndex = 2; // Start parameter index from 2 (after id)
      
      // Add modified_at by default
      const now = new Date().toISOString();
      sets.push(`modified_at = '${now}'`);
      
      if (updates.date) {
        const formattedDate = updates.date instanceof Date ?
          updates.date.toISOString() : updates.date;
        sets.push(`date = $${paramIndex}`);
        values.push(formattedDate);
        paramIndex++;
      }
      
      if (updates.flatNumber) {
        sets.push(`flat_number = $${paramIndex}`);
        values.push(updates.flatNumber);
        paramIndex++;
      }
      
      if (updates.propertyId) {
        sets.push(`propertyid = $${paramIndex}`);
        values.push(updates.propertyId);
        paramIndex++;
      }
      
      if (updates.maintenanceType) {
        sets.push(`maintenance_type = $${paramIndex}`);
        values.push(updates.maintenanceType);
        paramIndex++;
      }
      
      if (updates.description !== undefined) {
        sets.push(`description = $${paramIndex}`);
        values.push(updates.description);
        paramIndex++;
      }
      
      if (updates.vendorId !== undefined) {
        sets.push(`vendorid = $${paramIndex}`);
        values.push(updates.vendorId);
        paramIndex++;
      }
      
      // Build and execute the SQL
      const setClause = sets.join(', ');
      const updateSql = `
        UPDATE maintenance_records 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.execute(sql.raw(updateSql, ...values));
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating maintenance record: ${error}`);
      throw error;
    }
  }

  async deleteMaintenanceRecord(id: number): Promise<boolean> {
    try {
      console.log(`Deleting maintenance record with ID: ${id}`);
      await db.execute(sql`
        DELETE FROM maintenance_records
        WHERE id = ${id}
      `);
      return true;
    } catch (error) {
      console.error(`Error deleting maintenance record: ${error}`);
      throw error;
    }
  }
}
