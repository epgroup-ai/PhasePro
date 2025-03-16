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
  parsedInvoiceSchema
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

// Set up multer for file uploads with temporary storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tempDir = path.join(os.tmpdir(), 'enquiry-uploads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'));
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
      const uploadedFiles = await Promise.all(
        files.map(async (file: Express.Multer.File) => {
          const uploadedFile = await storage.saveFile({
            enquiryId: null,
            filename: file.originalname,
            contentType: file.mimetype,
            size: file.size,
          });
          
          return {
            id: uploadedFile.id,
            filename: uploadedFile.filename,
            contentType: uploadedFile.contentType,
            size: uploadedFile.size,
            path: file.path,
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
        filePaths = validFiles
          .filter(Boolean)
          .map(file => {
            if (file && typeof file.path === 'string' && file.path.length > 0) {
              return file.path;
            }
            return null;
          })
          .filter((path): path is string => path !== null);
      }
      
      // Extract data using OpenAI
      const startTime = Date.now();
      const extractionResult = await extractDocumentData(filePaths);
      const processingTime = Date.now() - startTime;
      
      // Save the extracted enquiry
      const validatedData = extractionResultSchema.parse(extractionResult);
      
      // Format the date strings into JavaScript Date objects
      const dateReceived = validatedData.enquiry.dateReceived ? new Date(validatedData.enquiry.dateReceived) : new Date();
      const deadline = validatedData.enquiry.deadline ? new Date(validatedData.enquiry.deadline) : null;
      
      const enquiry = await storage.createEnquiry({
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
        deliveryRequirements: validatedData.enquiry.deliveryRequirements || null,
      });

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
      const enquiries = await storage.getAllEnquiries();
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
      
      const specSheet = await storage.createSpecSheet({
        enquiryId: id,
        generatedBy: req.body.generatedBy || 'system',
        content: {
          enquiry,
          specifications: specs,
          generatedAt: new Date().toISOString(),
        },
        version: 1,
      });
      
      res.json(specSheet);
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
      const invoices = await storage.getAllInvoices();
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
      const items = await storage.getInvoiceItems(id);
      
      if (items.length === 0) {
        return res.status(404).json({ message: 'Invoice item not found' });
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
