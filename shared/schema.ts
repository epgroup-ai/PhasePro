import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Original User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
    contactPerson: z.string().optional(),
    contactEmail: z.string().email().optional(),
    dateReceived: z.string(),
    deadline: z.string().optional(),
    specialInstructions: z.string().optional(),
    deliveryRequirements: z.string().optional(),
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
