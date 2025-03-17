import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
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
import { FileText, ArrowLeft, Tag, Users, Printer, Download } from "lucide-react";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { z } from "zod";

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

  // Fetch spec sheet data
  const { data, isLoading, error } = useQuery<{ specSheet: SpecSheet }>({
    queryKey: ['/api/spec-sheets', parseInt(id)],
    enabled: !!id,
  });

  const specSheet = data?.specSheet;
  
  // Parse the content if it's a string
  let content = null;
  try {
    if (specSheet?.content) {
      if (typeof specSheet.content === 'string') {
        content = JSON.parse(specSheet.content);
      } else {
        content = specSheet.content;
      }
      
      // Ensure content structure is valid by using safe access methods
      if (content && !content.enquiry) {
        console.error("Missing enquiry data in spec sheet content");
        content = { ...content, enquiry: {} };
      }
      
      if (content && !content.specifications) {
        console.error("Missing specifications in spec sheet content");
        content = { ...content, specifications: [] };
      }
    }
  } catch (error) {
    console.error("Error parsing spec sheet content:", error);
  }

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

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Specification Sheet</h2>
        <p className="text-red-700">
          {error ? error.message : "Specification sheet not found. It may have been deleted or the ID is invalid."}
        </p>
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
            {enquiryCode} • {customerName} • Generated {specSheet?.generatedAt 
              ? format(new Date(specSheet.generatedAt), 'PPp')
              : 'Unknown date'}
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
                    {safeGetContentValue(content, 'enquiry.dateReceived') 
                      ? format(new Date(safeGetContentValue(content, 'enquiry.dateReceived')), 'PPP')
                      : 'N/A'}
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
                    {specSheet?.generatedAt 
                      ? format(new Date(specSheet.generatedAt), 'PPp')
                      : 'Unknown date'}
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