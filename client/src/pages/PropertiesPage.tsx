import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Eye } from "lucide-react";
import { SelectItem } from "@radix-ui/react-select";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insertPropertySchema } from "@shared/schema";
import { FLATS, OWNERS, MAINTENANCE_FEES, getOwnerByFlatNumber, getFlatTypeByFlatNumber, getMaintenanceFeeByFlatNumber } from "@shared/constants";

// Extended schema with validation
const propertyFormSchema = insertPropertySchema.extend({
  flatNumber: z.string().min(3, "Flat number is required"),
  owner: z.string().min(2, "Owner name is required"),
  flatType: z.enum(["1BHK", "2BHK", "3BHK", "penthouse"]),
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
      owner: "",
      flatType: "1BHK",
      monthlyRent: 0,
      maintenanceFee: 0,
      createdBy: 0,
      isOccupied: false,
      notes: ""
    }
  });

  // Handle form submission
  function onSubmit(values: PropertyFormValues) {
    const selectedProperty = getSelectedProperty();
    
    if (activeTab === "modify" && selectedProperty) {
      updatePropertyMutation.mutate({ 
        id: selectedProperty.id, 
        values: {
          ...values,
          isOccupied: !!values.isOccupied // Ensure boolean
        }
      });
    } else if (activeTab === "add") {
      createPropertyMutation.mutate(values);
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
        owner: property.owner,
        monthlyRent: property.monthlyRent,
        maintenanceFee: property.maintenanceFee,
        isOccupied: property.isOccupied,
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
                    ) : (
                      properties.map((property: any) => (
                        <SelectItem key={property.id} value={property.flatNumber}>
                          {property.flatNumber} - {property.flatType}
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
                        name="owner"
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
                        name="monthlyRent"
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
                        name="isOccupied"
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
                          {property.flatNumber} - {property.flatType}
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
                        name="owner"
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
                        name="monthlyRent"
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
                        name="isOccupied"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occupancy Status</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "true")}
                              defaultValue={field.value ? "true" : "false"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="true">Occupied</SelectItem>
                                <SelectItem value="false">Vacant</SelectItem>
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
                              placeholder="Optional notes about the property"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" type="button" onClick={() => handleTabChange("view")}>
                        Cancel
                      </Button>
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
                Enter the details of the property you want to add.
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
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              
                              // Auto-fill other fields based on selected flat
                              const flatType = getFlatTypeByFlatNumber(value);
                              const owner = getOwnerByFlatNumber(value);
                              const maintenanceFee = getMaintenanceFeeByFlatNumber(value);
                              
                              if (flatType) form.setValue('flatType', flatType as any);
                              if (owner) form.setValue('owner', owner);
                              if (maintenanceFee) form.setValue('maintenanceFee', maintenanceFee);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a flat number" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FLATS.map((flat) => (
                                <SelectItem key={flat.flatNumber} value={flat.flatNumber}>
                                  {flat.flatNumber} - {flat.flatType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select from predefined flats in ARDH building
                          </FormDescription>
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
                      name="owner"
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
                              {OWNERS.map((owner) => (
                                <SelectItem key={owner} value={owner}>
                                  {owner}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select from the building's 5 owners
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="monthlyRent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g. 15000" {...field} />
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
                            <Input type="number" placeholder="e.g. 1000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isOccupied"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupancy Status</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "true")}
                            defaultValue={field.value ? "true" : "false"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Occupied</SelectItem>
                              <SelectItem value="false">Vacant</SelectItem>
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
                            placeholder="Optional notes about the property"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" type="button" onClick={() => form.reset()}>
                      Clear
                    </Button>
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
