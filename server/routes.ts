import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { extractDocumentData } from "./lib/openai";
import { insertEnquirySchema, insertProductSpecificationSchema, extractionResultSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import path from "path";
import fs from "fs";
import os from "os";

// Add type definition for multer
interface File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

// Add type augmentation for Express.Request
declare global {
  namespace Express {
    interface Request {
      files?: File[] | { [fieldname: string]: File[] };
    }
  }
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
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      handleError(err, res);
    }
  });

  // File upload endpoint
  app.post('/api/upload', upload.array('files', 5), async (req: Request, res: Response) => {
    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const files = Array.isArray(req.files) ? req.files : [];
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
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
  app.post('/api/process', async (req: Request, res: Response) => {
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
          .filter(file => file.path !== null && file.path !== undefined)
          .map(file => file.path!);
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
        const validFiles = files.filter(Boolean);
        
        await Promise.all(
          validFiles.map(file =>
            storage.updateFile(file.id, { enquiryId: enquiry.id })
          )
        );
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
  app.get('/api/enquiries', async (req: Request, res: Response) => {
    try {
      const enquiries = await storage.getAllEnquiries();
      res.json(enquiries);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get enquiry by ID
  app.get('/api/enquiries/:id', async (req: Request, res: Response) => {
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
  app.patch('/api/enquiries/:id', async (req: Request, res: Response) => {
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
  app.patch('/api/specifications/:id', async (req: Request, res: Response) => {
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
  app.post('/api/enquiries/:id/generate-spec-sheet', async (req: Request, res: Response) => {
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
  app.delete('/api/files/:id', async (req: Request, res: Response) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
