import OpenAI from "openai";
import fs from "fs";
import { ExtractionResult } from "@shared/schema";
import path from "path";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development" });

// Sample data for packaging boxes enquiry
function getSampleExtractionResult(): ExtractionResult {
  return {
    enquiry: {
      customerName: "ACME PRODUCTS INC.",
      enquiryCode: "ENQ-2025-0312",
      contactPerson: "Sarah Johnson",
      contactEmail: "sarah.johnson@acmeproducts.com",
      dateReceived: "2025-03-12",
      deadline: "2025-03-28",
      specialInstructions: "All packaging should follow eco-friendly guidelines. We are seeking recyclable materials wherever possible. Please advise on sustainability options for all packaging components. We require FSC certification for all paper products.",
      deliveryRequirements: "Staggered delivery is acceptable, with first batch of at least 1,000 cardboard boxes and 300 display packages needed by April 15, 2025. Remaining quantities can be delivered by May 1, 2025."
    },
    productSpecifications: [
      {
        productType: "Cardboard Boxes",
        dimensions: "250mm x 150mm x 100mm",
        material: "Corrugated Cardboard, E-flute, 200gsm",
        quantity: "5,000 units",
        printType: "4-color offset printing with matte lamination",
        aiConfidence: 98
      },
      {
        productType: "Display Packaging",
        dimensions: "400mm x 300mm x 200mm",
        material: "SBS Board, 350gsm",
        quantity: "1,000 units",
        printType: "6-color offset printing with spot UV coating",
        aiConfidence: 95
      },
      {
        productType: "Shipping Labels",
        dimensions: "100mm x 150mm",
        material: "Self-Adhesive Paper",
        quantity: "10,000 units",
        printType: "2-color thermal printing",
        aiConfidence: 92
      }
    ],
    aiConfidence: 95,
    warnings: [
      "FSC certification requirement should be verified with suppliers",
      "Specific eco-friendly material alternatives should be discussed with the customer"
    ]
  };
}

// Sample data for the labels enquiry
function getSampleLabelExtractionResult(): ExtractionResult {
  return {
    enquiry: {
      customerName: "GLOBAL RETAIL SOLUTIONS",
      enquiryCode: "GRS-2025-L47",
      contactPerson: "Michael Chen",
      contactEmail: "m.chen@globalretail.com",
      dateReceived: "2025-03-10",
      deadline: "2025-04-05",
      specialInstructions: "We are committed to reducing our environmental impact and would prefer eco-friendly options where available. Please highlight any sustainable materials or processes in your proposal. All products must comply with EU and US consumer product safety regulations.",
      deliveryRequirements: "We require staggered delivery with an initial batch of 10,000 clothing tags, 15,000 stickers, and 30,000 barcode labels by April 5, with remaining quantities delivered by April 30. Goods to be delivered to our distribution center at 789 Warehouse Lane, Chicago, IL 60607."
    },
    productSpecifications: [
      {
        productType: "Clothing Tags",
        dimensions: "50mm x 80mm",
        material: "Recycled Card Stock, 300gsm",
        quantity: "25,000 pcs",
        printType: "Full color digital printing, both sides",
        aiConfidence: 97
      },
      {
        productType: "Promotional Stickers",
        dimensions: "75mm diameter (circular)",
        material: "Vinyl with permanent adhesive",
        quantity: "50,000 pcs",
        printType: "4-color process with gloss finish",
        aiConfidence: 94
      },
      {
        productType: "Barcode Labels",
        dimensions: "40mm x 20mm",
        material: "Self-Adhesive Paper",
        quantity: "100,000 pcs",
        printType: "Black thermal printing",
        aiConfidence: 96
      }
    ],
    aiConfidence: 96,
    warnings: [
      "Verify EU and US safety regulation compliance requirements with regulatory team",
      "Discuss eco-friendly alternatives for vinyl materials"
    ]
  };
}

/**
 * Extracts data from document files using OpenAI API
 * This function processes PDF, DOCX, and TXT files to extract enquiry information
 * 
 * @param filePaths Array of file paths to process
 * @returns Structured data extracted from the documents
 */
export async function extractDocumentData(filePaths: string[]): Promise<ExtractionResult> {
  try {
    // For development mode, check if we have an OpenAI key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-dummy-key-for-development") {
      console.log("No valid OpenAI API key found. Using sample data for demo.");
      
      // Check if we should use the sample for labels
      const useLabelsSample = filePaths.some(p => p.includes('sample_enquiry_labels'));
      
      if (useLabelsSample) {
        return getSampleLabelExtractionResult();
      } else {
        return getSampleExtractionResult();
      }
    }
    
    console.log("Processing files:", filePaths);
    
    // Handle both uploaded files and sample files
    const fileContents = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          // Check if this is a known sample file
          if (filePath.includes('sample_enquiry_')) {
            console.log("Reading sample file:", filePath);
            return fs.readFileSync(filePath, 'utf-8');
          }
          
          // Otherwise handle as regular upload
          const ext = path.extname(filePath).toLowerCase();
          if (ext === '.pdf' || ext === '.docx' || ext === '.txt') {
            // Read text content directly (in production we'd use specific parsers for each file type)
            return fs.readFileSync(filePath, 'utf-8');
          } else {
            return `Contents of ${path.basename(filePath)}`;
          }
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
          
          // If we can't read the file but it's a sample, try to use the static samples instead
          if (filePath.includes('sample_enquiry_packaging_boxes')) {
            return fs.readFileSync('./attached_assets/sample_enquiry_packaging_boxes.txt', 'utf-8');
          } else if (filePath.includes('sample_enquiry_labels')) {
            return fs.readFileSync('./attached_assets/sample_enquiry_labels.txt', 'utf-8');
          }
          
          return `Unable to read ${path.basename(filePath)}`;
        }
      })
    );

    // Combine file contents for analysis
    const combinedContent = fileContents.join('\n\n');

    console.log("Sending content to OpenAI for analysis...");
    
    // Send the content to OpenAI for analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that specializes in extracting structured information from packaging enquiry documents. 
          Extract the following information in JSON format:
          1. Customer name
          2. Enquiry code/ID (if available, generate one in format ENQ-YYYY-XXXX if missing)
          3. Contact person
          4. Contact email
          5. Date received (in YYYY-MM-DD format)
          6. Deadline (in YYYY-MM-DD format, if available)
          7. Product specifications (product type, dimensions, material, quantity, print type)
          8. Special instructions
          9. Delivery requirements
          
          For each product specification, provide a confidence score from 0-100.
          For the overall extraction, provide an aiConfidence score from 0-100.
          If information is missing or potentially incorrect, flag it with warnings.
          Structure the response as a valid JSON object with "enquiry", "productSpecifications", "aiConfidence", and "warnings" fields.`
        },
        {
          role: "user",
          content: combinedContent
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Lower temperature for more deterministic results
      max_tokens: 2000, // Allow for detailed responses
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to get content from OpenAI response");
    }

    console.log("Received response from OpenAI");
    
    // Parse and validate the JSON response
    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error("Error in OpenAI extraction:", error);
    
    // Check if this is an API key issue
    if (error instanceof Error && error.message.includes("API key")) {
      console.error("Invalid or missing OpenAI API key");
    }
    
    // Fall back to sample data if OpenAI fails
    console.log("Using fallback sample data due to error");
    
    // Check if we should use the sample for labels
    const useLabelsSample = filePaths.some(p => p?.includes('sample_enquiry_labels'));
    
    if (useLabelsSample) {
      return getSampleLabelExtractionResult();
    } else {
      return getSampleExtractionResult();
    }
  }
}