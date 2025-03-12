import { useState } from "react";
import { CheckCircleIcon, AlertTriangleIcon, PlusCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ProductSpecification {
  id: number;
  enquiryId: number;
  productType: string;
  dimensions: string;
  material: string;
  quantity: string;
  printType: string;
  aiConfidence: number | null;
  verified: boolean | null;
}

interface ProductSpecificationsProps {
  specifications: ProductSpecification[];
  onChange: (specifications: ProductSpecification[]) => void;
  enquiryId: number;
}

export default function ProductSpecifications({ specifications, onChange, enquiryId }: ProductSpecificationsProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newSpec, setNewSpec] = useState<Partial<ProductSpecification>>({
    productType: "",
    dimensions: "",
    material: "",
    quantity: "",
    printType: "",
    enquiryId,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addSpecMutation = useMutation({
    mutationFn: async (spec: Partial<ProductSpecification>) => {
      const response = await apiRequest("POST", "/api/specifications", spec);
      return response.json();
    },
    onSuccess: (data) => {
      // Add the new specification to the list
      onChange([...specifications, data]);
      setIsAdding(false);
      setNewSpec({
        productType: "",
        dimensions: "",
        material: "",
        quantity: "",
        printType: "",
        enquiryId,
      });
      toast({
        title: "Specification added",
        description: "The product specification has been added successfully."
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/enquiries/${enquiryId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error adding specification",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteSpecMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/specifications/${id}`);
      return id;
    },
    onSuccess: (id) => {
      // Remove the deleted specification from the list
      onChange(specifications.filter(spec => spec.id !== id));
      toast({
        title: "Specification deleted",
        description: "The product specification has been deleted successfully."
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/enquiries/${enquiryId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting specification",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSpecChange = (index: number, field: keyof ProductSpecification, value: string) => {
    const updatedSpecs = [...specifications];
    updatedSpecs[index] = {
      ...updatedSpecs[index],
      [field]: value,
    };
    onChange(updatedSpecs);
  };

  const handleNewSpecChange = (field: keyof ProductSpecification, value: string) => {
    setNewSpec({
      ...newSpec,
      [field]: value,
    });
  };

  const handleAddSpec = () => {
    if (isAdding) {
      // Check if all required fields are filled
      const { productType, dimensions, material, quantity, printType } = newSpec;
      if (!productType || !dimensions || !material || !quantity || !printType) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      
      addSpecMutation.mutate({
        ...newSpec,
        enquiryId,
      });
    } else {
      setIsAdding(true);
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewSpec({
      productType: "",
      dimensions: "",
      material: "",
      quantity: "",
      printType: "",
      enquiryId,
    });
  };

  const handleDeleteSpec = (id: number) => {
    deleteSpecMutation.mutate(id);
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-base font-medium text-gray-900">Product Specifications</h4>
        <div className="flex items-center">
          {specifications.length > 0 && specifications[0].aiConfidence && (
            <span className="mr-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
              AI Confidence: {specifications[0].aiConfidence}%
            </span>
          )}
          <Button
            onClick={handleAddSpec}
            variant="ghost"
            size="sm"
            className="text-primary-600 hover:text-primary-500"
            disabled={addSpecMutation.isPending}
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions (mm)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Print Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {specifications.map((spec, index) => (
              <tr key={spec.id || index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="relative">
                    <Input
                      type="text"
                      value={spec.productType || ""}
                      onChange={(e) => handleSpecChange(index, "productType", e.target.value)}
                      className="border-transparent focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                    {spec.aiConfidence && spec.aiConfidence >= 90 ? (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-green-500">
                        <CheckCircleIcon className="h-3 w-3" />
                      </div>
                    ) : (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-warning">
                        <AlertTriangleIcon className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="relative">
                    <Input
                      type="text"
                      value={spec.dimensions || ""}
                      onChange={(e) => handleSpecChange(index, "dimensions", e.target.value)}
                      className="border-transparent focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-green-500">
                      <CheckCircleIcon className="h-3 w-3" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="relative">
                    <Input
                      type="text"
                      value={spec.material || ""}
                      onChange={(e) => handleSpecChange(index, "material", e.target.value)}
                      className={`border-transparent focus:ring-primary-500 focus:border-primary-500 text-sm ${
                        spec.material === "Self-Adhesive Paper" && 
                        "border-yellow-300 bg-yellow-50"
                      }`}
                    />
                    {spec.material === "Self-Adhesive Paper" ? (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-warning">
                        <AlertTriangleIcon className="h-3 w-3" />
                      </div>
                    ) : (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-green-500">
                        <CheckCircleIcon className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="relative">
                    <Input
                      type="text"
                      value={spec.quantity || ""}
                      onChange={(e) => handleSpecChange(index, "quantity", e.target.value)}
                      className="border-transparent focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-green-500">
                      <CheckCircleIcon className="h-3 w-3" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="relative">
                    <Input
                      type="text"
                      value={spec.printType || ""}
                      onChange={(e) => handleSpecChange(index, "printType", e.target.value)}
                      className="border-transparent focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-green-500">
                      <CheckCircleIcon className="h-3 w-3" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-600 hover:text-primary-900 mr-2"
                    onClick={() => setEditingIndex(index === editingIndex ? null : index)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-900"
                    onClick={() => handleDeleteSpec(spec.id)}
                    disabled={deleteSpecMutation.isPending}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            
            {isAdding && (
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <Input
                    type="text"
                    value={newSpec.productType || ""}
                    onChange={(e) => handleNewSpecChange("productType", e.target.value)}
                    className="text-sm"
                    placeholder="Product Type"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <Input
                    type="text"
                    value={newSpec.dimensions || ""}
                    onChange={(e) => handleNewSpecChange("dimensions", e.target.value)}
                    className="text-sm"
                    placeholder="Dimensions"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <Input
                    type="text"
                    value={newSpec.material || ""}
                    onChange={(e) => handleNewSpecChange("material", e.target.value)}
                    className="text-sm"
                    placeholder="Material"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <Input
                    type="text"
                    value={newSpec.quantity || ""}
                    onChange={(e) => handleNewSpecChange("quantity", e.target.value)}
                    className="text-sm"
                    placeholder="Quantity"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <Input
                    type="text"
                    value={newSpec.printType || ""}
                    onChange={(e) => handleNewSpecChange("printType", e.target.value)}
                    className="text-sm"
                    placeholder="Print Type"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-600 hover:text-primary-900 mr-2"
                    onClick={handleAddSpec}
                    disabled={addSpecMutation.isPending}
                  >
                    {addSpecMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-900"
                    onClick={handleCancelAdd}
                  >
                    Cancel
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {specifications.some(spec => spec.material === "Self-Adhesive Paper") && (
        <div className="mt-2 text-sm text-yellow-600 flex items-center">
          <AlertTriangleIcon className="h-4 w-4 mr-2" />
          <span>Please verify material type for shipping labels. AI suggests "Self-Adhesive Vinyl" as an alternative.</span>
        </div>
      )}
    </div>
  );
}
