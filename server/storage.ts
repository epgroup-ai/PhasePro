import {
  users, type User, type InsertUser,
  sessions, type Session,
  files, type File, type InsertFile,
  productSpecifications, type ProductSpecification, type InsertProductSpecification,
  enquiries, type Enquiry, type InsertEnquiry,
  specSheets, type SpecSheet, type InsertSpecSheet,
  invoices, type Invoice, type InsertInvoice,
  invoiceItems, type InvoiceItem, type InsertInvoiceItem,
  type DashboardStats
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Extend the storage interface with CRUD methods for all schemas
export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  updateUserLoginTime(id: number): Promise<User>;

  // File methods
  saveFile(file: InsertFile): Promise<File>;
  getFile(id: number): Promise<File | undefined>;
  getFilesByEnquiryId(enquiryId: number): Promise<File[]>;
  updateFile(id: number, data: Partial<InsertFile>): Promise<File>;
  deleteFile(id: number): Promise<void>;

  // Product Specification methods
  createProductSpecification(spec: InsertProductSpecification): Promise<ProductSpecification>;
  getProductSpecification(id: number): Promise<ProductSpecification | undefined>;
  getProductSpecificationsByEnquiryId(enquiryId: number): Promise<ProductSpecification[]>;
  updateProductSpecification(id: number, data: Partial<InsertProductSpecification>): Promise<ProductSpecification>;
  deleteProductSpecification(id: number): Promise<void>;

  // Enquiry methods
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  getEnquiry(id: number): Promise<Enquiry | undefined>;
  getEnquiryByCode(enquiryCode: string): Promise<Enquiry | undefined>;
  getAllEnquiries(): Promise<Enquiry[]>;
  updateEnquiry(id: number, data: Partial<InsertEnquiry>): Promise<Enquiry>;
  deleteEnquiry(id: number): Promise<void>;

  // Spec Sheet methods
  createSpecSheet(specSheet: InsertSpecSheet): Promise<SpecSheet>;
  getSpecSheet(id: number): Promise<SpecSheet | undefined>;
  getSpecSheetsByEnquiryId(enquiryId: number): Promise<SpecSheet[]>;

  // Invoice methods
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByAssignee(assigneeId: string): Promise<Invoice[]>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;

  // Invoice Item methods
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  updateInvoiceItem(id: number, data: Partial<InsertInvoiceItem>): Promise<InvoiceItem>;
  deleteInvoiceItem(id: number): Promise<void>;

  // Dashboard Stats
  getDashboardStats(): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  public sessionStore: session.Store;
  private users: Map<number, User>;
  private files: Map<number, File & { path?: string }>;
  private productSpecs: Map<number, ProductSpecification>;
  private enquiries: Map<number, Enquiry>;
  private specSheets: Map<number, SpecSheet>;
  private invoices: Map<number, Invoice>;
  private invoiceItems: Map<number, InvoiceItem>;
  private userCurrentId: number;
  private fileCurrentId: number;
  private productSpecCurrentId: number;
  private enquiryCurrentId: number;
  private specSheetCurrentId: number;
  private invoiceCurrentId: number;
  private invoiceItemCurrentId: number;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    this.users = new Map();
    this.files = new Map();
    this.productSpecs = new Map();
    this.enquiries = new Map();
    this.specSheets = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.userCurrentId = 1;
    this.fileCurrentId = 1;
    this.productSpecCurrentId = 1;
    this.enquiryCurrentId = 1;
    this.specSheetCurrentId = 1;
    this.invoiceCurrentId = 1;
    this.invoiceItemCurrentId = 1;

    // Add a test user (factory worker)
    this.createUser({
      username: 'testuser',
      password: '$2a$10$4gVBKcJzZtL/wmgIXUqDoeUf9eqKAufJR5PvFwEvQf5yWUEjDF/Om', // hashed version of 'testpassword'
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'user'
    }).then(user => {
      console.log('Test user created:', user);
    });

    // Add some initial data for the dashboard
    this.createEnquiry({
      enquiryCode: 'ENQ-2023-0042',
      customerName: 'ABC Packaging Ltd.',
      contactPerson: 'Sarah Johnson',
      contactEmail: 's.johnson@abcpackaging.com',
      dateReceived: new Date(),
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      status: 'new',
      specialInstructions: 'The cardboard boxes must be stackable and have reinforced corners. Customer requests eco-friendly materials where possible.',
      deliveryRequirements: 'Phased delivery required: 2,500 units by July 15, remaining 2,500 by August 1. Delivery to ABC Packaging Ltd. warehouse in Manchester.',
      aiConfidence: 92,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  // This method is no longer needed but we keep it for interface compatibility
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      lastLogin: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserLoginTime(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    const updatedUser = { ...user, lastLogin: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // File methods
  async saveFile(insertFile: InsertFile): Promise<File> {
    const id = this.fileCurrentId++;
    const file: File = { ...insertFile, id, uploadedAt: new Date() };
    this.files.set(id, file);
    return file;
  }

  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByEnquiryId(enquiryId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.enquiryId === enquiryId,
    );
  }

  async updateFile(id: number, data: Partial<InsertFile>): Promise<File> {
    const file = this.files.get(id);
    if (!file) {
      throw new Error(`File with ID ${id} not found`);
    }
    const updatedFile = { ...file, ...data };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<void> {
    this.files.delete(id);
  }

  // Product Specification methods
  async createProductSpecification(insertSpec: InsertProductSpecification): Promise<ProductSpecification> {
    const id = this.productSpecCurrentId++;
    const spec: ProductSpecification = { ...insertSpec, id };
    this.productSpecs.set(id, spec);
    return spec;
  }

  async getProductSpecification(id: number): Promise<ProductSpecification | undefined> {
    return this.productSpecs.get(id);
  }

  async getProductSpecificationsByEnquiryId(enquiryId: number): Promise<ProductSpecification[]> {
    return Array.from(this.productSpecs.values()).filter(
      (spec) => spec.enquiryId === enquiryId,
    );
  }

  async updateProductSpecification(id: number, data: Partial<InsertProductSpecification>): Promise<ProductSpecification> {
    const spec = this.productSpecs.get(id);
    if (!spec) {
      throw new Error(`Product specification with ID ${id} not found`);
    }
    const updatedSpec = { ...spec, ...data };
    this.productSpecs.set(id, updatedSpec);
    return updatedSpec;
  }

  async deleteProductSpecification(id: number): Promise<void> {
    this.productSpecs.delete(id);
  }

  // Enquiry methods
  async createEnquiry(insertEnquiry: InsertEnquiry): Promise<Enquiry> {
    const id = this.enquiryCurrentId++;
    // If enquiryCode is not provided, generate one
    if (!insertEnquiry.enquiryCode) {
      insertEnquiry.enquiryCode = `ENQ-${new Date().getFullYear()}-${id.toString().padStart(4, '0')}`;
    }
    const enquiry: Enquiry = { ...insertEnquiry, id };
    this.enquiries.set(id, enquiry);
    return enquiry;
  }

  async getEnquiry(id: number): Promise<Enquiry | undefined> {
    return this.enquiries.get(id);
  }

  async getEnquiryByCode(enquiryCode: string): Promise<Enquiry | undefined> {
    return Array.from(this.enquiries.values()).find(
      (enquiry) => enquiry.enquiryCode === enquiryCode,
    );
  }

  async getAllEnquiries(): Promise<Enquiry[]> {
    return Array.from(this.enquiries.values());
  }

  async updateEnquiry(id: number, data: Partial<InsertEnquiry>): Promise<Enquiry> {
    const enquiry = this.enquiries.get(id);
    if (!enquiry) {
      throw new Error(`Enquiry with ID ${id} not found`);
    }
    const updatedEnquiry = { ...enquiry, ...data };
    this.enquiries.set(id, updatedEnquiry);
    return updatedEnquiry;
  }

  async deleteEnquiry(id: number): Promise<void> {
    this.enquiries.delete(id);
  }

  // Spec Sheet methods
  async createSpecSheet(insertSpecSheet: InsertSpecSheet): Promise<SpecSheet> {
    const id = this.specSheetCurrentId++;
    const specSheet: SpecSheet = { ...insertSpecSheet, id, generatedAt: new Date() };
    this.specSheets.set(id, specSheet);
    return specSheet;
  }

  async getSpecSheet(id: number): Promise<SpecSheet | undefined> {
    return this.specSheets.get(id);
  }

  async getSpecSheetsByEnquiryId(enquiryId: number): Promise<SpecSheet[]> {
    return Array.from(this.specSheets.values()).filter(
      (sheet) => sheet.enquiryId === enquiryId,
    );
  }

  // Invoice methods
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceCurrentId++;
    
    // Set default values for nullable fields
    const status = insertInvoice.status || 'pending';
    const currency = insertInvoice.currency || 'GBP';
    const supplierContact = insertInvoice.supplierContact || null;
    const customerReference = insertInvoice.customerReference || null;
    const paymentTerms = insertInvoice.paymentTerms || null;
    const dueDate = insertInvoice.dueDate || null;
    const taxAmount = insertInvoice.taxAmount || null;
    const uploadedBy = insertInvoice.uploadedBy || null;
    const assignedTo = insertInvoice.assignedTo || null;
    const assignedToName = insertInvoice.assignedToName || null;
    const assignedToDepartment = insertInvoice.assignedToDepartment || null;
    const aiConfidence = insertInvoice.aiConfidence || null;
    const rawText = insertInvoice.rawText || null;
    const filePath = insertInvoice.filePath || null;
    const processingTime = insertInvoice.processingTime || null;
    
    const invoice: Invoice = { 
      id,
      invoiceNumber: insertInvoice.invoiceNumber,
      invoiceDate: insertInvoice.invoiceDate,
      supplierName: insertInvoice.supplierName,
      customerName: insertInvoice.customerName,
      totalAmount: insertInvoice.totalAmount,
      status,
      currency,
      uploadedAt: new Date(),
      supplierContact,
      customerReference,
      paymentTerms,
      dueDate,
      taxAmount,
      uploadedBy,
      assignedTo,
      assignedToName,
      assignedToDepartment,
      processedAt: null,
      processingTime,
      aiConfidence,
      rawText,
      filePath
    };
    
    this.invoices.set(id, invoice);
    return invoice;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    return Array.from(this.invoices.values()).find(
      (invoice) => invoice.invoiceNumber === invoiceNumber,
    );
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }

  async getInvoicesByAssignee(assigneeId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.assignedTo === assigneeId,
    );
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice> {
    const invoice = this.invoices.get(id);
    if (!invoice) {
      throw new Error(`Invoice with ID ${id} not found`);
    }
    const updatedInvoice = { ...invoice, ...data };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    this.invoices.delete(id);
  }

  // Invoice Item methods
  async createInvoiceItem(insertItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = this.invoiceItemCurrentId++;
    
    // Set default values for nullable fields
    const category = insertItem.category || null;
    const categoryManagerId = insertItem.categoryManagerId || null;
    const categoryManagerName = insertItem.categoryManagerName || null;
    const categoryManagerDepartment = insertItem.categoryManagerDepartment || null;
    
    const item: InvoiceItem = { 
      id,
      invoiceId: insertItem.invoiceId,
      sku: insertItem.sku,
      description: insertItem.description,
      quantity: insertItem.quantity,
      unitPrice: insertItem.unitPrice,
      totalPrice: insertItem.totalPrice,
      category,
      categoryManagerId,
      categoryManagerName,
      categoryManagerDepartment
    };
    
    this.invoiceItems.set(id, item);
    return item;
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values()).filter(
      (item) => item.invoiceId === invoiceId,
    );
  }

  async updateInvoiceItem(id: number, data: Partial<InsertInvoiceItem>): Promise<InvoiceItem> {
    const item = this.invoiceItems.get(id);
    if (!item) {
      throw new Error(`Invoice item with ID ${id} not found`);
    }
    const updatedItem = { ...item, ...data };
    this.invoiceItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteInvoiceItem(id: number): Promise<void> {
    this.invoiceItems.delete(id);
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const enquiries = Array.from(this.enquiries.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newEnquiries = enquiries.filter((e: Enquiry) => e.status === 'new').length;
    const processedToday = enquiries.filter((e: Enquiry) => 
      e.processedAt && new Date(e.processedAt) >= today
    ).length;
    const pendingReview = enquiries.filter((e: Enquiry) => e.status === 'processed').length;
    
    // Calculate average processing time
    const processedEnquiries = enquiries.filter((e: Enquiry) => e.processingTime);
    const totalTime = processedEnquiries.reduce((sum: number, e: Enquiry) => sum + (e.processingTime || 0), 0);
    const avgTime = processedEnquiries.length ? (totalTime / processedEnquiries.length / 1000) : 0;
    const avgProcessingTime = `${avgTime.toFixed(1)} sec`;
    
    return {
      newEnquiries,
      processedToday,
      pendingReview,
      avgProcessingTime,
    };
  }
}

import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "process";

// PostgreSQL Database implementation
export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  private db: any;
  private queryClient: any;

  constructor() {
    // Connect to PostgreSQL
    const connectionString = env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Create Postgres client
    const client = postgres(connectionString);
    this.db = drizzle(client);
    
    // Session store
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      conObject: {
        connectionString,
      },
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    // We're not implementing Google Auth for now
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const role = insertUser.role || "user";
    const fullName = insertUser.fullName || null;
    const email = insertUser.email || null;
    
    const result = await this.db.insert(users).values({
      ...insertUser,
      role,
      fullName,
      email,
      createdAt: new Date(),
      lastLogin: null
    }).returning();
    
    return result[0];
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const result = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async updateUserLoginTime(id: number): Promise<User> {
    const result = await this.db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  // File methods
  async saveFile(insertFile: InsertFile): Promise<File> {
    const path = insertFile.path || null;
    const enquiryId = insertFile.enquiryId || null;
    
    const result = await this.db.insert(files).values({
      ...insertFile,
      path,
      enquiryId,
      uploadedAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getFile(id: number): Promise<File | undefined> {
    const result = await this.db.select().from(files).where(eq(files.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getFilesByEnquiryId(enquiryId: number): Promise<File[]> {
    const result = await this.db.select().from(files).where(eq(files.enquiryId, enquiryId));
    return result;
  }

  async updateFile(id: number, data: Partial<InsertFile>): Promise<File> {
    const result = await this.db
      .update(files)
      .set(data)
      .where(eq(files.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFile(id: number): Promise<void> {
    await this.db.delete(files).where(eq(files.id, id));
  }

  // Product Specification methods
  async createProductSpecification(insertSpec: InsertProductSpecification): Promise<ProductSpecification> {
    const aiConfidence = insertSpec.aiConfidence || null;
    const verified = insertSpec.verified || null;
    
    const result = await this.db.insert(productSpecifications).values({
      ...insertSpec,
      aiConfidence,
      verified
    }).returning();
    
    return result[0];
  }

  async getProductSpecification(id: number): Promise<ProductSpecification | undefined> {
    const result = await this.db.select().from(productSpecifications).where(eq(productSpecifications.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getProductSpecificationsByEnquiryId(enquiryId: number): Promise<ProductSpecification[]> {
    const result = await this.db.select().from(productSpecifications).where(eq(productSpecifications.enquiryId, enquiryId));
    return result;
  }

  async updateProductSpecification(id: number, data: Partial<InsertProductSpecification>): Promise<ProductSpecification> {
    const result = await this.db
      .update(productSpecifications)
      .set(data)
      .where(eq(productSpecifications.id, id))
      .returning();
    
    return result[0];
  }

  async deleteProductSpecification(id: number): Promise<void> {
    await this.db.delete(productSpecifications).where(eq(productSpecifications.id, id));
  }

  // Enquiry methods
  async createEnquiry(insertEnquiry: InsertEnquiry): Promise<Enquiry> {
    const contactPerson = insertEnquiry.contactPerson || null;
    const contactEmail = insertEnquiry.contactEmail || null;
    const deadline = insertEnquiry.deadline || null;
    const specialInstructions = insertEnquiry.specialInstructions || null;
    const deliveryRequirements = insertEnquiry.deliveryRequirements || null;
    const processingTime = insertEnquiry.processingTime || null;
    const status = insertEnquiry.status || "pending";
    
    // Generate a unique enquiry code if not provided
    if (!insertEnquiry.enquiryCode) {
      // Get the current year
      const year = new Date().getFullYear();
      
      // Generate a base code pattern
      const baseCode = `ENQ-${year}-`;
      
      // Find the highest existing code with this prefix
      const existingEnquiries = await this.db.select()
        .from(enquiries)
        .where(like(enquiries.enquiryCode, `${baseCode}%`))
        .orderBy(sql`enquiry_code DESC`)
        .limit(1);
      
      let nextCounter = 1;
      
      if (existingEnquiries.length > 0) {
        const lastCode = existingEnquiries[0].enquiryCode;
        const counterStr = lastCode.substring(baseCode.length);
        const counter = parseInt(counterStr, 10);
        if (!isNaN(counter)) {
          nextCounter = counter + 1;
        }
      }
      
      insertEnquiry.enquiryCode = `${baseCode}${nextCounter.toString().padStart(4, '0')}`;
    } else {
      // Check if the provided enquiry code already exists
      const existingEnquiry = await this.getEnquiryByCode(insertEnquiry.enquiryCode);
      if (existingEnquiry) {
        throw new Error(`Enquiry with code ${insertEnquiry.enquiryCode} already exists`);
      }
    }
    
    const result = await this.db.insert(enquiries).values({
      ...insertEnquiry,
      status,
      contactPerson,
      contactEmail,
      deadline,
      specialInstructions,
      deliveryRequirements,
      processingTime
    }).returning();
    
    return result[0];
  }

  async getEnquiry(id: number): Promise<Enquiry | undefined> {
    const result = await this.db.select().from(enquiries).where(eq(enquiries.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getEnquiryByCode(enquiryCode: string): Promise<Enquiry | undefined> {
    const result = await this.db.select().from(enquiries).where(eq(enquiries.enquiryCode, enquiryCode)).limit(1);
    return result[0] || undefined;
  }

  async getAllEnquiries(): Promise<Enquiry[]> {
    const result = await this.db.select().from(enquiries);
    return result;
  }

  async updateEnquiry(id: number, data: Partial<InsertEnquiry>): Promise<Enquiry> {
    const result = await this.db
      .update(enquiries)
      .set(data)
      .where(eq(enquiries.id, id))
      .returning();
    
    return result[0];
  }

  async deleteEnquiry(id: number): Promise<void> {
    await this.db.delete(enquiries).where(eq(enquiries.id, id));
  }

  // Spec Sheet methods
  async createSpecSheet(insertSpecSheet: InsertSpecSheet): Promise<SpecSheet> {
    const version = insertSpecSheet.version || 1;
    const generatedBy = insertSpecSheet.generatedBy || null;
    
    const result = await this.db.insert(specSheets).values({
      ...insertSpecSheet,
      version,
      generatedBy,
      generatedAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getSpecSheet(id: number): Promise<SpecSheet | undefined> {
    const result = await this.db.select().from(specSheets).where(eq(specSheets.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getSpecSheetsByEnquiryId(enquiryId: number): Promise<SpecSheet[]> {
    const result = await this.db.select().from(specSheets).where(eq(specSheets.enquiryId, enquiryId));
    return result;
  }

  // Invoice methods
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const result = await this.db.insert(invoices).values({
      ...insertInvoice,
      uploadedAt: new Date(),
      processedAt: insertInvoice.processedAt || null,
      processingTime: insertInvoice.processingTime || null,
      aiConfidence: insertInvoice.aiConfidence || null,
      uploadedBy: insertInvoice.uploadedBy || null,
      assignedTo: insertInvoice.assignedTo || null,
      assignedToName: insertInvoice.assignedToName || null,
      assignedToDepartment: insertInvoice.assignedToDepartment || null,
      dueDate: insertInvoice.dueDate || null,
      taxAmount: insertInvoice.taxAmount || null,
      rawText: insertInvoice.rawText || null,
      filePath: insertInvoice.filePath || null,
      supplierContact: insertInvoice.supplierContact || null,
      customerReference: insertInvoice.customerReference || null,
      paymentTerms: insertInvoice.paymentTerms || null,
    }).returning();
    
    return result[0];
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const result = await this.db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const result = await this.db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber)).limit(1);
    return result[0] || undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    const result = await this.db.select().from(invoices);
    return result;
  }

  async getInvoicesByAssignee(assigneeId: string): Promise<Invoice[]> {
    const result = await this.db.select().from(invoices).where(eq(invoices.assignedTo, assigneeId));
    return result;
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice> {
    const result = await this.db
      .update(invoices)
      .set(data)
      .where(eq(invoices.id, id))
      .returning();
    
    return result[0];
  }

  async deleteInvoice(id: number): Promise<void> {
    await this.db.delete(invoices).where(eq(invoices.id, id));
  }

  // Invoice Item methods
  async createInvoiceItem(insertItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const result = await this.db.insert(invoiceItems).values({
      ...insertItem,
      category: insertItem.category || null,
      categoryManagerId: insertItem.categoryManagerId || null,
      categoryManagerName: insertItem.categoryManagerName || null,
      categoryManagerDepartment: insertItem.categoryManagerDepartment || null,
    }).returning();
    
    return result[0];
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    const result = await this.db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    return result;
  }

  async updateInvoiceItem(id: number, data: Partial<InsertInvoiceItem>): Promise<InvoiceItem> {
    const result = await this.db
      .update(invoiceItems)
      .set(data)
      .where(eq(invoiceItems.id, id))
      .returning();
    
    return result[0];
  }

  async deleteInvoiceItem(id: number): Promise<void> {
    await this.db.delete(invoiceItems).where(eq(invoiceItems.id, id));
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    // Get all enquiries
    const allEnquiries = await this.db.select().from(enquiries);
    
    // New enquiries
    const newEnquiries = allEnquiries.filter((e: Enquiry) => e.status === 'new').length;
    
    // Today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Processed today
    const processedToday = allEnquiries.filter((e: Enquiry) => 
      e.processedAt && new Date(e.processedAt) >= today
    ).length;
    
    // Pending review
    const pendingReview = allEnquiries.filter((e: Enquiry) => e.status === 'processed').length;
    
    // Average processing time
    const processedWithTime = allEnquiries.filter((e: Enquiry) => e.processingTime != null);
    const avgTimeInMs = processedWithTime.length > 0
      ? processedWithTime.reduce((acc: number, curr: Enquiry) => acc + (curr.processingTime || 0), 0) / processedWithTime.length
      : 0;
    
    // Format average time as string (convert ms to seconds)
    const avgProcessingTime = `${(avgTimeInMs / 1000).toFixed(1)} sec`;
    
    return {
      newEnquiries,
      processedToday,
      pendingReview,
      avgProcessingTime
    };
  }
}

// Import drizzle-orm functions
import { eq, like, sql } from "drizzle-orm";
import { json } from "drizzle-orm/pg-core";

// Use PostgreSQL storage instead of memory storage
export const storage = new DatabaseStorage();
