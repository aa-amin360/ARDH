import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  insertPropertySchema,
  type Property,
  PropertyCharge,
  chargeTypeEnum,
} from "@shared/schema";
import {
  FLATS,
  OWNERS,
  MAINTENANCE_FEES,
  getOwnerByFlatNumber,
  getFlatTypeByFlatNumber,
  getMaintenanceFeeByFlatNumber,
  getNestawayIdByFlatNumber,
} from "@shared/constants";

// Extended schema with validation
const propertyFormSchema = insertPropertySchema.extend({
  flatNumber: z.string().min(3, "Flat number is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  flatType: z.enum(["1BHK", "2BHK", "3BHK", "penthouse"]),
  
  // These fields are not in the properties table anymore but needed for the form
  // Will be stored in property_charges table instead
  rentAmount: z.coerce
    .number()
    .min(0, "Expected rent must be a positive number")
    .optional(),
  maintenanceFee: z.coerce
    .number()
    .min(0, "Maintenance fee must be a positive number")
    .optional(),
  waterFee: z.coerce
    .number()
    .min(0, "Water fee must be a positive number")
    .optional(),
    
  isRented: z.boolean().default(false),
  floorArea: z.coerce.number().optional(),
  createdBy: z.number().optional(),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export default function PropertiesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("view");
  const [selectedFlatNumber, setSelectedFlatNumber] = useState<string>("");
  const [isReadOnly, setIsReadOnly] = useState(true);

  // Fetch properties - use explicit fetch to debug authentication issues
  const [propertyData, setPropertyData] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await fetch("/api/properties", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Properties loaded:", data.length, data);
      setPropertyData(data);
    } catch (error) {
      console.error("Error loading properties:", error);
    } finally {
      setLoadingProperties(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchProperties();
  }, []);

  // Also support the existing React Query interface for backwards compatibility
  const {
    data: properties = propertyData,
    isLoading = loadingProperties,
    isError,
    refetch = fetchProperties,
  } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    // Adding retry options and staleTime to improve data fetching reliability
    retry: 3,
    staleTime: 60000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: false, // Don't run automatically - we'll use our custom fetch
  });

  // Sort properties by flat number for consistent display
  const sortedProperties = useMemo(() => {
    return [...(properties || [])].sort((a, b) =>
      a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }),
    );
  }, [properties]);

  // Create property mutation
  const createPropertyMutation = useMutation({
    mutationFn: async (values: PropertyFormValues) => {
      const res = await apiRequest("POST", "/api/properties", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Property added",
        description: "The property has been added successfully.",
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
        variant: "destructive",
      });
    },
  });

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: PropertyFormValues;
    }) => {
      const res = await apiRequest("PATCH", `/api/properties/${id}`, values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Property updated",
        description: "The property has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      refetch(); // Explicitly refetch to ensure we have the latest data
      setActiveTab("view");
    },
    onError: (error: any) => {
      toast({
        title: "Error updating property",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      flatNumber: "",
      ownerName: "",
      flatType: "1BHK",
      apartmentFloor: "1",
      leaseStatus: "Leasable",
      rentAmount: 0,
      maintenanceFee: 0,
      waterFee: 0,
      isRented: false,
      floorArea: 0,
      notes: "",
      nestawayId: "",
      createdBy: 0,
    },
  } as any);

  // Handle form submission
  function onSubmit(values: PropertyFormValues) {
    const selectedProperty = getSelectedProperty();

    // Format the values for API submission
    const formattedValues = {
      ...values,
      isRented: !!values.isRented, // Ensure boolean
      rentAmount:
        typeof values.rentAmount === "string"
          ? parseFloat(values.rentAmount)
          : values.rentAmount, // Ensure number
      maintenanceFee:
        typeof values.maintenanceFee === "string"
          ? parseFloat(values.maintenanceFee)
          : values.maintenanceFee, // Ensure number
      waterFee:
        typeof values.waterFee === "string"
          ? parseFloat(values.waterFee)
          : values.waterFee, // Ensure number
      floorArea: values.floorArea
        ? typeof values.floorArea === "string"
          ? parseFloat(values.floorArea)
          : values.floorArea
        : null, // Handle optional floor area
    };

    if (activeTab === "modify" && selectedProperty) {
      // For updates, we need to include the property ID
      updatePropertyMutation.mutate({
        id: selectedProperty.id,
        values: formattedValues as any,
      });
    } else if (activeTab === "add") {
      // For new properties, we'll create both the property and initial charges
      createPropertyMutation.mutate(formattedValues as any);
      
      // The backend will create property charges automatically based on the
      // rentAmount, maintenanceFee, and waterFee fields we're passing
      // See DatabaseStorage.createProperty implementation
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

  // Fetch current charges for the selected property
  const { data: propertyCharges = [] } = useQuery<PropertyCharge[]>({
    queryKey: ["/api/properties/charges", selectedFlatNumber], 
    queryFn: async () => {
      if (!selectedFlatNumber) return [];
      const res = await fetch(`/api/properties/charges?flatNumber=${selectedFlatNumber}&currentOnly=true`);
      if (!res.ok) throw new Error("Failed to fetch property charges");
      return res.json();
    },
    enabled: !!selectedFlatNumber,
  });

  // Handle property selection
  const handlePropertySelect = (flatNumber: string) => {
    setSelectedFlatNumber(flatNumber);
    const property = properties.find((p) => p.flatNumber === flatNumber);

    if (property) {
      // Get the current charges for this property
      const currentRent = propertyCharges.find(c => c.chargeType === 'rent')?.amount || 0;
      const currentMaintenanceFee = propertyCharges.find(c => c.chargeType === 'maint_fee')?.amount || 0;
      const currentWaterFee = propertyCharges.find(c => c.chargeType === 'water_fee')?.amount || 0;
      
      form.reset({
        flatNumber: property.flatNumber,
        flatType: property.flatType as any,
        apartmentFloor: property.apartmentFloor as any,
        leaseStatus: property.leaseStatus as any,
        ownerName: property.ownerName,
        rentAmount: currentRent,
        maintenanceFee: currentMaintenanceFee,
        waterFee: currentWaterFee,
        isRented: property.isRented,
        floorArea: property.floorArea || 0,
        notes: property.notes || "",
        nestawayId: property.nestawayId || "",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Properties Management</h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="view">View Property</TabsTrigger>
          <TabsTrigger value="modify">Modify Property</TabsTrigger>
          <TabsTrigger value="add">Add Property</TabsTrigger>
          <TabsTrigger value="charges">Property Charges</TabsTrigger>
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
                <Select
                  onValueChange={handlePropertySelect}
                  value={selectedFlatNumber}
                >
                  <SelectTrigger className="w-full sm:w-1/2">
                    <SelectValue placeholder="Select a flat number" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                        Loading...
                      </div>
                    ) : Array.isArray(properties) && properties.length > 0 ? (
                      properties.map((property: Property) => (
                        <SelectItem
                          key={property.id}
                          value={property.flatNumber}
                        >
                          {property.flatNumber}
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
                        name="nestawayId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nestaway ID</FormLabel>
                            <FormControl>
                              <Input readOnly={true} {...field} value={field.value || ""} />
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
                        name="rentAmount"
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
                        name="waterFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Water Fee (₹)</FormLabel>
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
                <Select
                  onValueChange={handlePropertySelect}
                  value={selectedFlatNumber}
                >
                  <SelectTrigger className="w-full sm:w-1/2">
                    <SelectValue placeholder="Select a flat number" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                        Loading...
                      </div>
                    ) : Array.isArray(properties) && properties.length > 0 ? (
                      properties.map((property: Property) => (
                        <SelectItem
                          key={property.id}
                          value={property.flatNumber}
                        >
                          {property.flatNumber}
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
                  <form
                    className="space-y-6"
                    onSubmit={form.handleSubmit(onSubmit)}
                  >
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
                        name="nestawayId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nestaway ID</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} />
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
                              <Select
                                disabled={isReadOnly}
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select flat type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1BHK">1BHK</SelectItem>
                                  <SelectItem value="2BHK">2BHK</SelectItem>
                                  <SelectItem value="3BHK">3BHK</SelectItem>
                                  <SelectItem value="penthouse">
                                    Penthouse
                                  </SelectItem>
                                </SelectContent>
                              </Select>
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
                              <Select
                                disabled={isReadOnly}
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select owner" />
                                </SelectTrigger>
                                <SelectContent>
                                  {OWNERS.map((owner) => (
                                    <SelectItem key={owner} value={owner}>
                                      {owner}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rentAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Rent (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                readOnly={isReadOnly}
                                {...field}
                              />
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
                              <Input
                                type="number"
                                readOnly={isReadOnly}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="waterFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Water Fee (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                readOnly={isReadOnly}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isRented"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Lease Status</FormLabel>
                              <FormDescription>
                                Is this property currently available for lease?
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                disabled={isReadOnly}
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
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
                              <Input
                                type="number"
                                readOnly={isReadOnly}
                                {...field}
                                value={field.value || ""}
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
                              readOnly={isReadOnly}
                              placeholder="Add any notes about this property"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={
                          isReadOnly || updatePropertyMutation.isPending
                        }
                      >
                        {updatePropertyMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
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
                Enter property details to add a new property.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  className="space-y-6"
                  onSubmit={form.handleSubmit(onSubmit)}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="flatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flat Number</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} />
                          </FormControl>
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
                            <Input {...field} value={field.value || ""} />
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
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                const maintenanceFee =
                                  value === "1BHK"
                                    ? 1000
                                    : value === "2BHK"
                                      ? 1500
                                      : value === "3BHK"
                                        ? 2000
                                        : 2500;
                                form.setValue("maintenanceFee", maintenanceFee);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select flat type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1BHK">1BHK</SelectItem>
                                <SelectItem value="2BHK">2BHK</SelectItem>
                                <SelectItem value="3BHK">3BHK</SelectItem>
                                <SelectItem value="penthouse">
                                  Penthouse
                                </SelectItem>
                              </SelectContent>
                            </Select>
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
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select owner" />
                              </SelectTrigger>
                              <SelectContent>
                                {OWNERS.map((owner) => (
                                  <SelectItem key={owner} value={owner}>
                                    {owner}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rentAmount"
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
                      name="waterFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Water Fee (₹)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              placeholder="Enter water fee"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isRented"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Lease Status</FormLabel>
                            <FormDescription>
                              Is this property currently available for lease?
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
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
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ""}
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
                            placeholder="Add any notes about this property"
                            {...field}
                            value={field.value || ""}
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
                    >
                      {createPropertyMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Property
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Charges</CardTitle>
              <CardDescription>
                Manage rent, maintenance, and water fees for properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyChargesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Property Charges Tab Component
function PropertyChargesTab() {
  const { toast } = useToast();
  const [selectedFlatNumber, setSelectedFlatNumber] = useState<string>("all");
  const [selectedChargeType, setSelectedChargeType] = useState<string>("all");
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [formData, setFormData] = useState({
    flatNumber: "",
    chargeType: "rent",
    amount: 0,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    nestawayId: "",
  });

  // Load all property charges
  const { data: propertyCharges = [], isLoading: isLoadingCharges } = useQuery<
    PropertyCharge[]
  >({
    queryKey: ["/api/property-charges"],
    queryFn: () =>
      apiRequest("GET", "/api/property-charges").then((res) => res.json()),
  });

  // Load all properties to populate the dropdown
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: () =>
      apiRequest("GET", "/api/properties").then((res) => res.json()),
  });

  // Create mutation for adding a new property charge
  const createChargeMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting property charge data:", data); // Debug log
      const response = await apiRequest("POST", "/api/property-charges", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Charge added successfully",
        description: "The property charge has been added.",
      });
      setIsAddChargeOpen(false);
      setFormData({
        flatNumber: "",
        chargeType: "rent",
        amount: 0,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        nestawayId: "",
      });
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/property-charges"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding charge",
        description: error.message,
        variant: "destructive",
      });
      console.error("Error creating property charge:", error);
    },
  });

  // Helper function to convert charge type to display name
  const getChargeTypeName = (chargeType: string) => {
    switch (chargeType) {
      case "rent":
        return "Rent";
      case "maint_fee":
        return "Maintenance Fee";
      case "water_fee":
        return "Water Fee";
      default:
        return chargeType;
    }
  };

  // Extract unique flat numbers
  const uniqueFlatNumbers: string[] = [];
  if (Array.isArray(properties)) {
    properties.forEach((p) => {
      if (p.flatNumber && !uniqueFlatNumbers.includes(p.flatNumber)) {
        uniqueFlatNumbers.push(p.flatNumber);
      }
    });

    uniqueFlatNumbers.sort((a, b) => {
      // Convert to number if flatNumber is numeric
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      return numA - numB;
    });
  }

  // Filter charges based on selections
  const filteredCharges = Array.isArray(propertyCharges)
    ? propertyCharges.filter((charge) => {
        return (
          (selectedFlatNumber === "all" ||
            selectedFlatNumber === "" ||
            charge.flatNumber === selectedFlatNumber) &&
          (selectedChargeType === "all" ||
            selectedChargeType === "" ||
            charge.chargeType === selectedChargeType)
        );
      })
    : [];

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating property charge with data:", formData);

    // Convert the date string to ISO format
    const effectiveFromDate = new Date(formData.effectiveFrom);
    const formattedDate = effectiveFromDate.toISOString();
    
    // Create a properly formatted data object
    const chargeData = {
      ...formData,
      effectiveFrom: formattedDate,
      effectiveTo: null,
      createdBy: 1 // Use admin user ID as default
    };
    
    console.log("Submitting formatted charge data:", chargeData);
    createChargeMutation.mutate(chargeData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        {/*<div>
          <h2 className="text-xl font-bold">Property Charges Management</h2>
          <p className="text-muted-foreground">
            View and manage property charges including rent, maintenance fees,
            and water fees
          </p>
        </div>*/}

        <Button onClick={() => setIsAddChargeOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New Charge
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Charges History</CardTitle>
          <CardDescription>
            View history of charges for all properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="flatFilter">Filter by Flat Number</Label>
              <Select
                value={selectedFlatNumber}
                onValueChange={setSelectedFlatNumber}
              >
                <SelectTrigger id="flatFilter">
                  <SelectValue placeholder="All Flats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Flats</SelectItem>
                  {uniqueFlatNumbers.map((flatNumber) => (
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
                  <SelectItem value="all">All Charge Types</SelectItem>
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
                    filteredCharges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell className="font-medium">
                          {charge.flatNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              charge.chargeType === "rent"
                                ? "default"
                                : charge.chargeType === "maint_fee"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {getChargeTypeName(charge.chargeType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(charge.amount)}</TableCell>
                        <TableCell>
                          {formatDate(new Date(charge.effectiveFrom))}
                        </TableCell>
                        <TableCell>
                          {charge.effectiveTo ? (
                            <Badge variant="outline">Historical</Badge>
                          ) : (
                            <Badge variant="default">Current</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        {filteredCharges?.length === 0
                          ? "No charges found with the selected filters."
                          : "No property charges found."}
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
              Set a new rate for rent, maintenance fee, or water charge for a
              property.
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
                    onValueChange={(value) => {
                      // Find the property with this flat number
                      const property = properties.find((p: Property) => p.flatNumber === value);
                      // Update form with flat number and nestaway ID if available
                      setFormData({ 
                        ...formData, 
                        flatNumber: value,
                        nestawayId: property?.nestawayId || ""
                      });
                    }}
                    required
                  >
                    <SelectTrigger id="flatNumber">
                      <SelectValue placeholder="Select flat number" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueFlatNumbers.map((flatNumber) => (
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
                    onValueChange={(value) =>
                      setFormData({ ...formData, chargeType: value })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        effectiveFrom: e.target.value,
                      })
                    }
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
                    value={formData.nestawayId}
                    readOnly={true}
                    className="bg-muted"
                    placeholder="Auto-populated from property data"
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
