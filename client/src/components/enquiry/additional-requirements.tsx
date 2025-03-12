import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircleIcon, AlertTriangleIcon } from "lucide-react";

interface AdditionalRequirementsProps {
  specialInstructions: string;
  deliveryRequirements: string;
  onChange: (data: { specialInstructions?: string; deliveryRequirements?: string }) => void;
  warnings?: {
    specialInstructions?: string;
    deliveryRequirements?: string;
  };
}

export default function AdditionalRequirements({
  specialInstructions,
  deliveryRequirements,
  onChange,
  warnings = {},
}: AdditionalRequirementsProps) {
  const [hasEcoFriendlyTerm, setHasEcoFriendlyTerm] = useState<boolean>(
    specialInstructions?.toLowerCase().includes("eco-friendly") || false
  );

  const handleSpecialInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onChange({ specialInstructions: value });
    
    // Check if it contains the eco-friendly term
    setHasEcoFriendlyTerm(value.toLowerCase().includes("eco-friendly"));
  };

  const handleDeliveryRequirementsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ deliveryRequirements: e.target.value });
  };

  return (
    <div>
      <h4 className="text-base font-medium text-gray-900 mb-4">Additional Requirements</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions
          </Label>
          <div className="relative">
            <Textarea
              id="specialInstructions"
              rows={3}
              value={specialInstructions || ""}
              onChange={handleSpecialInstructionsChange}
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            <div className="absolute top-0 right-0 mt-1 mr-2 text-yellow-500">
              {hasEcoFriendlyTerm && <AlertTriangleIcon className="h-4 w-4" />}
              {!hasEcoFriendlyTerm && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
            </div>
          </div>
          {hasEcoFriendlyTerm && (
            <p className="mt-1 text-xs text-yellow-600">
              AI has flagged "eco-friendly" for verification with category manager.
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="deliveryRequirements" className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Requirements
          </Label>
          <div className="relative">
            <Textarea
              id="deliveryRequirements"
              rows={3}
              value={deliveryRequirements || ""}
              onChange={handleDeliveryRequirementsChange}
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            <div className="absolute top-0 right-0 mt-1 mr-2 text-green-500">
              <CheckCircleIcon className="h-4 w-4" />
            </div>
          </div>
          {warnings?.deliveryRequirements && (
            <p className="mt-1 text-xs text-yellow-600">{warnings.deliveryRequirements}</p>
          )}
        </div>
      </div>
    </div>
  );
}
