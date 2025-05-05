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

// Create a form schema with Zod that extends the insertMaintenanceRecordSchema
const maintenanceFormSchema = insertMaintenanceRecordSchema.extend({
  date: z.coerce.date({
    required_error: "A maintenance date is required",
  }),
  maintenanceDate: z.coerce.date({
    required_error: "A maintenance date is required",
  }),
});

// Define maintenance types
const maintenanceTypes = [
  "Water Tank Cleaning",
  "Elevator Maintenance",
  "Fire Extinguisher Refill",
  "Pest Control",
  "Garden Maintenance",
  "AC Servicing",
  "Electrical Maintenance",
  "Plumbing Maintenance",
  "Painting",
  "Security System Maintenance",
];

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
      const response = await apiRequest("GET", "/api/maintenance-records");
      return await response.json();
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

  // Query for vendors
  const { data: vendors, isLoading: isLoadingVendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/vendors");
      return await response.json();
    },
  });

  // Mutation for creating a maintenance record
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST",
        "/api/maintenance-records",
        data,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to create maintenance record",
        );
      }
      return await response.json();
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
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update maintenance record",
        );
      }
      return await response.json();
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
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to delete maintenance record",
        );
      }
      return await response.json();
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
      date: new Date(),
      maintenanceDate: new Date(),
      vendorId: null,
      description: "",
    },
  });

  // Setup form for modifying a maintenance record
  const editForm = useForm<z.infer<typeof maintenanceFormSchema>>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      propertyId: undefined,
      maintenanceType: "",
      date: new Date(),
      maintenanceDate: new Date(),
      vendorId: null,
      description: "",
    },
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
  const onAddSubmit = (data: z.infer<typeof maintenanceFormSchema>) => {
    createMutation.mutate({
      propertyId: Number(data.propertyId),
      maintenanceType: data.maintenanceType,
      date: format(data.date, "yyyy-MM-dd"),
      maintenanceDate: format(data.maintenanceDate, "yyyy-MM-dd"),
      vendor: data.vendorId,
      description: data.description,
    });
  };

  // Handle submission of the edit form
  const onEditSubmit = (data: z.infer<typeof maintenanceFormSchema>) => {
    if (!selectedRecord) return;

    updateMutation.mutate({
      id: selectedRecord.id,
      data: {
        maintenanceType: data.maintenanceType,
        date: format(data.date, "yyyy-MM-dd"),
        maintenanceDate: format(data.maintenanceDate, "yyyy-MM-dd"),
        vendor: data.vendorId,
        description: data.description,
      },
    });
  };

  // Handle edit record button click
  const handleEditRecord = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    editForm.reset({
      propertyId: record.propertyId,
      maintenanceType: record.maintenanceType,
      date: new Date(record.date),
      maintenanceDate: new Date(record.date),
      vendorId: record.vendorId,
      description: record.description,
    });
    setActiveTab("modify");
  };

  // Handle delete record button click
  const handleDeleteRecord = (id: number) => {
    setRecordToDelete(id);
    setIsDeleteDialogOpen(true);
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

  // Effect to monitor property and maintenance type changes in the add form
  useEffect(() => {
    const propertyId = addForm.watch("propertyId");
    const maintenanceType = addForm.watch("maintenanceType");

    if (propertyId && maintenanceType) {
      handlePropertyChange(propertyId.toString(), maintenanceType);
    }
  }, [addForm.watch("propertyId"), addForm.watch("maintenanceType")]);

  // Loading state
  if (isLoadingRecords || isLoadingVendors) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {maintenanceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
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
                    <TableHead>Vendor</TableHead>
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
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteRecord(record.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                          <FormLabel>Property</FormLabel>
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
                                <SelectValue placeholder="Select a property" />
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
                                <SelectValue placeholder="Select maintenance type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {maintenanceTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
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
                      name="maintenanceDate"
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
                                <SelectValue placeholder="Select a vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">No Vendor</SelectItem>
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
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Record...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Maintenance Record
                        </>
                      )}
                    </Button>
                  </div>
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
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        name="maintenanceDate"
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
                                <SelectItem value={"0"}>No Vendor</SelectItem>
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
