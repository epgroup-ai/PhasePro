import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';
import { InvoiceProcessingAnimation } from '@/components/ui/loading-animation';
import { useLocation } from 'wouter';

type UploadFormData = {
  invoice: FileList;
};

export default function InvoiceUpload() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<UploadFormData>();

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/invoices/upload", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setProcessingResult(data);
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Invoice processed successfully",
        description: `Invoice #${data.meta.invoiceNumber} has been assigned to ${data.assignedTo?.name || 'Unassigned'}`,
      });
      
      // Navigate to the invoice detail page after a short delay
      setTimeout(() => {
        navigate(`/invoices/${data.id}`);
      }, 2000);
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast({
        title: "Failed to process invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: UploadFormData) => {
    if (!data.invoice || data.invoice.length === 0) {
      toast({
        title: "No file selected",
        description: "Please select an invoice file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('invoice', data.invoice[0]);
    
    setIsProcessing(true);
    uploadMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Upload Invoice</h1>
        <p className="text-muted-foreground">Upload and process supplier invoices for automatic category assignment</p>
      </div>

      {isProcessing ? (
        <div className="max-w-md mx-auto">
          <InvoiceProcessingAnimation />
        </div>
      ) : processingResult ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Invoice Processed Successfully</CardTitle>
            <CardDescription>The invoice has been processed and categorized</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Invoice Details</h3>
                <p className="text-sm">Invoice Number: {processingResult.meta.invoiceNumber}</p>
                <p className="text-sm">Supplier: {processingResult.meta.supplierName}</p>
                <p className="text-sm">Date: {processingResult.meta.invoiceDate}</p>
                <p className="text-sm">Total Amount: {processingResult.meta.totalAmount} {processingResult.meta.currency}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Assignment</h3>
                <p className="text-sm">Primary Category: {processingResult.assignedTo?.department || 'Unassigned'}</p>
                <p className="text-sm">Assigned To: {processingResult.assignedTo?.name || 'Unassigned'}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Items</h3>
                <ul className="list-disc list-inside text-sm">
                  {processingResult.items.map((item: any, index: number) => (
                    <li key={index} className="mb-1">
                      {item.sku} - {item.description} ({item.category || 'Uncategorized'})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="mr-2" onClick={() => setProcessingResult(null)}>Upload Another</Button>
            <Button onClick={() => navigate(`/invoices/${processingResult.id}`)}>View Details</Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Upload Invoice</CardTitle>
            <CardDescription>
              Upload an invoice file to automatically extract and categorize items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="upload-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                  onClick={() => document.getElementById('invoice-upload')?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">PDF, DOCX, TXT, JPG, PNG (Max 10MB)</p>
                  <Input 
                    id="invoice-upload"
                    type="file" 
                    {...register('invoice', { required: true })}
                    accept=".pdf,.docx,.txt,.jpg,.jpeg,.png" 
                    className="hidden"
                  />
                </div>
                {errors.invoice && (
                  <p className="text-sm text-red-500">Please select a file</p>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              form="upload-form" 
              disabled={uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Process Invoice
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}