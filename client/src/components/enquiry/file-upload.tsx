import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UploadCloudIcon } from "lucide-react";
import { UploadedFile } from "@/pages/new-enquiry";

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
        description: `Successfully uploaded ${valid.length} files.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors cursor-pointer ${
        isDragging ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:border-primary-500"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-upload")?.click()}
    >
      <div className="space-y-1 text-center">
        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="flex text-sm text-gray-600">
          <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
            <span>{isUploading ? "Uploading..." : "Upload files"}</span>
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
    </div>
  );
}
