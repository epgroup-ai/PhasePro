import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDate, formatCurrency } from '@/lib/utils';

// Invoice status badge color mapping
const statusColors: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'processed': 'bg-blue-100 text-blue-800',
  'assigned': 'bg-purple-100 text-purple-800',
  'completed': 'bg-green-100 text-green-800',
};

export default function InvoiceDetail() {
  const [_, setLocation] = useLocation();
  const [match, params] = useRoute('/invoices/:id');
  const invoiceId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  
  // Fetch invoice details
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) throw new Error('Failed to fetch invoice details');
      return res.json();
    },
    enabled: !!invoiceId,
  });

  // Fetch category managers for assignment
  const { data: categoryManagers = [] } = useQuery({
    queryKey: ['/api/category-managers'],
    queryFn: async () => {
      // Normally we'd fetch from API, but using a static list for now
      return [
        { id: 'JH', name: 'Jon', department: 'Retail & Consumables' },
        { id: 'SF', name: 'Sarah & Janice', department: 'Catering' },
        { id: 'JM', name: 'Josie', department: 'E commerce & Resale Bags' },
        { id: 'CD', name: 'Carol', department: 'Plastic Bags' },
        { id: 'AN', name: 'Alina', department: 'Paper Bags' },
      ];
    },
  });

  // Update invoice status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: string }) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, {
        status: data.status,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Status updated",
        description: "The invoice status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign invoice mutation
  const assignInvoiceMutation = useMutation({
    mutationFn: async (data: { managerId: string }) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, {
        assignedTo: data.managerId,
        status: 'assigned',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Invoice assigned",
        description: "The invoice has been assigned successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update invoice item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: number, data: any }) => {
      const response = await apiRequest("PATCH", `/api/invoice-items/${itemId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId] });
      toast({
        title: "Item updated",
        description: "The invoice item has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">Error loading invoice: {(error as Error).message}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => setLocation('/invoices')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              Invoice #{invoice.invoiceNumber}
              <Badge 
                className={`ml-3 ${statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}`}
                variant="outline"
              >
                {invoice.status}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              {invoice.supplierName} • {formatDate(new Date(invoice.invoiceDate))}
            </p>
          </div>
          
          <div className="flex space-x-2">
            {invoice.status === 'pending' && (
              <Button 
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ status: 'processed' })}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Processed
              </Button>
            )}
            
            {invoice.status === 'processed' && (
              <Select
                onValueChange={(value) => assignInvoiceMutation.mutate({ managerId: value })}
                disabled={assignInvoiceMutation.isPending}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  {categoryManagers.map((manager: any) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name} ({manager.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {invoice.status === 'assigned' && (
              <Button 
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ status: 'completed' })}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Completed
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Invoice Details</TabsTrigger>
          <TabsTrigger value="items">Line Items</TabsTrigger>
          <TabsTrigger value="history">Processing History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
                    <dd className="mt-1 text-sm">{invoice.invoiceNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Invoice Date</dt>
                    <dd className="mt-1 text-sm">{formatDate(new Date(invoice.invoiceDate))}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatCurrency(invoice.totalAmount, invoice.currency || 'GBP')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Currency</dt>
                    <dd className="mt-1 text-sm">{invoice.currency || 'GBP'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <Badge 
                        className={`${statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}`}
                        variant="outline"
                      >
                        {invoice.status}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Processing Time</dt>
                    <dd className="mt-1 text-sm">
                      {invoice.processingTime 
                        ? `${(invoice.processingTime / 1000).toFixed(2)} seconds` 
                        : 'Not processed yet'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Supplier & Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Supplier</h3>
                  <p className="text-sm font-medium">{invoice.supplierName}</p>
                  {invoice.supplierContact && (
                    <p className="text-sm text-gray-500">{invoice.supplierContact}</p>
                  )}
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Customer</h3>
                  <p className="text-sm font-medium">{invoice.customerName}</p>
                  {invoice.customerReference && (
                    <p className="text-sm text-gray-500">Ref: {invoice.customerReference}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Assignment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4">
                  <div className="flex-1">
                    <h3 className="font-medium">Primary Category Manager</h3>
                    {invoice.assignedTo ? (
                      <div className="mt-2 flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                          <span className="font-medium text-primary">
                            {invoice.assignedTo.name.split(' ')[0][0]}{invoice.assignedTo.name.split(' ').length > 1 ? invoice.assignedTo.name.split(' ')[1][0] : ''}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{invoice.assignedTo.name}</p>
                          <p className="text-sm text-gray-500">{invoice.assignedTo.department}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Not assigned yet
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium">Assignment Confidence</h3>
                    <div className="mt-2 flex items-center">
                      <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${(invoice.confidence || 0) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round((invoice.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on AI analysis of invoice line items
                    </p>
                  </div>
                </div>
                
                {invoice.assignedTo && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 flex">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Invoice correctly assigned to {invoice.assignedTo.name}
                      </p>
                      <p className="text-xs text-green-700">
                        Based on line item categories and primary department assignment
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU/Product Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, invoice.currency || 'GBP')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.totalPrice, invoice.currency || 'GBP')}
                      </TableCell>
                      <TableCell>
                        {item.category || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {item.categoryManager ? (
                          <Select
                            defaultValue={item.categoryManager.id}
                            onValueChange={(value) => 
                              updateItemMutation.mutate({ 
                                itemId: item.id, 
                                data: { 
                                  categoryManager: value 
                                } 
                              })
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue 
                                placeholder={item.categoryManager.name} 
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryManagers.map((manager: any) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-gray-500">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-medium">Total</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.totalAmount, invoice.currency || 'GBP')}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Processing History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-2 border-primary pl-4 pb-4">
                  <p className="text-sm font-medium">Invoice uploaded</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(new Date(invoice.createdAt || invoice.invoiceDate))}
                  </p>
                </div>
                
                {invoice.status !== 'pending' && (
                  <div className="border-l-2 border-primary pl-4 pb-4">
                    <p className="text-sm font-medium">Invoice processed by AI</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(new Date(invoice.processedAt || invoice.updatedAt || invoice.invoiceDate))}
                    </p>
                    <p className="text-xs text-gray-500">
                      Processing time: {invoice.processingTime ? (invoice.processingTime / 1000).toFixed(2) : 'N/A'} seconds
                    </p>
                  </div>
                )}
                
                {(invoice.status === 'assigned' || invoice.status === 'completed') && (
                  <div className="border-l-2 border-primary pl-4 pb-4">
                    <p className="text-sm font-medium">
                      Assigned to {invoice.assignedTo?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(new Date(invoice.assignedAt || invoice.updatedAt || invoice.invoiceDate))}
                    </p>
                    <p className="text-xs text-gray-500">
                      Department: {invoice.assignedTo?.department}
                    </p>
                  </div>
                )}
                
                {invoice.status === 'completed' && (
                  <div className="border-l-2 border-green-500 pl-4 pb-4">
                    <p className="text-sm font-medium">Invoice completed</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(new Date(invoice.completedAt || invoice.updatedAt || invoice.invoiceDate))}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}