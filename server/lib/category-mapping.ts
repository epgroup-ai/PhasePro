// Category mapping based on the provided CSV data
export interface CategoryManager {
  id: string;
  name: string;
  department: string;
}

export interface CategoryMapping {
  code: string;
  manager: CategoryManager;
  description: string;
}

// Map of category codes to category managers
export const categoryManagers: Record<string, CategoryManager> = {
  'A': { id: 'JH', name: 'Jon', department: 'Retail & Consumables' },
  'B': { id: 'SF', name: 'Sarah & Janice', department: 'Catering' },
  'B1': { id: 'SF', name: 'Sarah & Janice', department: 'Catering' },
  'C': { id: 'JM', name: 'Josie', department: 'E commerce & Resale Bags' },
  'D': { id: 'CD', name: 'Carol', department: 'Plastic Bags' },
  'E': { id: 'AN', name: 'Alina', department: 'Paper Bags' },
};

// Map of product SKU prefixes to category codes
export const categoryMappings: Record<string, CategoryMapping> = {
  'BAGPAPER': { code: 'E', manager: categoryManagers['E'], description: 'Paper Bags' },
  'PAPER': { code: 'E', manager: categoryManagers['E'], description: 'Paper Products' },
  'BAGPLAST': { code: 'D', manager: categoryManagers['D'], description: 'Plastic Bags' },
  'BAGRESALE': { code: 'C', manager: categoryManagers['C'], description: 'Resale Bags' },
  'BOPP': { code: 'D', manager: categoryManagers['D'], description: 'BOPP Products' },
  'CARRIERS': { code: 'D', manager: categoryManagers['D'], description: 'Carrier Bags' },
  'REFUSESAC': { code: 'D', manager: categoryManagers['D'], description: 'Refuse Sacks' },
  'STRETCH': { code: 'C', manager: categoryManagers['C'], description: 'Stretch Film' },
  'VESTCARRI': { code: 'D', manager: categoryManagers['D'], description: 'Vest Carriers' },
  'CHEMICAL': { code: 'A', manager: categoryManagers['A'], description: 'Chemicals' },
  'CORRUGATE': { code: 'C', manager: categoryManagers['C'], description: 'Corrugate Cartons' },
  'COSMETIC': { code: 'C', manager: categoryManagers['C'], description: 'Cosmetics' },
  'EQUIPMENT': { code: 'A', manager: categoryManagers['A'], description: 'Equipment' },
  'FIRSTAID': { code: 'A', manager: categoryManagers['A'], description: 'First Aid' },
  'FURNITUR': { code: 'A', manager: categoryManagers['A'], description: 'Furniture' },
  'GLOVES': { code: 'A', manager: categoryManagers['A'], description: 'Gloves' },
  'HANGERS': { code: 'A', manager: categoryManagers['A'], description: 'Hangers' },
  'HYGIENEPA': { code: 'A', manager: categoryManagers['A'], description: 'Hygiene Products' },
  'JANITOR': { code: 'A', manager: categoryManagers['A'], description: 'Janitorial Supplies' },
  'LABELS': { code: 'A', manager: categoryManagers['A'], description: 'Labels' },
  'M&S ACRYL': { code: 'A', manager: categoryManagers['A'], description: 'M&S Acrylic' },
  'M&S EQUIP': { code: 'A', manager: categoryManagers['A'], description: 'M&S Equipment' },
  'M&S PUBLI': { code: 'A', manager: categoryManagers['A'], description: 'M&S Publications' },
  'PACKAGING': { code: 'C', manager: categoryManagers['C'], description: 'Packaging' },
  'POS': { code: 'A', manager: categoryManagers['A'], description: 'Point of Sale' },
  'PRINT': { code: 'A', manager: categoryManagers['A'], description: 'Print' },
  'SEASDECO': { code: 'A', manager: categoryManagers['A'], description: 'Seasonal Decorations' },
  'SECURITY': { code: 'A', manager: categoryManagers['A'], description: 'Security' },
  'SHOPBSKT': { code: 'A', manager: categoryManagers['A'], description: 'Shopping Baskets' },
  'SIGNS': { code: 'C', manager: categoryManagers['C'], description: 'Signs' },
  'SIZEMARK': { code: 'A', manager: categoryManagers['A'], description: 'Size Markers' },
  'STATIONER': { code: 'C', manager: categoryManagers['C'], description: 'Stationery' },
  'TAPE': { code: 'C', manager: categoryManagers['C'], description: 'Tape' },
  'TILLROLL': { code: 'A', manager: categoryManagers['A'], description: 'Till Rolls' },
  'TWINE': { code: 'C', manager: categoryManagers['C'], description: 'Twine' },
  'VENDING': { code: 'C', manager: categoryManagers['C'], description: 'Vending' },
  'WORKWEAR': { code: 'A', manager: categoryManagers['A'], description: 'Workwear' },
  'CATELGHT': { code: 'B1', manager: categoryManagers['B1'], description: 'Catering - Light' },
  'CATERDISP': { code: 'B', manager: categoryManagers['B'], description: 'Catering Disposables' },
  'CATEREQUI': { code: 'B1', manager: categoryManagers['B1'], description: 'Catering Equipment' },
  'CHOPBORD': { code: 'B1', manager: categoryManagers['B1'], description: 'Chopping Boards' },
  'COOKWARE': { code: 'B1', manager: categoryManagers['B1'], description: 'Cookware' },
  'FOIL': { code: 'B', manager: categoryManagers['B'], description: 'Foil Products' },
  'FOODPACK': { code: 'A', manager: categoryManagers['A'], description: 'Food Packaging Paper' },
  'FOODWRAP': { code: 'C', manager: categoryManagers['C'], description: 'Food Wrap' },
  'GASTNORM': { code: 'B1', manager: categoryManagers['B1'], description: 'Gastronorm' },
  'GLASWARE': { code: 'B1', manager: categoryManagers['B1'], description: 'Glassware' },
  'KITCWARE': { code: 'B1', manager: categoryManagers['B1'], description: 'Kitchenware' },
  'RESTSUND': { code: 'B1', manager: categoryManagers['B1'], description: 'Restaurant Sundries' },
  'TABLEWARE': { code: 'B', manager: categoryManagers['B'], description: 'Tableware' },
};

/**
 * Determine the category manager for a given product code or description
 * 
 * @param productCode The product code or SKU
 * @param description Optional description to help with categorization
 * @returns The mapped category manager or undefined if no match
 */
export function getCategoryManager(productCode: string, description?: string): CategoryManager | undefined {
  // Check if we have a direct mapping for this product code prefix
  for (const prefix in categoryMappings) {
    if (productCode.toUpperCase().startsWith(prefix)) {
      return categoryMappings[prefix].manager;
    }
  }

  // If we have a description, try to match against keywords
  if (description) {
    const upperDescription = description.toUpperCase();
    
    // Paper products keywords (Alina - E)
    if (upperDescription.includes('PAPER') || upperDescription.includes('KRAFT') || 
        upperDescription.includes('CARDBOARD') || 
        (upperDescription.includes('BAG') && !upperDescription.includes('PLASTIC'))) {
      console.log(`Assigning to Paper Bags (E): ${upperDescription}`);
      return categoryManagers['E'];
    }
    
    // Plastic products keywords (Carol - D)
    if (upperDescription.includes('PLASTIC') || upperDescription.includes('POLY') || 
        upperDescription.includes('CARRIER') || upperDescription.includes('VEST') ||
        (upperDescription.includes('BAG') && upperDescription.includes('PLASTIC'))) {
      console.log(`Assigning to Plastic Bags (D): ${upperDescription}`);
      return categoryManagers['D'];
    }
    
    // Catering keywords (Sarah & Janice - B)
    if (upperDescription.includes('CATERING') || upperDescription.includes('CUP') || 
        upperDescription.includes('PLATE') || upperDescription.includes('CUTLERY') ||
        upperDescription.includes('STRAW') || upperDescription.includes('FOOD CONTAINER') ||
        (upperDescription.includes('BOX') && 
         (upperDescription.includes('FOOD') || upperDescription.includes('PIZZA') || 
          upperDescription.includes('MEAL') || upperDescription.includes('CAKE'))) ||
        upperDescription.includes('FOIL')) {
      console.log(`Assigning to Catering (B): ${upperDescription}`);
      return categoryManagers['B'];
    }
    
    // Retail keywords (Jon - A)
    if (upperDescription.includes('RETAIL') || upperDescription.includes('POS') || 
        upperDescription.includes('HANGER') || upperDescription.includes('LABEL') ||
        upperDescription.includes('STICKER') || upperDescription.includes('SIGN') || 
        upperDescription.includes('CHEMICAL') || upperDescription.includes('PRINT')) {
      console.log(`Assigning to Retail & Consumables (A): ${upperDescription}`);
      return categoryManagers['A'];
    }
    
    // E-commerce keywords (Josie - C)
    if (upperDescription.includes('ECOMMERCE') || upperDescription.includes('E-COMMERCE') || 
        upperDescription.includes('RESALE') || upperDescription.includes('STRETCH') ||
        upperDescription.includes('PACKAGING') || upperDescription.includes('STATIONERY') ||
        upperDescription.includes('SHIP') || upperDescription.includes('TAPE') || 
        upperDescription.includes('TRANSIT')) {
      console.log(`Assigning to E-commerce & Resale Bags (C): ${upperDescription}`);
      return categoryManagers['C'];
    }
  }

  // Default to Jon for Retail & Consumables if no match is found
  return categoryManagers['A'];
}