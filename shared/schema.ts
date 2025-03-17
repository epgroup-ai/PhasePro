import { pgTable, text, serial, integer, boolean, timestamp, json, numeric, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define CategoryManager schema at the top level
export const categoryManagerSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string(),
});

export type CategoryManager = z.infer<typeof categoryManagerSchema>;

// User schema for local authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  fullName: text("full_name"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Session schema for express-session with connect-pg-simple
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export type Session = typeof sessions.$inferSelect;

// File schema
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  enquiryId: integer("enquiry_id"),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  // For memory storage implementation
  path: text("path"),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadedAt: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// Product specification schema
export const productSpecifications = pgTable("product_specifications", {
  id: serial("id").primaryKey(),
  enquiryId: integer("enquiry_id").notNull(),
  productType: text("product_type").notNull(),
  dimensions: text("dimensions").notNull(),
  material: text("material").notNull(),
  quantity: text("quantity").notNull(),
  printType: text("print_type").notNull(),
  aiConfidence: integer("ai_confidence"),
  verified: boolean("verified").default(false),
});

export const insertProductSpecificationSchema = createInsertSchema(productSpecifications).omit({
  id: true,
});

export type InsertProductSpecification = z.infer<typeof insertProductSpecificationSchema>;
export type ProductSpecification = typeof productSpecifications.$inferSelect;

// Enquiry schema
export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  enquiryCode: text("enquiry_code").notNull().unique(),
  customerName: text("customer_name").notNull(),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  dateReceived: timestamp("date_received").defaultNow().notNull(),
  deadline: timestamp("deadline"),
  status: text("status").notNull().default("new"),
  specialInstructions: text("special_instructions"),
  deliveryRequirements: text("delivery_requirements"),
  aiConfidence: integer("ai_confidence"),
  processedAt: timestamp("processed_at"),
  processedBy: text("processed_by"),
  processingTime: integer("processing_time"),
  createdBy: integer("created_by").references(() => users.id),
  // Category manager assignment fields
  assignedTo: text("assigned_to"),
  assignedToName: text("assigned_to_name"),
  assignedToDepartment: text("assigned_to_department"),
});

export const insertEnquirySchema = createInsertSchema(enquiries).omit({
  id: true,
});

export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Enquiry = typeof enquiries.$inferSelect;

// Spec sheet schema
export const specSheets = pgTable("spec_sheets", {
  id: serial("id").primaryKey(),
  enquiryId: integer("enquiry_id").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  generatedBy: text("generated_by"),
  content: json("content").notNull(),
  version: integer("version").notNull().default(1),
});

export const insertSpecSheetSchema = createInsertSchema(specSheets).omit({
  id: true,
  generatedAt: true,
});

export type InsertSpecSheet = z.infer<typeof insertSpecSheetSchema>;
export type SpecSheet = typeof specSheets.$inferSelect;

// Define the content type for spec sheets
export const specSheetContentSchema = z.object({
  enquiry: z.custom<Enquiry>(),
  specifications: z.array(z.custom<ProductSpecification>()),
  generatedAt: z.string(),
  categoryManager: categoryManagerSchema.optional(),
  productCategoryAssignments: z.array(
    z.object({
      specificationId: z.number(),
      productType: z.string(),
      categoryManager: categoryManagerSchema
    })
  ).optional(),
});

export type SpecSheetContent = z.infer<typeof specSheetContentSchema>;

// Stats schema for dashboard
export const dashboardStats = z.object({
  newEnquiries: z.number(),
  processedToday: z.number(),
  pendingReview: z.number(),
  avgProcessingTime: z.string(),
});

export type DashboardStats = z.infer<typeof dashboardStats>;

// Document extraction result schema
export const extractionResultSchema = z.object({
  enquiry: z.object({
    customerName: z.string(),
    enquiryCode: z.string(),
    contactPerson: z.string().nullable().optional().transform(val => 
      (!val || val === "" || val === "undefined") ? null : val
    ),
    contactEmail: z.string().nullable().optional().transform(val => 
      (!val || val === "" || val === "undefined") ? null : val
    ),
    dateReceived: z.string().nullable().optional().transform(val => 
      (!val) ? new Date().toISOString() : val
    ),
    deadline: z.string().nullable().optional(),
    specialInstructions: z.string().nullable().optional(),
    deliveryRequirements: z.string().nullable().optional(),
  }),
  productSpecifications: z.array(
    z.object({
      productType: z.string(),
      dimensions: z.string(),
      material: z.string(),
      quantity: z.string(),
      printType: z.string(),
      aiConfidence: z.number().optional(),
    })
  ),
  aiConfidence: z.number(),
  warnings: z.array(z.string()).optional(),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

// Invoice schema
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  supplierName: text("supplier_name").notNull(),
  customerName: text("customer_name").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  currency: text("currency").notNull().default("GBP"),
  status: text("status").notNull().default("pending"),
  supplierContact: text("supplier_contact"),
  customerReference: text("customer_reference"),
  paymentTerms: text("payment_terms"),
  dueDate: timestamp("due_date"),
  taxAmount: numeric("tax_amount"),
  uploadedBy: integer("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  assignedTo: text("assigned_to"),
  assignedToName: text("assigned_to_name"),
  assignedToDepartment: text("assigned_to_department"),
  processedAt: timestamp("processed_at"),
  processingTime: integer("processing_time"),
  aiConfidence: numeric("ai_confidence"),
  rawText: text("raw_text"),
  filePath: text("file_path"),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Invoice items schema
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  sku: text("sku").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  category: text("category"),
  categoryManagerId: text("category_manager_id"),
  categoryManagerName: text("category_manager_name"),
  categoryManagerDepartment: text("category_manager_department"),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
});

export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

// Parsed Invoice schema for API responses
export const parsedInvoiceSchema = z.object({
  meta: z.object({
    invoiceNumber: z.string(),
    invoiceDate: z.string(),
    supplierName: z.string(),
    supplierContact: z.string().optional(),
    customerName: z.string(),
    customerReference: z.string().optional(),
    totalAmount: z.number(),
    currency: z.string(),
    paymentTerms: z.string().optional(),
    dueDate: z.string().optional(),
    taxAmount: z.number().optional(),
  }),
  items: z.array(
    z.object({
      sku: z.string(),
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      totalPrice: z.number(),
      category: z.string().optional(),
      categoryManager: categoryManagerSchema.optional(),
    })
  ),
  status: z.enum(['pending', 'processed', 'assigned', 'completed']),
  assignedTo: categoryManagerSchema.optional(),
  processingTime: z.number().optional(),
  confidence: z.number(),
  rawText: z.string().optional(),
});

export type ParsedInvoice = z.infer<typeof parsedInvoiceSchema>;
