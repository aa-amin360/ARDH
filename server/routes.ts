import express, { Request, Response, type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { setupAuth } from "./auth";
import {
  insertUserSchema,
  insertPropertySchema,
  insertIncomeSchema,
  insertExpenseSchema,
  insertWaterTankSchema,
  insertTenantSchema,
  insertVendorSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: 'Unauthorized' });
  };
  
  // Middleware to check if user is an admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user && (req.user as any).role === 'admin') {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  };
  
  // Middleware to restrict data entry users from accessing income routes
  const adminOnlyForIncome = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user) {
      const userRole = (req.user as any).role;
      // If user is data_entry and trying to access income routes, block them
      if (userRole === 'data_entry' && req.path.includes('/income')) {
        return res.status(403).json({ message: 'Data entry users cannot access income information.' });
      }
    }
    return next();
  };
  
  // User routes (admin only)
  app.get('/api/users', isAdmin, async (req, res, next) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email
      })));
    } catch (error) {
      next(error);
    }
  });
  
  app.post('/api/users', isAdmin, async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(userData);
      
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        email: newUser.email
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  // Property routes
  app.get('/api/properties', isAuthenticated, async (req, res, next) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      next(error);
    }
  });
  
  app.get('/api/properties/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }
      
      res.json(property);
    } catch (error) {
      next(error);
    }
  });
  
  app.post('/api/properties', isAuthenticated, async (req, res, next) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      const newProperty = await storage.createProperty(propertyData);
      res.status(201).json(newProperty);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  // Support both PUT and PATCH for property updates
  app.put('/api/properties/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const propertyData = insertPropertySchema.partial().parse(req.body);
      
      const updatedProperty = await storage.updateProperty(id, propertyData);
      
      if (!updatedProperty) {
        return res.status(404).json({ message: 'Property not found' });
      }
      
      res.json(updatedProperty);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  app.patch('/api/properties/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const propertyData = insertPropertySchema.partial().parse(req.body);
      
      console.log(`Updating property ${id} with data:`, propertyData);
      
      const updatedProperty = await storage.updateProperty(id, propertyData);
      
      if (!updatedProperty) {
        return res.status(404).json({ message: 'Property not found' });
      }
      
      res.json(updatedProperty);
    } catch (error) {
      console.error('Error updating property:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  app.delete('/api/properties/:id', isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProperty(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Property not found' });
      }
      
      res.json({ message: 'Property deleted successfully' });
    } catch (error) {
      next(error);
    }
  });
  
  // Income routes
  app.get('/api/incomes', isAuthenticated, adminOnlyForIncome, async (req, res, next) => {
    try {
      const incomes = await storage.getIncomes();
      res.json(incomes);
    } catch (error) {
      next(error);
    }
  });
  
  // Bulk upload for income
  app.post('/api/incomes/bulk-upload', isAuthenticated, adminOnlyForIncome, async (req, res, next) => {
    try {
      // In a real implementation, this would:
      // 1. Parse the CSV file from req.files
      // 2. Validate each row of the CSV
      // 3. Create income records for each valid row
      // 4. Return success count and any errors
      
      // For the prototype, we'll simulate a successful upload
      setTimeout(() => {
        res.json({
          success: true,
          count: 5, // Simulating 5 records uploaded
          message: "Uploaded income records successfully"
        });
      }, 1000); // Simulated 1 second delay
    } catch (error) {
      console.error("Bulk upload error:", error);
      next(error);
    }
  });
  
  app.get('/api/incomes/:id', isAuthenticated, adminOnlyForIncome, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const income = await storage.getIncome(id);
      
      if (!income) {
        return res.status(404).json({ message: 'Income not found' });
      }
      
      res.json(income);
    } catch (error) {
      next(error);
    }
  });
  
  app.post('/api/incomes', isAuthenticated, adminOnlyForIncome, async (req, res, next) => {
    try {
      const incomeData = insertIncomeSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id
      });
      
      const newIncome = await storage.createIncome(incomeData);
      res.status(201).json(newIncome);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  app.put('/api/incomes/:id', isAuthenticated, adminOnlyForIncome, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const incomeData = insertIncomeSchema.partial().parse(req.body);
      
      const updatedIncome = await storage.updateIncome(id, incomeData);
      
      if (!updatedIncome) {
        return res.status(404).json({ message: 'Income not found' });
      }
      
      res.json(updatedIncome);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  app.delete('/api/incomes/:id', isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteIncome(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Income not found' });
      }
      
      res.json({ message: 'Income deleted successfully' });
    } catch (error) {
      next(error);
    }
  });
  
  // Expense routes
  app.get('/api/expenses', isAuthenticated, async (req, res, next) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });
  
  // Bulk upload for expenses
  app.post('/api/expenses/bulk-upload', isAuthenticated, async (req, res, next) => {
    try {
      // In a real implementation, this would:
      // 1. Parse the CSV file from req.files (using a package like 'multer' for file uploads)
      // 2. Validate each row of the CSV
      // 3. Create expense records for each valid row
      // 4. Return success count and any errors
      
      // For the prototype, we'll simulate a successful upload
      setTimeout(() => {
        res.json({
          success: true,
          count: 5, // Simulating 5 records uploaded
          message: "Uploaded expenses successfully"
        });
      }, 1000); // Simulated 1 second delay
    } catch (error) {
      console.error("Bulk upload error:", error);
      next(error);
    }
  });
  
  app.get('/api/expenses/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpense(id);
      
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      res.json(expense);
    } catch (error) {
      next(error);
    }
  });
  
  app.post('/api/expenses', isAuthenticated, async (req, res, next) => {
    try {
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id
      });
      
      const newExpense = await storage.createExpense(expenseData);
      res.status(201).json(newExpense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  app.put('/api/expenses/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const expenseData = insertExpenseSchema.partial().parse(req.body);
      
      const updatedExpense = await storage.updateExpense(id, expenseData);
      
      if (!updatedExpense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      res.json(updatedExpense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  app.delete('/api/expenses/:id', isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteExpense(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      next(error);
    }
  });
  
  // Water Tank routes
  app.get('/api/water-tanks', isAuthenticated, async (req, res, next) => {
    try {
      const waterTanks = await storage.getWaterTanks();
      res.json(waterTanks);
    } catch (error) {
      next(error);
    }
  });
  
  app.get('/api/water-tanks/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const waterTank = await storage.getWaterTank(id);
      
      if (!waterTank) {
        return res.status(404).json({ message: 'Water tank record not found' });
      }
      
      res.json(waterTank);
    } catch (error) {
      next(error);
    }
  });
  
  app.post('/api/water-tanks', isAuthenticated, async (req, res, next) => {
    try {
      const waterTankData = insertWaterTankSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id
      });
      
      const newWaterTank = await storage.createWaterTank(waterTankData);
      res.status(201).json(newWaterTank);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  app.put('/api/water-tanks/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const waterTankData = insertWaterTankSchema.partial().parse(req.body);
      
      const updatedWaterTank = await storage.updateWaterTank(id, waterTankData);
      
      if (!updatedWaterTank) {
        return res.status(404).json({ message: 'Water tank record not found' });
      }
      
      res.json(updatedWaterTank);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  app.delete('/api/water-tanks/:id', isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWaterTank(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Water tank record not found' });
      }
      
      res.json({ message: 'Water tank record deleted successfully' });
    } catch (error) {
      next(error);
    }
  });
  
  // Dashboard data routes
  app.get('/api/dashboard/income-summary', isAuthenticated, adminOnlyForIncome, async (req, res, next) => {
    try {
      const incomeSummary = await storage.getIncomeSummary();
      res.json(incomeSummary);
    } catch (error) {
      next(error);
    }
  });
  
  app.get('/api/dashboard/expense-summary', isAuthenticated, async (req, res, next) => {
    try {
      const expenseSummary = await storage.getExpenseSummary();
      res.json(expenseSummary);
    } catch (error) {
      next(error);
    }
  });
  
  app.get('/api/dashboard/property-summary', isAuthenticated, async (req, res, next) => {
    try {
      const propertySummary = await storage.getPropertySummary();
      res.json(propertySummary);
    } catch (error) {
      next(error);
    }
  });
  
  app.get('/api/dashboard/recent-transactions', isAuthenticated, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const transactions = await storage.getRecentTransactions(limit);
      
      // If user is data_entry, filter out income transactions
      if (req.user && (req.user as any).role === 'data_entry') {
        const expensesOnly = transactions.filter(t => 'category' in t); // Only expenses have 'category' field
        res.json(expensesOnly);
      } else {
        res.json(transactions);
      }
    } catch (error) {
      next(error);
    }
  });

  // Tenant routes
  app.get('/api/tenants', isAuthenticated, async (req, res, next) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/tenants/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const tenant = await storage.getTenant(id);
      
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/properties/:propertyId/tenants', isAuthenticated, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const tenants = await storage.getTenantsByProperty(propertyId);
      res.json(tenants);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/tenants', isAuthenticated, async (req, res, next) => {
    try {
      const tenantData = insertTenantSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id
      });
      
      const newTenant = await storage.createTenant(tenantData);
      res.status(201).json(newTenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });

  app.put('/api/tenants/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const tenantData = insertTenantSchema.partial().parse(req.body);
      
      const updatedTenant = await storage.updateTenant(id, tenantData);
      
      if (!updatedTenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      res.json(updatedTenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });

  app.delete('/api/tenants/:id', isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTenant(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      res.json({ message: 'Tenant deleted successfully' });
    } catch (error) {
      next(error);
    }
  });

  // Vendor routes
  app.get('/api/vendors', isAuthenticated, async (req, res, next) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/vendors/by-service/:serviceType', isAuthenticated, async (req, res, next) => {
    try {
      const serviceType = req.params.serviceType;
      const vendors = await storage.getVendorsByServiceType(serviceType);
      res.json(vendors);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/vendors/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vendor = await storage.getVendor(id);
      
      if (!vendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }
      
      res.json(vendor);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/vendors', isAuthenticated, async (req, res, next) => {
    try {
      const vendorData = insertVendorSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id
      });
      
      const newVendor = await storage.createVendor(vendorData);
      res.status(201).json(newVendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });

  app.put('/api/vendors/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vendorData = insertVendorSchema.partial().parse(req.body);
      
      const updatedVendor = await storage.updateVendor(id, vendorData);
      
      if (!updatedVendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }
      
      res.json(updatedVendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });

  app.delete('/api/vendors/:id', isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteVendor(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Vendor not found' });
      }
      
      res.json({ message: 'Vendor deleted successfully' });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}