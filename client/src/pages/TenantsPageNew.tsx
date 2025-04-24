import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { queryClient, apiRequest } from "../lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { DatePicker } from "../components/ui/date-picker";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Loader2, PlusCircle, Edit, Trash2, Search } from "lucide-react";

import { Tenant, InsertTenant, Property } from "@shared/schema";
import { FLATS } from "@shared/constants";

// Define the tenant form values type with the flat_number field
type TenantFormValues = {
  name: string;
  phone: string;
  email: string;
  propertyId: number;
  flatNumber: string; // Added flat_number field
  leaseStartDate: Date;
  leaseEndDate: Date;
  rentAmount: number;
  securityDeposit: number;
  status: "active" | "inactive" | "notice_period";
  notes?: string;
  createdBy: number;
};

// Hardcoded flat numbers as requested
const FLAT_NUMBERS = [
  "101", "102", "103", "201", "202", "203", "204", 
  "301", "302", "303", "304", "401", "402", "403", 
  "404", "501", "502", "503", "504"
];

export default function TenantsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch tenants with console logging for debugging
  const { data: tenants = [], isLoading: loadingTenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
    staleTime: 1000,
    onSuccess: (data) => {
      console.log("Tenants loaded:", data.length);
    },
    onError: (error) => {
      console.error("Error fetching tenants:", error);
    }
  });

  // Use state for properties to ensure we have control over the data
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  
  // Fetch properties using a direct approach
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoadingProperties(true);
        const response = await fetch('/api/properties', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch properties: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Properties loaded for tenant form:", data.length);
        setProperties(data);
      } catch (error) {
        console.error("Error loading properties:", error);
        toast({
          title: "Error",
          description: "Failed to load properties. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingProperties(false);
      }
    };
    
    fetchProperties();
  }, [toast]);

  // Sort properties by flat number in ascending order
  const sortedProperties = [...properties].sort((a, b) =>
    a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }),
  );

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (values: TenantFormValues) => {
      const res = await apiRequest("POST", "/api/tenants", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant added successfully.",
      });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add tenant: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: TenantFormValues;
    }) => {
      const res = await apiRequest("PATCH", `/api/tenants/${id}`, values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant updated successfully.",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update tenant: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tenants/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete tenant: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Define form for add/edit tenant with validation schema
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(
      z.object({
        name: z.string().min(3, "Name must be at least 3 characters"),
        phone: z
          .string()
          .min(10, "Contact number must be at least 10 characters"),
        email: z.string().email("Please enter a valid email address"),
        propertyId: z.number().min(1, "Please select a property"),
        flatNumber: z.string().min(1, "Flat number is required"),
        leaseStartDate: z.date(),
        leaseEndDate: z.date(),
        rentAmount: z.number().min(1, "Rent amount must be greater than 0"),
        securityDeposit: z
          .number()
          .min(0, "Security deposit must be 0 or greater"),
        status: z.enum(["active", "inactive", "notice_period"]),
        notes: z.string().optional(),
        createdBy: z.number(),
      }),
    ),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      propertyId: 0,
      flatNumber: "", // Default value for flatNumber
      leaseStartDate: new Date(),
      leaseEndDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1),
      ),
      rentAmount: 0,
      securityDeposit: 0,
      status: "active",
      notes: "",
      createdBy: user?.id || 1,
    },
  });

  // When a tenant is selected for editing, populate the form
  useEffect(() => {
    if (selectedTenant && isEditDialogOpen) {
      form.reset({
        name: selectedTenant.name,
        phone: selectedTenant.phone,
        email: selectedTenant.email || "",
        propertyId: selectedTenant.propertyId,
        flatNumber: selectedTenant.flatNumber || "", // Get flatNumber from tenant record
        leaseStartDate: new Date(selectedTenant.leaseStartDate),
        leaseEndDate: new Date(selectedTenant.leaseEndDate),
        rentAmount: selectedTenant.rentAmount,
        securityDeposit: selectedTenant.securityDeposit,
        status: selectedTenant.status,
        notes: selectedTenant.notes || "",
        createdBy: selectedTenant.createdBy,
      });
    }
  }, [selectedTenant, isEditDialogOpen, form]);

  // Reset form when add dialog is opened
  useEffect(() => {
    if (isAddDialogOpen) {
      form.reset({
        name: "",
        phone: "",
        email: "",
        propertyId: 0,
        flatNumber: "", // Added flatNumber
        leaseStartDate: new Date(),
        leaseEndDate: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1),
        ),
        rentAmount: 0,
        securityDeposit: 0,
        status: "active",
        notes: "",
        createdBy: user?.id || 1,
      });
    }
  }, [isAddDialogOpen, form, user]);

  // Handle form submission
  function onSubmit(values: TenantFormValues) {
    if (selectedTenant && isEditDialogOpen) {
      updateTenantMutation.mutate({ id: selectedTenant.id, values });
    } else {
      createTenantMutation.mutate(values);
    }
  }

  // Filter tenants based on search query
  const filteredTenants = tenants.filter((tenant) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(query) ||
      tenant.email?.toLowerCase().includes(query) ||
      tenant.phone.toLowerCase().includes(query) ||
      getPropertyFlatNumber(tenant.propertyId)?.toLowerCase().includes(query)
    );
  });

  // Helper function to get property flat number
  function getPropertyFlatNumber(propertyId: number): string {
    const property = properties.find((p) => p.id === propertyId);
    return property ? property.flatNumber : "Unknown";
  }

  // Status badge color
  function getStatusColor(status: string): string {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "notice_period":
        return "bg-amber-500";
      case "inactive":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tenants Management
          </h1>
          <p className="text-muted-foreground">
            Manage tenant information, lease details, and status.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tenants</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTenants ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No tenants found matching your search criteria."
                : "No tenants found. Click 'Add Tenant' to create one."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Lease Period</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        {tenant.name}
                      </TableCell>
                      <TableCell>
                        {tenant.flatNumber ||
                          getPropertyFlatNumber(tenant.propertyId)}
                      </TableCell>
                      <TableCell>
                        <div>{tenant.phone}</div>
                        <div className="text-sm text-muted-foreground">
                          {tenant.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {format(
                            new Date(tenant.leaseStartDate),
                            "dd MMM yyyy",
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          to{" "}
                          {format(new Date(tenant.leaseEndDate), "dd MMM yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        ₹{tenant.rentAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(tenant.status)}>
                          {tenant.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Tenant Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>
              Enter the tenant details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Tenant name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          // Update the propertyId field
                          field.onChange(Number(value));

                          // When a property is selected, update the flatNumber field automatically
                          const selectedProperty = properties.find(
                            (p) => p.id === Number(value),
                          );
                          if (selectedProperty) {
                            form.setValue(
                              "flatNumber",
                              selectedProperty.flatNumber,
                            );
                          }
                        }}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Hardcoded flat numbers as requested */}
                          {FLAT_NUMBERS.map((flatNumber) => {
                            // Find property with this flat number
                            const property = properties.find(p => p.flatNumber === flatNumber);
                            if (!property) return null;
                            
                            // Find if this flat is in our predefined list
                            const flatInfo = FLATS.find(f => f.flatNumber === flatNumber);
                            
                            return (
                              <SelectItem
                                key={property.id}
                                value={property.id.toString()}
                              >
                                {flatNumber} ({flatInfo?.flatType || property.flatType})
                              </SelectItem>
                            );
                          }).filter(Boolean)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter phone number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="leaseStartDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Lease Start Date</FormLabel>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="leaseEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Lease End Date</FormLabel>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter monthly rent"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="securityDeposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Deposit (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter security deposit"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="notice_period">
                          Notice Period
                        </SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes or additional information"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTenantMutation.isPending}
                >
                  {createTenantMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Tenant"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update the tenant details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Tenant name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(Number(value));
                          const selectedProperty = properties.find(
                            (p) => p.id === Number(value),
                          );
                          if (selectedProperty) {
                            form.setValue(
                              "flatNumber",
                              selectedProperty.flatNumber,
                            );
                          }
                        }}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Hardcoded flat numbers as requested */}
                          {FLAT_NUMBERS.map((flatNumber) => {
                            // Find property with this flat number
                            const property = properties.find(p => p.flatNumber === flatNumber);
                            if (!property) return null;
                            
                            // Find if this flat is in our predefined list
                            const flatInfo = FLATS.find(f => f.flatNumber === flatNumber);
                            
                            return (
                              <SelectItem
                                key={property.id}
                                value={property.id.toString()}
                              >
                                {flatNumber} ({flatInfo?.flatType || property.flatType})
                              </SelectItem>
                            );
                          }).filter(Boolean)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Rest of the form fields same as Add Tenant dialog */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter phone number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="leaseStartDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Lease Start Date</FormLabel>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="leaseEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Lease End Date</FormLabel>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter monthly rent"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="securityDeposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Deposit (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter security deposit"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="notice_period">
                          Notice Period
                        </SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes or additional information"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTenantMutation.isPending}
                >
                  {updateTenantMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedTenant?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (selectedTenant) {
                  deleteTenantMutation.mutate(selectedTenant.id);
                }
              }}
              disabled={deleteTenantMutation.isPending}
            >
              {deleteTenantMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Tenant"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}