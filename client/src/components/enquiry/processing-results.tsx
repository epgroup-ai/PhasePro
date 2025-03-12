import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import EnquiryDetails from "./enquiry-details";
import ProductSpecifications from "./product-specifications";
import AdditionalRequirements from "./additional-requirements";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SaveIcon, SendIcon } from "lucide-react";

interface ProcessingResultsProps {
  result: {
    enquiry: any;
    specifications: any[];
    processingTime: string;
    warnings: string[];
  };
}

export default function ProcessingResults({ result }: ProcessingResultsProps) {
  const [enquiry, setEnquiry] = useState(result.enquiry);
  const [specifications, setSpecifications] = useState(result.specifications);
  const { toast } = useToast();

  const generateSpecSheetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST", 
        `/api/enquiries/${enquiry.id}/generate-spec-sheet`,
        { generatedBy: "user" }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Spec Sheet Generated",
        description: `Spec sheet version ${data.version} has been created successfully.`,
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      // Save enquiry updates
      const enquiryResponse = await apiRequest(
        "PATCH", 
        `/api/enquiries/${enquiry.id}`,
        enquiry
      );
      
      // Save specification updates
      await Promise.all(
        specifications.map((spec) =>
          apiRequest("PATCH", `/api/specifications/${spec.id}`, spec)
        )
      );
      
      return enquiryResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft Saved",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleEnquiryChange = (updatedEnquiry: any) => {
    setEnquiry({ ...enquiry, ...updatedEnquiry });
  };

  const handleSpecificationsChange = (updatedSpecs: any[]) => {
    setSpecifications(updatedSpecs);
  };

  const handleSaveDraft = () => {
    saveDraftMutation.mutate();
  };

  const handleGenerateSpecSheet = () => {
    generateSpecSheetMutation.mutate();
  };

  return (
    <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Extracted Specifications</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Review and edit the AI-extracted information below.
          {result.processingTime && (
            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
              Processed in {result.processingTime}
            </span>
          )}
        </p>
        
        {result.warnings && result.warnings.length > 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800 mb-1">Warnings</h4>
            <ul className="text-xs text-yellow-700 list-disc list-inside">
              {result.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        <EnquiryDetails enquiry={enquiry} onChange={handleEnquiryChange} />
        
        <ProductSpecifications 
          specifications={specifications} 
          onChange={handleSpecificationsChange}
          enquiryId={enquiry.id}
        />
        
        <AdditionalRequirements 
          specialInstructions={enquiry.specialInstructions}
          deliveryRequirements={enquiry.deliveryRequirements}
          onChange={handleEnquiryChange}
        />
        
        <div className="mt-8 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saveDraftMutation.isPending}
            className="inline-flex items-center"
          >
            <SaveIcon className="h-4 w-4 mr-2" />
            {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            onClick={handleGenerateSpecSheet}
            disabled={generateSpecSheetMutation.isPending}
            className="inline-flex items-center"
          >
            <SendIcon className="h-4 w-4 mr-2" />
            {generateSpecSheetMutation.isPending ? "Generating..." : "Generate Spec Sheet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
