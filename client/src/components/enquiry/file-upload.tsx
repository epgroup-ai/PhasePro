import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UploadCloudIcon, Loader2 } from "lucide-react";
import { UploadedFile } from "@/pages/new-enquiry";
import { LoadingAnimation } from "@/components/ui/loading-animation";

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
}

export default function FileUpload({ onFilesUploaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isUploading) return;

      const { files } = e.dataTransfer;
      if (files.length === 0) return;

      await uploadFiles(Array.from(files));
    },
    [isUploading]
  );

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isUploading || !e.target.files || e.target.files.length === 0) return;

      await uploadFiles(Array.from(e.target.files));
      e.target.value = ""; // Reset file input
    },
    [isUploading]
  );

  const validateFiles = (files: File[]): { valid: File[]; invalid: File[] } => {
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const valid: File[] = [];
    const invalid: File[] = [];

    files.forEach((file) => {
      if (validTypes.includes(file.type) && file.size <= maxSize) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    });

    return { valid, invalid };
  };

  const uploadFiles = async (files: File[]) => {
    const { valid, invalid } = validateFiles(files);

    if (invalid.length > 0) {
      toast({
        title: "Invalid files detected",
        description: `${invalid.length} files were skipped. Only PDF and DOCX files up to 10MB are allowed.`,
        variant: "destructive",
      });

      if (valid.length === 0) return;
    }

    setIsUploading(true);

    // Show uploading toast
    toast({
      title: "Uploading files",
      description: (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading {valid.length} file(s)...</span>
        </div>
      ),
      duration: 3000,
    });

    try {
      const formData = new FormData();
      valid.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const uploadedFiles = await response.json();
      onFilesUploaded(uploadedFiles);

      toast({
        title: "Files uploaded",
        description: (
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Successfully uploaded {valid.length} files.</span>
          </div>
        ),
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: (
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>{error instanceof Error ? error.message : "An error occurred during upload"}</span>
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
        isUploading ? "border-primary-500 bg-primary-50 cursor-wait" : 
        isDragging ? "border-primary-500 bg-primary-50 cursor-pointer" : 
        "border-gray-300 hover:border-primary-500 cursor-pointer"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && document.getElementById("file-upload")?.click()}
    >
      {isUploading ? (
        <div className="space-y-3 text-center py-2">
          <div className="relative mx-auto h-12 w-12">
            <Loader2 className="animate-spin text-primary h-12 w-12" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-700">
                {/* Show progress percentage if available */}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900">Uploading files...</h3>
            <div className="h-1.5 w-36 mx-auto bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-full"></div>
            </div>
            <p className="text-xs text-gray-500">Please wait while we upload your files</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1 text-center">
          <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
              <span>Upload files</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                multiple
                accept=".pdf,.docx,.doc"
                onChange={handleFileInputChange}
                disabled={isUploading}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">PDF, DOCX up to 10MB</p>
        </div>
      )}
    </div>
  );
}
