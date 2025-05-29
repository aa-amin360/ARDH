import express, { Request, Response, type Express } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { z } from "zod";
import { setupAuth } from "./auth";
import { getConstraintErrorMessage } from "@shared/dbErrorHandler";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for CSV file uploads (bulk upload)
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});
import {
  insertUserSchema,
  insertPropertySchema,
  insertIncomeSchema,
  insertExpenseSchema,
  insertWaterTankSchema,
  insertTenantSchema,
  insertVendorSchema,
  insertPropertyChargeSchema,
  insertTenantChargeSchema,
  insertPropertyOwnerSchema,
  insertMaintenanceRecordSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up file upload
  const multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Create uploads directory if it doesn't exist
      const uploadDir = path.resolve("./uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // Generate a unique filename with original extension
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  });

  // File filter to validate file types
  const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    // Accept only jpg, jpeg, png, and pdf files
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPG, PNG and PDF files are allowed.",
        ),
      );
    }
  };

  // Configure multer upload
  const upload = multer({
    storage: multerStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB file size limit
    },
    fileFilter,
  });

  // Set up authentication
  setupAuth(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to check if user is an admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (
      req.isAuthenticated() &&
      req.user &&
      (req.user as any).role === "admin"
    ) {
      return next();
    }
    return res
      .status(403)
      .json({ message: "Forbidden. Admin access required." });
  };

  // Middleware to restrict data entry users from accessing income routes
  const adminOnlyForIncome = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user) {
      const userRole = (req.user as any).role;
      // If user is data_entry and trying to access income routes, block them
      if (userRole === "data_entry" && req.path.includes("/income")) {
        return res.status(403).json({
          message: "Data entry users cannot access income information.",
        });
      }
    }
    return next();
  };

  // User routes (admin only)
  app.get("/api/users", isAdmin, async (req, res, next) => {
    try {
      const users = await dbStorage.getUsers();
      res.json(
        users.map((user) => ({
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          email: user.email,
        })),
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users", isAdmin, async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const newUser = await dbStorage.createUser(userData);

      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        email: newUser.email,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });

  // Property routes
  app.get("/api/properties/flats", isAuthenticated, async (req, res, next) => {
    try {
      const flats = await dbStorage.getFlatNumberOptions();
      res.json(flats); // [{ id, flat_number }]
    } catch (error) {
      console.error("Error fetching flat numbers:", error);
      next(error);
    }
  });

  app.get("/api/properties", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Fetching properties for user:", req.user);
      const properties = await dbStorage.getProperties();
      console.log("Properties found:", properties.length);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      next(error);
    }
  });

  app.get("/api/properties/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const property = await dbStorage.getProperty(id);

      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      res.json(property);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties", isAuthenticated, async (req, res, next) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      const newProperty = await dbStorage.createProperty(propertyData);
      res.status(201).json(newProperty);
    } catch (error: any) {
      const message = getConstraintErrorMessage(error);
      res.status(400).json({ message });
    }
  });

  // Support both PUT and PATCH for property updates
  app.put("/api/properties/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const propertyData = insertPropertySchema.partial().parse(req.body);

      const updatedProperty = await dbStorage.updateProperty(id, propertyData);

      if (!updatedProperty) {
        return res.status(404).json({ message: "Property not found" });
      }

      res.json(updatedProperty);
    } catch (error: any) {
      // Log full error for debugging
      console.error(`Error updating property ${req.params.id}:`, error);

      // Send clean user-friendly message
      let message = getConstraintErrorMessage(error);

      // Format validation errors more nicely
      if (error.errors) {
        message =
          "Invalid property data: " +
          error.errors
            .map((e: any) => e.message || e.path.join("."))
            .join(", ");
      }

      // Send response but don't call next(error) afterward
      res.status(400).json({ message });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const propertyData = insertPropertySchema.partial().parse(req.body);

      console.log(`Updating property ${id} with data:`, propertyData);

      const updatedProperty = await dbStorage.updateProperty(id, propertyData);

      if (!updatedProperty) {
        return res.status(404).json({ message: "Property not found" });
      }

      res.json(updatedProperty);
    } catch (error) {
      console.error("Error updating property:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/properties/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await dbStorage.deleteProperty(id);

      if (!success) {
        return res.status(404).json({ message: "Property not found" });
      }

      res.json({ message: "Property deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Income routes
  app.get(
    "/api/incomes",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        const incomes = await dbStorage.getIncomes();
        res.json(incomes);
      } catch (error) {
        next(error);
      }
    },
  );

  // Bulk upload for income
  app.post(
    "/api/incomes/bulk-upload",
    isAuthenticated,
    adminOnlyForIncome,
    csvUpload.single("file"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const csvData = req.file.buffer.toString("utf-8");
        const lines = csvData.split("\n").filter(line => line.trim() !== "");
        
        if (lines.length < 2) {
          return res.status(400).json({ message: "CSV file must contain at least a header row and one data row" });
        }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const expectedHeaders = ["date", "amount", "type", "description", "property_id", "received_from"];
        
        // Validate headers
        const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          return res.status(400).json({ 
            message: `Missing required headers: ${missingHeaders.join(", ")}` 
          });
        }

        // Get all properties to map flat numbers to property IDs
        const properties = await dbStorage.getProperties();
        const flatToPropertyMap = new Map();
        properties.forEach(prop => {
          if (prop.flatNumber) {
            flatToPropertyMap.set(prop.flatNumber, prop.id);
          }
        });

        let successful = 0;
        let failed = 0;
        const failedRecords: any[] = [];

        // Process each data row
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, "")); // Remove quotes
          
          if (values.length < expectedHeaders.length) {
            failedRecords.push({
              date: values[0] || "",
              amount: values[1] || "",
              type: values[2] || "",
              description: values[3] || "",
              property_id: values[4] || "",
              received_from: values[5] || "",
              error_message: "Insufficient columns in CSV row"
            });
            failed++;
            continue;
          }

          const record: any = {};
          headers.forEach((header, index) => {
            record[header] = values[index];
          });

          try {
            // Map flat number to property ID
            const flatNumber = record.property_id;
            const propertyId = flatToPropertyMap.get(flatNumber);
            
            if (!propertyId) {
              failedRecords.push({
                ...record,
                error_message: `Flat number '${flatNumber}' not found in properties`
              });
              failed++;
              continue;
            }

            // Validate and create income record
            const incomeData = {
              date: record.date,
              amount: parseFloat(record.amount),
              type: record.type,
              description: record.description || "",
              propertyId: propertyId,
              receivedFrom: record.received_from,
              createdBy: (req.user as any).id,
              attachmentId: null
            };

            // Validate with schema
            const validatedData = insertIncomeSchema.parse(incomeData);
            await dbStorage.createIncome(validatedData);
            successful++;

          } catch (error: any) {
            failedRecords.push({
              ...record,
              error_message: error.message || "Failed to create income record"
            });
            failed++;
          }
        }

        res.json({
          successful,
          failed,
          total: successful + failed,
          failedRecords
        });

      } catch (error) {
        console.error("Bulk upload error:", error);
        next(error);
      }
    },
  );

  app.get(
    "/api/incomes/:id",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const income = await dbStorage.getIncome(id);

        if (!income) {
          return res.status(404).json({ message: "Income not found" });
        }

        res.json(income);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/incomes",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        // Parse the income data
        const incomeData = insertIncomeSchema.parse({
          ...req.body,
          createdBy: (req.user as any).id,
          // Use the attachmentId from the request body if provided, otherwise set to null
          attachmentId: req.body.attachmentId || null,
        });

        const newIncome = await dbStorage.createIncome(incomeData);
        res.status(201).json(newIncome);
      } catch (error: any) {
        //console.error("Error creating income:", error);
        const message = getConstraintErrorMessage(error);
        console.error("Message is: ", message);
        res.status(400).json({ message });
      }
    },
  );

  app.put(
    "/api/incomes/:id",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const incomeData = insertIncomeSchema.partial().parse(req.body);

        const updatedIncome = await dbStorage.updateIncome(id, incomeData);

        if (!updatedIncome) {
          return res.status(404).json({ message: "Income not found" });
        }

        res.json(updatedIncome);
      } catch (error: any) {
        const message = getConstraintErrorMessage(error);

        res.status(400).json({ message });
        next(error);
      }
    },
  );

  app.delete("/api/incomes/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await dbStorage.deleteIncome(id);

      if (!success) {
        return res.status(404).json({ message: "Income not found" });
      }

      res.json({ message: "Income deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Expense routes
  app.get("/api/expenses", isAuthenticated, async (req, res, next) => {
    try {
      const expenses = await dbStorage.getExpenses();
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  // Expense categories and subcategories
  app.get(
    "/api/expenses/categories",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const categories = await dbStorage.getDistinctExpenseCategories();
        res.json(categories);
      } catch (error) {
        console.error("Error fetching expense categories:", error);
        next(error);
      }
    },
  );

  app.get(
    "/api/expenses/subcategories/:category",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const category = req.params.category;
        const subcategories = await dbStorage.getExpenseSubcategories(category);
        res.json(subcategories);
      } catch (error) {
        console.error("Error fetching expense subcategories:", error);
        next(error);
      }
    },
  );

  // Get maintenance types (from expense subcategories where category is "General Maintenance Works")
  app.get("/api/maintenance-types", isAuthenticated, async (req, res, next) => {
    try {
      const maintenanceTypes = await dbStorage.getMaintenanceTypes();
      res.json(maintenanceTypes);
    } catch (error) {
      console.error("Error fetching maintenance types:", error);
      next(error);
    }
  });

  // Vendor endpoints
  app.get(
    "/api/vendors/by-subcategory/:subcategory",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const subcategory = req.params.subcategory;
        const vendors =
          await dbStorage.getVendorsByExpenseSubcategory(subcategory);
        res.json(vendors);
      } catch (error) {
        next(error);
      }
    },
  );

  // Bulk upload for expenses
  app.post(
    "/api/expenses/bulk-upload",
    isAuthenticated,
    csvUpload.single("file"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const csvData = req.file.buffer.toString("utf-8");
        const lines = csvData.split("\n").filter(line => line.trim() !== "");
        
        if (lines.length < 2) {
          return res.status(400).json({ message: "CSV file must contain at least a header row and one data row" });
        }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const expectedHeaders = ["subcategory", "amount", "date", "property", "description"];
        
        // Validate headers
        const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          return res.status(400).json({ 
            message: `Missing required headers: ${missingHeaders.join(", ")}` 
          });
        }

        // Get all properties to map flat numbers to property IDs
        const properties = await dbStorage.getProperties();
        const flatToPropertyMap = new Map();
        properties.forEach(prop => {
          if (prop.flatNumber) {
            flatToPropertyMap.set(prop.flatNumber, prop.id);
          }
        });

        // Get all expense categories and subcategories to map subcategory to category
        const categories = await dbStorage.getDistinctExpenseCategories();
        const subcategoryToCategoryMap = new Map();
        
        for (const categoryObj of categories) {
          const subcategories = await dbStorage.getExpenseSubcategories(categoryObj.expense_category);
          subcategories.forEach((subcat: any) => {
            subcategoryToCategoryMap.set(subcat.expense_sub_category, categoryObj.expense_category);
          });
        }

        let successful = 0;
        let failed = 0;
        const failedRecords: any[] = [];

        // Process each data row
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, "")); // Remove quotes
          
          if (values.length < expectedHeaders.length) {
            failedRecords.push({
              subcategory: values[0] || "",
              amount: values[1] || "",
              date: values[2] || "",
              property: values[3] || "",
              description: values[4] || "",
              error_message: "Insufficient columns in CSV row"
            });
            failed++;
            continue;
          }

          const record: any = {};
          headers.forEach((header, index) => {
            record[header] = values[index];
          });

          try {
            // Map flat number to property ID
            const flatNumber = record.property;
            const propertyId = flatToPropertyMap.get(flatNumber);
            
            if (!propertyId) {
              failedRecords.push({
                ...record,
                error_message: `Flat number '${flatNumber}' not found in properties`
              });
              failed++;
              continue;
            }

            // Map subcategory to category
            const subcategory = record.subcategory;
            const category = subcategoryToCategoryMap.get(subcategory);
            
            if (!category) {
              failedRecords.push({
                ...record,
                error_message: `Subcategory '${subcategory}' not found in expense categories`
              });
              failed++;
              continue;
            }

            // Validate and create expense record
            const expenseData = {
              date: record.date,
              amount: parseFloat(record.amount),
              category: category,
              subcategory: subcategory,
              description: record.description || "",
              propertyId: propertyId,
              createdBy: (req.user as any).id,
              attachmentId: null
            };

            // Validate with schema
            const validatedData = insertExpenseSchema.parse(expenseData);
            await dbStorage.createExpense(validatedData);
            successful++;

          } catch (error: any) {
            failedRecords.push({
              ...record,
              error_message: error.message || "Failed to create expense record"
            });
            failed++;
          }
        }

        res.json({
          successful,
          failed,
          total: successful + failed,
          failedRecords
        });

      } catch (error) {
        console.error("Bulk upload error:", error);
        next(error);
      }
    },
  );

  app.get("/api/expenses/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await dbStorage.getExpense(id);

      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json(expense);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req, res, next) => {
    try {
      // Parse the expense data
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id,
        // Use the attachmentId from the request body if provided, otherwise set to null
        attachmentId: req.body.attachmentId || null,
      });

      const newExpense = await dbStorage.createExpense(expenseData);
      res.status(201).json(newExpense);
    } catch (error: any) {
      console.error("Error creating expense:", error);

      const message = getConstraintErrorMessage(error);
      res.status(400).json({ message });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const expenseData = insertExpenseSchema.partial().parse(req.body);

      const updatedExpense = await dbStorage.updateExpense(id, expenseData);

      if (!updatedExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json(updatedExpense);
    } catch (error: any) {
      const message = getConstraintErrorMessage(error);
      res.status(400).json({ message });
      next(error);
    }
  });

  app.delete("/api/expenses/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await dbStorage.deleteExpense(id);

      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Water Tank routes
  app.get("/api/water-tanks", isAuthenticated, async (req, res, next) => {
    try {
      const waterTanks = await dbStorage.getWaterTanks();
      res.json(waterTanks);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/water-tanks/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const waterTank = await dbStorage.getWaterTank(id);

      if (!waterTank) {
        return res.status(404).json({ message: "Water tank record not found" });
      }

      res.json(waterTank);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/water-tanks", isAuthenticated, async (req, res, next) => {
    try {
      const waterTankData = insertWaterTankSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id,
      });

      const newWaterTank = await dbStorage.createWaterTank(waterTankData);
      res.status(201).json(newWaterTank);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/water-tanks/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const waterTankData = insertWaterTankSchema.partial().parse(req.body);

      const updatedWaterTank = await dbStorage.updateWaterTank(
        id,
        waterTankData,
      );

      if (!updatedWaterTank) {
        return res.status(404).json({ message: "Water tank record not found" });
      }

      res.json(updatedWaterTank);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/water-tanks/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await dbStorage.deleteWaterTank(id);

      if (!success) {
        return res.status(404).json({ message: "Water tank record not found" });
      }

      res.json({ message: "Water tank record deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Dashboard data routes
  app.get(
    "/api/dashboard/income-summary",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        const incomeSummary = await dbStorage.getIncomeSummary();
        res.json(incomeSummary);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/dashboard/expense-summary",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const expenseSummary = await dbStorage.getExpenseSummary();
        res.json(expenseSummary);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/dashboard/property-summary",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const propertySummary = await dbStorage.getPropertySummary();
        res.json(propertySummary);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/dashboard/recent-transactions",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const limit = parseInt(req.query.limit as string) || 10;
        const transactions = await dbStorage.getRecentTransactions(limit);

        // If user is data_entry, filter out income transactions
        if (req.user && (req.user as any).role === "data_entry") {
          const expensesOnly = transactions.filter((t) => "category" in t); // Only expenses have 'category' field
          res.json(expensesOnly);
        } else {
          res.json(transactions);
        }
      } catch (error) {
        next(error);
      }
    },
  );

  // Tenant routes
  app.get("/api/tenants", isAuthenticated, async (req, res, next) => {
    try {
      const tenants = await dbStorage.getTenants();
      res.json(tenants);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/tenants/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const tenant = await dbStorage.getTenant(id);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.json(tenant);
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/properties/:propertyId/tenants",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const propertyId = parseInt(req.params.propertyId);
        const tenants = await dbStorage.getTenantsByProperty(propertyId);
        res.json(tenants);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/tenants", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Creating tenant with data:", req.body);
      const tenantData = insertTenantSchema.parse({
        ...req.body,
        createdBy: req.body.createdBy || (req.user as any)?.id || 1, // Safe fallback
      });

      const newTenant = await dbStorage.createTenant(tenantData);
      res.status(201).json(newTenant);
    } catch (error: any) {
      const message = getConstraintErrorMessage(error);
      res.status(400).json({ message });
      next(error);
    }
  });

  app.put("/api/tenants/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const tenantData = insertTenantSchema.partial().parse(req.body);

      const updatedTenant = await dbStorage.updateTenant(id, tenantData);

      if (!updatedTenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.json(updatedTenant);
    } catch (error: any) {
      const message = getConstraintErrorMessage(error);
      console.error("Error updating tenant:", error, message);
      res.status(400).json({ message });
    }
  });

  app.delete("/api/tenants/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await dbStorage.deleteTenant(id);

      if (!success) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.json({ message: "Tenant deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Vendor routes

  // Get distinct vendor service types
  app.get(
    "/api/vendors/service-types",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const types = await dbStorage.getDistinctVendorServiceTypes();
        res.json(types.map((row) => row.vendor_type));
      } catch (error) {
        console.error("Error fetching vendor service types:", error);
        next(error);
      }
    },
  );

  app.get("/api/vendors", isAuthenticated, async (req, res, next) => {
    try {
      const vendors = await dbStorage.getVendors();
      res.json(vendors);
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/vendors/by-service/:serviceType",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const serviceType = req.params.serviceType;
        const vendors = await dbStorage.getVendorsByServiceType(serviceType);
        res.json(vendors);
      } catch (error) {
        next(error);
      }
    },
  );

  // Get vendors by maintenance type (which is an expense subcategory)
  app.get(
    "/api/vendors/by-maintenance-type/:maintenanceType",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const maintenanceType = req.params.maintenanceType;
        console.log(`Getting vendors for maintenance type: ${maintenanceType}`);
        const vendors =
          await dbStorage.getVendorsByMaintenanceType(maintenanceType);
        res.json(vendors);
      } catch (error) {
        console.error("Error fetching vendors by maintenance type:", error);
        next(error);
      }
    },
  );

  app.get("/api/vendors/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vendor = await dbStorage.getVendor(id);

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      res.json(vendor);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/vendors", isAuthenticated, async (req, res, next) => {
    try {
      const vendorData = insertVendorSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id,
      });

      const newVendor = await dbStorage.createVendor(vendorData);
      res.status(201).json(newVendor);
    } catch (error: any) {
      const message = getConstraintErrorMessage(error);
      res.status(400).json({ message });
      next(error);
    }
  });

  app.put("/api/vendors/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vendorData = insertVendorSchema.partial().parse(req.body);

      const updatedVendor = await dbStorage.updateVendor(id, vendorData);

      if (!updatedVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      res.json(updatedVendor);
    } catch (error: any) {
      const message = getConstraintErrorMessage(error);
      res.status(400).json({ message });
      next(error);
    }
  });

  app.delete("/api/vendors/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await dbStorage.deleteVendor(id);

      if (!success) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Property Charges routes

  app.get("/api/property-charges", isAuthenticated, async (req, res, next) => {
    try {
      const charges = await dbStorage.getPropertyCharges();
      res.json(charges);
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/properties/:flatNumber/charges",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const flatNumber = req.params.flatNumber;
        const charges = await dbStorage.getPropertyChargesByFlat(flatNumber);
        res.json(charges);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/properties/:flatNumber/current-charges",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const flatNumber = req.params.flatNumber;
        const charges = await dbStorage.getCurrentPropertyCharges(flatNumber);
        res.json(charges);
      } catch (error) {
        next(error);
      }
    },
  );

  // Check if a property has active tenants (for occupancy status)
  app.get(
    "/api/properties/:flatNumber/has-active-tenants",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const flatNumber = req.params.flatNumber;
        const hasActiveTenants = await dbStorage.hasActiveTenants(flatNumber);
        res.json({ hasActiveTenants });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/properties/:flatNumber/charge-history/:chargeType",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const { flatNumber, chargeType } = req.params;
        const charges = await dbStorage.getPropertyChargeHistory(
          flatNumber,
          chargeType,
        );
        res.json(charges);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/property-charges/:id",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const charge = await dbStorage.getPropertyCharge(id);

        if (!charge) {
          return res.status(404).json({ message: "Property charge not found" });
        }

        res.json(charge);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/property-charges",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        console.log("Creating property charge with data:", req.body);

        const chargeData = insertPropertyChargeSchema.parse({
          ...req.body,
          createdBy: req.body.createdBy || (req.user as any).id,
        });

        // First close old active charge if same flat and charge type exist already
        await dbStorage.closeActiveCharge(
          chargeData.flatNumber,
          chargeData.chargeType,
        );

        // Then add new charge
        const newCharge = await dbStorage.addNewCharge(chargeData);

        res.status(201).json(newCharge);
      } catch (error) {
        console.error("Error creating property charge:", error);
        console.error("Full error:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors });
        }
        next(error);
      }
    },
  );

  app.put(
    "/api/property-charges/:id",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const chargeData = insertPropertyChargeSchema.partial().parse(req.body);

        const updatedCharge = await dbStorage.updatePropertyCharge(
          id,
          chargeData,
        );

        if (!updatedCharge) {
          return res.status(404).json({ message: "Property charge not found" });
        }

        res.json(updatedCharge);
      } catch (error: any) {
        const message = getConstraintErrorMessage(error);
        res.status(400).json({ message });
      }
    },
  );

  app.delete("/api/property-charges/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await dbStorage.deletePropertyCharge(id);

      if (!success) {
        return res.status(404).json({ message: "Property charge not found" });
      }

      res.json({ message: "Property charge deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Tenant Charges routes
  app.get("/api/tenant-charges", isAuthenticated, async (req, res, next) => {
    try {
      const charges = await dbStorage.getTenantCharges();
      res.json(charges);
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/tenants/:tenantId/charges",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const charges = await dbStorage.getTenantChargesByTenant(tenantId);
        res.json(charges);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/tenants/:tenantId/current-charges",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const charges = await dbStorage.getCurrentTenantCharges(tenantId);
        res.json(charges);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/tenants/:tenantId/charge-history/:chargeType",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const { chargeType } = req.params;
        const charges = await dbStorage.getTenantChargeHistory(
          tenantId,
          chargeType,
        );
        res.json(charges);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/tenant-charges/:id",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const charge = await dbStorage.getTenantCharge(id);

        if (!charge) {
          return res.status(404).json({ message: "Tenant charge not found" });
        }

        res.json(charge);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/tenant-charges",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        const chargeData = insertTenantChargeSchema.parse({
          ...req.body,
          createdBy: (req.user as any).id,
        });

        const newCharge = await dbStorage.createTenantCharge(chargeData);
        res.status(201).json(newCharge);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors });
        }
        next(error);
      }
    },
  );

  app.put(
    "/api/tenant-charges/:id",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const chargeData = insertTenantChargeSchema.partial().parse(req.body);

        const updatedCharge = await dbStorage.updateTenantCharge(
          id,
          chargeData,
        );

        if (!updatedCharge) {
          return res.status(404).json({ message: "Tenant charge not found" });
        }

        res.json(updatedCharge);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors });
        }
        next(error);
      }
    },
  );

  app.delete("/api/tenant-charges/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await dbStorage.deleteTenantCharge(id);

      if (!success) {
        return res.status(404).json({ message: "Tenant charge not found" });
      }

      res.json({ message: "Tenant charge deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Helper route to sync property charge with tenant
  app.post(
    "/api/properties/:flatNumber/sync-charge",
    isAuthenticated,
    adminOnlyForIncome,
    async (req, res, next) => {
      try {
        const { flatNumber } = req.params;
        const { chargeType, amount, effectiveFrom } = req.body;

        if (!chargeType || !amount || !effectiveFrom) {
          return res.status(400).json({
            message:
              "Missing required fields: chargeType, amount, effectiveFrom",
          });
        }

        await dbStorage.syncPropertyChargeWithTenant(
          flatNumber,
          chargeType,
          amount,
          new Date(effectiveFrom),
          (req.user as any).id,
        );

        res.json({
          message: "Property charge synced with tenant charges successfully",
        });
      } catch (error) {
        next(error);
      }
    },
  );

  // Helper route to get current tenants for a flat
  app.get(
    "/api/properties/:flatNumber/current-tenants",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const { flatNumber } = req.params;
        const tenants = await dbStorage.getCurrentTenantsForFlat(flatNumber);
        res.json(tenants);
      } catch (error) {
        next(error);
      }
    },
  );

  // Property Owner routes
  app.get("/api/property-owners", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Fetching all property owners");
      const owners = await dbStorage.getPropertyOwners();
      res.json(owners);
    } catch (error) {
      console.error("Error fetching property owners:", error);
      next(error);
    }
  });

  app.get(
    "/api/property-owners/search",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const { term } = req.query;
        if (!term || typeof term !== "string") {
          return res.status(400).json({ message: "Search term is required" });
        }

        console.log(`Searching property owners with term: ${term}`);
        const owners = await dbStorage.searchPropertyOwners(term);
        res.json(owners);
      } catch (error) {
        console.error("Error searching property owners:", error);
        next(error);
      }
    },
  );

  app.get(
    "/api/property-owners/:id",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const id = req.params.id;
        const owner = await dbStorage.getPropertyOwner(id);

        if (!owner) {
          return res.status(404).json({ message: "Property owner not found" });
        }

        res.json(owner);
      } catch (error) {
        console.error(
          `Error fetching property owner with ID ${req.params.id}:`,
          error,
        );
        next(error);
      }
    },
  );

  app.get(
    "/api/property-owners/:id/linked-flats",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const owner = await dbStorage.getPropertyOwner(req.params.id);

        if (!owner) {
          return res.status(404).json({ message: "Property owner not found" });
        }

        const linkedFlats = await dbStorage.getPropertyOwnerLinkedFlats(
          owner.fullName,
        );
        res.json(linkedFlats);
      } catch (error) {
        console.error(
          `Error fetching linked flats for owner ${req.params.id}:`,
          error,
        );
        next(error);
      }
    },
  );

  app.post("/api/property-owners", isAdmin, async (req, res, next) => {
    try {
      console.log("Creating new property owner");
      const ownerData = insertPropertyOwnerSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id,
      });

      const newOwner = await dbStorage.createPropertyOwner(ownerData);
      res.status(201).json(newOwner);
    } catch (error: any) {
      const message = getConstraintErrorMessage(error);
      res.status(400).json({ message });
    }
  });

  app.put("/api/property-owners/:id", isAdmin, async (req, res, next) => {
    try {
      const id = req.params.id;
      const ownerData = insertPropertyOwnerSchema.partial().parse(req.body);

      console.log(`Updating property owner ${id} with data:`, ownerData);

      const updatedOwner = await dbStorage.updatePropertyOwner(id, ownerData);

      if (!updatedOwner) {
        return res.status(404).json({ message: "Property owner not found" });
      }

      res.json(updatedOwner);
    } catch (error: any) {
      const message = getConstraintErrorMessage(error);
      res.status(400).json({ message });
    }
  });

  app.delete("/api/property-owners/:id", isAdmin, async (req, res, next) => {
    try {
      const id = req.params.id;

      // Check if owner is linked to any properties first
      const isLinked = await dbStorage.isPropertyOwnerLinked(id);

      if (isLinked) {
        return res.status(400).json({
          message:
            "Cannot delete property owner because they are linked to properties. Please unlink the properties first.",
        });
      }

      const success = await dbStorage.deletePropertyOwner(id);

      if (!success) {
        return res.status(404).json({ message: "Property owner not found" });
      }

      res.json({ message: "Property owner deleted successfully" });
    } catch (error) {
      console.error(`Error deleting property owner ${req.params.id}:`, error);
      next(error);
    }
  });

  // Maintenance Record routes
  app.get(
    "/api/maintenance-records",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const records = await dbStorage.getMaintenanceRecords();
        res.json(records);
        console.log("Maintenance records:", records);
      } catch (error) {
        console.error("Error fetching maintenance records:", error);
        next(error);
      }
    },
  );

  app.get(
    "/api/maintenance-records/:id",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const record = await dbStorage.getMaintenanceRecord(id);

        if (!record) {
          return res
            .status(404)
            .json({ message: "Maintenance record not found" });
        }

        res.json(record);
      } catch (error) {
        console.error(
          `Error fetching maintenance record ${req.params.id}:`,
          error,
        );
        next(error);
      }
    },
  );

  app.get(
    "/api/maintenance-records/property/:propertyId",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const propertyId = parseInt(req.params.propertyId);
        const records =
          await dbStorage.getMaintenanceRecordsByProperty(propertyId);
        res.json(records);
      } catch (error) {
        console.error(
          `Error fetching maintenance records for property ${req.params.propertyId}:`,
          error,
        );
        next(error);
      }
    },
  );

  app.get(
    "/api/maintenance-records/type/:type",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const type = req.params.type;
        const records = await dbStorage.getMaintenanceRecordsByType(type);
        res.json(records);
      } catch (error) {
        console.error(
          `Error fetching maintenance records for type ${req.params.type}:`,
          error,
        );
        next(error);
      }
    },
  );

  app.get(
    "/api/maintenance-records/last-date/:propertyId/:type",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const propertyId = parseInt(req.params.propertyId);
        const type = req.params.type;
        const lastDate = await dbStorage.getLastMaintenanceDate(
          propertyId,
          type,
        );
        res.json({ lastMaintenanceDate: lastDate });
      } catch (error) {
        console.error(`Error fetching last maintenance date:`, error);
        next(error);
      }
    },
  );

  app.post(
    "/api/maintenance-records",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const recordData = insertMaintenanceRecordSchema.parse({
          ...req.body,
          createdBy: (req.user as any).id,
        });

        console.log("Creating maintenance record with data:", recordData);
        const newRecord = await dbStorage.createMaintenanceRecord(recordData);
        res.status(201).json(newRecord);
      } catch (error: any) {
        // Log error for debugging
        console.error("Error creating maintenance record:", error);

        const message = getConstraintErrorMessage(error);
        // Send response without calling next(error)
        res.status(400).json({ message });
      }
    },
  );

  app.put(
    "/api/maintenance-records/:id",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const recordData = insertMaintenanceRecordSchema
          .partial()
          .parse(req.body);

        const updatedRecord = await dbStorage.updateMaintenanceRecord(
          id,
          recordData,
        );

        if (!updatedRecord) {
          return res
            .status(404)
            .json({ message: "Maintenance record not found" });
        }

        res.json(updatedRecord);
      } catch (error: any) {
        // Log error for debugging purposes
        console.error(
          `Error updating maintenance record ${req.params.id}:`,
          error,
        );

        const message = getConstraintErrorMessage(error);

        // Send response without calling next(error)
        res.status(400).json({ message });
      }
    },
  );

  app.delete(
    "/api/maintenance-records/:id",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const success = await dbStorage.deleteMaintenanceRecord(id);

        if (!success) {
          return res
            .status(404)
            .json({ message: "Maintenance record not found" });
        }

        res.json({ message: "Maintenance record deleted successfully" });
      } catch (error) {
        // Log the full error for debugging
        console.error(
          `Error deleting maintenance record ${req.params.id}:`,
          error,
        );

        // Send a clean user-friendly error message
        res.status(500).json({
          message: "Failed to delete maintenance record. Please try again.",
        });
      }
    },
  );

  // Attachment routes
  // Upload an attachment
  app.post(
    "/api/attachments",
    isAuthenticated,
    upload.single("file"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        console.log(
          "Uploading file:",
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
        );

        try {
          // Create attachment record in the database
          const fileData = fs.readFileSync(req.file.path).toString("base64");

          const attachment = await dbStorage.createAttachment({
            filename: req.file.originalname,
            data: fileData,
            filetype: req.file.mimetype,
            filesize: req.file.size,
            uploadedBy: (req.user as any).id,
          });

          // If entityType and entityId are provided, link the attachment to the entity
          const { entityType, entityId } = req.body;
          if (
            entityType &&
            entityId &&
            (entityType === "income" || entityType === "expense")
          ) {
            await dbStorage.updateEntityWithAttachment(
              entityType,
              parseInt(entityId),
              attachment.id,
            );
          }

          // Log success and return
          console.log(
            "Attachment created successfully with ID:",
            attachment.id,
          );
          res.status(201).json({
            id: attachment.id,
            fileName: attachment.filename,
            fileType: attachment.filetype,
            fileSize: attachment.filesize,
          });
        } catch (error) {
          console.error("Error processing file:", error);
          throw error;
        } finally {
          // Clean up the uploaded file
          try {
            if (req.file && req.file.path) {
              fs.unlinkSync(req.file.path);
              console.log("Temporary file cleaned up:", req.file.path);
            }
          } catch (cleanupError) {
            console.error("Error cleaning up file:", cleanupError);
          }
        }
      } catch (error) {
        console.error("Error uploading attachment:", error);
        res.status(500).json({
          message: "Failed to upload attachment: " + (error as Error).message,
        });
      }
    },
  );

  // Get an attachment by ID (download the file)
  app.get("/api/attachments/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const attachment = await dbStorage.getAttachment(id);

      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      // Send the file as base64 data with proper content type
      const buffer = Buffer.from(attachment.data, "base64");
      res.set("Content-Type", attachment.filetype);
      res.set("Content-Length", buffer.length.toString());
      // Change from inline to attachment to force download
      res.set(
        "Content-Disposition",
        `attachment; filename="${attachment.filename}"`,
      );
      res.send(buffer);
    } catch (error) {
      console.error("Error retrieving attachment:", error);
      next(error);
    }
  });

  // Get attachment metadata without downloading the file
  app.get(
    "/api/attachments/:id/metadata",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const attachment = await dbStorage.getAttachment(id);

        if (!attachment) {
          return res.status(404).json({ message: "Attachment not found" });
        }

        // Send metadata only with consistent field naming
        res.json({
          id: attachment.id,
          fileName: attachment.filename, // Standardize to camelCase for frontend
          fileType: attachment.filetype, // Standardize to camelCase for frontend
          fileSize: attachment.filesize, // Standardize to camelCase for frontend
          uploadedAt: attachment.uploadedAt,
          uploadedBy: attachment.uploadedBy,
        });
      } catch (error) {
        console.error("Error retrieving attachment metadata:", error);
        res.status(500).json({
          message:
            "Failed to retrieve attachment metadata: " +
            (error as Error).message,
        });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
