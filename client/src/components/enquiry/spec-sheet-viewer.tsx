import { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Printer, Download, EyeIcon, BarChart3, FileIcon, ArrowLeftRight, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import wsClient, { CursorPosition, ActiveUser } from "@/lib/websocket-client";

interface SpecSheetViewerProps {
  specSheets: SpecSheet[] | undefined;
  enquiryId?: number;
}

export default function SpecSheetViewer({ specSheets, enquiryId }: SpecSheetViewerProps) {
  console.log("SpecSheetViewer received:", specSheets ? (Array.isArray(specSheets) ? specSheets.length : "non-array") : "undefined", "spec sheets");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const specSheetRef = useRef<HTMLDivElement>(null);

  // WebSocket states
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [cursorPositions, setCursorPositions] = useState<CursorPosition[]>([]);
  const [collaborationEnabled, setCollaborationEnabled] = useState(false);
  
  // Safe content type checking with optional chaining
  if (specSheets && Array.isArray(specSheets) && specSheets.length > 0 && specSheets[0]) {
    console.log("First spec sheet content type:", typeof specSheets[0].content);
    
    // Safe content preview with conditional checks
    const content = specSheets[0].content;
    if (content) {
      console.log("First spec sheet content preview:", 
        typeof content === 'string' 
          ? content.substring(0, 100) 
          : JSON.stringify(content).substring(0, 100));
    }
  }
  
  const [open, setOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<(SpecSheet & { content: SpecSheetContent }) | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSheets, setCompareSheets] = useState<Array<SpecSheet & { content: SpecSheetContent }>>([]);
  const [activeTab, setActiveTab] = useState<string>("preview");
  
  // WebSocket setup and cleanup
  useEffect(() => {
    wsClient.connect();
    
    // Set up event listeners
    const connectionListener = (data: { connected: boolean }) => {
      setConnected(data.connected);
      
      if (data.connected) {
        toast({
          title: "Connected to collaboration server",
          description: "You can now collaborate with others in real-time",
        });
      } else {
        toast({
          title: "Disconnected from server",
          description: "Trying to reconnect...",
          variant: "destructive",
        });
      }
    };
    
    const usersListener = (data: { users: ActiveUser[] }) => {
      setActiveUsers(data.users);
    };
    
    const cursorsListener = (data: CursorPosition[]) => {
      setCursorPositions(data);
    };
    
    // Add event listeners
    const removeConnectionListener = wsClient.addListener("connection", connectionListener);
    const removeUsersListener = wsClient.addListener("users", usersListener);
    const removeCursorsListener = wsClient.addListener("cursorPositions", cursorsListener);
    
    // Setup cursor tracking if collaboration is enabled
    const handleMouseMove = (e: MouseEvent) => {
      if (!collaborationEnabled || !selectedSheet || !user) return;
      
      const container = specSheetRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Only update if position changed significantly (avoid spamming)
      wsClient.updateCursorPosition({
        x,
        y,
        specId: selectedSheet.id,
      });
    };
    
    if (collaborationEnabled && specSheetRef.current) {
      specSheetRef.current.addEventListener("mousemove", handleMouseMove);
    }
    
    // Cleanup function
    return () => {
      removeConnectionListener();
      removeUsersListener();
      removeCursorsListener();
      
      if (collaborationEnabled && specSheetRef.current) {
        specSheetRef.current?.removeEventListener("mousemove", handleMouseMove);
      }
      
      // Leave the spec sheet room if we're in one
      if (selectedSheet) {
        wsClient.leaveSpecSheet(selectedSheet.id);
      }
    };
  }, [collaborationEnabled, selectedSheet, user]);
  
  // Join the collaboration room when a spec sheet is selected
  useEffect(() => {
    if (selectedSheet && user && collaborationEnabled) {
      wsClient.joinSpecSheet(selectedSheet.id, user.id, user.username || user.fullName || `User ${user.id}`);
      
      // Set up the initial connection
      if (!connected) {
        wsClient.connect();
      }
    }
  }, [selectedSheet, user, collaborationEnabled, connected]);

  // Sort spec sheets by generation date (newest first)
  const sortedSheets = specSheets ? [...specSheets].sort((a, b) => {
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  }) : [];

  // Format date for display
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`;
  };

  // Helper function to map spec sheets to properly typed objects
  const mapSpecSheet = (sheet: SpecSheet): SpecSheet & { content: SpecSheetContent } => {
    // Handle both string and object content formats
    let parsedContent: SpecSheetContent;
    
    if (typeof sheet.content === 'string') {
      try {
        parsedContent = JSON.parse(sheet.content) as unknown as SpecSheetContent;
      } catch (error) {
        console.error('Error parsing spec sheet content:', error);
        // Provide empty default content if parsing fails
        parsedContent = {
          enquiry: {} as any,
          specifications: [],
          generatedAt: new Date().toISOString(),
        };
      }
    } else {
      parsedContent = sheet.content as unknown as SpecSheetContent;
    }
    
    console.log('Parsed spec sheet content:', parsedContent);
    
    return {
      ...sheet,
      content: parsedContent
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
    setCompareMode(false);
    setCompareSheets([]);
    setActiveTab("preview");
    setOpen(true);
  };

  const handlePrintSpecSheet = () => {
    window.print();
  };

  const handleExportPDF = () => {
    alert("PDF export functionality will be implemented in the next phase");
  };

  const handleCompareSheet = (sheet: SpecSheet) => {
    const mappedSheet = mapSpecSheet(sheet);
    
    if (compareSheets.length === 0) {
      // First sheet selected for comparison
      setCompareSheets([mappedSheet]);
      setCompareMode(true);
    } else if (compareSheets.length === 1) {
      // Second sheet selected for comparison
      setCompareSheets([...compareSheets, mappedSheet]);
      setSelectedSheet(mappedSheet); // Set selected to the latest one
      setActiveTab("compare");
      setOpen(true);
    } else {
      // Already have 2 sheets, replace the second one
      setCompareSheets([compareSheets[0], mappedSheet]);
      setSelectedSheet(mappedSheet);
      setActiveTab("compare");
      setOpen(true);
    }
  };

  const handleViewTableFormat = (sheet: SpecSheet) => {
    setSelectedSheet(mapSpecSheet(sheet));
    setCompareMode(false);
    setCompareSheets([]);
    setActiveTab("table");
    setOpen(true);
  };

  const getAiConfidenceColor = (confidence: number | null | undefined) => {
    if (!confidence) return "bg-gray-100 text-gray-800";
    if (confidence >= 90) return "bg-green-100 text-green-800";
    if (confidence >= 70) return "bg-blue-100 text-blue-800";
    return "bg-yellow-100 text-yellow-800";
  };

  if (!specSheets || specSheets.length === 0) {
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
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleViewSpecSheet(sheet)}
                title="View Sheet"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleViewTableFormat(sheet)}
                title="Table View"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button 
                variant={compareSheets.some(s => s.id === sheet.id) ? "secondary" : "ghost"}
                size="sm" 
                onClick={() => handleCompareSheet(sheet)}
                title={compareSheets.length > 0 ? "Compare with selected sheet" : "Select for comparison"}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {compareSheets.length === 1 && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="flex items-center">
              <ArrowLeftRight className="h-4 w-4 mr-2 text-blue-500" />
              Sheet selected for comparison. Select another sheet to compare.
            </p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {compareMode ? "Compare Specification Sheets" : "Specification Sheet"}
            </DialogTitle>
            <DialogDescription>
              {selectedSheet && formatDate(selectedSheet.generatedAt)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSheet && (
            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <Tabs 
                    defaultValue={activeTab} 
                    className="w-full" 
                    onValueChange={setActiveTab}
                  >
                    <TabsList>
                      <TabsTrigger value="preview">
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="table">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Table View
                      </TabsTrigger>
                      {compareSheets.length > 1 && (
                        <TabsTrigger value="compare">
                          <ArrowLeftRight className="h-4 w-4 mr-2" />
                          Compare
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant={collaborationEnabled ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setCollaborationEnabled(!collaborationEnabled)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {collaborationEnabled ? "Collaboration On" : "Enable Collaboration"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintSpecSheet}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
                
                {/* Show active collaborators when collaboration is enabled */}
                {collaborationEnabled && activeUsers.length > 0 && (
                  <div className="bg-gray-50 p-2 rounded border">
                    <div className="text-sm font-medium mb-1 flex items-center">
                      <Users className="h-4 w-4 mr-1 text-blue-500" />
                      Active Collaborators
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeUsers.map((user) => (
                        <div 
                          key={user.userId} 
                          className="flex items-center text-xs px-2 py-1 rounded-full" 
                          style={{ backgroundColor: `${user.color}20`, color: user.color }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full mr-1" 
                            style={{ backgroundColor: user.color }}
                          ></div>
                          {user.userName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Tabs defaultValue={activeTab} value={activeTab}>
                <TabsContent value="preview" className="mt-0">
                  <div 
                    ref={specSheetRef}
                    className="border rounded-md p-6 bg-white relative" 
                    id="spec-sheet-printable"
                  >
                    {/* Render other users' cursors */}
                    {collaborationEnabled && cursorPositions.map((cursor) => {
                      if (cursor.userId === user?.id) return null; // Don't show own cursor
                      return (
                        <div 
                          key={cursor.userId}
                          className="absolute pointer-events-none z-10 flex flex-col items-start"
                          style={{ 
                            left: `${cursor.x}px`, 
                            top: `${cursor.y}px`,
                            transition: 'left 0.2s, top 0.2s' 
                          }}
                        >
                          <div
                            className="w-4 h-4 mb-1 transform -translate-x-1/2"
                            style={{
                              borderLeft: `10px solid transparent`,
                              borderRight: `10px solid transparent`,
                              borderBottom: `10px solid ${cursor.color}`,
                            }}
                          />
                          <span 
                            className="text-xs px-2 py-1 rounded whitespace-nowrap"
                            style={{ 
                              backgroundColor: cursor.color, 
                              color: 'white', 
                              transform: 'translateX(-50%)',
                            }}
                          >
                            {cursor.userName}
                          </span>
                        </div>
                      );
                    })}
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
                </TabsContent>
                
                <TabsContent value="table" className="mt-0">
                  <div className="border rounded-md p-6 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Product Specifications Table</h2>
                      <Badge variant="outline">
                        Version {selectedSheet.version}
                      </Badge>
                    </div>
                    
                    <Table>
                      <TableCaption>Generated on {formatDate(selectedSheet.generatedAt)}</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Type</TableHead>
                          <TableHead>Dimensions</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Print Type</TableHead>
                          <TableHead>Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeGetContentValue(selectedSheet, 'content.specifications', []).map((spec: ProductSpecification, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{spec.productType || 'Unknown'}</TableCell>
                            <TableCell>{spec.dimensions || 'N/A'}</TableCell>
                            <TableCell>{spec.material || 'N/A'}</TableCell>
                            <TableCell>{spec.quantity || 'N/A'}</TableCell>
                            <TableCell>{spec.printType || 'N/A'}</TableCell>
                            <TableCell>
                              {spec.aiConfidence ? (
                                <Badge className={getAiConfidenceColor(spec.aiConfidence)}>
                                  {spec.aiConfidence}%
                                </Badge>
                              ) : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                {compareSheets.length > 1 && (
                  <TabsContent value="compare" className="mt-0">
                    <div className="border rounded-md p-6 bg-white">
                      <h2 className="text-lg font-semibold mb-4">Specification Comparison</h2>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {compareSheets.map((sheet, index) => (
                          <div key={index} className={`p-4 rounded-md ${index === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className={index === 0 ? 'bg-blue-100' : 'bg-green-100'}>
                                Version {sheet.version}
                              </Badge>
                              <div className="text-xs text-gray-500">
                                {formatDate(sheet.generatedAt)}
                              </div>
                            </div>
                            
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[180px]">Specification</TableHead>
                                  <TableHead>Value</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {safeGetContentValue(sheet, 'content.specifications', []).map((spec: ProductSpecification, specIndex: number) => (
                                  <TableRow key={specIndex}>
                                    <TableCell className="font-medium">Product {specIndex + 1}</TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <div><span className="font-medium">Type:</span> {spec.productType || 'N/A'}</div>
                                        <div><span className="font-medium">Material:</span> {spec.material || 'N/A'}</div>
                                        <div><span className="font-medium">Dimensions:</span> {spec.dimensions || 'N/A'}</div>
                                        <div><span className="font-medium">Quantity:</span> {spec.quantity || 'N/A'}</div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow>
                                  <TableCell className="font-medium">Special Instructions</TableCell>
                                  <TableCell>{safeGetContentValue(sheet, 'content.enquiry.specialInstructions') || 'None'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Delivery Requirements</TableCell>
                                  <TableCell>{safeGetContentValue(sheet, 'content.enquiry.deliveryRequirements') || 'None'}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}