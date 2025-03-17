import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { CategoryManager } from "./category-mapping";
import { CategoryManager as SchemaManager } from "@shared/schema";
import { getCategoryManager } from "./category-mapping";
import { getCategoryManagerForProduct } from "./category-mapper";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface InvoiceItem {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  categoryManager?: CategoryManager;
}

export interface InvoiceMeta {
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  supplierContact?: string;
  customerName: string;
  customerReference?: string;
  totalAmount: number;
  currency: string;
  paymentTerms?: string;
  dueDate?: string;
  taxAmount?: number;
}

export interface ParsedInvoice {
  meta: InvoiceMeta;
  items: InvoiceItem[];
  rawText?: string;
  status: 'pending' | 'processed' | 'assigned' | 'completed';
  assignedTo?: CategoryManager;
  processingTime?: number;
  confidence: number;
}

/**
 * Parse an invoice document using OpenAI API
 * 
 * @param filePath Path to the invoice file
 * @returns Structured invoice data with category assignments
 */
export async function parseInvoiceDocument(filePath: string): Promise<ParsedInvoice> {
  try {
    console.log(`Processing invoice file: ${filePath}`);
    const startTime = Date.now();
    
    // Check if the OpenAI API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-dummy-key-for-development") {
      throw new Error("OpenAI API key is not set or invalid");
    }
    
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Prompt for invoice parsing
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        {
          role: "system",
          content: `You are an AI assistant specialized in parsing invoice documents.
          Extract the following information in a structured format:
          
          1. Invoice metadata (invoice number, date, supplier, customer, total amount, etc.)
          2. Line items (SKU/product code, description, quantity, unit price, total)
          
          Format the response as a valid JSON object with "meta" and "items" fields.
          For each item, include the SKU, description, quantity, unitPrice, and totalPrice.
          If a field is not present in the invoice, use null for that field.
          
          Example format:
          {
            "meta": {
              "invoiceNumber": "INV-12345",
              "invoiceDate": "2023-05-15",
              "supplierName": "ABC Supplies Inc.",
              "customerName": "XYZ Company",
              "totalAmount": 1250.50,
              "currency": "GBP"
            },
            "items": [
              {
                "sku": "BAGPAPER123",
                "description": "Kraft Paper Bags 10x15cm",
                "quantity": 500,
                "unitPrice": 0.25,
                "totalPrice": 125.00
              }
            ]
          }`
        },
        {
          role: "user",
          content: fileContent
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Lower temperature for more deterministic results
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to get content from OpenAI response");
    }
    
    console.log("Received invoice parsing response from OpenAI");
    
    // Parse and validate the JSON response
    const result = JSON.parse(content) as { meta: InvoiceMeta, items: Omit<InvoiceItem, 'categoryManager'>[] };
    
    // Assign category managers to each item using both category-mapping and enhanced category-mapper
    const itemsWithCategories = result.items.map(item => {
      // Try first with the CSV-based category mapper (enhanced)
      let categoryManager = getCategoryManagerForProduct(item.sku, item.description);
      
      // Fallback to the hardcoded category mapping if needed
      if (!categoryManager) {
        categoryManager = getCategoryManager(item.sku, item.description);
      }
      
      console.log(`Assigned item "${item.description}" (SKU: ${item.sku}) to Category Manager: ${categoryManager?.name || 'None'} (ID: ${categoryManager?.id || 'None'}, Type: ${typeof categoryManager?.id})`);
      
      return {
        ...item,
        categoryManager: categoryManager || undefined, // Important: Use undefined instead of null for compatibility
        category: categoryManager?.department || 'Unassigned'
      };
    });
    
    // Determine the primary category manager for the entire invoice
    let primaryManager: CategoryManager | undefined;
    
    if (itemsWithCategories.length > 0) {
      // Group items by category manager and find the one with the most items
      const managerCounts: Record<string, { count: number, manager: CategoryManager }> = {};
      
      itemsWithCategories.forEach(item => {
        if (item.categoryManager) {
          const managerId = item.categoryManager.id;
          if (!managerCounts[managerId]) {
            managerCounts[managerId] = { count: 0, manager: item.categoryManager };
          }
          managerCounts[managerId].count++;
        }
      });
      
      // Find the manager with the highest count
      let maxCount = 0;
      Object.values(managerCounts).forEach(({ count, manager }) => {
        if (count > maxCount) {
          maxCount = count;
          primaryManager = manager;
        }
      });
    }
    
    const processingTime = Date.now() - startTime;
    
    if (primaryManager) {
      console.log(`Selected primary category manager for invoice: ${primaryManager.name} (ID: ${primaryManager.id}, Type: ${typeof primaryManager.id})`);
    } else {
      console.log('No primary category manager selected for this invoice');
    }
    
    // Return the parsed invoice with category assignments
    return {
      meta: result.meta,
      items: itemsWithCategories,
      status: 'processed',
      assignedTo: primaryManager,
      processingTime,
      confidence: 0.85, // Fixed confidence for now, could be improved in the future
      rawText: fileContent
    };
  } catch (error: any) {
    console.error("Error in invoice parsing:", error);
    const errorMessage = error?.message || 'Unknown error';
    throw new Error(`Failed to parse invoice: ${errorMessage}`);
  }
}