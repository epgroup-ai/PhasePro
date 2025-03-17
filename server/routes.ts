import type { Express, Response, NextFunction } from "express";
import { Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { extractDocumentData } from "./lib/openai";
import { parseInvoiceDocument } from "./lib/invoice-parser";
import { getCategoryManager } from "./lib/category-mapping";
import CollaborationServer from "./lib/websocket";
import { 
  insertEnquirySchema, 
  insertProductSpecificationSchema, 
  extractionResultSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  parsedInvoiceSchema,
  CategoryManager
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import path from "path";
import fs from "fs";
import os from "os";
import { setupAuth } from "./auth";
// Import hashPassword function for test routes
import { hashPassword } from "./auth";

// Import Express.Multer namespace
import { Multer } from 'multer';

// Add multer file type for use with file uploads
import { Request as ExpressRequest } from 'express';

// Extend the request interface for multer
interface MulterRequest extends ExpressRequest {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

// Set up multer for file uploads with consistent storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Store files in a consistent location in the project directory
      const uploadDir = './uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      console.log(`Storing file in directory: ${uploadDir}`);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = uniqueSuffix + '-' + file.originalname;
      console.log(`Generated filename for upload: ${filename}`);
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/vnd.ms-excel', // XLS
      'text/csv', // CSV files
      'application/json' // JSON files
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.warn(`Rejected file upload with mimetype: ${file.mimetype}`);
      cb(new Error('Invalid file type. Allowed types: PDF, DOCX, Excel (XLS/XLSX), CSV, and JSON files.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Test routes to verify API functionality (no auth required)
  app.get('/api/test', (req: Request, res: Response) => {
    console.log("GET /api/test - Testing API connection");
    res.json({ 
      success: true, 
      message: 'API is working',
      timestamp: new Date().toISOString(),
      cookies: req.cookies,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated()
    });
  });
  
  // Create a test user route for debugging
  app.get('/api/test/create-user', async (req: Request, res: Response) => {
    try {
      console.log("GET /api/test/create-user - Creating test user");
      
      // Check if test user already exists
      const existingUser = await storage.getUserByUsername("debuguser");
      
      if (existingUser) {
        console.log("Test user already exists");
        return res.json({ 
          success: true, 
          message: 'Test user already exists',
          user: {
            id: existingUser.id,
            username: existingUser.username,
          }
        });
      }
      
      // Create a new test user if one doesn't exist
      const user = await storage.createUser({
        username: "debuguser",
        password: await hashPassword("debugpass"),
        email: "debug@example.com",
        fullName: "Debug User",
        role: "user"
      });
      
      console.log("Test user created:", user.id);
      
      res.json({ 
        success: true, 
        message: 'Test user created',
        user: {
          id: user.id,
          username: user.username,
        }
      });
    } catch (err) {
      console.error("Error creating test user:", err);
      res.status(500).json({ success: false, message: 'Error creating test user' });
    }
  });
  
  // Direct login test route (bypasses frontend)
  app.get('/api/test/login', async (req: Request, res: Response) => {
    try {
      console.log("GET /api/test/login - Direct login test");
      req.login({ id: 1 } as any, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ success: false, message: 'Login error', error: err.message });
        }
        console.log("Test login successful - User authenticated:", req.isAuthenticated());
        return res.json({ 
          success: true, 
          message: 'Test login successful',
          isAuthenticated: req.isAuthenticated(),
          sessionID: req.sessionID
        });
      });
    } catch (err) {
      console.error("Error in test login:", err);
      res.status(500).json({ success: false, message: 'Error in test login' });
    }
  });

  // Authentication middleware for protected routes
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  };

  // Error handling middleware
  const handleError = (err: any, res: Response) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        details: fromZodError(err).message 
      });
    }
    console.error(err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  };

  // Get dashboard stats
  app.get('/api/stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      handleError(err, res);
    }
  });

  // File upload endpoint
  app.post('/api/upload', requireAuth, upload.array('files', 5), async (req, res: Response) => {
    try {
      // Cast req to any to bypass TypeScript limitations with multer
      const multerReq = req as any;
      
      if (!multerReq.files || (Array.isArray(multerReq.files) && multerReq.files.length === 0)) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const files = Array.isArray(multerReq.files) ? multerReq.files : [];
      console.log("Received files for upload:", files.map(f => ({ name: f.originalname, path: f.path, size: f.size })));
      
      const uploadedFiles = await Promise.all(
        files.map(async (file: Express.Multer.File) => {
          // Make sure we save the file path in the database record
          const uploadedFile = await storage.saveFile({
            enquiryId: null,
            filename: file.originalname,
            contentType: file.mimetype,
            size: file.size,
            path: file.path  // Save the actual path to find the file later
          });
          
          console.log(`Saved file to database: id=${uploadedFile.id}, path=${uploadedFile.path || file.path}`);
          
          return {
            id: uploadedFile.id,
            filename: uploadedFile.filename,
            contentType: uploadedFile.contentType,
            size: uploadedFile.size,
            path: uploadedFile.path || file.path,
          };
        })
      );

      res.status(200).json(uploadedFiles);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Process files with AI
  app.post('/api/process', requireAuth, async (req: Request, res: Response) => {
    try {
      const { fileIds, sampleDocType } = z.object({ 
        fileIds: z.array(z.number()), 
        sampleDocType: z.string().optional() 
      }).parse(req.body);
      
      let filePaths: string[] = [];
      let useSampleFiles = false;
      
      // Check if we're using sample documents
      if (sampleDocType) {
        console.log(`Using sample document type: ${sampleDocType}`);
        useSampleFiles = true;
        
        if (sampleDocType === 'packaging') {
          filePaths = ['./attached_assets/sample_enquiry_packaging_boxes.txt'];
        } else if (sampleDocType === 'labels') {
          filePaths = ['./attached_assets/sample_enquiry_labels.txt'];
        } else {
          return res.status(400).json({ message: 'Invalid sample document type' });
        }
      } else {
        // Regular file processing
        if (fileIds.length === 0) {
          return res.status(400).json({ message: 'No files specified for processing' });
        }

        const files = await Promise.all(fileIds.map(id => storage.getFile(id)));
        const validFiles = files.filter(Boolean);
        
        if (validFiles.length === 0) {
          return res.status(404).json({ message: 'No valid files found for the provided IDs' });
        }

        // Get file paths from storage
        console.log("Valid files for extraction:", validFiles);
        filePaths = validFiles
          .filter(Boolean)
          .map(file => {
            console.log("Processing file for extraction:", file);
            // Find the actual path - in memory storage often doesn't have the path property set
            let realPath = file.path;
            
            // If path is missing but we have a filename, try to construct the path
            if ((!realPath || realPath.length === 0) && file.filename) {
              // Look for the file in the uploads directory
              const possiblePath = `./uploads/${file.filename}`;
              if (fs.existsSync(possiblePath)) {
                console.log(`Found file at constructed path: ${possiblePath}`);
                realPath = possiblePath;
              } else {
                // Try with the id as a fallback 
                const possibleIdPath = `./uploads/${file.id}-${file.filename}`;
                if (fs.existsSync(possibleIdPath)) {
                  console.log(`Found file at alternate path: ${possibleIdPath}`);
                  realPath = possibleIdPath;
                }
              }
            }
            
            if (realPath && realPath.length > 0) {
              console.log(`Using file path for extraction: ${realPath}`);
              return realPath;
            }
            
            console.warn(`Could not determine path for file: ${file.filename}, id: ${file.id}`);
            return null;
          })
          .filter((path): path is string => path !== null);
        
        console.log(`File paths for extraction: ${JSON.stringify(filePaths)}`);
        
        // If we still don't have file paths but we have files, check for the actual uploaded location
        if (filePaths.length === 0 && validFiles.length > 0) {
          console.log("No file paths found, searching for alternate locations...");
          // Check in attached_assets directory
          try {
            const files = fs.readdirSync('./attached_assets');
            console.log("Files in attached_assets:", files);
            
            // Look for files that match our filenames
            for (const validFile of validFiles) {
              const filename = validFile.filename;
              const matchingFile = files.find(f => f.includes(filename));
              if (matchingFile) {
                const fullPath = `./attached_assets/${matchingFile}`;
                console.log(`Found matching file: ${fullPath}`);
                filePaths.push(fullPath);
              }
            }
          } catch (error) {
            console.error("Error searching attached_assets:", error);
          }
        }
      }
      
      // Extract data using OpenAI
      const startTime = Date.now();
      const extractionResult = await extractDocumentData(filePaths);
      const processingTime = Date.now() - startTime;
      
      // Preprocess the data to ensure we can validate correctly
      // Fix common email format issues in the extraction result if needed
      if (extractionResult.enquiry?.contactEmail) {
        const email = extractionResult.enquiry.contactEmail;
        // If it's not a valid email format, set to null
        if (!email.includes('@') || !email.includes('.')) {
          console.log(`Invalid email format detected: ${email}, setting to null`);
          extractionResult.enquiry.contactEmail = null;
        }
      }
      
      // Generate a unique enquiry code in case the extracted one already exists
      const generateUniqueEnquiryCode = async () => {
        const currentYear = new Date().getFullYear();
        const baseCode = `ENQ-${currentYear}-`;
        let counter = 1;
        let uniqueCode;
        let isUnique = false;
        
        while (!isUnique) {
          // Format the counter with leading zeros (4 digits)
          const formattedCounter = String(counter).padStart(4, '0');
          uniqueCode = `${baseCode}${formattedCounter}`;
          
          // Check if this code already exists
          const existingEnquiry = await storage.getEnquiryByCode(uniqueCode);
          if (!existingEnquiry) {
            isUnique = true;
          } else {
            counter++;
          }
        }
        
        return uniqueCode;
      };
      
      let enquiry;
      let validatedData;
      
      // Save the extracted enquiry
      try {
        validatedData = extractionResultSchema.parse(extractionResult);
        
        // Format the date strings into JavaScript Date objects
        const dateReceived = validatedData.enquiry.dateReceived ? new Date(validatedData.enquiry.dateReceived) : new Date();
        const deadline = validatedData.enquiry.deadline ? new Date(validatedData.enquiry.deadline) : null;
        
        // Check if the enquiry code already exists
        if (validatedData.enquiry.enquiryCode) {
          const existingEnquiry = await storage.getEnquiryByCode(validatedData.enquiry.enquiryCode);
          if (existingEnquiry) {
            console.log(`Enquiry with code ${validatedData.enquiry.enquiryCode} already exists, generating new code`);
            validatedData.enquiry.enquiryCode = await generateUniqueEnquiryCode();
          }
        } else {
          // No code provided, generate a new one
          validatedData.enquiry.enquiryCode = await generateUniqueEnquiryCode();
        }
        
        enquiry = await storage.createEnquiry({
          customerName: validatedData.enquiry.customerName,
          enquiryCode: validatedData.enquiry.enquiryCode,
          contactPerson: validatedData.enquiry.contactPerson || null,
          contactEmail: validatedData.enquiry.contactEmail || null,
          dateReceived,
          deadline,
          status: 'processed',
          aiConfidence: validatedData.aiConfidence,
          processedAt: new Date(),
          processingTime,
          specialInstructions: validatedData.enquiry.specialInstructions || null,
          createdBy: req.user?.id,
          deliveryRequirements: validatedData.enquiry.deliveryRequirements || null,
        });
      } catch (validationError) {
        console.error("Validation error:", validationError);
        
        // Generate a unique enquiry code for the fallback case
        const fallbackEnquiryCode = await generateUniqueEnquiryCode();
        
        // Create with fallback values for required fields that failed validation
        enquiry = await storage.createEnquiry({
          customerName: extractionResult.enquiry?.customerName || "Unknown Customer",
          enquiryCode: fallbackEnquiryCode,
          contactPerson: extractionResult.enquiry?.contactPerson || null,
          contactEmail: null, // Always set to null if validation failed
          dateReceived: new Date(),
          deadline: null,
          status: 'processed',
          aiConfidence: extractionResult.aiConfidence || 0,
          processedAt: new Date(),
          processingTime,
          specialInstructions: extractionResult.enquiry?.specialInstructions || null,
          deliveryRequirements: extractionResult.enquiry?.deliveryRequirements || null,
          createdBy: req.user?.id,
        });
        
        // If validation failed, create a basic product spec structure
        validatedData = {
          productSpecifications: extractionResult.productSpecifications || [],
          warnings: extractionResult.warnings || ['Created with fallback values due to validation error'],
          aiConfidence: extractionResult.aiConfidence || 0,
          enquiry: extractionResult.enquiry || { customerName: "Unknown Customer" }
        };
      }

      // Save the product specifications
      const specifications = await Promise.all(
        validatedData.productSpecifications.map(spec =>
          storage.createProductSpecification({
            ...spec,
            enquiryId: enquiry.id,
          })
        )
      );

      // Update files to associate with the enquiry (if not using sample files)
      if (!useSampleFiles && fileIds.length > 0) {
        const files = await Promise.all(fileIds.map(id => storage.getFile(id)));
        const validFiles = files.filter((file): file is NonNullable<typeof file> => file !== undefined && file !== null);
        
        if (validFiles.length > 0) {
          await Promise.all(
            validFiles.map(file => storage.updateFile(file.id, { enquiryId: enquiry.id }))
          );
        }
      }

      res.status(200).json({
        enquiry,
        specifications,
        processingTime: `${(processingTime / 1000).toFixed(1)} seconds`,
        warnings: validatedData.warnings || [],
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get all enquiries
  app.get('/api/enquiries', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      // Debug log to trace the issue with filtering
      console.log(`GET /api/enquiries - User ID: ${userId}, Is Admin: ${isAdmin}`);
      
      // If admin, return all enquiries, otherwise only return the user's enquiries
      const enquiries = await storage.getAllEnquiries(isAdmin ? undefined : userId);
      
      console.log(`Returning ${enquiries.length} enquiries to user ${userId}`);
      
      res.json(enquiries);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get enquiry by ID
  app.get('/api/enquiries/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const enquiry = await storage.getEnquiry(id);
      
      if (!enquiry) {
        return res.status(404).json({ message: 'Enquiry not found' });
      }
      
      // Check if user has access to this enquiry
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      // Only allow access if the user is an admin or the enquiry creator
      if (!isAdmin && enquiry.createdBy !== userId) {
        return res.status(403).json({ message: 'Access denied: You do not have permission to view this enquiry' });
      }
      
      const specs = await storage.getProductSpecificationsByEnquiryId(id);
      const files = await storage.getFilesByEnquiryId(id);
      const specSheets = await storage.getSpecSheetsByEnquiryId(id);
      
      res.json({
        enquiry,
        specifications: specs,
        files,
        specSheets,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Update enquiry
  app.patch('/api/enquiries/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const enquiry = await storage.getEnquiry(id);
      
      if (!enquiry) {
        return res.status(404).json({ message: 'Enquiry not found' });
      }
      
      // Check if user has access to this enquiry
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      // Only allow access if the user is an admin or the enquiry creator
      if (!isAdmin && enquiry.createdBy !== userId) {
        return res.status(403).json({ message: 'Access denied: You do not have permission to update this enquiry' });
      }
      
      const updateData = insertEnquirySchema.partial().parse(req.body);
      const updatedEnquiry = await storage.updateEnquiry(id, updateData);
      
      res.json(updatedEnquiry);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Update product specification
  app.patch('/api/specifications/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const spec = await storage.getProductSpecification(id);
      
      if (!spec) {
        return res.status(404).json({ message: 'Product specification not found' });
      }
      
      const updateData = insertProductSpecificationSchema.partial().parse(req.body);
      const updatedSpec = await storage.updateProductSpecification(id, updateData);
      
      res.json(updatedSpec);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Generate spec sheet
  app.post('/api/enquiries/:id/generate-spec-sheet', requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const enquiry = await storage.getEnquiry(id);
      
      if (!enquiry) {
        return res.status(404).json({ message: 'Enquiry not found' });
      }
      
      const specs = await storage.getProductSpecificationsByEnquiryId(id);
      
      // Import the category mapper
      const { getCategoryManagerForProduct, getAllCategoryManagers } = await import('./lib/category-mapper');
      
      // Assign category managers to each product specification
      const productCategoryAssignments = specs.map(spec => {
        // Pass both product type and additional details like dimensions and material
        const additionalDetails = `${spec.dimensions} ${spec.material} ${spec.printType}`;
        const categoryManager = getCategoryManagerForProduct(spec.productType, additionalDetails);
        return {
          specificationId: spec.id,
          productType: spec.productType,
          categoryManager: categoryManager || getAllCategoryManagers()[0] // Default to first manager if none found
        };
      });
      
      // Find the primary category manager based on frequency of assignments
      let primaryCategoryManager = null;
      if (productCategoryAssignments.length > 0) {
        // Count occurrences of each category manager
        const managerCounts: Record<string, { count: number, manager: CategoryManager }> = {};
        
        productCategoryAssignments.forEach(assignment => {
          const managerId = assignment.categoryManager.id;
          if (!managerCounts[managerId]) {
            managerCounts[managerId] = { count: 0, manager: assignment.categoryManager };
          }
          managerCounts[managerId].count++;
        });
        
        // Find the most frequent category manager
        let maxCount = 0;
        Object.values(managerCounts).forEach(({ count, manager }) => {
          if (count > maxCount) {
            maxCount = count;
            primaryCategoryManager = manager;
          }
        });
      }
      
      // Create a structured content object
      const specSheetContent = {
        enquiry,
        specifications: specs,
        generatedAt: new Date().toISOString(),
        categoryManager: primaryCategoryManager, // Primary category manager for the enquiry
        productCategoryAssignments // Individual assignments for each product
      };
      
      console.log('Creating spec sheet with content:', JSON.stringify(specSheetContent).substring(0, 100) + '...');
      
      const specSheet = await storage.createSpecSheet({
        enquiryId: id,
        generatedBy: req.body.generatedBy || 'system',
        content: specSheetContent,
        version: 1,
      });
      
      // Update the enquiry with the assigned category manager information
      if (primaryCategoryManager) {
        console.log(`Updating enquiry ${id} with primary category manager: ${primaryCategoryManager.name} (${primaryCategoryManager.id})`);
        
        const updatedEnquiry = await storage.updateEnquiry(id, {
          assignedTo: primaryCategoryManager.id,
          assignedToName: primaryCategoryManager.name,
          assignedToDepartment: primaryCategoryManager.department,
          status: 'assigned' // Update status to reflect the assignment
        });
        
        console.log(`Enquiry ${id} successfully assigned to ${primaryCategoryManager.name}`);
        
        // Return both the spec sheet and updated enquiry
        res.json({
          specSheet,
          enquiry: updatedEnquiry,
          categoryManager: primaryCategoryManager
        });
      } else {
        console.log(`No primary category manager found for enquiry ${id}`);
        res.json({ 
          specSheet,
          enquiry,
          categoryManager: null
        });
      }
    } catch (err) {
      handleError(err, res);
    }
  });

  // Delete file
  app.delete('/api/files/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getFile(id);
      
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      await storage.deleteFile(id);
      
      // Delete the physical file if it exists
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ============== INVOICE ROUTES ==============

  // Upload and process an invoice
  app.post('/api/invoices/upload', requireAuth, upload.single('invoice'), async (req: Request, res: Response) => {
    try {
      // Cast req to any to bypass TypeScript limitations with multer
      const multerReq = req as any;
      
      if (!multerReq.file) {
        return res.status(400).json({ message: 'No invoice file uploaded' });
      }

      const file = multerReq.file;
      
      // Store the file in the database
      const uploadedFile = await storage.saveFile({
        enquiryId: null,
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        path: file.path
      });

      // Process the invoice with AI
      const startTime = Date.now();
      const parsedInvoice = await parseInvoiceDocument(file.path);
      const processingTime = Date.now() - startTime;
      
      // Validate the parsed invoice
      const validatedInvoice = parsedInvoiceSchema.parse(parsedInvoice);
      
      // Create invoice record
      const invoiceDate = new Date(validatedInvoice.meta.invoiceDate);
      const dueDate = validatedInvoice.meta.dueDate ? new Date(validatedInvoice.meta.dueDate) : null;
      
      // Check if the invoice already exists
      const existingInvoice = await storage.getInvoiceByNumber(validatedInvoice.meta.invoiceNumber);
      
      if (existingInvoice) {
        return res.status(400).json({ 
          message: 'Invoice already exists',
          invoice: existingInvoice
        });
      }

      // Store the assignee information
      let assignedToId = null;
      let assignedToName = null;
      let assignedToDepartment = null;

      if (validatedInvoice.assignedTo) {
        assignedToId = validatedInvoice.assignedTo.id;
        assignedToName = validatedInvoice.assignedTo.name;
        assignedToDepartment = validatedInvoice.assignedTo.department;
      }

      // Create new invoice record
      const invoice = await storage.createInvoice({
        invoiceNumber: validatedInvoice.meta.invoiceNumber,
        invoiceDate,
        supplierName: validatedInvoice.meta.supplierName,
        supplierContact: validatedInvoice.meta.supplierContact || null,
        customerName: validatedInvoice.meta.customerName,
        customerReference: validatedInvoice.meta.customerReference || null,
        totalAmount: validatedInvoice.meta.totalAmount,
        currency: validatedInvoice.meta.currency,
        paymentTerms: validatedInvoice.meta.paymentTerms || null,
        dueDate,
        taxAmount: validatedInvoice.meta.taxAmount || null,
        status: validatedInvoice.status,
        assignedTo: assignedToId,
        assignedToName: assignedToName,
        assignedToDepartment: assignedToDepartment,
        uploadedBy: req.user?.id || null,
        filePath: file.path,
        processingTime,
        aiConfidence: validatedInvoice.confidence,
        rawText: validatedInvoice.rawText || null
      });

      // Create invoice items
      const invoiceItems = await Promise.all(
        validatedInvoice.items.map(async (item) => {
          let categoryManagerId = null;
          let categoryManagerName = null;
          let categoryManagerDepartment = null;

          if (item.categoryManager) {
            categoryManagerId = item.categoryManager.id;
            categoryManagerName = item.categoryManager.name;
            categoryManagerDepartment = item.categoryManager.department;
          }

          return storage.createInvoiceItem({
            invoiceId: invoice.id,
            sku: item.sku,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            category: item.category || null,
            categoryManagerId,
            categoryManagerName,
            categoryManagerDepartment
          });
        })
      );

      res.status(201).json({
        invoice,
        items: invoiceItems,
        processingTime: `${(processingTime / 1000).toFixed(1)} seconds`,
        file: uploadedFile
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get all invoices
  app.get('/api/invoices', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      // If admin, get all invoices, otherwise only get invoices uploaded by the user
      const invoices = await storage.getAllInvoices(isAdmin ? undefined : userId);
      res.json(invoices);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get invoice by ID with items
  app.get('/api/invoices/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Check if user has access to this invoice
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      // Only allow access if user is admin or invoice uploader
      if (!isAdmin && invoice.uploadedBy !== userId) {
        return res.status(403).json({ message: 'Access denied: You do not have permission to view this invoice' });
      }
      
      const items = await storage.getInvoiceItems(id);
      
      res.json({
        invoice,
        items
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Update invoice status
  app.patch('/api/invoices/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Check if user has access to this invoice
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      // Only allow access if user is admin or invoice uploader
      if (!isAdmin && invoice.uploadedBy !== userId) {
        return res.status(403).json({ message: 'Access denied: You do not have permission to update this invoice' });
      }
      
      const updateData = insertInvoiceSchema.partial().parse(req.body);
      const updatedInvoice = await storage.updateInvoice(id, updateData);
      
      res.json(updatedInvoice);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get invoices assigned to a category manager
  app.get('/api/invoices/assigned/:managerId', requireAuth, async (req: Request, res: Response) => {
    try {
      const managerId = req.params.managerId;
      const invoices = await storage.getInvoicesByAssignee(managerId);
      res.json(invoices);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Update an invoice item
  app.patch('/api/invoice-items/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInvoiceItem(id);
      
      if (!item) {
        return res.status(404).json({ message: 'Invoice item not found' });
      }
      
      // Get the parent invoice to check permissions
      const invoice = await storage.getInvoice(item.invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: 'Parent invoice not found' });
      }
      
      // Check if user has access to this invoice's items
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      // Only allow access if user is admin or invoice uploader
      if (!isAdmin && invoice.uploadedBy !== userId) {
        return res.status(403).json({ message: 'Access denied: You do not have permission to update this invoice item' });
      }
      
      const updateData = insertInvoiceItemSchema.partial().parse(req.body);
      const updatedItem = await storage.updateInvoiceItem(id, updateData);
      
      res.json(updatedItem);
    } catch (err) {
      handleError(err, res);
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time collaboration
  const collaborationServer = new CollaborationServer(httpServer);
  
  // Add WebSocket routes for spec sheet collaboration
  app.get('/api/collaboration/spec/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const specSheetId = parseInt(req.params.id);
      const specSheet = await storage.getSpecSheet(specSheetId);
      
      if (!specSheet) {
        return res.status(404).json({ message: 'Spec sheet not found' });
      }
      
      // Get the associated enquiry to check permissions
      const enquiry = await storage.getEnquiry(specSheet.enquiryId);
      
      if (!enquiry) {
        return res.status(404).json({ message: 'Associated enquiry not found' });
      }
      
      // Check if user has access to this enquiry/spec sheet
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      // Only allow access if the user is an admin or the enquiry creator
      if (!isAdmin && enquiry.createdBy !== userId) {
        return res.status(403).json({ message: 'Access denied: You do not have permission to view this spec sheet' });
      }
      
      res.json({
        specSheet,
        collaborationEnabled: true
      });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  return httpServer;
}
