import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileIcon, FileTextIcon, XIcon } from "lucide-react";
import { UploadedFile } from "@/pages/new-enquiry";

interface UploadedFilesProps {
  files: UploadedFile[];
  onRemoveFile: (id: number) => void;
}

export default function UploadedFiles({ files, onRemoveFile }: UploadedFilesProps) {
  const { toast } = useToast();

  const deleteFileMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/files/${id}`);
      return id;
    },
    onSuccess: (id) => {
      onRemoveFile(id);
      toast({
        title: "File removed",
        description: "The file has been successfully removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing file",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFile = (id: number) => {
    deleteFileMutation.mutate(id);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (contentType: string) => {
    if (contentType === "application/pdf") {
      return <FileIcon className="text-red-500" />;
    } else if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return <FileTextIcon className="text-blue-500" />;
    }
    return <FileIcon className="text-gray-500" />;
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700">Uploaded Files</h4>
      
      <div className="mt-2 space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between py-3 pl-3 pr-4 text-sm border border-gray-200 rounded-md"
          >
            <div className="flex items-center">
              {getFileIcon(file.contentType)}
              <span className="ml-3 truncate">{file.filename}</span>
              <span className="ml-2 text-xs text-gray-500">{formatFileSize(file.size)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => handleRemoveFile(file.id)}
                disabled={deleteFileMutation.isPending}
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
