import { CategoryManager } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface CategoryData {
  code: string;
  group: string;
  manager: CategoryManager;
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
      from_line: 2 // Skip header row
    });
    
    const categoryData: CategoryData[] = [];
    
    // Process each row and extract category code and manager
    records.forEach((row: any) => {
      // First column is the product code/SKU prefix
      const code = row[0];
      
      // Ignore empty rows or headers
      if (!code || code.trim() === '' || code === 'Skus' || code === 'A =JH' || code.startsWith(' ')) {
        return;
      }
      
      // Second column is manager category (A, B, C, D, E)
      const managerCode = row[1];
      
      if (managerCode && categoryManagerMap[managerCode]) {
        categoryData.push({
          code: code.trim().toUpperCase(),
          group: managerCode,
          manager: categoryManagerMap[managerCode]
        });
      }
    });
    
    console.log(`Loaded ${categoryData.length} category mappings`);
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
 * @returns The category manager or null if no match
 */
export function getCategoryManagerForProduct(productType: string): CategoryManager | null {
  // Load category data if not already loaded
  if (!categoryData) {
    categoryData = loadCategoryData();
  }
  
  // Convert product type to uppercase for case-insensitive matching
  const normalizedProductType = productType.toUpperCase();
  
  // Look for exact matches first (by code/prefix)
  for (const category of categoryData) {
    if (normalizedProductType.startsWith(category.code)) {
      return category.manager;
    }
  }
  
  // Look for keyword matches in the product type
  const keywords: Record<string, CategoryManager> = {
    'BAG': categoryManagerMap['E'], // Default to paper bags unless plastic specified
    'PAPER': categoryManagerMap['E'],
    'CARDBOARD': categoryManagerMap['E'],
    'PLASTIC BAG': categoryManagerMap['D'],
    'POLY': categoryManagerMap['D'],
    'POLYTHENE': categoryManagerMap['D'],
    'CARRIER': categoryManagerMap['D'],
    'FOOD': categoryManagerMap['B'],
    'CATER': categoryManagerMap['B'],
    'CUTLERY': categoryManagerMap['B'],
    'CUP': categoryManagerMap['B'],
    'PLATE': categoryManagerMap['B'],
    'BOWL': categoryManagerMap['B'],
    'PACKAGING': categoryManagerMap['C'],
    'SHIP': categoryManagerMap['C'],
    'LABEL': categoryManagerMap['A'],
    'PRINT': categoryManagerMap['A'],
    'STICKER': categoryManagerMap['A'],
    'TAPE': categoryManagerMap['C'],
    'DISPENSER': categoryManagerMap['B'],
    'EQUIPMENT': categoryManagerMap['A'],
    'HANGER': categoryManagerMap['A']
  };
  
  for (const [keyword, manager] of Object.entries(keywords)) {
    if (normalizedProductType.includes(keyword)) {
      return manager;
    }
  }
  
  // Default to retail & consumables if no match
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