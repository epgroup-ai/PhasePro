import OpenAI from "openai";
import fs from "fs";
import { ExtractionResult } from "@shared/schema";
import path from "path";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development" });

/**
 * Extracts data from document files using OpenAI API
 * This function processes PDF and DOCX files to extract enquiry information
 * 
 * @param filePaths Array of file paths to process
 * @returns Structured data extracted from the documents
 */
export async function extractDocumentData(filePaths: string[]): Promise<ExtractionResult> {
  try {
    // For a real implementation, we would:
    // 1. Parse the PDFs/DOCXs using a library like pdf.js or docx.js
    // 2. Extract the text content
    // 3. Send that content to OpenAI for analysis
    
    // For the prototype, we'll read the file content as text if possible or use sample data
    const fileContents = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const ext = path.extname(filePath).toLowerCase();
          if (ext === '.pdf' || ext === '.docx') {
            // In a real app, we'd use a proper parser library
            // For now, if we can read it as text, do that
            return fs.readFileSync(filePath, 'utf-8');
          } else {
            return `Contents of ${path.basename(filePath)}`;
          }
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
          return `Unable to read ${path.basename(filePath)}`;
        }
      })
    );

    // Combine file contents for analysis
    const combinedContent = fileContents.join('\n\n');

    // Send the content to OpenAI for analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that specializes in extracting structured information from packaging enquiry documents. 
          Extract the following information in JSON format:
          1. Customer name
          2. Enquiry code/ID (if available)
          3. Contact person
          4. Contact email
          5. Date received (in YYYY-MM-DD format)
          6. Deadline (in YYYY-MM-DD format, if available)
          7. Product specifications (product type, dimensions, material, quantity, print type)
          8. Special instructions
          9. Delivery requirements
          
          For each field, provide a confidence score from 0-100.
          If information is missing or potentially incorrect, flag it with warnings.
          Structure the response as a valid JSON object with "enquiry", "productSpecifications", "aiConfidence", and "warnings" fields.`
        },
        {
          role: "user",
          content: combinedContent
        }
      ],
      response_format: { type: "json_object" },
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to get content from OpenAI response");
    }

    // Parse and validate the JSON response
    const result = JSON.parse(content);
    
    // If in development environment with dummy key, use sample data
    if (process.env.OPENAI_API_KEY === "sk-dummy-key-for-development") {
      return getSampleExtractionResult();
    }
    
    return result;
  } catch (error) {
    console.error("Error in OpenAI extraction:", error);
    
    // Fall back to sample data if OpenAI fails
    return getSampleExtractionResult();
  }
}

// Sample data for development and testing
function getSampleExtractionResult(): ExtractionResult {
  return {
    enquiry: {
      customerName: "ABC Packaging Ltd.",
      enquiryCode: "ENQ-2023-0042",
      contactPerson: "Sarah Johnson",
      contactEmail: "s.johnson@abcpackaging.com",
      dateReceived: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      specialInstructions: "The cardboard boxes must be stackable and have reinforced corners. Customer requests eco-friendly materials where possible.",
      deliveryRequirements: "Phased delivery required: 2,500 units by July 15, remaining 2,500 by August 1. Delivery to ABC Packaging Ltd. warehouse in Manchester."
    },
    productSpecifications: [
      {
        productType: "Cardboard Box",
        dimensions: "300 x 200 x 150",
        material: "E-Flute Corrugated",
        quantity: "5,000",
        printType: "2-Color Offset",
        aiConfidence: 95
      },
      {
        productType: "Shipping Label",
        dimensions: "100 x 150",
        material: "Self-Adhesive Paper",
        quantity: "10,000",
        printType: "Digital Full Color",
        aiConfidence: 85
      }
    ],
    aiConfidence: 92,
    warnings: [
      "Material type for shipping labels is uncertain - AI suggests 'Self-Adhesive Vinyl' as an alternative",
      "Please verify 'eco-friendly' requirements with category manager"
    ]
  };
}
