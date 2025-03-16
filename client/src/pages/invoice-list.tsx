import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, FileText, Plus, Filter } from 'lucide-react';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

// Invoice status badge color mapping
const statusColors: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'processed': 'bg-blue-100 text-blue-800',
  'assigned': 'bg-purple-100 text-purple-800',
  'completed': 'bg-green-100 text-green-800',
};

export default function InvoiceList() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Fetch all invoices
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json();
    },
  });

  // Fetch invoices assigned to current user
  const { data: assignedInvoices, isLoading: isLoadingAssigned } = useQuery({
    queryKey: ['/api/invoices/assigned', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/invoices/assigned/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch assigned invoices');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Filter invoices based on active tab
  const displayedInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    switch (activeTab) {
      case 'pending':
        return invoices.filter((invoice: any) => invoice.status === 'pending');
      case 'processed':
        return invoices.filter((invoice: any) => invoice.status === 'processed');
      case 'assigned':
        return invoices.filter((invoice: any) => invoice.status === 'assigned');
      case 'completed':
        return invoices.filter((invoice: any) => invoice.status === 'completed');
      case 'my-invoices':
        return assignedInvoices || [];
      default:
        return invoices;
    }
  }, [invoices, assignedInvoices, activeTab]);

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
        <p className="text-red-500">Error loading invoices: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage and track supplier invoices</p>
        </div>
        <Button onClick={() => navigate('/invoices/upload')}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Invoice
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Invoice Management</CardTitle>
          <Tabs 
            defaultValue="all" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-2"
          >
            <TabsList className="grid grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processed">Processed</TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="my-invoices">My Invoices</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {displayedInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium mb-1">No invoices found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {activeTab === 'my-invoices' 
                  ? 'You don\'t have any invoices assigned to you yet.' 
                  : 'There are no invoices in this category.'}
              </p>
              <Button variant="outline" onClick={() => navigate('/invoices/upload')}>
                Upload Invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedInvoices.map((invoice: any) => (
                    <TableRow 
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.supplierName}</TableCell>
                      <TableCell>{formatDate(new Date(invoice.invoiceDate))}</TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount, invoice.currency || 'GBP')}</TableCell>
                      <TableCell>
                        {invoice.assignedTo ? (
                          <span className="text-sm">{invoice.assignedTo.department}</span>
                        ) : (
                          <span className="text-sm text-gray-500">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <span className="sr-only">Open menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoices/${invoice.id}`);
                            }}>
                              View Details
                            </DropdownMenuItem>
                            {invoice.status === 'pending' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                // Handle mark as processed
                              }}>
                                Mark as Processed
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'processed' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                // Handle assign
                              }}>
                                Assign to Manager
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'assigned' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                // Handle mark as completed
                              }}>
                                Mark as Completed
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {displayedInvoices.length} {displayedInvoices.length === 1 ? 'invoice' : 'invoices'}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}