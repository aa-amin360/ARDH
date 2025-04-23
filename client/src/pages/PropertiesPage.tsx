import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insertPropertySchema, type Property } from "@shared/schema";
import { 
  FLATS, 
  OWNERS, 
  MAINTENANCE_FEES, 
  getOwnerByFlatNumber, 
  getFlatTypeByFlatNumber, 
  getMaintenanceFeeByFlatNumber,
  getNestawayIdByFlatNumber 
} from "@shared/constants";

// Extended schema with validation
const propertyFormSchema = insertPropertySchema.extend({
  flatNumber: z.string().min(3, "Flat number is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  flatType: z.enum(["1BHK", "2BHK", "3BHK", "penthouse"]),
  expectedRent: z.coerce.number().min(0, "Expected rent must be a positive number"),
  maintenanceFee: z.coerce.number().min(0, "Maintenance fee must be a positive number"),
  isRented: z.boolean().default(false),
  floorArea: z.coerce.number().optional(),
  createdBy: z.number().optional()
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export default function PropertiesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("view");
  const [selectedFlatNumber, setSelectedFlatNumber] = useState<string>("");
  const [isReadOnly, setIsReadOnly] = useState(true);
  
  // Fetch properties
  const { 
    data: properties = [], 
    isLoading, 
    isError,
    refetch
  } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    // Adding retry options and staleTime to improve data fetching reliability
    retry: 3,
    staleTime: 60000 // 1 minute
  });

  // Create property mutation
  const createPropertyMutation = useMutation({
    mutationFn: async (values: PropertyFormValues) => {
      const res = await apiRequest("POST", "/api/properties", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Property added",
        description: "The property has been added successfully."
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      refetch(); // Explicitly refetch to ensure we have the latest data
      setActiveTab("view");
    },
    onError: (error: any) => {
      toast({
        title: "Error adding property",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: PropertyFormValues }) => {
      const res = await apiRequest("PATCH", `/api/properties/${id}`, values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Property updated",
        description: "The property has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      refetch(); // Explicitly refetch to ensure we have the latest data
      setActiveTab("view");
    },
    onError: (error: any) => {
      toast({
        title: "Error updating property",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Form
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      flatNumber: "",
      ownerName: "",
      flatType: "1BHK",
      expectedRent: 0,
      maintenanceFee: 0,
      isRented: false,
      currentTenant: "",
      floorArea: 0,
      notes: "",
      createdBy: 0
    }
  } as any);

  // Handle form submission
  function onSubmit(values: PropertyFormValues) {
    const selectedProperty = getSelectedProperty();
    
    // Format the values for API submission
    const formattedValues = {
      ...values,
      isRented: !!values.isRented, // Ensure boolean
      expectedRent: typeof values.expectedRent === 'string' 
        ? parseFloat(values.expectedRent) 
        : values.expectedRent, // Ensure number
      maintenanceFee: typeof values.maintenanceFee === 'string' 
        ? parseFloat(values.maintenanceFee) 
        : values.maintenanceFee, // Ensure number
      floorArea: values.floorArea 
        ? (typeof values.floorArea === 'string' 
            ? parseFloat(values.floorArea) 
            : values.floorArea) 
        : null // Handle optional floor area
    };
    
    if (activeTab === "modify" && selectedProperty) {
      updatePropertyMutation.mutate({ 
        id: selectedProperty.id, 
        values: formattedValues as any
      });
    } else if (activeTab === "add") {
      createPropertyMutation.mutate(formattedValues as any);
    }
  }

  // Reset form when switching tabs
  const handleTabChange = (value: string) => {
    form.reset();
    setSelectedFlatNumber("");
    setActiveTab(value);
    setIsReadOnly(value === "view");
  };

  // Get the selected property based on the flat number
  function getSelectedProperty(): Property | undefined {
    return properties.find((p) => p.flatNumber === selectedFlatNumber);
  }

  // Handle property selection
  const handlePropertySelect = (flatNumber: string) => {
    setSelectedFlatNumber(flatNumber);
    const property = properties.find((p) => p.flatNumber === flatNumber);
    
    if (property) {
      form.reset({
        flatNumber: property.flatNumber,
        flatType: property.flatType as any,
        apartmentFloor: property.apartmentFloor as any,
        leaseStatus: property.leaseStatus as any,
        ownerName: property.ownerName,
        expectedRent: property.expectedRent,
        maintenanceFee: property.maintenanceFee,
        waterCost: property.waterCost || undefined,
        isRented: property.isRented,
        currentTenant: property.currentTenant || "",
        floorArea: property.floorArea || 0,
        notes: property.notes || ""
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Properties Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="view">View Property</TabsTrigger>
          <TabsTrigger value="modify">Modify Property</TabsTrigger>
          <TabsTrigger value="add">Add Property</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>View Property Details</CardTitle>
              <CardDescription>
                Select a property to view its details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Select onValueChange={handlePropertySelect} value={selectedFlatNumber}>
                  <SelectTrigger className="w-full sm:w-1/2">
                    <SelectValue placeholder="Select a flat number" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                      </div>
                    ) : Array.isArray(properties) && properties.length > 0 ? (
                      properties.map((property: Property) => (
                        <SelectItem key={property.id} value={property.flatNumber}>
                          {property.flatNumber} {property.flatType && `- ${property.flatType}`} {property.ownerName && `(${property.ownerName})`}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-muted-foreground">
                        No properties found. Add some properties first.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedFlatNumber && (
                <Form {...form}>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="flatNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flat Number</FormLabel>
                            <FormControl>
                              <Input readOnly={true} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="flatType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flat Type</FormLabel>
                            <FormControl>
                              <Input readOnly={true} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ownerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner</FormLabel>
                            <FormControl>
                              <Input readOnly={true} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="expectedRent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Rent (₹)</FormLabel>
                            <FormControl>
                              <Input readOnly={true} type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="maintenanceFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maintenance Fee (₹)</FormLabel>
                            <FormControl>
                              <Input readOnly={true} type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isRented"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occupancy Status</FormLabel>
                            <FormControl>
                              <Input 
                                readOnly={true} 
                                value={field.value ? "Occupied" : "Vacant"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currentTenant"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Tenant</FormLabel>
                            <FormControl>
                              <Input readOnly={true} value={field.value || "None"} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="floorArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Floor Area (sq ft)</FormLabel>
                            <FormControl>
                              <Input readOnly={true} type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              readOnly={true}
                              placeholder="No notes available"
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modify" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Modify Property</CardTitle>
              <CardDescription>
                Select a property and update its details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Select onValueChange={handlePropertySelect} value={selectedFlatNumber}>
                  <SelectTrigger className="w-full sm:w-1/2">
                    <SelectValue placeholder="Select a flat number" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                      </div>
                    ) : Array.isArray(properties) && properties.length > 0 ? (
                      properties.map((property: Property) => (
                        <SelectItem key={property.id} value={property.flatNumber}>
                          {property.flatNumber} {property.flatType && `- ${property.flatType}`} {property.ownerName && `(${property.ownerName})`}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-muted-foreground">
                        No properties found. Add some properties first.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedFlatNumber && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="flatNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flat Number</FormLabel>
                            <FormControl>
                              <Input readOnly={true} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="flatType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flat Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select flat type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1BHK">1 BHK</SelectItem>
                                <SelectItem value="2BHK">2 BHK</SelectItem>
                                <SelectItem value="3BHK">3 BHK</SelectItem>
                                <SelectItem value="penthouse">Penthouse</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ownerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select owner" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {OWNERS.map((owner, index) => (
                                  <SelectItem key={index} value={owner}>
                                    {owner}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="expectedRent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Rent (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="maintenanceFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maintenance Fee (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isRented"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Currently Rented
                              </FormLabel>
                              <FormDescription>
                                Is this property currently occupied by a tenant?
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="floorArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Floor Area (sq ft)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional notes about the property"
                              value={field.value || ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updatePropertyMutation.isPending}
                        className="gap-1"
                      >
                        {updatePropertyMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Property</CardTitle>
              <CardDescription>
                Enter details to add a new property to the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="flatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flat Number</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter 3-digit flat number (e.g. 101)"
                              onChange={(e) => {
                                field.onChange(e);
                                // Try to auto-fill the related fields based on entered flat number
                                const flatNumber = e.target.value;
                                const flatInfo = FLATS.find(f => f.flatNumber === flatNumber);
                                if (flatInfo) {
                                  form.setValue("flatType", flatInfo.flatType);
                                  form.setValue("ownerName", flatInfo.owner);
                                  form.setValue("nestawayId", flatInfo.nestawayId || "");
                                  form.setValue("maintenanceFee", getMaintenanceFeeByFlatNumber(flatNumber));
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter a 3-digit flat number (e.g., 101, 204, 503)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nestawayId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nestaway ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., N35410" value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="flatType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flat Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select flat type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1BHK">1 BHK</SelectItem>
                              <SelectItem value="2BHK">2 BHK</SelectItem>
                              <SelectItem value="3BHK">3 BHK</SelectItem>
                              <SelectItem value="penthouse">Penthouse</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Owner</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select owner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {OWNERS.map((owner, index) => (
                                <SelectItem key={index} value={owner}>
                                  {owner}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="expectedRent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 15000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="maintenanceFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maintenance Fee (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 1000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="waterCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Water Cost (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 500" value={field.value ?? ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="apartmentFloor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Floor</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select floor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1st Floor</SelectItem>
                              <SelectItem value="2">2nd Floor</SelectItem>
                              <SelectItem value="3">3rd Floor</SelectItem>
                              <SelectItem value="4">4th Floor</SelectItem>
                              <SelectItem value="5">5th Floor</SelectItem>
                              <SelectItem value="6">6th Floor</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="floorArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Floor Area (sq ft)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 800" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="leaseStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lease Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select lease status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Leasable">Leasable</SelectItem>
                              <SelectItem value="Non-Leasable">Non-Leasable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes about the property"
                            value={field.value || ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={createPropertyMutation.isPending}
                      className="gap-1"
                    >
                      {createPropertyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add Property
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}