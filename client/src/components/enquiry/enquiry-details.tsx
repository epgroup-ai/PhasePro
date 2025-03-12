import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircleIcon, AlertTriangleIcon } from "lucide-react";
import { format } from "date-fns";

interface EnquiryDetailsProps {
  enquiry: {
    customerName: string;
    enquiryCode: string;
    contactPerson: string;
    contactEmail: string;
    dateReceived: string;
    deadline: string;
  };
  onChange: (data: Partial<EnquiryDetailsProps["enquiry"]>) => void;
}

export default function EnquiryDetails({ enquiry, onChange }: EnquiryDetailsProps) {
  const handleChange = (field: keyof EnquiryDetailsProps["enquiry"], value: string) => {
    onChange({ [field]: value });
  };

  // Check if deadline is within 15 days of date received
  const isTightDeadline = () => {
    if (!enquiry.dateReceived || !enquiry.deadline) return false;
    
    const received = new Date(enquiry.dateReceived);
    const deadline = new Date(enquiry.deadline);
    const diffTime = Math.abs(deadline.getTime() - received.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 15;
  };

  // Format date to YYYY-MM-DD for input fields
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return format(date, "yyyy-MM-dd");
  };

  return (
    <div className="mb-8">
      <h4 className="text-base font-medium text-gray-900 mb-4">Basic Information</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</Label>
          <div className="relative">
            <Input
              type="text"
              value={enquiry.customerName}
              onChange={(e) => handleChange("customerName", e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-green-500">
              <CheckCircleIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Enquiry ID</Label>
          <div className="relative">
            <Input
              type="text"
              value={enquiry.enquiryCode}
              onChange={(e) => handleChange("enquiryCode", e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-green-500">
              <CheckCircleIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Date Received</Label>
          <div className="relative">
            <Input
              type="date"
              value={formatDate(enquiry.dateReceived)}
              onChange={(e) => handleChange("dateReceived", e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</Label>
          <div className="relative">
            <Input
              type="text"
              value={enquiry.contactPerson || ""}
              onChange={(e) => handleChange("contactPerson", e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-green-500">
              <CheckCircleIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</Label>
          <div className="relative">
            <Input
              type="email"
              value={enquiry.contactEmail || ""}
              onChange={(e) => handleChange("contactEmail", e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-green-500">
              <CheckCircleIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Deadline</Label>
          <div className="relative">
            <Input
              type="date"
              value={formatDate(enquiry.deadline)}
              onChange={(e) => handleChange("deadline", e.target.value)}
            />
            {isTightDeadline() && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-warning">
                <AlertTriangleIcon className="h-4 w-4" />
              </div>
            )}
          </div>
          {isTightDeadline() && (
            <p className="mt-1 text-xs text-warning">Tight deadline (15 days or less)</p>
          )}
        </div>
      </div>
    </div>
  );
}
