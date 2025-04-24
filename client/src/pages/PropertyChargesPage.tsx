import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  PropertyCharge, 
  chargeTypeEnum 
} from "@shared/schema";
import { Loader2, Filter, Plus } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";

// Types for our form
interface PropertyChargeFormData {
  flatNumber: string;
  chargeType: string;
  amount: number;
  effectiveFrom: string;
  nestawayId?: string;
}

export default function PropertyChargesPage() {
  const { toast } = useToast();
  const [selectedFlatNumber, setSelectedFlatNumber] = useState<string>("");
  const [selectedChargeType, setSelectedChargeType] = useState<string>("");
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [formData, setFormData] = useState<PropertyChargeFormData>({
    flatNumber: "",
    chargeType: "rent",
    amount: 0,
    effectiveFrom: new Date().toISOString().slice(0, 10)
  });

  // Load all property charges
  const { 
    data: propertyCharges, 
    isLoading: isLoadingCharges 
  } = useQuery<PropertyCharge[]>({
    queryKey: ['/api/property-charges'],
    enabled: true,
  });

  // Load all properties to populate the dropdown
  const { 
    data: properties, 
    isLoading: isLoadingProperties 
  } = useQuery({
    queryKey: ['/api/properties'],
    enabled: true,
  });

  // Create mutation for adding a new property charge
  const createChargeMutation = useMutation({
    mutationFn: async (data: PropertyChargeFormData) => {
      const response = await apiRequest("POST", "/api/property-charges", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Charge added successfully",
        description: "The property charge has been added.",
      });
      setIsAddChargeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/property-charges'] });
      
      // Reset form data
      setFormData({
        flatNumber: "",
        chargeType: "rent",
        amount: 0,
        effectiveFrom: new Date().toISOString().slice(0, 10)
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add charge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter charges based on selected flat number and charge type
  const filteredCharges = propertyCharges?.filter(charge => {
    let match = true;
    
    if (selectedFlatNumber) {
      match = match && charge.flatNumber === selectedFlatNumber;
    }
    
    if (selectedChargeType) {
      match = match && charge.chargeType === selectedChargeType;
    }
    
    return match;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: Number(formData.amount)
    };
    createChargeMutation.mutate(data);
  };

  // Unique flat numbers for the filter dropdown
  const uniqueFlatNumbers = properties ? 
    [...new Set(properties.map(p => p.flatNumber))].sort() : 
    [];

  const getChargeTypeName = (type: string) => {
    switch(type) {
      case "rent": return "Rent";
      case "maint_fee": return "Maintenance Fee";
      case "water_fee": return "Water Fee";
      default: return type;
    }
  };

  // Calculate some useful metrics 
  const calculateTotals = () => {
    if (!propertyCharges) return { totalRent: 0, totalMaint: 0, totalWater: 0 };
    
    // Get the current (most recent) charges for each flat/type combination
    const currentCharges = propertyCharges.reduce<Record<string, PropertyCharge>>((acc, charge) => {
      const key = `${charge.flatNumber}-${charge.chargeType}`;
      if (!acc[key] || new Date(charge.effectiveFrom) > new Date(acc[key].effectiveFrom)) {
        acc[key] = charge;
      }
      return acc;
    }, {});
    
    // Calculate totals by type
    const totals = Object.values(currentCharges).reduce(
      (totals, charge) => {
        if (charge.chargeType === "rent") totals.totalRent += charge.amount;
        if (charge.chargeType === "maint_fee") totals.totalMaint += charge.amount;
        if (charge.chargeType === "water_fee") totals.totalWater += charge.amount;
        return totals;
      },
      { totalRent: 0, totalMaint: 0, totalWater: 0 }
    );
    
    return totals;
  };
  
  const totals = calculateTotals();

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Property Charges</h1>
          <p className="text-muted-foreground">
            Manage rental rates, maintenance fees, and water charges for properties
          </p>
        </div>
        <Button onClick={() => setIsAddChargeOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New Charge
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Monthly Rent Income</CardTitle>
            <CardDescription>Total expected rent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalRent)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Monthly Maintenance</CardTitle>
            <CardDescription>Total maintenance fees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalMaint)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Monthly Water Fees</CardTitle>
            <CardDescription>Total water charges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalWater)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Charge History</CardTitle>
          <CardDescription>Historical record of all property charges and rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="flatFilter">Filter by Flat</Label>
              <Select
                value={selectedFlatNumber}
                onValueChange={setSelectedFlatNumber}
              >
                <SelectTrigger id="flatFilter">
                  <SelectValue placeholder="All Flats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Flats</SelectItem>
                  {uniqueFlatNumbers.map(flatNumber => (
                    <SelectItem key={flatNumber} value={flatNumber}>
                      Flat {flatNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="chargeTypeFilter">Filter by Charge Type</Label>
              <Select
                value={selectedChargeType}
                onValueChange={setSelectedChargeType}
              >
                <SelectTrigger id="chargeTypeFilter">
                  <SelectValue placeholder="All Charge Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Charge Types</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="maint_fee">Maintenance Fee</SelectItem>
                  <SelectItem value="water_fee">Water Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedFlatNumber("");
                  setSelectedChargeType("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
          
          {isLoadingCharges ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flat Number</TableHead>
                    <TableHead>Charge Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCharges && filteredCharges.length > 0 ? (
                    filteredCharges.map(charge => (
                      <TableRow key={charge.id}>
                        <TableCell className="font-medium">{charge.flatNumber}</TableCell>
                        <TableCell>
                          <Badge variant={
                            charge.chargeType === "rent" ? "default" : 
                            charge.chargeType === "maint_fee" ? "secondary" : 
                            "outline"
                          }>
                            {getChargeTypeName(charge.chargeType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(charge.amount)}</TableCell>
                        <TableCell>{formatDate(new Date(charge.effectiveFrom))}</TableCell>
                        <TableCell>
                          {charge.effectiveTo ? (
                            <Badge variant="outline">Historical</Badge>
                          ) : (
                            <Badge variant="success">Current</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        {filteredCharges?.length === 0 ? 
                          "No charges found with the selected filters." : 
                          "No property charges found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Charge Dialog */}
      <Dialog open={isAddChargeOpen} onOpenChange={setIsAddChargeOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Property Charge</DialogTitle>
            <DialogDescription>
              Set a new rate for rent, maintenance fee, or water charge for a property.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="flatNumber" className="text-right">
                  Flat Number
                </Label>
                <div className="col-span-3">
                  <Select
                    value={formData.flatNumber}
                    onValueChange={(value) => setFormData({...formData, flatNumber: value})}
                    required
                  >
                    <SelectTrigger id="flatNumber">
                      <SelectValue placeholder="Select flat number" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueFlatNumbers.map(flatNumber => (
                        <SelectItem key={flatNumber} value={flatNumber}>
                          Flat {flatNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="chargeType" className="text-right">
                  Charge Type
                </Label>
                <div className="col-span-3">
                  <Select
                    value={formData.chargeType}
                    onValueChange={(value) => setFormData({...formData, chargeType: value})}
                    required
                  >
                    <SelectTrigger id="chargeType">
                      <SelectValue placeholder="Select charge type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="maint_fee">Maintenance Fee</SelectItem>
                      <SelectItem value="water_fee">Water Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount (₹)
                </Label>
                <div className="col-span-3">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="effectiveFrom" className="text-right">
                  Effective From
                </Label>
                <div className="col-span-3">
                  <Input
                    id="effectiveFrom"
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({...formData, effectiveFrom: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nestawayId" className="text-right">
                  Nestaway ID
                </Label>
                <div className="col-span-3">
                  <Input
                    id="nestawayId"
                    type="text"
                    value={formData.nestawayId || ""}
                    onChange={(e) => setFormData({...formData, nestawayId: e.target.value})}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsAddChargeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createChargeMutation.isPending}>
                {createChargeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Charge
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}