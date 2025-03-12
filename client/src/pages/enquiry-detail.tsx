import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Enquiry, ProductSpecification, File as EnquiryFile, SpecSheet } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileIcon, Download, CheckCircle, AlertTriangle, FileText, ClipboardCheck } from "lucide-react";
import ProductSpecifications from "@/components/enquiry/product-specifications";
import EnquiryDetails from "@/components/enquiry/enquiry-details";
import AdditionalRequirements from "@/components/enquiry/additional-requirements";
import SpecSheetViewer from "@/components/enquiry/spec-sheet-viewer";

interface EnquiryDetailResponse {
  enquiry: Enquiry;
  specifications: ProductSpecification[];
  files: EnquiryFile[];
  specSheets?: SpecSheet[];
}

export default function EnquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data, isLoading, error } = useQuery<EnquiryDetailResponse>({
    queryKey: ['/api/enquiries', parseInt(id)],
    enabled: !!id,
  });
  
  const queryClient = useQueryClient();
  
  const generateSpecSheetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/enquiries/${id}/generate-spec-sheet`, {
        generatedBy: "user",
      });
      return response.json();
    },
    onSuccess: () => {
      // Refetch the enquiry data to get the new spec sheet
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries', parseInt(id)] });
      
      toast({
        title: "Spec sheet generated",
        description: "The specification sheet has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate spec sheet",
        description: error.message || "An error occurred while generating the spec sheet.",
        variant: "destructive",
      });
    },
  });
  
  const updateEnquiryMutation = useMutation({
    mutationFn: async (data: Partial<Enquiry>) => {
      const response = await apiRequest("PATCH", `/api/enquiries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Enquiry updated",
        description: "Changes saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update enquiry details.",
        variant: "destructive",
      });
    },
  });
  
  const handleUpdateEnquiry = (data: Partial<Enquiry["enquiry"]>) => {
    updateEnquiryMutation.mutate(data as Partial<Enquiry>);
  };
  
  const handleGenerateSpecSheet = () => {
    generateSpecSheetMutation.mutate();
  };
  
  const handleSpecificationUpdate = (updatedSpecs: ProductSpecification[]) => {
    // This would typically update specifications via a separate API call
    console.log("Updating specifications:", updatedSpecs);
  };
  
  const handleAdditionalRequirementsUpdate = (data: {
    specialInstructions?: string;
    deliveryRequirements?: string;
  }) => {
    updateEnquiryMutation.mutate(data);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3"></div>
        <div className="h-40 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-60 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Enquiry</h2>
        <p className="text-red-700">
          {error ? error.message : "Enquiry not found. It may have been deleted or the ID is invalid."}
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
  
  const { enquiry, specifications, files, specSheets = [] } = data;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">{enquiry.enquiryCode}</h1>
          <p className="text-gray-500">
            {enquiry.customerName} • {" "}
            {enquiry.dateReceived && (
              <span>Received {formatDistanceToNow(new Date(enquiry.dateReceived), { addSuffix: true })}</span>
            )}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setLocation("/processed-enquiries")}
          >
            Back to List
          </Button>
          <Button
            onClick={handleGenerateSpecSheet}
            disabled={generateSpecSheetMutation.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            {generateSpecSheetMutation.isPending ? "Generating..." : "Generate Spec Sheet"}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Specifications</CardTitle>
              <CardDescription>
                {specifications.length} product(s) in this enquiry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductSpecifications 
                specifications={specifications} 
                onChange={handleSpecificationUpdate}
                enquiryId={enquiry.id}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Additional Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <AdditionalRequirements
                specialInstructions={enquiry.specialInstructions || ""}
                deliveryRequirements={enquiry.deliveryRequirements || ""}
                onChange={handleAdditionalRequirementsUpdate}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enquiry Details</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className={
                  enquiry.status === 'new' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  enquiry.status === 'processed' ? 'bg-green-100 text-green-800 border-green-300' :
                  enquiry.status === 'completed' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                  ''
                }>
                  {enquiry.status.charAt(0).toUpperCase() + enquiry.status.slice(1)}
                </Badge>
                {enquiry.aiConfidence && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    AI Confidence: {enquiry.aiConfidence}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <EnquiryDetails
                enquiry={{
                  customerName: enquiry.customerName,
                  enquiryCode: enquiry.enquiryCode,
                  contactPerson: enquiry.contactPerson || "",
                  contactEmail: enquiry.contactEmail || "",
                  dateReceived: enquiry.dateReceived ? new Date(enquiry.dateReceived).toISOString().split('T')[0] : "",
                  deadline: enquiry.deadline ? new Date(enquiry.deadline).toISOString().split('T')[0] : "",
                }}
                onChange={handleUpdateEnquiry}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Specification Sheets</CardTitle>
              <CardDescription>
                View and manage generated specification sheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpecSheetViewer specSheets={specSheets} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Attached Files</CardTitle>
              <CardDescription>
                {files.length} file(s) attached to this enquiry
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files.length > 0 ? (
                <ul className="space-y-2">
                  {files.map((file) => (
                    <li key={file.id} className="p-2 border rounded flex items-center justify-between">
                      <div className="flex items-center">
                        <FileIcon className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="text-sm font-medium">{file.filename}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">No files attached</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}