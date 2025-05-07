import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  MaintenanceRecord,
  insertMaintenanceRecordSchema,
  Property,
  Vendor,
} from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarIcon,
  Loader2,
  Search,
  RotateCw,
  Edit,
  Trash2,
  Plus,
  FilterX,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Create a form schema with Zod that matches only what we need
const maintenanceFormSchema = z.object({
  propertyId: z.number({
    required_error: "Property is required",
  }),
  maintenanceType: z.string({
    required_error: "Maintenance type is required",
  }),
  maintDate: z.coerce.date({
    required_error: "A maintenance date is required",
  }),
  vendorId: z.string().optional(),
  description: z.string().optional(),
});

export default function MaintenanceTrackerPage() {
  const [activeTab, setActiveTab] = useState("add");
  const [selectedRecord, setSelectedRecord] =
    useState<MaintenanceRecord | null>(null);
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState<Date | null>(
    null,
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for maintenance records
  const { data: maintenanceRecords, isLoading: isLoadingRecords } = useQuery<
    MaintenanceRecord[]
  >({
    queryKey: ["/api/maintenance-records"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/maintenance-records");
        const data = await response.json();
        // Convert date strings to Date objects for display
        return data.map((record: any) => ({
          ...record,
          date: record.date || record.maintenanceDate,
        }));
      } catch (error) {
        console.error("Error fetching maintenance records:", error);
        return [];
      }
    },
  });

  // Query for properties
  const properties = [
    { id: 0, flatNumber: "ARDH Building" },
    { id: 1, flatNumber: "Common Areas" },
    { id: 2, flatNumber: "101" },
    { id: 3, flatNumber: "102" },
    { id: 4, flatNumber: "103" },
    { id: 5, flatNumber: "201" },
    { id: 6, flatNumber: "202" },
    { id: 7, flatNumber: "203" },
    { id: 8, flatNumber: "204" },
    { id: 9, flatNumber: "301" },
    { id: 10, flatNumber: "302" },
    { id: 11, flatNumber: "303" },
    { id: 12, flatNumber: "304" },
    { id: 13, flatNumber: "401" },
    { id: 14, flatNumber: "402" },
    { id: 15, flatNumber: "403" },
    { id: 16, flatNumber: "404" },
    { id: 17, flatNumber: "501" },
    { id: 18, flatNumber: "502" },
    { id: 19, flatNumber: "503" },
    { id: 20, flatNumber: "504" },
    { id: 21, flatNumber: "601" },
  ];

  const mainCategory = "General Maintenance Works";

  // Query to fetch subcategor  ies based on selected category
  const { data: subcategories = [], isLoading: isLoadingSubcategories } =
    useQuery({
      queryKey: ["subcategories", mainCategory],
      queryFn: async ({ queryKey }) => {
        const [, currentCategory] = queryKey; // Extract the category from the key
        return apiRequest(
          "GET",
          `/api/expenses/subcategories/${currentCategory}`,
        ).then((res) => res.json());
      },
      enabled: !!mainCategory, // Only run the query if mainCategory has a value
    });

  // Query for vendors
  {
    /*const { data: vendors, isLoading: isLoadingVendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/vendors");
      return await response.json();
    },
  });*/
  }

  // Mutation for creating a maintenance record
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Data to be sent:", data);
      const response = await apiRequest(
        "POST",
        "/api/maintenance-records",
        data,
      );
      if (!response.ok) {
        try {
          const errorData = await response.json();
          let errorMessage = errorData.message || "Failed to create maintenance record";
          
          // Clean any HTML content from error messages
          if (typeof errorMessage === 'string' && (errorMessage.includes('<') && errorMessage.includes('>'))) {
            errorMessage = "An unexpected error occurred. Please try again.";
          }
          
          throw new Error(errorMessage);
        } catch (jsonError) {
          // If JSON parsing fails
          throw new Error(
            `Failed to create maintenance record. Please try again.`,
          );
        }
      }

      try {
        // Try to parse the response body, but don't require it
        return await response.json();
      } catch (err) {
        // If there's no JSON or empty response, still consider it a success
        console.log("No JSON response, but request was successful");
        return { success: true };
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Maintenance record created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-records"] });
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a maintenance record
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest(
        "PUT",
        `/api/maintenance-records/${id}`,
        data,
      );
      if (!response.ok) {
        try {
          const errorData = await response.json();
          let errorMessage = errorData.message || "Failed to update maintenance record";
          
          // Clean any HTML content from error messages
          if (typeof errorMessage === 'string' && (errorMessage.includes('<') && errorMessage.includes('>'))) {
            errorMessage = "An unexpected error occurred. Please try again.";
          }
          
          throw new Error(errorMessage);
        } catch (jsonError) {
          // If JSON parsing fails
          throw new Error(
            `Failed to update maintenance record. Please try again.`,
          );
        }
      }

      try {
        // Try to parse the response body, but don't require it
        return await response.json();
      } catch (err) {
        // If there's no JSON or empty response, still consider it a success
        console.log("No JSON response, but update request was successful");
        return { success: true };
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Maintenance record updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-records"] });
      setActiveTab("view");
      setSelectedRecord(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a maintenance record
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/maintenance-records/${id}`,
      );
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to delete maintenance record",
          );
        } catch (jsonError) {
          // If JSON parsing fails
          throw new Error(
            `Failed to delete maintenance record: ${response.statusText}`,
          );
        }
      }

      try {
        // Try to parse the response body, but don't require it
        return await response.json();
      } catch (err) {
        // If there's no JSON or empty response, still consider it a success
        console.log("No JSON response, but delete request was successful");
        return { success: true };
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Maintenance record deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-records"] });
      setRecordToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Setup form for adding a maintenance record
  const addForm = useForm<z.infer<typeof maintenanceFormSchema>>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      propertyId: undefined,
      maintenanceType: "",
      maintDate: new Date(),
      vendorId: "",
      description: "",
    },
  });

  // Filter records based on selected filters
  const filteredRecords = maintenanceRecords?.filter((record) => {
    let matches = true;
    if (
      filterProperty &&
      filterProperty !== "all" &&
      record.propertyId.toString() !== filterProperty
    ) {
      matches = false;
    }
    if (
      filterType &&
      filterType !== "all" &&
      record.maintenanceType !== filterType
    ) {
      matches = false;
    }
    return matches;
  });

  // Setup form for modifying a maintenance record
  const editForm = useForm<z.infer<typeof maintenanceFormSchema>>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      propertyId: undefined,
      maintenanceType: "",
      maintDate: new Date(),
      vendorId: "",
      description: "",
    },
  });

  const watchMainType = addForm.watch("maintenanceType");
  const activeMaintenanceType =
    watchMainType || selectedRecord?.maintenanceType;

  // Query for Vendors by subcategory
  const { data: vendors = [], isLoading: isLoadingVendors } = useQuery({
    queryKey: ["/api/vendors/by-subcategory", activeMaintenanceType],
    queryFn: async () => {
      if (!activeMaintenanceType) return [];

      return apiRequest(
        "GET",
        `/api/vendors/by-subcategory/${encodeURIComponent(activeMaintenanceType)}`,
      ).then((res) => res.json());
    },
    enabled: !!activeMaintenanceType,
  });

  // Handle property change in Add form - fetch last maintenance date
  const handlePropertyChange = async (
    propertyId: string,
    maintenanceType: string,
  ) => {
    if (propertyId && maintenanceType) {
      try {
        const response = await apiRequest(
          "GET",
          `/api/maintenance-records/last-date/${propertyId}/${encodeURIComponent(maintenanceType)}`,
        );
        const data = await response.json();
        if (data.lastMaintenanceDate) {
          setLastMaintenanceDate(new Date(data.lastMaintenanceDate));
        } else {
          setLastMaintenanceDate(null);
        }
      } catch (error) {
        console.error("Error fetching last maintenance date:", error);
        setLastMaintenanceDate(null);
      }
    } else {
      setLastMaintenanceDate(null);
    }
  };

  // Handle submission of the add form
  const onAddSubmit = async (data: z.infer<typeof maintenanceFormSchema>) => {
    console.log("onAddSubmit triggered with data:", data);

    // Check if data is valid
    if (!data.propertyId || !data.maintenanceType) {
      console.error("Missing required fields:", {
        propertyId: data.propertyId,
        maintenanceType: data.maintenanceType,
      });
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Match the field names with the database column names
      const formattedData = {
        propertyId: Number(data.propertyId),
        maintenanceType: data.maintenanceType,
        date: format(data.maintDate, "yyyy-MM-dd"), // Using the field name that matches the DB
        vendorId: data.vendorId ? Number(data.vendorId) : null,
        description: data.description || "",
        createdBy: 1, // Will be replaced with actual user ID from auth
        flatNumber:
          properties?.find((p) => p.id === Number(data.propertyId))
            ?.flatNumber || "",
      };
      console.log("Formatted data for maintenance record:", formattedData);
      createMutation.mutate(formattedData);
    } catch (error) {
      console.error("Error in onAddSubmit:", error);
      toast({
        title: "Error",
        description: "An error occurred while submitting the form",
        variant: "destructive",
      });
    }
  };

  // Handle submission of the edit form
  const onEditSubmit = (data: z.infer<typeof maintenanceFormSchema>) => {
    if (!selectedRecord) return;

    console.log("Edit form submission triggered with data:", data);

    try {
      // Match the field names with the database column names
      const formattedData = {
        maintenanceType: data.maintenanceType,
        date: format(data.maintDate, "yyyy-MM-dd"), // Using the field name that matches the DB
        vendorId: data.vendorId ? Number(data.vendorId) : null,
        description: data.description || "",
        flatNumber:
          properties?.find((p) => p.id === Number(data.propertyId))
            ?.flatNumber || selectedRecord.flatNumber,
      };

      console.log("Formatted edit data:", formattedData);

      updateMutation.mutate({
        id: selectedRecord.id,
        data: formattedData,
      });
    } catch (error) {
      console.error("Error in onEditSubmit:", error);
      toast({
        title: "Error",
        description: "An error occurred while updating the record",
        variant: "destructive",
      });
    }
  };

  // Handle edit record button click
  const handleEditRecord = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    editForm.reset({
      propertyId: record.propertyId,
      maintenanceType: record.maintenanceType,
      maintDate: new Date(record.date),
      vendorId: record.vendorId ? record.vendorId.toString() : "",
      description: record.description || "",
    });
    setActiveTab("modify");
  };

  // Handle delete record button click
  const handleDeleteRecord = (id: number) => {
    setRecordToDelete(id);
    setIsDeleteDialogOpen(true); // Only open the confirmation dialog here
  };

  // Confirm delete action
  const confirmDelete = () => {
    if (recordToDelete) {
      deleteMutation.mutate(recordToDelete);
    }
    setIsDeleteDialogOpen(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFilterProperty("all");
    setFilterType("all");
  };

  // Effect to monitor property and maintenance type changes in the add form
  useEffect(() => {
    const propertyId = addForm.watch("propertyId");
    const maintenanceType = addForm.watch("maintenanceType");

    if (propertyId && maintenanceType) {
      handlePropertyChange(propertyId.toString(), maintenanceType);
    }
  }, [addForm.watch("propertyId"), addForm.watch("maintenanceType")]);

  // Loading state
  {
    /*if (isLoadingRecords || isLoadingVendors) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }*/
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Maintenance Tracker</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add">Add Record</TabsTrigger>
          <TabsTrigger value="view">View Records</TabsTrigger>
          <TabsTrigger value="modify" disabled={!selectedRecord}>
            Modify Record
          </TabsTrigger>
        </TabsList>

        {/* View Records Tab */}
        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Records</CardTitle>
              <CardDescription>
                View and manage property maintenance records
              </CardDescription>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="filterProperty">Property:</Label>
                  <Select
                    value={filterProperty}
                    onValueChange={setFilterProperty}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Properties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {properties?.map((property) => (
                        <SelectItem
                          key={property.id}
                          value={property.id.toString()}
                        >
                          {property.flatNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="filterType">Maintenance Type:</Label>

                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue
                        placeholder={
                          isLoadingSubcategories
                            ? "Loading..."
                            : "Select Maintenance Type"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((type) => (
                        <SelectItem
                          key={type.expense_sub_category}
                          value={type.expense_sub_category}
                        >
                          {type.expense_sub_category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  className="flex items-center gap-1"
                  onClick={resetFilters}
                >
                  <FilterX className="h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>
                  {filteredRecords?.length
                    ? `Showing ${filteredRecords.length} maintenance records`
                    : "No maintenance records found"}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Maintenance Type</TableHead>
                    <TableHead>Maintenance Date</TableHead>
                    <TableHead>Vendor ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords?.length ? (
                    filteredRecords.map((record) => {
                      const property = properties?.find(
                        (p) => p.id === record.propertyId,
                      );
                      return (
                        <TableRow key={record.id}>
                          <TableCell>{property?.flatNumber || "N/A"}</TableCell>
                          <TableCell>{record.maintenanceType}</TableCell>
                          <TableCell>
                            {format(new Date(record.date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>{record.vendorId}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {record.description}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditRecord(record)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() =>
                                      handleDeleteRecord(record.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this record.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        confirmDelete(); // This triggers the actual deletion
                                      }}
                                    >
                                      Yes, Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        No maintenance records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Record Tab */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add Maintenance Record</CardTitle>
              <CardDescription>
                Create a new maintenance record for a property
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...addForm}>
                <form
                  onSubmit={addForm.handleSubmit(onAddSubmit)}
                  className="space-y-4"
                >
                  {/* Property Selection */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={addForm.control}
                      name="propertyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property/Entity</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(Number(value));
                              const maintenanceType =
                                addForm.getValues("maintenanceType");
                              if (maintenanceType) {
                                handlePropertyChange(value, maintenanceType);
                              }
                            }}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select area" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {properties?.map((property) => (
                                <SelectItem
                                  key={property.id}
                                  value={property.id.toString()}
                                >
                                  {property.flatNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Maintenance Type Selection */}
                    <FormField
                      control={addForm.control}
                      name="maintenanceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maintenance Type</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              const propertyId =
                                addForm.getValues("propertyId");
                              if (propertyId) {
                                handlePropertyChange(
                                  propertyId.toString(),
                                  value,
                                );
                              }
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    isLoadingSubcategories
                                      ? "Loading..."
                                      : "Select Maintenance Type"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subcategories.map((type) => (
                                <SelectItem
                                  key={type.expense_sub_category}
                                  value={type.expense_sub_category}
                                >
                                  {type.expense_sub_category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Last Maintenance Date (Read-only) */}
                    {
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="lastMaintenanceDate">
                          Last Maintenance Date
                        </Label>
                        <Input
                          id="lastMaintenanceDate"
                          value={
                            lastMaintenanceDate
                              ? format(lastMaintenanceDate, "dd/MM/yyyy")
                              : "No previous record"
                          }
                          disabled
                        />
                      </div>
                    }
                    {/* Maintenance Date */}
                    <FormField
                      control={addForm.control}
                      name="maintDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Maintenance Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Vendor Selection */}
                    <FormField
                      control={addForm.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    isLoadingVendors
                                      ? "Loading..."
                                      : "Select a Vendor"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors?.map((vendor) => (
                                <SelectItem
                                  key={vendor.id}
                                  value={vendor.id.toString()} // this must be string
                                >
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />{" "}
                  </div>
                  {/* Description */}
                  <FormField
                    control={addForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter maintenance details"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Direct submission button outside form validation */}
                  <Button
                    type="button"
                    disabled={createMutation.isPending}
                    className="w-full md:w-auto"
                    onClick={() => {
                      console.log("Direct submission button clicked");

                      // Get values directly
                      const values = addForm.getValues();
                      console.log("Form values:", values);

                      // Check required fields manually
                      if (
                        !values.propertyId ||
                        !values.maintenanceType ||
                        !values.maintDate
                      ) {
                        console.log("Missing required fields");
                        toast({
                          title: "Form Error",
                          description:
                            "Please fill in all required fields: Property, Type, and Date",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Create data object directly
                      const maintenanceData = {
                        propertyId: Number(values.propertyId),
                        maintenanceType: values.maintenanceType,
                        date: format(values.maintDate, "yyyy-MM-dd"),
                        vendorId: values.vendorId
                          ? Number(values.vendorId)
                          : null,
                        description: values.description || "",
                        createdBy: 1, // Admin user ID
                        flatNumber:
                          properties?.find(
                            (p) => p.id === Number(values.propertyId),
                          )?.flatNumber || "",
                      };

                      console.log("Submitting data directly:", maintenanceData);

                      // Call mutation directly
                      createMutation.mutate(maintenanceData);
                    }}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add Maintenance Record
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modify Record Tab */}
        <TabsContent value="modify">
          <Card>
            <CardHeader>
              <CardTitle>Modify Maintenance Record</CardTitle>
              <CardDescription>
                Update the selected maintenance record
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedRecord ? (
                <Form {...editForm}>
                  <form
                    onSubmit={editForm.handleSubmit(onEditSubmit)}
                    className="space-y-6"
                  >
                    {/* Property Selection - Read Only */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
                      <Label htmlFor="propertyId">Property</Label>
                      <Input
                        id="propertyId"
                        value={
                          properties?.find(
                            (p) => p.id === selectedRecord.propertyId,
                          )?.flatNumber || "Unknown Property"
                        }
                        disabled
                      />
                      <p className="text-sm text-muted-foreground">
                        Property cannot be changed. Create a new record instead.
                      </p>

                      {/* Maintenance Type - Read Only */}
                      <Label htmlFor="maintenanceType">Maintenance Type</Label>
                      <Input
                        id="maintenanceType"
                        value={selectedRecord.maintenanceType}
                        disabled
                      />
                      <p className="text-sm text-muted-foreground">
                        Maintenance type cannot be changed. Create a new record
                        instead.
                      </p>

                      {/* Maintenance Date */}
                      <FormField
                        control={editForm.control}
                        name="maintDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Maintenance Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground",
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() ||
                                    date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Vendor Selection */}
                      <FormField
                        control={editForm.control}
                        name="vendorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a vendor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {vendors?.map((vendor) => (
                                  <SelectItem
                                    key={vendor.id}
                                    value={vendor.id.toString()}
                                  >
                                    {vendor.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Description */}
                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter maintenance details"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-1/2"
                        onClick={() => {
                          setSelectedRecord(null);
                          setActiveTab("view");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="w-1/2"
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <RotateCw className="mr-2 h-4 w-4" />
                            Update Record
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="text-muted-foreground">No record selected</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("view")}
                  >
                    Go back to view
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
