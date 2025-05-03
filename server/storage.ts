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
  Tenant,
  InsertTenant,
  Vendor,
  InsertVendor,
  PropertyCharge,
  InsertPropertyCharge,
  TenantCharge,
  InsertTenantCharge,
  PropertyOwner,
  InsertPropertyOwner,
  IncomeSummary,
  ExpenseSummary,
  PropertySummary,
} from "@shared/schema";
import session from "express-session";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "./db";
import { propertyCharges } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Properties
  getProperty(id: number): Promise<Property | undefined>;
  getProperties(): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(
    id: number,
    property: Partial<InsertProperty>,
  ): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;

  // Income
  getIncome(id: number): Promise<Income | undefined>;
  getIncomes(): Promise<Income[]>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(
    id: number,
    income: Partial<InsertIncome>,
  ): Promise<Income | undefined>;
  deleteIncome(id: number): Promise<boolean>;

  // Expense
  getExpense(id: number): Promise<Expense | undefined>;
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(
    id: number,
    expense: Partial<InsertExpense>,
  ): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;

  // Water Tank
  getWaterTank(id: number): Promise<WaterTank | undefined>;
  getWaterTanks(): Promise<WaterTank[]>;
  createWaterTank(waterTank: InsertWaterTank): Promise<WaterTank>;
  updateWaterTank(
    id: number,
    waterTank: Partial<InsertWaterTank>,
  ): Promise<WaterTank | undefined>;
  deleteWaterTank(id: number): Promise<boolean>;

  // Tenant management
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenants(): Promise<Tenant[]>;
  getTenantsByProperty(propertyId: number): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(
    id: number,
    tenant: Partial<InsertTenant>,
  ): Promise<Tenant | undefined>;
  deleteTenant(id: number): Promise<boolean>;

  // Vendor management
  getVendor(id: number): Promise<Vendor | undefined>;
  getVendors(): Promise<Vendor[]>;
  getVendorsByServiceType(serviceType: string): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(
    id: number,
    vendor: Partial<InsertVendor>,
  ): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;

  // Property Charge management
  getPropertyCharge(id: number): Promise<PropertyCharge | undefined>;
  getPropertyCharges(): Promise<PropertyCharge[]>;
  getPropertyChargesByFlat(flatNumber: string): Promise<PropertyCharge[]>;
  getCurrentPropertyCharges(flatNumber: string): Promise<PropertyCharge[]>;
  getPropertyChargeHistory(
    flatNumber: string,
    chargeType: string,
  ): Promise<PropertyCharge[]>;
  createPropertyCharge(charge: InsertPropertyCharge): Promise<PropertyCharge>;
  updatePropertyCharge(
    id: number,
    charge: Partial<InsertPropertyCharge>,
  ): Promise<PropertyCharge | undefined>;
  deletePropertyCharge(id: number): Promise<boolean>;

  // Tenant Charge management
  getTenantCharge(id: number): Promise<TenantCharge | undefined>;
  getTenantCharges(): Promise<TenantCharge[]>;
  getTenantChargesByTenant(tenantId: number): Promise<TenantCharge[]>;
  getCurrentTenantCharges(tenantId: number): Promise<TenantCharge[]>;
  getTenantChargeHistory(
    tenantId: number,
    chargeType: string,
  ): Promise<TenantCharge[]>;
  createTenantCharge(charge: InsertTenantCharge): Promise<TenantCharge>;
  updateTenantCharge(
    id: number,
    charge: Partial<InsertTenantCharge>,
  ): Promise<TenantCharge | undefined>;
  deleteTenantCharge(id: number): Promise<boolean>;

  // Helper methods for property and tenant charge sync
  getCurrentTenantsForFlat(flatNumber: string): Promise<Tenant[]>;
  syncPropertyChargeWithTenant(
    flatNumber: string,
    chargeType: string,
    amount: number,
    effectiveFrom: Date,
    createdBy: number,
  ): Promise<void>;

  // Property Owner management
  getPropertyOwner(id: string): Promise<PropertyOwner | undefined>;
  getPropertyOwners(): Promise<PropertyOwner[]>;
  searchPropertyOwners(searchTerm: string): Promise<PropertyOwner[]>;
  createPropertyOwner(owner: InsertPropertyOwner): Promise<PropertyOwner>;
  updatePropertyOwner(
    id: string,
    owner: Partial<InsertPropertyOwner>,
  ): Promise<PropertyOwner | undefined>;
  deletePropertyOwner(id: string): Promise<boolean>;
  getPropertyOwnerLinkedFlats(ownerName: string): Promise<Property[]>;
  isPropertyOwnerLinked(id: string): Promise<boolean>;

  // Summary/Dashboard data
  getIncomeSummary(): Promise<IncomeSummary>;
  getExpenseSummary(): Promise<ExpenseSummary>;
  getPropertySummary(): Promise<PropertySummary>;
  getRecentTransactions(limit: number): Promise<(Income | Expense)[]>;

  // Session store for authentication
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private properties: Map<number, Property>;
  private incomes: Map<number, Income>;
  private expenses: Map<number, Expense>;
  private waterTanks: Map<number, WaterTank>;
  private tenants: Map<number, Tenant>;
  private vendors: Map<number, Vendor>;
  private propertyCharges: Map<number, PropertyCharge>;
  private tenantCharges: Map<number, TenantCharge>;

  private userCounter: number;
  private propertyCounter: number;
  private incomeCounter: number;
  private expenseCounter: number;
  private waterTankCounter: number;
  private tenantCounter: number;
  private vendorCounter: number;
  private propertyChargeCounter: number;
  private tenantChargeCounter: number;

  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.incomes = new Map();
    this.expenses = new Map();
    this.waterTanks = new Map();
    this.tenants = new Map();
    this.vendors = new Map();
    this.propertyCharges = new Map();
    this.tenantCharges = new Map();

    this.userCounter = 1;
    this.propertyCounter = 1;
    this.incomeCounter = 1;
    this.expenseCounter = 1;
    this.waterTankCounter = 1;
    this.tenantCounter = 1;
    this.vendorCounter = 1;
    this.propertyChargeCounter = 1;
    this.tenantChargeCounter = 1;

    // Create an in-memory session store
    const MemoryStore = require("memorystore")(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });

    this.seedData();
  }

  // Seed some initial data
  private seedData() {
    // Create admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "admin123", // In a real app, this would be hashed
      role: "admin",
      name: "Admin User",
      email: "admin@example.com",
    };
    this.createUser(adminUser);

    // Create data entry user
    const dataEntryUser: InsertUser = {
      username: "dataentry",
      password: "data123", // In a real app, this would be hashed
      role: "data_entry",
      name: "Data Entry User",
      email: "data@example.com",
    };
    this.createUser(dataEntryUser);

    // Create sample properties
    const propertyTypes: ("1BHK" | "2BHK" | "3BHK" | "penthouse")[] = [
      "1BHK",
      "2BHK",
      "3BHK",
      "penthouse",
    ];
    const maintenanceFees = {
      "1BHK": 1000,
      "2BHK": 1500,
      "3BHK": 2000,
      penthouse: 3000,
    };
    const rents = {
      "1BHK": 25000,
      "2BHK": 35000,
      "3BHK": 50000,
      penthouse: 80000,
    };

    // Create 9 1BHK flats
    for (let i = 101; i <= 109; i++) {
      this.createProperty({
        flatNumber: i.toString(),
        flatType: "1BHK",
        ownerName: `Owner ${i}`,
        expectedRent: rents["1BHK"],
        maintenanceFee: maintenanceFees["1BHK"],
        isRented: i !== 109, // One vacant flat
        currentTenant: i !== 109 ? `Tenant ${i}` : undefined,
        floorArea: 600,
        notes: `1BHK flat ${i}`,
      });
    }

    // Create 9 2BHK flats
    for (let i = 201; i <= 209; i++) {
      this.createProperty({
        flatNumber: i.toString(),
        flatType: "2BHK",
        ownerName: `Owner ${i}`,
        expectedRent: rents["2BHK"],
        maintenanceFee: maintenanceFees["2BHK"],
        isRented: true,
        currentTenant: `Tenant ${i}`,
        floorArea: 950,
        notes: `2BHK flat ${i}`,
      });
    }

    // Create 1 3BHK flat
    this.createProperty({
      flatNumber: "301",
      flatType: "3BHK",
      ownerName: "Owner 301",
      expectedRent: rents["3BHK"],
      maintenanceFee: maintenanceFees["3BHK"],
      isRented: false,
      floorArea: 1500,
      notes: "3BHK flat 301",
    });

    // Create 1 penthouse
    this.createProperty({
      flatNumber: "401",
      flatType: "penthouse",
      ownerName: "Owner 401",
      expectedRent: rents["penthouse"],
      maintenanceFee: maintenanceFees["penthouse"],
      isRented: false,
      floorArea: 2500,
      notes: "Penthouse 401",
    });

    // Create sample incomes (rent payments for last few months)
    const months = [4, 5, 6]; // Apr, May, Jun
    const properties = Array.from(this.properties.values());
    const rentedProperties = properties.filter((p) => p.isRented);

    months.forEach((month) => {
      // Rent incomes
      rentedProperties.forEach((property) => {
        this.createIncome({
          date: new Date(2023, month - 1, 15),
          amount: property.expectedRent,
          type: "rent",
          description: `Rent received for ${property.flatNumber}`,
          propertyId: property.id,
          receivedFrom: "Nestaway",
          createdBy: 1, // Admin user
        });
      });

      // Maintenance incomes
      properties.forEach((property) => {
        this.createIncome({
          date: new Date(2023, month - 1, 10),
          amount: property.maintenanceFee,
          type: "maintenance",
          description: `Maintenance fee for ${property.flatNumber}`,
          propertyId: property.id,
          receivedFrom: "Nestaway",
          createdBy: 1, // Admin user
        });
      });
    });

    // Create sample expenses
    const expenseCategories: any = [
      {
        category: "electricity",
        amount: 9500,
        description: "Common area electricity",
      },
      {
        category: "generator_fuel",
        amount: 5000,
        description: "Generator diesel",
      },
      {
        category: "cctv_maintenance",
        amount: 3500,
        description: "CCTV maintenance",
      },
      {
        category: "internet",
        amount: 2500,
        description: "Common area internet",
      },
      {
        category: "elevator_maintenance",
        amount: 12000,
        description: "Elevator maintenance",
      },
      {
        category: "general_building_maintenance",
        amount: 15000,
        description: "General building repairs",
      },
      {
        category: "water_tank",
        amount: 8000,
        description: "Water tank clean-up",
      },
      {
        category: "drainage_cleaning",
        amount: 5000,
        description: "Drainage cleaning",
      },
      { category: "misc", amount: 7500, description: "Miscellaneous expenses" },
    ];

    months.forEach((month) => {
      expenseCategories.forEach(({ category, amount, description }) => {
        this.createExpense({
          date: new Date(2023, month - 1, Math.floor(Math.random() * 28) + 1),
          amount,
          category,
          description: `${description} - ${month}/2023`,
          vendor: "Local vendor",
          createdBy: 1, // Admin user
        });
      });
    });

    // Create water tank deliveries
    const waterTankDeliveries = [
      { date: new Date(2023, 5, 5), liters: 5000, cost: 3200 },
      { date: new Date(2023, 5, 15), liters: 5000, cost: 3200 },
      { date: new Date(2023, 5, 25), liters: 5000, cost: 3200 },
      { date: new Date(2023, 4, 5), liters: 5000, cost: 3200 },
      { date: new Date(2023, 4, 15), liters: 5000, cost: 3200 },
      { date: new Date(2023, 4, 25), liters: 5000, cost: 3200 },
    ];

    waterTankDeliveries.forEach(({ date, liters, cost }) => {
      this.createWaterTank({
        date,
        liters,
        tankerNumber: `TN-${Math.floor(1000 + Math.random() * 9000)}`,
        personInCharge: "Building Manager",
        cost,
        createdBy: 1, // Admin user
      });
    });

    // Create sample vendors
    const vendors = [
      {
        name: "Electrical Solutions",
        phone: "9876543210",
        email: "electrical@example.com",
        serviceType: "Electrical",
        provisionType: "service",
        address: "123 Main St, Bangalore",
        contactPerson: "Raj Kumar",
        notes: "Preferred electrician for the building",
        createdBy: 1,
      },
      {
        name: "Plumbing Experts",
        phone: "9876543211",
        email: "plumbing@example.com",
        serviceType: "Plumbing",
        provisionType: "service",
        address: "456 Park Ave, Bangalore",
        contactPerson: "Suresh Singh",
        notes: "Available 24/7 for emergencies",
        createdBy: 1,
      },
      {
        name: "Paint Masters",
        phone: "9876543212",
        email: "paint@example.com",
        serviceType: "Paint_Job",
        provisionType: "both",
        address: "789 Lake View, Bangalore",
        contactPerson: "Vishal Patel",
        notes: "Premium quality paint services",
        createdBy: 1,
      },
      {
        name: "Carpentry Works",
        phone: "9876543213",
        email: "wood@example.com",
        serviceType: "Wood_work",
        provisionType: "both",
        address: "321 Wood St, Bangalore",
        contactPerson: "Prakash Joshi",
        notes: "Custom furniture and repairs",
        createdBy: 1,
      },
      {
        name: "City Water Supply",
        phone: "9876543214",
        email: "water@example.com",
        serviceType: "Water",
        provisionType: "product",
        address: "567 Tank Road, Bangalore",
        contactPerson: "Mahesh Kumar",
        notes: "Reliable water tanker service",
        createdBy: 1,
      },
    ];

    vendors.forEach((vendor) => {
      this.createVendor(vendor);
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCounter++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Properties
  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = this.propertyCounter++;
    const now = new Date();
    const property: Property = {
      ...insertProperty,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(
    id: number,
    updates: Partial<InsertProperty>,
  ): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;

    const updatedProperty = {
      ...property,
      ...updates,
      updatedAt: new Date(),
    };
    this.properties.set(id, updatedProperty);
    return updatedProperty;
  }

  async deleteProperty(id: number): Promise<boolean> {
    return this.properties.delete(id);
  }

  // Income
  async getIncome(id: number): Promise<Income | undefined> {
    return this.incomes.get(id);
  }

  async getIncomes(): Promise<Income[]> {
    return Array.from(this.incomes.values());
  }

  async createIncome(insertIncome: InsertIncome): Promise<Income> {
    const id = this.incomeCounter++;
    const now = new Date();
    const income: Income = { ...insertIncome, id, createdAt: now };
    this.incomes.set(id, income);
    return income;
  }

  async updateIncome(
    id: number,
    updates: Partial<InsertIncome>,
  ): Promise<Income | undefined> {
    const income = this.incomes.get(id);
    if (!income) return undefined;

    const updatedIncome = { ...income, ...updates };
    this.incomes.set(id, updatedIncome);
    return updatedIncome;
  }

  async deleteIncome(id: number): Promise<boolean> {
    return this.incomes.delete(id);
  }

  // Expenses
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.expenseCounter++;
    const now = new Date();
    const expense: Expense = { ...insertExpense, id, createdAt: now };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(
    id: number,
    updates: Partial<InsertExpense>,
  ): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;

    const updatedExpense = { ...expense, ...updates };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Water Tank
  async getWaterTank(id: number): Promise<WaterTank | undefined> {
    return this.waterTanks.get(id);
  }

  async getWaterTanks(): Promise<WaterTank[]> {
    return Array.from(this.waterTanks.values());
  }

  async createWaterTank(insertWaterTank: InsertWaterTank): Promise<WaterTank> {
    const id = this.waterTankCounter++;
    const now = new Date();
    const waterTank: WaterTank = { ...insertWaterTank, id, createdAt: now };
    this.waterTanks.set(id, waterTank);
    return waterTank;
  }

  async updateWaterTank(
    id: number,
    updates: Partial<InsertWaterTank>,
  ): Promise<WaterTank | undefined> {
    const waterTank = this.waterTanks.get(id);
    if (!waterTank) return undefined;

    const updatedWaterTank = { ...waterTank, ...updates };
    this.waterTanks.set(id, updatedWaterTank);
    return updatedWaterTank;
  }

  async deleteWaterTank(id: number): Promise<boolean> {
    return this.waterTanks.delete(id);
  }

  // Tenant management
  async getTenant(id: number): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async getTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  async getTenantsByProperty(propertyId: number): Promise<Tenant[]> {
    return Array.from(this.tenants.values()).filter(
      (tenant) => tenant.propertyId === propertyId,
    );
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const id = this.tenantCounter++;
    const now = new Date();
    const tenant: Tenant = {
      ...insertTenant,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.tenants.set(id, tenant);

    // Update the property's isRented status and currentTenant name
    const property = this.properties.get(tenant.propertyId);
    if (property) {
      this.updateProperty(property.id, {
        isRented: true,
        currentTenant: tenant.name,
      });
    }

    return tenant;
  }

  async updateTenant(
    id: number,
    updates: Partial<InsertTenant>,
  ): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;

    const updatedTenant = {
      ...tenant,
      ...updates,
      updatedAt: new Date(),
    };
    this.tenants.set(id, updatedTenant);

    // If tenant status is changed to inactive, update property status
    if (updates.status === "inactive" && tenant.status !== "inactive") {
      const property = this.properties.get(tenant.propertyId);
      if (property) {
        this.updateProperty(property.id, {
          isRented: false,
          currentTenant: undefined,
        });
      }
    }

    // If tenant name is updated, update property currentTenant
    if (updates.name && tenant.status === "active") {
      const property = this.properties.get(tenant.propertyId);
      if (property) {
        this.updateProperty(property.id, {
          currentTenant: updates.name,
        });
      }
    }

    return updatedTenant;
  }

  async deleteTenant(id: number): Promise<boolean> {
    const tenant = this.tenants.get(id);
    if (tenant) {
      // Update property status if tenant was active
      if (tenant.status === "active") {
        const property = this.properties.get(tenant.propertyId);
        if (property) {
          this.updateProperty(property.id, {
            isRented: false,
            currentTenant: undefined,
          });
        }
      }
    }

    return this.tenants.delete(id);
  }

  // Vendor management
  async getVendor(id: number): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

  async getVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async getVendorsByServiceType(serviceType: string): Promise<Vendor[]> {
    return Array.from(this.vendors.values()).filter(
      (vendor) => vendor.service_type === serviceType,
    );
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const id = this.vendorCounter++;
    const now = new Date();
    const vendor: Vendor = {
      ...insertVendor,
      id,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    this.vendors.set(id, vendor);
    return vendor;
  }

  async updateVendor(
    id: number,
    updates: Partial<InsertVendor>,
  ): Promise<Vendor | undefined> {
    const vendor = this.vendors.get(id);
    if (!vendor) return undefined;

    const updatedVendor = {
      ...vendor,
      ...updates,
      updatedAt: new Date(),
    };
    this.vendors.set(id, updatedVendor);
    return updatedVendor;
  }

  async deleteVendor(id: number): Promise<boolean> {
    return this.vendors.delete(id);
  }

  // Property Charge methods
  async getPropertyCharge(id: number): Promise<PropertyCharge | undefined> {
    return this.propertyCharges.get(id);
  }

  async getPropertyCharges(): Promise<PropertyCharge[]> {
    return Array.from(this.propertyCharges.values());
  }

  async getPropertyChargesByFlat(
    flatNumber: string,
  ): Promise<PropertyCharge[]> {
    return Array.from(this.propertyCharges.values()).filter(
      (charge) => charge.flatNumber === flatNumber,
    );
  }

  async getCurrentPropertyCharges(
    flatNumber: string,
  ): Promise<PropertyCharge[]> {
    return Array.from(this.propertyCharges.values()).filter(
      (charge) =>
        charge.flatNumber === flatNumber && charge.effectiveTo === null,
    );
  }

  async getPropertyChargeHistory(
    flatNumber: string,
    chargeType: string,
  ): Promise<PropertyCharge[]> {
    return Array.from(this.propertyCharges.values())
      .filter(
        (charge) =>
          charge.flatNumber === flatNumber && charge.chargeType === chargeType,
      )
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  }

  async createPropertyCharge(
    charge: InsertPropertyCharge,
  ): Promise<PropertyCharge> {
    const id = this.propertyChargeCounter++;
    const now = new Date();

    // Check if there are any existing active charges that need to be closed
    const currentCharges = Array.from(this.propertyCharges.values()).filter(
      (c) =>
        c.flatNumber === charge.flatNumber &&
        c.chargeType === charge.chargeType &&
        c.effectiveTo === null,
    );

    // Update the effective end date for the current charges
    if (currentCharges.length > 0) {
      for (const currentCharge of currentCharges) {
        const updatedCharge = {
          ...currentCharge,
          effectiveTo: charge.effectiveFrom,
        };
        this.propertyCharges.set(currentCharge.id, updatedCharge);

        // Sync with tenant charges if flat is occupied
        await this.syncPropertyChargeWithTenant(
          charge.flatNumber,
          charge.chargeType,
          charge.amount,
          charge.effectiveFrom,
          charge.createdBy,
        );
      }
    }

    // Create the new charge
    const newCharge: PropertyCharge = {
      ...charge,
      id,
      createdAt: now,
    };
    this.propertyCharges.set(id, newCharge);
    return newCharge;
  }

  async updatePropertyCharge(
    id: number,
    updates: Partial<InsertPropertyCharge>,
  ): Promise<PropertyCharge | undefined> {
    const charge = this.propertyCharges.get(id);
    if (!charge) return undefined;

    const updatedCharge: PropertyCharge = {
      ...charge,
      ...updates,
    };
    this.propertyCharges.set(id, updatedCharge);
    return updatedCharge;
  }

  async deletePropertyCharge(id: number): Promise<boolean> {
    return this.propertyCharges.delete(id);
  }

  //Simple insert to property charge
  async createSimplePropertyCharge(
    charge: InsertPropertyCharge,
  ): Promise<PropertyCharge> {
    const id = this.propertyChargeCounter++;

    const newCharge: PropertyCharge = {
      ...charge,
      id,
      createdAt: new Date(), // correctly setting created_at
    };

    this.propertyCharges.set(id, newCharge);
    return newCharge;
  }

  // Tenant Charge methods
  async getTenantCharge(id: number): Promise<TenantCharge | undefined> {
    return this.tenantCharges.get(id);
  }

  async getTenantCharges(): Promise<TenantCharge[]> {
    return Array.from(this.tenantCharges.values());
  }

  async getTenantChargesByTenant(tenantId: number): Promise<TenantCharge[]> {
    return Array.from(this.tenantCharges.values()).filter(
      (charge) => charge.tenantId === tenantId,
    );
  }

  async getCurrentTenantCharges(tenantId: number): Promise<TenantCharge[]> {
    return Array.from(this.tenantCharges.values()).filter(
      (charge) => charge.tenantId === tenantId && charge.effectiveTo === null,
    );
  }

  async getTenantChargeHistory(
    tenantId: number,
    chargeType: string,
  ): Promise<TenantCharge[]> {
    return Array.from(this.tenantCharges.values())
      .filter(
        (charge) =>
          charge.tenantId === tenantId && charge.chargeType === chargeType,
      )
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  }

  async createTenantCharge(charge: InsertTenantCharge): Promise<TenantCharge> {
    const id = this.tenantChargeCounter++;
    const now = new Date();

    // Check if there are any existing active charges that need to be closed
    const currentCharges = Array.from(this.tenantCharges.values()).filter(
      (c) =>
        c.tenantId === charge.tenantId &&
        c.chargeType === charge.chargeType &&
        c.effectiveTo === null,
    );

    // Update the effective end date for the current charges
    if (currentCharges.length > 0) {
      for (const currentCharge of currentCharges) {
        const updatedCharge = {
          ...currentCharge,
          effectiveTo: charge.effectiveFrom,
        };
        this.tenantCharges.set(currentCharge.id, updatedCharge);
      }
    }

    // Create the new charge
    const newCharge: TenantCharge = {
      ...charge,
      id,
      createdAt: now,
    };
    this.tenantCharges.set(id, newCharge);
    return newCharge;
  }

  async updateTenantCharge(
    id: number,
    updates: Partial<InsertTenantCharge>,
  ): Promise<TenantCharge | undefined> {
    const charge = this.tenantCharges.get(id);
    if (!charge) return undefined;

    const updatedCharge: TenantCharge = {
      ...charge,
      ...updates,
    };
    this.tenantCharges.set(id, updatedCharge);
    return updatedCharge;
  }

  async deleteTenantCharge(id: number): Promise<boolean> {
    return this.tenantCharges.delete(id);
  }

  // Helper methods for property and tenant charge sync
  async getCurrentTenantsForFlat(flatNumber: string): Promise<Tenant[]> {
    const today = new Date();
    return Array.from(this.tenants.values()).filter(
      (tenant) =>
        tenant.flatNumber === flatNumber && tenant.leaseEndDate >= today,
    );
  }

  async syncPropertyChargeWithTenant(
    flatNumber: string,
    chargeType: string,
    amount: number,
    effectiveFrom: Date,
    createdBy: number,
  ): Promise<void> {
    // Find current tenants for this flat
    const currentTenants = await this.getCurrentTenantsForFlat(flatNumber);

    // If there are current tenants, update their charges too
    for (const tenant of currentTenants) {
      // Find current charges for this tenant
      const currentCharges = Array.from(this.tenantCharges.values()).filter(
        (c) =>
          c.tenantId === tenant.id &&
          c.chargeType === chargeType &&
          c.effectiveTo === null,
      );

      // Update the effective end date for the current charges
      if (currentCharges.length > 0) {
        for (const currentCharge of currentCharges) {
          const updatedCharge = {
            ...currentCharge,
            effectiveTo: effectiveFrom,
          };
          this.tenantCharges.set(currentCharge.id, updatedCharge);
        }
      }

      // Create a new tenant charge
      const id = this.tenantChargeCounter++;
      const newCharge: TenantCharge = {
        id,
        tenantId: tenant.id,
        flatNumber,
        chargeType: chargeType as any,
        amount,
        effectiveFrom,
        effectiveTo: null,
        createdBy,
        createdAt: new Date(),
      };
      this.tenantCharges.set(id, newCharge);
    }
  }

  // Dashboard data
  async getIncomeSummary(): Promise<IncomeSummary> {
    const incomes = Array.from(this.incomes.values());
    const total = incomes.reduce((sum, income) => sum + income.amount, 0);

    // Group by type
    const byType = this.groupBy(incomes, "type").map(([type, items]) => ({
      type,
      amount: items.reduce((sum, income) => sum + income.amount, 0),
    }));

    // Group by month
    const byMonth = this.groupByMonth(incomes).map(([month, items]) => ({
      month,
      amount: items.reduce((sum, income) => sum + income.amount, 0),
    }));

    return { total, byType, byMonth };
  }

  async getExpenseSummary(): Promise<ExpenseSummary> {
    const expenses = Array.from(this.expenses.values());
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Group by category
    const byCategory = this.groupBy(expenses, "category").map(
      ([category, items]) => ({
        category,
        amount: items.reduce((sum, expense) => sum + expense.amount, 0),
      }),
    );

    // Group by month
    const byMonth = this.groupByMonth(expenses).map(([month, items]) => ({
      month,
      amount: items.reduce((sum, expense) => sum + expense.amount, 0),
    }));

    return { total, byCategory, byMonth };
  }

  async getPropertySummary(): Promise<PropertySummary> {
    const properties = Array.from(this.properties.values());
    const total = properties.length;

    // Group by type
    const byType = this.groupBy(properties, "flatType").map(
      ([type, items]) => ({
        type,
        count: items.length,
      }),
    );

    // Calculate occupancy rate
    const rentedCount = properties.filter((p) => p.isRented).length;
    const occupancyRate = (rentedCount / total) * 100;

    // Calculate total monthly rent (expected from Nestaway)
    const totalMonthlyRent = properties
      .filter((p) => p.isRented)
      .reduce((sum, property) => sum + property.expectedRent, 0);

    // Calculate total maintenance collection
    const totalMaintenanceCollection = properties.reduce(
      (sum, property) => sum + property.maintenanceFee,
      0,
    );

    return {
      total,
      byType,
      occupancyRate,
      totalMonthlyRent,
      totalMaintenanceCollection,
    };
  }

  async getRecentTransactions(limit: number): Promise<(Income | Expense)[]> {
    const incomes = Array.from(this.incomes.values()).map((income) => ({
      ...income,
      transactionType: "income" as const,
    }));

    const expenses = Array.from(this.expenses.values()).map((expense) => ({
      ...expense,
      transactionType: "expense" as const,
    }));

    const allTransactions = [...incomes, ...expenses];

    // Sort by date (most recent first)
    allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return allTransactions.slice(0, limit);
  }

  // Helper methods
  private groupBy<T>(items: T[], key: keyof T): [string, T[]][] {
    const groups = new Map<string, T[]>();

    items.forEach((item) => {
      const value = String(item[key]);
      if (!groups.has(value)) {
        groups.set(value, []);
      }
      groups.get(value)!.push(item);
    });

    return Array.from(groups.entries());
  }

  private groupByMonth<T extends { date: Date }>(items: T[]): [string, T[]][] {
    const groups = new Map<string, T[]>();

    items.forEach((item) => {
      const date = new Date(item.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups.has(month)) {
        groups.set(month, []);
      }
      groups.get(month)!.push(item);
    });

    return Array.from(groups.entries());
  }
}

import { DatabaseStorage } from "./DatabaseStorage";

// Use DatabaseStorage instead of MemStorage for persistence
export const storage = new DatabaseStorage();
