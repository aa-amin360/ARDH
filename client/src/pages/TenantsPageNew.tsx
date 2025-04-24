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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Search,
  Upload,
  FileSpreadsheet,
} from "lucide-react";

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
    queryFn: () => apiRequest("GET", "/api/tenants").then((res) => res.json()),
    staleTime: 1000,
    onSuccess: (data) => {
      console.log("Tenants data fetched:", data);
    },
    onError: (error) => {
      console.error("Error fetching tenants:", error);
    },
  });

  // Use state for properties to ensure we have control over the data
  const [loadingProperties, setLoadingProperties] = useState(true);

  // Fetch properties using a direct approach
  const properties = [
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

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (values: TenantFormValues) => {
      const res = await apiRequest("POST", "/api/tenants", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create tenant: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async (values: TenantFormValues & { id: number }) => {
      const { id, ...updateData } = values;
      const res = await apiRequest("PATCH", `/api/tenants/${id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsEditDialogOpen(false);
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
      const res = await apiRequest("DELETE", `/api/tenants/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete tenant: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filtered tenants based on search query
  const filteredTenants = React.useMemo(() => {
    if (!Array.isArray(tenants)) return [];
    if (!searchQuery) return tenants;

    const lowerCaseQuery = searchQuery.toLowerCase();
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(lowerCaseQuery) ||
        tenant.flatNumber?.toLowerCase().includes(lowerCaseQuery) ||
        tenant.phone?.toLowerCase().includes(lowerCaseQuery) ||
        tenant.email?.toLowerCase().includes(lowerCaseQuery),
    );
  }, [tenants, searchQuery]);

  // Helper function to get property flat number from propertyId
  const getPropertyFlatNumber = (propertyId: number): string => {
    const property = properties.find((p) => p.id === propertyId);
    return property ? property.flatNumber : `Property #${propertyId}`;
  };

  // Status colors for badges
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "inactive":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "notice_period":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      default:
        return "bg-slate-100 text-slate-800 hover:bg-slate-100";
    }
  };

  // Add tenant form
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        phone: z.string().min(10, "Phone must be at least 10 characters"),
        email: z.string().email("Invalid email format"),
        propertyId: z.number().min(1, "Property is required"),
        flatNumber: z.string(),
        leaseStartDate: z.date(),
        leaseEndDate: z.date(),
        rentAmount: z.number().min(1, "Rent must be greater than 0"),
        securityDeposit: z.number().min(0),
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
      flatNumber: "",
      leaseStartDate: new Date(),
      leaseEndDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1),
      ),
      rentAmount: 0,
      securityDeposit: 0,
      status: "active",
      notes: "",
      createdBy: 0,
    },
  });

  // Edit form
  const editForm = useForm<TenantFormValues & { id: number }>({
    resolver: zodResolver(
      z.object({
        id: z.number(),
        name: z.string().min(2, "Name must be at least 2 characters"),
        phone: z.string().min(10, "Phone must be at least 10 characters"),
        email: z.string().email("Invalid email format"),
        propertyId: z.number().min(1, "Property is required"),
        flatNumber: z.string(),
        leaseStartDate: z.date(),
        leaseEndDate: z.date(),
        rentAmount: z.number().min(1, "Rent must be greater than 0"),
        securityDeposit: z.number().min(0),
        status: z.enum(["active", "inactive", "notice_period"]),
        notes: z.string().optional(),
        createdBy: z.number(),
      }),
    ),
    defaultValues: {
      id: 0,
      name: "",
      phone: "",
      email: "",
      propertyId: 0,
      flatNumber: "",
      leaseStartDate: new Date(),
      leaseEndDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1),
      ),
      rentAmount: 0,
      securityDeposit: 0,
      status: "active",
      notes: "",
      createdBy: 0,
    },
  });

  // Effect to populate edit form when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      editForm.reset({
        id: selectedTenant.id,
        name: selectedTenant.name,
        phone: selectedTenant.phone || "",
        email: selectedTenant.email || "",
        propertyId: selectedTenant.propertyId,
        flatNumber: selectedTenant.flatNumber || "",
        leaseStartDate: new Date(selectedTenant.leaseStartDate),
        leaseEndDate: new Date(selectedTenant.leaseEndDate),
        rentAmount: selectedTenant.rentAmount,
        securityDeposit: selectedTenant.securityDeposit || 0,
        status: selectedTenant.status as any,
        notes: selectedTenant.notes || "",
        createdBy: selectedTenant.createdBy || user?.id || 0,
      });
    }
  }, [selectedTenant, editForm, user]);

  // Submit handler for add form
  function onSubmit(values: TenantFormValues) {
    createTenantMutation.mutate({
      ...values,
      createdBy: user?.id || 0,
    });
  }

  // Submit handler for edit form
  function onEditSubmit(values: TenantFormValues & { id: number }) {
    updateTenantMutation.mutate(values);
  }

  // Submit handler for delete confirmation
  function onDeleteConfirm() {
    if (selectedTenant) {
      deleteTenantMutation.mutate(selectedTenant.id);
    }
  }

  return (
    <Card className="container mx-auto mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-bold">
            Tenant Management
          </CardTitle>
          <CardDescription>
            Manage tenant information and leases
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
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
        <Tabs defaultValue="view">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="view">View Tenants</TabsTrigger>
            <TabsTrigger value="add">Add Tenant</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          {/* View Tenants Tab */}
          <TabsContent value="view" className="mt-4">
            {loadingTenants ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "No tenants found matching your search criteria."
                  : "No tenants found. Use the 'Add Tenant' tab to create one."}
              </div>
            ) : (
              <div>
                {/* Last Entered Records */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Last Entered Records
                  </h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead>Rent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(filteredTenants) &&
                        filteredTenants.length > 0 ? (
                          filteredTenants.slice(0, 5).map((tenant: any) => (
                            <TableRow key={`tenant-${tenant.id}`}>
                              <TableCell className="font-medium">
                                {tenant.name}
                              </TableCell>
                              <TableCell>
                                {tenant.flatNumber ||
                                  getPropertyFlatNumber(tenant.propertyId)}
                              </TableCell>
                              <TableCell>
                                ₹{tenant.rentAmount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getStatusColor(tenant.status)}
                                >
                                  {tenant.status.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {format(
                                  new Date(tenant.createdAt || new Date()),
                                  "dd MMM yyyy",
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              No tenant records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* All Tenants table */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">All Tenants</h3>
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
                        {Array.isArray(filteredTenants) &&
                        filteredTenants.length > 0 ? (
                          filteredTenants.map((tenant: any) => (
                            <TableRow key={`all-${tenant.id}`}>
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
                                  {format(
                                    new Date(tenant.leaseEndDate),
                                    "dd MMM yyyy",
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                ₹{tenant.rentAmount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getStatusColor(tenant.status)}
                                >
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
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              No tenant records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Add Tenant Tab */}
          <TabsContent value="add" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Tenant</CardTitle>
                <CardDescription>
                  Fill out the form below to add a new tenant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    {/* Form fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter tenant name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number" {...field} />
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
                              <Input placeholder="Enter email address" {...field} />
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
                                field.onChange(parseInt(value));
                                // Automatically set flatNumber based on propertyId
                                const property = properties.find(p => p.id === parseInt(value));
                                if (property) {
                                  form.setValue("flatNumber", property.flatNumber);
                                }
                              }}
                              value={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select property" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {properties.map((property) => (
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

                      <FormField
                        control={form.control}
                        name="rentAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rent Amount (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="Enter rent amount"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
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
                                min="0"
                                placeholder="Enter security deposit"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="notice_period">Notice Period</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter additional notes about the tenant"
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Submit button */}
                    <Button
                      type="submit"
                      className="mt-4"
                      disabled={createTenantMutation.isPending}
                    >
                      {createTenantMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Tenant
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Upload Tab */}
          <TabsContent value="bulk" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Upload Tenants</CardTitle>
                <CardDescription>
                  Upload a CSV file with tenant details for bulk adding.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-12">
                  <p className="text-muted-foreground">
                    Bulk upload functionality is under development.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update the tenant's information.
            </DialogDescription>
          </DialogHeader>
          {/* Edit form */}
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tenant?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteConfirm}
              disabled={deleteTenantMutation.isPending}
            >
              {deleteTenantMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
