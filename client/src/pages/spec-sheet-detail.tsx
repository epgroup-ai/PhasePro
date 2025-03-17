import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Redirect } from "wouter";
import { SpecSheet, categoryManagerSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowLeft, Tag, Users, Printer, Download, AlertTriangle } from "lucide-react";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";

// Safely get nested values from an object
function safeGetContentValue(obj: any, path: string, defaultValue: any = null) {
  try {
    const value = path.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), obj);
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

export default function SpecSheetDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading: isLoadingAuth } = useAuth();

  // Redirect to auth page if not authenticated
  if (!isLoadingAuth && !user) {
    return <Redirect to="/auth" />;
  }

  // Fetch spec sheet data
  const { data, isLoading, error } = useQuery<{ specSheet: SpecSheet }>({
    queryKey: ['/api/spec-sheets', parseInt(id)],
    enabled: !!id && !!user, // Only fetch when authenticated
  });

  const specSheet = data?.specSheet;
  
  // Parse the content if it's a string
  let content = null;
  let parsingError: Error | string | null = null;
  
  const parseContent = () => {
    try {
      console.log("Spec sheet:", specSheet ? "found" : "not found");
      console.log("Spec sheet ID:", specSheet?.id);
      console.log("Content type:", typeof specSheet?.content);
      
      // If there's no content at all, return default structure
      if (!specSheet?.content) {
        console.warn("No content available in spec sheet");
        parsingError = "No content available in spec sheet";
        return { enquiry: {}, specifications: [], productCategoryAssignments: [] };
      }
      
      // Handle different content types
      let parsedContent;
      if (typeof specSheet.content === 'string') {
        try {
          // Try to parse as JSON string
          console.log("Attempting to parse string content");
          const contentSample = specSheet.content.substring(0, 200);
          console.log("Content sample:", contentSample);
          parsedContent = JSON.parse(specSheet.content);
        } catch (parseErr) {
          console.error("JSON parsing failed:", parseErr);
          // Capture the parsing error
          parsingError = parseErr instanceof Error 
            ? parseErr 
            : new Error("Failed to parse JSON content: " + String(parseErr));
          
          // Return a default structure
          return { 
            enquiry: {}, 
            specifications: [], 
            productCategoryAssignments: [],
            rawContent: specSheet.content.substring(0, 500) // For debugging
          };
        }
      } else {
        // Content is already an object
        console.log("Content is already an object");
        parsedContent = specSheet.content;
      }
      
      // Ensure we have all expected fields with defaults
      const validatedContent = {
        enquiry: parsedContent.enquiry || {},
        specifications: Array.isArray(parsedContent.specifications) 
          ? parsedContent.specifications 
          : [],
        productCategoryAssignments: Array.isArray(parsedContent.productCategoryAssignments)
          ? parsedContent.productCategoryAssignments
          : [],
        categoryManager: parsedContent.categoryManager || null,
        generatedAt: parsedContent.generatedAt || specSheet.generatedAt
      };
      
      // Debug what we've got
      console.log("Content validation completed:");
      console.log("- Enquiry keys:", Object.keys(validatedContent.enquiry));
      console.log("- Specs count:", validatedContent.specifications.length);
      console.log("- Assignments count:", validatedContent.productCategoryAssignments.length);
      console.log("- Has category manager:", !!validatedContent.categoryManager);
      
      return validatedContent;
    } catch (error) {
      console.error("Fatal error in content parsing:", error);
      // Ensure error is of a known type
      parsingError = error instanceof Error 
        ? error 
        : new Error("Unknown error: " + String(error));
      return { enquiry: {}, specifications: [], productCategoryAssignments: [] };
    }
  };
  
  // Execute the parsing
  content = parseContent();

  // Extract product category assignments safely
  const productAssignments = safeGetContentValue(content, 'productCategoryAssignments', []);
  
  // Group products by category manager
  const productsByManager: Record<string, any[]> = {};
  if (Array.isArray(productAssignments)) {
    productAssignments.forEach((assignment) => {
      const managerId = assignment.categoryManager?.id || 'unassigned';
      if (!productsByManager[managerId]) {
        productsByManager[managerId] = [];
      }
      productsByManager[managerId].push(assignment);
    });
  }

  // Get the primary category manager
  const primaryManager = safeGetContentValue(content, 'categoryManager', null);
  
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingAnimation
          variant="default"
          size="lg"
          text="Verifying authentication..."
        />
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingAnimation
          variant="default"
          size="lg"
          text="Loading Specification Sheet"
        />
      </div>
    );
  }

  if (error || !data || parsingError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Specification Sheet</h2>
        
        {error && (
          <p className="text-red-700 mb-2">
            <strong>API Error:</strong> {error.message}
          </p>
        )}
        
        {parsingError && (
          <p className="text-red-700 mb-2">
            <strong>Content Parsing Error:</strong> {
              typeof parsingError === 'object' && parsingError !== null && parsingError instanceof Error
                ? parsingError.message 
                : typeof parsingError === 'string'
                  ? parsingError
                  : JSON.stringify(parsingError)
            }
          </p>
        )}
        
        {!error && !parsingError && !data && (
          <p className="text-red-700 mb-2">
            Specification sheet not found. It may have been deleted or the ID is invalid.
          </p>
        )}
        
        {/* Debug information if needed */}
        {specSheet && (
          <div className="mt-3 p-3 bg-red-100 text-xs font-mono overflow-auto max-h-32 rounded">
            <p className="font-semibold">Debug Information:</p>
            <p>Spec Sheet ID: {specSheet.id}</p>
            <p>Content Type: {typeof specSheet.content}</p>
            <p>Generated At: {specSheet.generatedAt ? new Date(specSheet.generatedAt).toString() : 'N/A'}</p>
            <p>Version: {specSheet.version}</p>
            {typeof specSheet.content === 'string' && (
              <p>Content Sample: {specSheet.content.substring(0, 100)}...</p>
            )}
          </div>
        )}
        
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => setLocation("/processed-enquiries")}
        >
          Return to Enquiries List
        </Button>
      </div>
    );
  }

  // Get the enquiry ID to enable navigation back to the enquiry detail page
  const enquiryId = safeGetContentValue(content, 'enquiry.id');
  const enquiryCode = safeGetContentValue(content, 'enquiry.enquiryCode', 'Unknown');
  const customerName = safeGetContentValue(content, 'enquiry.customerName', 'Unknown');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Specification Sheet</h1>
          <p className="text-gray-500">
            {enquiryCode} • {customerName} • Generated {(() => {
              try {
                if (!specSheet?.generatedAt) return 'Unknown date';
                return format(new Date(specSheet.generatedAt), 'PPp');
              } catch (error) {
                console.error("Error formatting header date:", error, specSheet?.generatedAt);
                return 'Invalid date format';
              }
            })()}
          </p>
        </div>
        <div className="flex space-x-3">
          {enquiryId && (
            <Button
              variant="outline"
              onClick={() => setLocation(`/enquiries/${enquiryId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Enquiry
            </Button>
          )}
          <Button>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Categorization Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Product Categorization
              </CardTitle>
              <CardDescription>
                Products have been categorized by type and assigned to appropriate category managers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(productsByManager).map(([managerId, assignments]) => {
                  const manager = assignments[0]?.categoryManager;
                  if (!manager) return null;
                  
                  return (
                    <div key={managerId} className="border rounded-md p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 mr-2 text-blue-600" />
                          <h3 className="text-lg font-semibold">{manager.name}</h3>
                          <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                            {manager.department}
                          </Badge>
                        </div>
                        <Badge className="bg-gray-100 text-gray-800">
                          {assignments.length} product{assignments.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product Type</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments.map((assignment, index) => {
                            // Find the corresponding specification
                            const specification = Array.isArray(content?.specifications)
                              ? content.specifications.find((spec: any) => spec.id === assignment.specificationId)
                              : null;
                            
                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{assignment.productType}</TableCell>
                                <TableCell>
                                  {specification && (
                                    <div className="text-sm text-gray-600">
                                      {specification.dimensions} • {specification.material} • {specification.quantity} units
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
                
                {Object.keys(productsByManager).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Products Categorized</h3>
                    <p className="text-gray-500 max-w-md">
                      There are no product categorizations available for this specification sheet.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle>Product Specifications</CardTitle>
              <CardDescription>
                {Array.isArray(content?.specifications) ? content.specifications.length : 0} products in this specification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(content?.specifications) && content.specifications.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Type</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Print Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {content.specifications.map((spec: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{spec.productType}</TableCell>
                        <TableCell>{spec.dimensions}</TableCell>
                        <TableCell>{spec.material}</TableCell>
                        <TableCell>{spec.quantity}</TableCell>
                        <TableCell>{spec.printType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No product specifications found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* Primary Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Assignment</CardTitle>
              <CardDescription>
                The main category manager for this enquiry
              </CardDescription>
            </CardHeader>
            <CardContent>
              {primaryManager ? (
                <div className="p-4 border rounded-md bg-blue-50">
                  <div className="flex items-center mb-2">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    <h3 className="text-lg font-semibold">{primaryManager.name}</h3>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {primaryManager.department}
                  </Badge>
                  <p className="mt-3 text-sm text-gray-600">
                    ID: {primaryManager.id}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No primary category manager assigned
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Enquiry Details */}
          <Card>
            <CardHeader>
              <CardTitle>Enquiry Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Customer</dt>
                  <dd className="text-base">{safeGetContentValue(content, 'enquiry.customerName', 'Unknown')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                  <dd className="text-base">{safeGetContentValue(content, 'enquiry.contactPerson', 'N/A')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-base">{safeGetContentValue(content, 'enquiry.contactEmail', 'N/A')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date Received</dt>
                  <dd className="text-base">
                    {(() => {
                      try {
                        const dateValue = safeGetContentValue(content, 'enquiry.dateReceived');
                        if (!dateValue) return 'N/A';
                        return format(new Date(dateValue), 'PPP');
                      } catch (error) {
                        console.error("Error formatting date:", error, safeGetContentValue(content, 'enquiry.dateReceived'));
                        return 'Invalid date format';
                      }
                    })()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Special Instructions</dt>
                  <dd className="text-base">{safeGetContentValue(content, 'enquiry.specialInstructions', 'None')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Delivery Requirements</dt>
                  <dd className="text-base">{safeGetContentValue(content, 'enquiry.deliveryRequirements', 'None')}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          
          {/* Version Info */}
          <Card>
            <CardHeader>
              <CardTitle>Version Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Version</dt>
                  <dd className="text-base">{specSheet?.version || 1}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Generated By</dt>
                  <dd className="text-base">{specSheet?.generatedBy || 'System'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Generated At</dt>
                  <dd className="text-base">
                    {(() => {
                      try {
                        if (!specSheet?.generatedAt) return 'Unknown date';
                        return format(new Date(specSheet.generatedAt), 'PPp');
                      } catch (error) {
                        console.error("Error formatting generatedAt date:", error, specSheet?.generatedAt);
                        return 'Invalid date format';
                      }
                    })()}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}