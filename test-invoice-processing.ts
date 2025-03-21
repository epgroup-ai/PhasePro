import { parseInvoiceDocument, type ParsedInvoice } from './server/lib/invoice-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Create a timeout promise
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Invoice processing timed out after 30 seconds')), 30000)
  );
  
  try {
    // Path to the test invoice file
    const filePath = path.join(__dirname, 'test-files', 'sample-invoice.txt');
    console.log(`Processing invoice file: ${filePath}`);
    
    // Parse the invoice with timeout
    const result = await Promise.race<ParsedInvoice>([
      parseInvoiceDocument(filePath),
      timeout
    ]);
    
    // Display the results
    console.log('Parsed invoice:');
    console.log(JSON.stringify(result, null, 2));
    
    // Show category assignments
    console.log('\nCategory assignments:');
    result.items.forEach(item => {
      console.log(`Item: ${item.sku} - ${item.description}`);
      console.log(`  Category: ${item.category || 'Unassigned'}`);
      console.log(`  Manager: ${item.categoryManager ? `${item.categoryManager.name} (${item.categoryManager.department})` : 'None'}`);
    });
    
    console.log('\nInvoice assigned to:', result.assignedTo ? 
      `${result.assignedTo.name} (${result.assignedTo.department})` : 'Nobody');
    
  } catch (error) {
    console.error('Error testing invoice processing:', error);
  } finally {
    process.exit(0); // Ensure the process exits
  }
}

main();