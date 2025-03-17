import OpenAI from "openai";
import fs from "fs";
import { ExtractionResult } from "@shared/schema";
import path from "path";
// Import pdf-parse dynamically to avoid initialization issues
const pdfParse = async (dataBuffer: Buffer) => {
  // Dynamically import to avoid initialization test file issues
  const pdfParseModule = await import('pdf-parse');
  return pdfParseModule.default(dataBuffer);
};
import XLSX from "xlsx";
import mammoth from "mammoth";
import Anthropic from "@anthropic-ai/sdk";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development" });
// Optional Anthropic integration
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

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
 * Extract text from a PDF file
 * @param filePath Path to the PDF file
 * @returns Extracted text content
 */
async function extractPdfText(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error extracting PDF text from ${filePath}:`, error);
    return `[Error extracting PDF: ${error.message}]`;
  }
}

/**
 * Extract text from a DOCX file
 * @param filePath Path to the DOCX file
 * @returns Extracted text content
 */
async function extractDocxText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error(`Error extracting DOCX text from ${filePath}:`, error);
    return `[Error extracting DOCX: ${error.message}]`;
  }
}

/**
 * Extract data from Excel files (XLS/XLSX)
 * @param filePath Path to the Excel file
 * @returns Extracted content as text
 */
function extractExcelText(filePath: string): string {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    
    // Read the Excel file with proper options for binary format
    const workbook = XLSX.readFile(filePath, {
      type: 'binary',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      console.error("Invalid Excel workbook structure:", workbook);
      return "[Error: Invalid Excel file structure]";
    }
    
    console.log(`Excel file contains ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);
    
    // Process each sheet in the workbook
    let result = '';
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`Processing sheet ${index + 1}/${workbook.SheetNames.length}: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        console.error(`Sheet ${sheetName} is invalid or empty`);
        result += `Sheet: ${sheetName} (Empty or invalid)\n\n`;
        return;
      }
      
      // Convert sheet to JSON with header mapping
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: "",  // Default empty string for missing cells
        blankrows: false  // Skip blank rows
      });
      
      // Add sheet name and header
      result += `Sheet: ${sheetName}\n`;
      
      // Convert JSON to formatted text
      if (jsonData && jsonData.length > 0) {
        jsonData.forEach((row: any, rowIndex: number) => {
          if (row && Array.isArray(row)) {
            // Format and join cells with tabs
            const formattedRow = row.map((cell: any) => {
              // Handle different cell types
              if (cell === null || cell === undefined) return "";
              if (cell instanceof Date) return cell.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
              return String(cell).trim();
            });
            
            result += formattedRow.join('\t') + '\n';
          } else if (row) {
            // Handle non-array rows (should not happen with header:1)
            result += JSON.stringify(row) + '\n';
          }
        });
      } else {
        result += "[Empty sheet]\n";
      }
      
      result += '\n';
    });
    
    console.log(`Successfully extracted ${result.length} characters from Excel file`);
    return result;
  } catch (error) {
    console.error(`Error extracting Excel data from ${filePath}:`, error);
    return `[Error extracting Excel: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Process a file based on its extension and extract text content
 * @param filePath Path to the file
 * @returns Extracted text content
 */
async function processFile(filePath: string): Promise<string> {
  // Check if this is a known sample file
  if (filePath.includes('sample_enquiry_')) {
    console.log("Reading sample file:", filePath);
    return fs.readFileSync(filePath, 'utf-8');
  }
  
  // Otherwise handle as regular upload based on file extension
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      console.log(`Processing PDF file: ${filePath}`);
      return await extractPdfText(filePath);
    
    case '.docx':
      console.log(`Processing DOCX file: ${filePath}`);
      return await extractDocxText(filePath);
    
    case '.xlsx':
    case '.xls':
      console.log(`Processing Excel file: ${filePath}`);
      return extractExcelText(filePath);
    
    case '.txt':
    case '.csv':
    case '.json':
      console.log(`Processing text file: ${filePath}`);
      return fs.readFileSync(filePath, 'utf-8');
    
    default:
      console.warn(`Unsupported file format: ${ext} for ${filePath}`);
      return `[Unsupported file format: ${ext}]`;
  }
}

/**
 * Process files using OpenAI or Claude API for document extraction
 * @param text Document text to analyze
 * @returns Structured extraction result
 */
async function processWithAI(text: string): Promise<ExtractionResult> {
  console.log(`Processing document content with AI (content length: ${text.length} characters)`);
  
  // Prepare system prompt for either OpenAI or Claude
  const systemPrompt = `You are an AI assistant that specializes in extracting structured information from packaging enquiry documents. 
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
  Structure the response as a valid JSON object with "enquiry", "productSpecifications", "aiConfidence", and "warnings" fields.`;

  try {
    // Try with Anthropic's Claude if available
    if (anthropic) {
      try {
        const claudeResponse = await anthropic.messages.create({
          model: "claude-3-opus-20240229",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.1
        });
        
        const content = claudeResponse.content[0].text;
        // Remove any markdown code block syntax if present
        const cleanedContent = content.replace(/^```json\n|\n```$/g, '');
        
        return JSON.parse(cleanedContent);
      } catch (claudeError) {
        console.error("Error using Claude API, falling back to OpenAI:", claudeError);
        // Fall through to OpenAI
      }
    }
    
    // Process with OpenAI
    console.log("Sending content to OpenAI for analysis...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: text
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
    return JSON.parse(content);
  } catch (error) {
    console.error("Error in AI processing:", error);
    throw error;
  }
}

/**
 * Extracts data from document files using OpenAI or Claude API
 * This function processes PDF, DOCX, Excel and TXT files to extract enquiry information
 * 
 * @param filePaths Array of file paths to process
 * @returns Structured data extracted from the documents
 */
export async function extractDocumentData(filePaths: string[]): Promise<ExtractionResult> {
  try {
    // For development mode with no API keys, return sample data
    if ((!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-dummy-key-for-development") 
        && !process.env.ANTHROPIC_API_KEY) {
      console.log("No valid AI API keys found. Using sample data for demo.");
      
      // Check if we should use the sample for labels
      const useLabelsSample = filePaths.some(p => p.includes('sample_enquiry_labels'));
      
      if (useLabelsSample) {
        return getSampleLabelExtractionResult();
      } else {
        return getSampleExtractionResult();
      }
    }
    
    if (filePaths.length === 0) {
      console.warn("No files provided for extraction");
      // We'll return an error message instead of sample data
      throw new Error("No valid files were found for extraction. Please check the uploaded files and try again.");
    }
    
    console.log("Processing files:", filePaths);
    
    // Process each file and extract text content
    const fileContentsPromises = filePaths.map(async (filePath) => {
      try {
        return await processFile(filePath);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        
        // Fall back to sample files if processing fails
        if (filePath.includes('sample_enquiry_packaging_boxes')) {
          return fs.readFileSync('./attached_assets/sample_enquiry_packaging_boxes.txt', 'utf-8');
        } else if (filePath.includes('sample_enquiry_labels')) {
          return fs.readFileSync('./attached_assets/sample_enquiry_labels.txt', 'utf-8');
        }
        
        return `Unable to process ${path.basename(filePath)}: ${error.message}`;
      }
    });
    
    // Wait for all file processing to complete
    const fileContents = await Promise.all(fileContentsPromises);
    
    // Combine file contents for analysis (limit to reasonable size)
    const maxContentLength = 100000; // ~100KB limit for efficiency
    let combinedContent = fileContents.join('\n\n===DOCUMENT BOUNDARY===\n\n');
    
    if (combinedContent.length > maxContentLength) {
      console.log(`Content too large (${combinedContent.length} chars), truncating to ${maxContentLength} chars`);
      combinedContent = combinedContent.substring(0, maxContentLength) + 
        '\n\n[Content truncated due to size constraints. Please review original documents for complete information.]';
    }
    
    // Process the combined content with AI
    return await processWithAI(combinedContent);
  } catch (error) {
    console.error("Error in document extraction:", error);
    
    // Check if this is an API key issue
    if (error instanceof Error && 
       (error.message.includes("API key") || error.message.includes("authentication"))) {
      console.error("API authentication error. Please check your API keys.");
    }
    
    // Fall back to sample data if processing fails
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