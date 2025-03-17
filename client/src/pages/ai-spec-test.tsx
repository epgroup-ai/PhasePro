import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Upload, Loader2 } from "lucide-react";

export default function AISpecTest() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedEnquiry, setProcessedEnquiry] = useState<any>(null);
  const [specSheet, setSpecSheet] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect to auth page if not authenticated
  if (!isLoadingAuth && !user) {
    return <Redirect to="/auth" />;
  }

  // Function to process a sample enquiry
  const processSampleEnquiry = async (sampleType: string) => {
    try {
      setError(null);
      setIsProcessing(true);
      setProcessedEnquiry(null);
      
      const response = await apiRequest("POST", "/api/process", { 
        fileIds: [], 
        sampleDocType: sampleType 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process enquiry");
      }
      
      const data = await response.json();
      setProcessedEnquiry(data);
      
      toast({
        title: "Enquiry Processed",
        description: `Successfully processed enquiry ${data.enquiry.enquiryCode}`,
      });
    } catch (error) {
      console.error("Error processing enquiry:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to generate a spec sheet from the processed enquiry
  const generateSpecSheet = async () => {
    if (!processedEnquiry || !processedEnquiry.enquiry) {
      setError("No processed enquiry available. Please process an enquiry first.");
      return;
    }
    
    try {
      setError(null);
      setIsGenerating(true);
      setSpecSheet(null);
      
      const response = await apiRequest(
        "POST", 
        `/api/enquiries/${processedEnquiry.enquiry.id}/generate-spec-sheet`,
        { generatedBy: "user" }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate spec sheet");
      }
      
      const data = await response.json();
      setSpecSheet(data);
      
      toast({
        title: "Spec Sheet Generated",
        description: `Successfully generated spec sheet (version ${data.version})`,
      });
    } catch (error) {
      console.error("Error generating spec sheet:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to view the generated spec sheet
  const viewSpecSheet = () => {
    if (specSheet && specSheet.id) {
      setLocation(`/spec-sheet/${specSheet.id}`);
    } else {
      setError("No spec sheet available to view");
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <LoadingAnimation variant="default" size="lg" text="Verifying authentication..." />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AI Spec Sheet Test</h1>
        <Button variant="outline" onClick={() => setLocation("/")}>
          Return to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Process Enquiry Card */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Process Sample Enquiry</CardTitle>
            <CardDescription>
              Process a sample enquiry document using AI to extract data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="w-full" 
                  onClick={() => processSampleEnquiry("packaging")}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Process Packaging Sample
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => processSampleEnquiry("labels")}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Process Labels Sample
                    </>
                  )}
                </Button>
              </div>

              {processedEnquiry && (
                <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
                  <h3 className="font-medium text-green-800">Enquiry Processed Successfully</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Enquiry Code: {processedEnquiry.enquiry.enquiryCode}
                  </p>
                  <p className="text-sm text-green-700">
                    Customer: {processedEnquiry.enquiry.customerName}
                  </p>
                  <p className="text-sm text-green-700">
                    Specifications: {processedEnquiry.specifications?.length || 0} products
                  </p>
                  <p className="text-sm text-green-700">
                    AI Confidence: {processedEnquiry.enquiry.aiConfidence}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Generate Spec Sheet Card */}
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Generate Spec Sheet</CardTitle>
            <CardDescription>
              Generate a specification sheet from the processed enquiry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                className="w-full" 
                onClick={generateSpecSheet}
                disabled={isGenerating || !processedEnquiry}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Spec Sheet
                  </>
                )}
              </Button>

              {specSheet && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <h3 className="font-medium text-blue-800">Spec Sheet Generated Successfully</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Spec Sheet ID: {specSheet.id}
                  </p>
                  <p className="text-sm text-blue-700">
                    Version: {specSheet.version}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200"
                    onClick={viewSpecSheet}
                  >
                    <FileText className="mr-2 h-3 w-3" />
                    View Spec Sheet
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 rounded-md border border-red-200">
          <h3 className="font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}