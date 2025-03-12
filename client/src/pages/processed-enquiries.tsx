import { useQuery } from "@tanstack/react-query";
import { Enquiry } from "@shared/schema";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessedEnquiries() {
  const { data: enquiries, isLoading, error } = useQuery<Enquiry[]>({
    queryKey: ['/api/enquiries'],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">New</Badge>;
      case 'processed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Processed</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Processed Enquiries</h1>
          <p className="text-sm text-gray-500">View and manage all customer enquiries</p>
        </div>
        <Link href="/new-enquiry">
          <Button>New Enquiry</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          Failed to load enquiries. Please try refreshing the page.
        </div>
      ) : (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          {enquiries && enquiries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enquiry ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.map((enquiry) => (
                  <TableRow key={enquiry.id}>
                    <TableCell className="font-medium">{enquiry.enquiryCode}</TableCell>
                    <TableCell>{enquiry.customerName}</TableCell>
                    <TableCell>
                      {enquiry.dateReceived
                        ? formatDistanceToNow(new Date(enquiry.dateReceived), { addSuffix: true })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {enquiry.deadline
                        ? formatDistanceToNow(new Date(enquiry.deadline), { addSuffix: true })
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(enquiry.status)}</TableCell>
                    <TableCell>
                      {enquiry.aiConfidence ? (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          {enquiry.aiConfidence}%
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/enquiries/${enquiry.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-4 py-5 sm:p-6 text-center">
              <p className="text-gray-500">No enquiries found</p>
              <Link href="/new-enquiry">
                <Button className="mt-4">Process New Enquiry</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
