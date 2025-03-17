import { CategoryManager } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface CategoryData {
  code: string;
  group: string;
  manager: CategoryManager;
  description?: string;
}

// Map of category managers by their ID
const categoryManagerMap: Record<string, CategoryManager> = {
  'A': {
    id: 'JH',
    name: 'Jon',
    department: 'Retail & Consumables'
  },
  'B': {
    id: 'SF',
    name: 'Sarah & Janice',
    department: 'Catering'
  },
  'B1': {
    id: 'SF',
    name: 'Sarah & Janice',
    department: 'Catering'
  },
  'C': {
    id: 'JM',
    name: 'Josie',
    department: 'E commerce & Resale Bags'
  },
  'D': {
    id: 'CAROL',
    name: 'Carol',
    department: 'Plastic Bags'
  },
  'E': {
    id: 'AN',
    name: 'Alina',
    department: 'Paper Bags'
  }
};

// Load and parse the category data from CSV
function loadCategoryData(): CategoryData[] {
  try {
    const csvFilePath = path.join(process.cwd(), 'attached_assets', 'Category Breakdown by CM.csv');
    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
    
    // Parse CSV
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      from_line: 6 // Skip header rows and start from the actual data
    });
    
    const categoryData: CategoryData[] = [];
    
    // Process each row and extract category code and manager
    records.forEach((row: any) => {
      // First column is the product code/SKU prefix
      const code = row[0];
      
      // Ignore empty rows or header/footer rows
      if (!code || 
          code.trim() === '' || 
          code === 'Skus' || 
          code === 'New Total' ||
          code === 'Current' ||
          code === 'A =JH' || 
          code === ' ' ||
          code.startsWith('Paper Factory') ||
          code.startsWith('Retail paper') ||
          code.startsWith('Cups') ||
          code.startsWith('Cutlery') ||
          code.startsWith('Straws') ||
          code.startsWith('Wooden') ||
          code.startsWith('FBB Incl') ||
          code.startsWith('Miscellaneous') ||
          code.startsWith('A =')) {
        return;
      }
      
      // Second column is manager category (A, B, C, D, E)
      const managerCode = row[1];
      
      // Skip if no manager code or not a valid category
      if (!managerCode || !categoryManagerMap[managerCode]) {
        return;
      }
      
      // Add the category mapping
      categoryData.push({
        code: code.trim().toUpperCase(),
        group: managerCode,
        manager: categoryManagerMap[managerCode],
        // Include description from column 2 or 3 if available
        description: row[2] ? row[2].trim() : (row[3] ? row[3].trim() : '')
      });
    });
    
    // Also add keyword-based mappings for special cases
    const keywordMappings = [
      { code: 'PAPER BAG', group: 'E', manager: categoryManagerMap['E'], description: 'Paper Bags' },
      { code: 'KRAFT BAG', group: 'E', manager: categoryManagerMap['E'], description: 'Kraft Paper Bags' },
      { code: 'CARD BOX', group: 'E', manager: categoryManagerMap['E'], description: 'Cardboard Boxes' },
      { code: 'PLASTIC BAG', group: 'D', manager: categoryManagerMap['D'], description: 'Plastic Bags' },
      { code: 'POLY BAG', group: 'D', manager: categoryManagerMap['D'], description: 'Polythene Bags' },
      { code: 'FOOD CONTAINER', group: 'B', manager: categoryManagerMap['B'], description: 'Food Containers' },
      { code: 'FOOD BOX', group: 'B', manager: categoryManagerMap['B'], description: 'Food Boxes' }
    ];
    
    categoryData.push(...keywordMappings);
    
    console.log(`Loaded ${categoryData.length} category mappings from CSV`);
    return categoryData;
  } catch (error) {
    console.error('Error loading category data:', error);
    // Return an empty array if there's an error
    return [];
  }
}

// Cached category data
let categoryData: CategoryData[] | null = null;

/**
 * Get the category manager for a product based on its type or code
 * 
 * @param productType The product type or description
 * @param additionalDetails Additional product details or description to help with matching
 * @returns The category manager or null if no match
 */
export function getCategoryManagerForProduct(productType: string, additionalDetails?: string): CategoryManager | null {
  // Load category data if not already loaded
  if (!categoryData) {
    categoryData = loadCategoryData();
  }
  
  // Convert product type to uppercase for case-insensitive matching
  const normalizedProductType = productType.toUpperCase();
  const normalizedDetails = additionalDetails ? additionalDetails.toUpperCase() : '';
  
  // Combined text for matching
  const combinedText = `${normalizedProductType} ${normalizedDetails}`;
  
  // Look for exact matches first (by code/prefix)
  for (const category of categoryData) {
    if (normalizedProductType.startsWith(category.code)) {
      console.log(`Found exact category match for "${productType}": ${category.code} -> ${category.manager.name}`);
      return category.manager;
    }
  }
  
  // Special case handling for common categories with extra details
  if (combinedText.includes('PLASTIC') && combinedText.includes('BAG')) {
    console.log(`Found special case match for "${productType}": Plastic bags -> ${categoryManagerMap['D'].name}`);
    return categoryManagerMap['D'];
  }
  
  if ((combinedText.includes('PAPER') || combinedText.includes('KRAFT')) && combinedText.includes('BAG')) {
    console.log(`Found special case match for "${productType}": Paper bags -> ${categoryManagerMap['E'].name}`);
    return categoryManagerMap['E'];
  }
  
  if (combinedText.includes('FOOD') && (combinedText.includes('CONTAINER') || combinedText.includes('PACKAGING'))) {
    console.log(`Found special case match for "${productType}": Food containers -> ${categoryManagerMap['B'].name}`);
    return categoryManagerMap['B'];
  }
  
  // Prioritized keyword groups - order matters for overlapping terms
  const keywordGroups = [
    // Paper Bags (E - Alina)
    {
      keywords: [
        'KRAFT BAG', 'PAPER BAG', 'KRAFT PAPER', 'CARDBOARD BOX', 'PAPER SACK', 
        'PAPER CONTAINER', 'PAPER PACKAGING', 'CARDBOARD PACKAGING', 'PAPER PRODUCT',
        'CORRUGATED BOX', 'MAILER BOX', 'DISPLAY BOX', 'GIFT BOX', 'SHIPPING BOX',
        'KRAFT BOX', 'BOX BOARD'
      ],
      manager: categoryManagerMap['E']
    },
    // Plastic Bags (D - Carol)
    {
      keywords: [
        'PLASTIC BAG', 'POLYTHENE', 'POLY BAG', 'CARRIER BAG', 'VEST CARRIER', 'REFUSE SACK',
        'HDPE BAG', 'LDPE BAG', 'PLASTIC CARRIER', 'POLYPROPYLENE BAG', 'PLASTIC MAILER',
        'PLASTIC FILM', 'PLASTIC PACKAGING', 'POLY MAILER', 'MAILING BAG', 'BIODEGRADABLE BAG'
      ],
      manager: categoryManagerMap['D']
    },
    // Catering (B - Sarah & Janice)
    {
      keywords: [
        'FOOD CONTAINER', 'CUTLERY', 'CUP', 'PLATE', 'BOWL', 'STRAW', 'CATERING', 'TABLEWARE', 'FOIL CONTAINER',
        'PIZZA BOX', 'TOGO BOX', 'TO GO BOX', 'CAKE BOX', 'BREADSTICK BOX', 'DOLCINI BOX', 'BEVERAGE CARRIER',
        'CATERING BOX', 'WHOLE CAKE BOX', 'FLATBREAD TOGO', 'PICNIC', 'TAKEAWAY', 'FOOD PACKAGING',
        'FOOD TRAY', 'MEAL CONTAINER', 'COFFEE CUP', 'DRINK CUP', 'LID', 'NAPKIN', 'SANDWICH BOX',
        'SALAD BOX', 'DESSERT BOX', 'FOOD WRAPPER', 'MENU CARD', 'CHOPSTICK', 'WOODEN CUTLERY',
        'SAUCE POT', 'PORTION POT', 'DELI CONTAINER', 'TAKEOUT CONTAINER', 'CATERING SUPPLIES'
      ],
      manager: categoryManagerMap['B']
    },
    // E-commerce (C - Josie)
    {
      keywords: [
        'PACKAGING', 'SHIPPING', 'E-COMMERCE', 'ECOMMERCE', 'TRANSIT', 'RESALE', 'STATIONERY', 'TAPE',
        'MAILING ENVELOPE', 'SHIPPING SUPPLIES', 'PACKING MATERIALS', 'SHIPPING BOX', 'POSTAL BOX',
        'BUBBLE WRAP', 'VOID FILL', 'SHIPPING LABEL', 'ADDRESS LABEL', 'POSTAL BAG', 'MAILING TUBE',
        'DOCUMENT ENVELOPE', 'POSTAL WRAP', 'COURIER BAG', 'PACKAGING TAPE', 'STRAPPING', 'EDGE PROTECTOR',
        'ONLINE RETAIL', 'FULFILLMENT', 'PROTECTIVE PACKAGING', 'PADDED ENVELOPE', 'JIFFY BAG'
      ],
      manager: categoryManagerMap['C']
    },
    // Retail & Consumables (A - Jon)
    {
      keywords: [
        'LABEL', 'PRINT', 'STICKER', 'RETAIL', 'EQUIPMENT', 'HANGER', 'FIRSTAID', 'HYGIENE', 'TILL ROLL',
        'PRICE TAG', 'BRANDING', 'PROMOTIONAL', 'SIGNAGE', 'MARKETING MATERIAL', 'DISPLAY STAND',
        'POS MATERIAL', 'POINT OF SALE', 'BARCODE LABEL', 'SECURITY TAG', 'SHELF EDGE', 'PRODUCT LABEL',
        'PRINTED MATERIAL', 'BROCHURE', 'FLYER', 'POSTER', 'BANNER', 'WINDOW GRAPHIC', 'RETAIL SUPPLIES',
        'SHOP FITTING', 'RETAIL DISPLAY', 'INFORMATION LABEL', 'WARNING LABEL', 'SAFETY LABEL'
      ],
      manager: categoryManagerMap['A']
    }
  ];
  
  // Check each keyword group
  for (const group of keywordGroups) {
    for (const keyword of group.keywords) {
      if (combinedText.includes(keyword)) {
        console.log(`Found keyword match for "${productType}": ${keyword} -> ${group.manager.name}`);
        return group.manager;
      }
    }
  }
  
  // Check simplistic keyword matches as fallback
  const fallbackKeywords: Record<string, CategoryManager> = {
    'BAG': categoryManagerMap['E'], // Default to paper bags 
    'PAPER': categoryManagerMap['E'],
    'BOARD': categoryManagerMap['E'],
    'PLASTIC': categoryManagerMap['D'],
    'POLY': categoryManagerMap['D'],
    'FOOD': categoryManagerMap['B'],
    'CATER': categoryManagerMap['B'],
    'SHIP': categoryManagerMap['C'],
    'PACK': categoryManagerMap['C'],
    'LABEL': categoryManagerMap['A'],
    'RETAIL': categoryManagerMap['A'],
    'BOX': categoryManagerMap['E'], // Add boxes to paper products by default
    'CAKE': categoryManagerMap['B'], // Add cake boxes to food category
    'TOGO': categoryManagerMap['B'], // Add ToGo boxes to food category
    'BEVERAGE': categoryManagerMap['B'], // Add beverage carriers to food category
    'PIZZA': categoryManagerMap['B']  // Add pizza boxes to food category
  };
  
  for (const [keyword, manager] of Object.entries(fallbackKeywords)) {
    if (combinedText.includes(keyword)) {
      console.log(`Found fallback keyword match for "${productType}": ${keyword} -> ${manager.name}`);
      return manager;
    }
  }
  
  // Default to retail & consumables if no match
  console.log(`No category match found for "${productType}", defaulting to ${categoryManagerMap['A'].name}`);
  return categoryManagerMap['A'];
}

/**
 * Get a list of all category managers
 * @returns Array of category managers
 */
export function getAllCategoryManagers(): CategoryManager[] {
  return Object.values(categoryManagerMap);
}

/**
 * Get a category manager by ID
 * @param id The category manager ID
 * @returns The category manager or null if not found
 */
export function getCategoryManagerById(id: string): CategoryManager | null {
  for (const manager of Object.values(categoryManagerMap)) {
    if (manager.id === id) {
      return manager;
    }
  }
  return null;
}