import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Eye } from "lucide-react";

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
import { insertPropertySchema } from "@shared/schema";
import { FLATS, OWNERS, MAINTENANCE_FEES, getOwnerByFlatNumber, getFlatTypeByFlatNumber, getMaintenanceFeeByFlatNumber } from "@shared/constants";

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
  const { data: properties = [], isLoading, isError } = useQuery({
    queryKey: ["/api/properties"]
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
  function getSelectedProperty() {
    return properties.find((p: any) => p.flatNumber === selectedFlatNumber);
  }

  // Handle property selection
  const handlePropertySelect = (flatNumber: string) => {
    setSelectedFlatNumber(flatNumber);
    const property = properties.find((p: any) => p.flatNumber === flatNumber);
    
    if (property) {
      form.reset({
        flatNumber: property.flatNumber,
        flatType: property.flatType,
        ownerName: property.ownerName,
        expectedRent: property.expectedRent,
        maintenanceFee: property.maintenanceFee,
        isRented: property.isRented,
        currentTenant: property.currentTenant || "",
        floorArea: property.floorArea || 0,
        notes: property.notes || ""
      } as any);
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
                    ) : (
                      properties.map((property: any) => (
                        <SelectItem key={property.id} value={property.flatNumber}>
                          {property.flatNumber}
                        </SelectItem>
                      ))
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
                              <Input readOnly={true} {...field} />
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
                              {...field}
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
                    ) : (
                      properties.map((property: any) => (
                        <SelectItem key={property.id} value={property.flatNumber}>
                          {property.flatNumber}
                        </SelectItem>
                      ))
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
                              defaultValue={field.value}
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
                            <FormControl>
                              <Input {...field} />
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
                      
                      {/* Removed isRented and currentTenant fields as they are determined from tenants data */}

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
                              placeholder="Add notes about the property"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" className="w-full sm:w-auto">
                        <Save className="w-4 h-4 mr-2" /> Update Property
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
                Enter the details of the new property.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {properties && properties.length >= FLATS.length ? (
                <div className="p-4 border border-orange-200 bg-orange-50 rounded-md mb-4">
                  <h3 className="font-medium text-orange-800">All properties have already been added</h3>
                  <p className="text-orange-700 mt-1">
                    All flats in the building have already been added to the database. 
                    To modify property details, please use the "Modify Property" tab.
                  </p>
                </div>
              ) : null}
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="flatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flat Number</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Auto-fill the related fields based on selected flat
                              const flatInfo = FLATS.find(f => f.flatNumber === value);
                              if (flatInfo) {
                                form.setValue("flatType", flatInfo.flatType);
                                form.setValue("ownerName", flatInfo.owner);
                                form.setValue("maintenanceFee", getMaintenanceFeeByFlatNumber(value));
                              }
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select flat number" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FLATS.map((flat, index) => {
                                // Check if this flat already exists in properties
                                const existingProperty = properties.find((p: any) => p.flatNumber === flat.flatNumber);
                                return (
                                  <SelectItem 
                                    key={index} 
                                    value={flat.flatNumber}
                                    disabled={!!existingProperty}
                                  >
                                    {flat.flatNumber} {existingProperty ? "(Already added)" : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
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
                            <Input {...field} placeholder="e.g., N35410" />
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
                              <SelectItem value="4BHK">4 BHK</SelectItem>
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
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select owner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {OWNERS.map((owner) => (
                                <SelectItem key={owner} value={owner}>
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
                            <Input type="number" {...field} placeholder="e.g., 15000" />
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
                            <Input type="number" {...field} placeholder="e.g., 1000" />
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
                            <Input type="number" {...field} placeholder="e.g., 500" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Removed isRented and currentTenant fields as they are determined from tenants data */}

                    <FormField
                      control={form.control}
                      name="floorArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Floor Area (sq ft)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="e.g., 650" />
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
                            placeholder="Add notes about the property"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" /> Add Property
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