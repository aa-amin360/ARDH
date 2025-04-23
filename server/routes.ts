import express, { Request, Response, type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import memorystore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import {
  loginSchema,
  insertUserSchema,
  insertPropertySchema,
  insertIncomeSchema,
  insertExpenseSchema,
  insertWaterTankSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  const MemoryStore = memorystore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  
  // Set up passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport to use a local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      
      // In a production app, we'd use bcrypt to hash and compare passwords
      if (user.password !== password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
  
  // Tell passport how to serialize/deserialize the user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  
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
  
  // Auth routes
  app.post('/api/auth/login', (req, res, next) => {
    try {
      loginSchema.parse(req.body);
      
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message });
        }
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            email: user.email
          });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: 'Logout failed' });
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  app.get('/api/auth/me', isAuthenticated, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email
    });
  });
  
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
  app.get('/api/incomes', isAuthenticated, async (req, res, next) => {
    try {
      const incomes = await storage.getIncomes();
      res.json(incomes);
    } catch (error) {
      next(error);
    }
  });
  
  app.get('/api/incomes/:id', isAuthenticated, async (req, res, next) => {
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
  
  app.post('/api/incomes', isAuthenticated, async (req, res, next) => {
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
  
  app.put('/api/incomes/:id', isAuthenticated, async (req, res, next) => {
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
  app.get('/api/dashboard/income-summary', isAuthenticated, async (req, res, next) => {
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
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
