import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "@/components/enquiry/file-upload";
import UploadedFiles from "@/components/enquiry/uploaded-files";
import ProcessingResults from "@/components/enquiry/processing-results";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export type UploadedFile = {
  id: number;
  filename: string;
  contentType: string;
  size: number;
  path?: string;
};

export default function NewEnquiry() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const { toast } = useToast();

  const processFilesMutation = useMutation({
    mutationFn: async ({ fileIds, sampleDocType }: { fileIds: number[], sampleDocType?: string }) => {
      const response = await apiRequest("POST", "/api/process", { fileIds, sampleDocType });
      return response.json();
    },
    onSuccess: (data) => {
      setProcessingResult(data);
      setIsProcessing(false);
      toast({
        title: "Files processed successfully!",
        description: "AI extraction complete. Please review the results.",
        variant: "default",
      });
    },
    onError: (error) => {
      setIsProcessing(false);
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process files. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (id: number) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleProcessFiles = () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files to process",
        description: "Please upload at least one file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Check if we're using sample documents
    if (uploadedFiles.length === 1) {
      const file = uploadedFiles[0];
      if (file.filename.includes('sample_enquiry_packaging_boxes')) {
        processFilesMutation.mutate({ fileIds: [], sampleDocType: 'packaging' });
        return;
      } else if (file.filename.includes('sample_enquiry_labels')) {
        processFilesMutation.mutate({ fileIds: [], sampleDocType: 'labels' });
        return;
      }
    }
    
    // Otherwise use regular file processing
    processFilesMutation.mutate({ fileIds: uploadedFiles.map((file) => file.id) });
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Process New Enquiry</h1>
      
      {!processingResult && (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Process New Enquiry</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Upload customer enquiry documents to extract specifications.</p>
            </div>
            <div>
              <div className="relative inline-block">
                <button type="button" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Help
                </button>
              </div>
            </div>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <div className="max-w-lg mx-auto">
              <FileUpload onFilesUploaded={handleFilesUploaded} />
              
              {uploadedFiles.length > 0 && (
                <UploadedFiles files={uploadedFiles} onRemoveFile={handleRemoveFile} />
              )}

              <div className="mt-6 mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Demo with sample documents:</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsProcessing(true);
                      processFilesMutation.mutate({ fileIds: [], sampleDocType: 'packaging' });
                    }}
                  >
                    Process Packaging Enquiry Demo
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsProcessing(true);
                      processFilesMutation.mutate({ fileIds: [], sampleDocType: 'labels' });
                    }}
                  >
                    Process Labels Enquiry Demo
                  </Button>
                </div>
                <div className="text-xs text-gray-500 italic mb-3">
                  Click on the buttons above for a one-click demo, or load sample files below:
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="ghost" size="sm"
                    onClick={() => {
                      const sampleFile = {
                        id: 999,
                        filename: "sample_enquiry_packaging_boxes.txt",
                        contentType: "text/plain",
                        size: 2048,
                        path: "./attached_assets/sample_enquiry_packaging_boxes.txt"
                      };
                      setUploadedFiles([sampleFile]);
                      toast({
                        title: "Sample document loaded",
                        description: "Sample packaging enquiry loaded successfully.",
                      });
                    }}
                  >
                    Load Packaging Sample
                  </Button>
                  <Button 
                    variant="ghost" size="sm"
                    onClick={() => {
                      const sampleFile = {
                        id: 998,
                        filename: "sample_enquiry_labels.txt",
                        contentType: "text/plain",
                        size: 2048,
                        path: "./attached_assets/sample_enquiry_labels.txt"
                      };
                      setUploadedFiles([sampleFile]);
                      toast({
                        title: "Sample document loaded",
                        description: "Sample labels enquiry loaded successfully.",
                      });
                    }}
                  >
                    Load Labels Sample
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleProcessFiles}
                  className="inline-flex items-center"
                  disabled={uploadedFiles.length === 0 || isProcessing}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : "Process Files"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {processingResult && (
        <ProcessingResults result={processingResult} />
      )}
    </div>
  );
}
