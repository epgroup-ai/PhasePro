import { useState } from "react";
import { SpecSheet, Enquiry, ProductSpecification, SpecSheetContent } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Printer, Download } from "lucide-react";

interface SpecSheetViewerProps {
  specSheets: SpecSheet[];
}

export default function SpecSheetViewer({ specSheets }: SpecSheetViewerProps) {
  const [open, setOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<(SpecSheet & { content: SpecSheetContent }) | null>(null);

  // Sort spec sheets by generation date (newest first)
  const sortedSheets = [...specSheets].sort((a, b) => {
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  });

  // Format date for display
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`;
  };

  // Helper function to map spec sheets to properly typed objects
  const mapSpecSheet = (sheet: SpecSheet): SpecSheet & { content: SpecSheetContent } => {
    return {
      ...sheet,
      content: sheet.content as unknown as SpecSheetContent
    };
  };
  
  // We'll use this function to safely check content in the UI
  const safeGetContentValue = (obj: any, path: string, defaultValue: any = null): any => {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
  };
  
  const handleViewSpecSheet = (sheet: SpecSheet) => {
    setSelectedSheet(mapSpecSheet(sheet));
    setOpen(true);
  };

  const handlePrintSpecSheet = () => {
    window.print();
  };

  if (specSheets.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">No spec sheets generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Available Spec Sheets</h3>
      
      <div className="space-y-2">
        {sortedSheets.map((sheet) => (
          <div 
            key={sheet.id} 
            className="p-2 border rounded flex items-center justify-between hover:bg-gray-50"
          >
            <div>
              <div className="font-medium">Spec Sheet v{sheet.version}</div>
              <div className="text-xs text-gray-500">
                Generated {formatDate(sheet.generatedAt)}
                {sheet.generatedBy && ` by ${sheet.generatedBy}`}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleViewSpecSheet(sheet)}
            >
              <FileText className="h-4 w-4 mr-2" />
              View
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Specification Sheet</DialogTitle>
            <DialogDescription>
              Generated on {selectedSheet && formatDate(selectedSheet.generatedAt)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSheet && (
            <div className="space-y-6">
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrintSpecSheet}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
              
              <div className="border rounded-md p-6 bg-white" id="spec-sheet-printable">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">Product Specification Sheet</h1>
                  <p className="text-gray-500">Reference: {safeGetContentValue(selectedSheet, 'content.enquiry.enquiryCode', 'N/A')}</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Customer Information</h2>
                    <div className="space-y-1">
                      <p><span className="font-medium">Company:</span> {safeGetContentValue(selectedSheet, 'content.enquiry.customerName', 'N/A')}</p>
                      <p><span className="font-medium">Contact:</span> {safeGetContentValue(selectedSheet, 'content.enquiry.contactPerson', 'N/A')}</p>
                      <p><span className="font-medium">Email:</span> {safeGetContentValue(selectedSheet, 'content.enquiry.contactEmail', 'N/A')}</p>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Enquiry Details</h2>
                    <div className="space-y-1">
                      <p><span className="font-medium">Date Received:</span> {formatDate(safeGetContentValue(selectedSheet, 'content.enquiry.dateReceived', new Date()))}</p>
                      <p><span className="font-medium">Deadline:</span> {
                        safeGetContentValue(selectedSheet, 'content.enquiry.deadline') 
                          ? formatDate(safeGetContentValue(selectedSheet, 'content.enquiry.deadline')) 
                          : "Not specified"
                      }</p>
                      <p><span className="font-medium">Status:</span> {safeGetContentValue(selectedSheet, 'content.enquiry.status', 'Unknown')}</p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-4">Product Specifications</h2>
                  
                  <ScrollArea className="max-h-[400px]">
                    {safeGetContentValue(selectedSheet, 'content.specifications', []).map((spec: ProductSpecification, index: number) => (
                      <div key={index} className="mb-6 border-b pb-6 last:border-b-0">
                        <h3 className="font-medium text-lg">{spec.productType || 'Unknown Product Type'}</h3>
                        <div className="grid md:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                          <div>
                            <span className="text-sm text-gray-500">Dimensions</span>
                            <p>{spec.dimensions || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Material</span>
                            <p>{spec.material || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Quantity</span>
                            <p>{spec.quantity || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Print Type</span>
                            <p>{spec.printType || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                
                {(safeGetContentValue(selectedSheet, 'content.enquiry.specialInstructions') || 
                  safeGetContentValue(selectedSheet, 'content.enquiry.deliveryRequirements')) && (
                  <>
                    <Separator className="my-6" />
                    
                    <div className="space-y-4">
                      {safeGetContentValue(selectedSheet, 'content.enquiry.specialInstructions') && (
                        <div>
                          <h2 className="text-lg font-semibold mb-2">Special Instructions</h2>
                          <p className="whitespace-pre-line">
                            {safeGetContentValue(selectedSheet, 'content.enquiry.specialInstructions', 'No special instructions provided')}
                          </p>
                        </div>
                      )}
                      
                      {safeGetContentValue(selectedSheet, 'content.enquiry.deliveryRequirements') && (
                        <div>
                          <h2 className="text-lg font-semibold mb-2">Delivery Requirements</h2>
                          <p className="whitespace-pre-line">
                            {safeGetContentValue(selectedSheet, 'content.enquiry.deliveryRequirements', 'No delivery requirements provided')}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <div className="text-center text-xs text-gray-500 mt-8">
                  Generated by AI-Integrated Enquiry System • {formatDate(selectedSheet.generatedAt)}
                  <div>Version {selectedSheet.version}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}