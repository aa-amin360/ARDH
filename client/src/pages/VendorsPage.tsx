import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { apiRequest, queryClient } from "../lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Loader2, PlusCircle, PencilLine, Trash2, Search } from "lucide-react";

import {
  Vendor,
  //vendorservice_typeEnum,
  vendorProvisionTypeEnum,
} from "@shared/schema";

// Define form validation schema
const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  //service_type: z.enum(vendorservice_typeEnum.enumValues),
  service_type: z.string().min(1, "Service Type is required"),
  provision_type: z.enum(vendorProvisionTypeEnum.enumValues),
  contact_person: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  is_active: z.boolean(),
  created_by: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

export default function VendorsPage() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch vendors
  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    queryFn: () => apiRequest("GET", "/api/vendors").then((res) => res.json()),
  });

  {
    console.log("Vendors: ", vendors);
  }
  //Fetch vendor types
  const { data: service_types = [] } = useQuery({
    queryKey: ["/api/vendors/service-types"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vendors/service-types");
      return res.json();
    },
  });

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      service_type: "", // Valid enum value from vendorservice_typeEnum - lowercase is crucial
      provision_type: "Service Provider", // Default provision type
      contact_person: "",
      address: "",
      notes: "",
      is_active: true,
      created_by: user?.id || 0,
    },
  });

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/vendors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Vendor added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<FormValues>;
    }) => {
      const res = await apiRequest("PUT", `/api/vendors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsEditDialogOpen(false);
      setSelectedVendor(null);
      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/vendors/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsDeleteDialogOpen(false);
      setSelectedVendor(null);
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler for form submission
  function onSubmit(data: FormValues) {
    console.log("Form data:", data);
    // Set created_by field
    const submitData = {
      ...data,
      created_by: user?.id || 1,
      // Convert empty strings to undefined (not null) for optional fields
      email: data.email === "" ? undefined : data.email,
      contact_person:
        data.contact_person === "" ? undefined : data.contact_person,
      address: data.address === "" ? undefined : data.address,
      notes: data.notes === "" ? undefined : data.notes,
    };

    if (selectedVendor && isEditDialogOpen) {
      updateVendorMutation.mutate({ id: selectedVendor.id, data: submitData });
    } else {
      createVendorMutation.mutate(submitData);
    }
  }

  // Open edit dialog and populate form
  function openEditDialog(vendor: Vendor) {
    setSelectedVendor(vendor);
    form.reset({
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email || "",
      service_type: vendor.service_type,
      provision_type: vendor.provision_type,
      contact_person: vendor.contact_person || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
      is_active: vendor.is_active,
      created_by: vendor.created_by,
    });
    setIsEditDialogOpen(true);
  }

  // Open delete dialog
  function openDeleteDialog(vendor: Vendor) {
    setSelectedVendor(vendor);
    setIsDeleteDialogOpen(true);
  }

  // Filter vendors based on search query
  const filteredVendors = vendors.filter((vendor) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      vendor.name.toLowerCase().includes(query) ||
      vendor.service_type.toLowerCase().includes(query) ||
      vendor.phone.toLowerCase().includes(query) ||
      (vendor.email?.toLowerCase() || "").includes(query)
    );
  });

  // Get service type display name
  function getserviceTypeName(type?: string): string {
    if (!type) {
      console.warn("getserviceTypeName called with undefined type");
      return "";
    }
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Get provision type display name
  function getprovisionTypeName(type: string): string {
    if (type === "service") return "Service Provider";
    if (type === "product") return "Product Supplier";
    if (type === "both") return "Both Services & Products";
    return type;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Vendors Management
          </h1>
          <p className="text-muted-foreground">
            Manage service providers and suppliers.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Vendors</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Vendors</TabsTrigger>
                <TabsTrigger value="utility">Utility</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="other">Others</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredVendors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? "No vendors found matching your search criteria."
                      : "No vendors added yet. Click 'Add Vendor' to create one."}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Service Type</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVendors.map((vendor) => (
                          <TableRow key={vendor.id}>
                            <TableCell className="font-medium">
                              {vendor.name}
                            </TableCell>
                            <TableCell>
                              {vendor.service_type}
                              <div className="text-xs text-muted-foreground">
                                {vendor.provision_type}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>{vendor.phone}</div>
                              {vendor.email && (
                                <div className="text-xs text-muted-foreground">
                                  {vendor.email}
                                </div>
                              )}
                              {vendor.contact_person && (
                                <div className="text-xs">
                                  Contact: {vendor.contact_person}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {vendor.notes || "-"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-xs ${
                                  vendor.is_active
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {vendor.is_active ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(vendor)}
                              >
                                <PencilLine className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(vendor)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Other tabs with filtered lists */}
              {["utility", "maintenance", "other"].map((category) => (
                <TabsContent key={category} value={category}>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Service Type</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredVendors
                            .filter((vendor) => {
                              if (category === "utility") {
                                return [
                                  "electrical",
                                  "plumbing",
                                  "water",
                                  "wifi",
                                  "trash_collection",
                                ].includes(vendor.service_type);
                              } else if (category === "maintenance") {
                                return [
                                  "paint_job",
                                  "wood_work",
                                  "cleaning",
                                  "pest_control",
                                  "hvac",
                                  "security",
                                  "landscaping",
                                ].includes(vendor.service_type);
                              } else if (category === "other") {
                                return vendor.service_type === "other";
                              }
                              return false;
                            })
                            .map((vendor) => (
                              <TableRow key={vendor.id}>
                                <TableCell className="font-medium">
                                  {vendor.name}
                                </TableCell>
                                <TableCell>
                                  {getserviceTypeName(vendor.service_type)}
                                  <div className="text-xs text-muted-foreground">
                                    {vendor.provision_type === "service"
                                      ? "Service Provider"
                                      : "Supplier"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>{vendor.phone}</div>
                                  {vendor.email && (
                                    <div className="text-xs text-muted-foreground">
                                      {vendor.email}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {vendor.notes || "-"}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-block px-2 py-1 rounded-full text-xs ${
                                      vendor.is_active
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {vendor.is_active ? "Active" : "Inactive"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(vendor)}
                                  >
                                    <PencilLine className="h-4 w-4" />
                                  </Button>
                                  {isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDeleteDialog(vendor)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Add Vendor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Enter the vendor details below. Click save when you're done.
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
                      <FormLabel>Vendor Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter vendor name" {...field} />
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
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="service_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {service_types.map((type: string) => (
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
                <FormField
                  control={form.control}
                  name="provision_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provision Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provision type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendorProvisionTypeEnum.enumValues.map((type) => (
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email address"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter contact person name"
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter address"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Is this vendor currently active and available for work?
                      </p>
                    </div>
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
                <Button type="submit" disabled={createVendorMutation.isPending}>
                  {createVendorMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update the vendor details below. Click save when you're done.
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
                      <FormLabel>Vendor Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter vendor name" {...field} />
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
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="service_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {service_types.map((type: string) => (
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
                <FormField
                  control={form.control}
                  name="provision_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provision Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provision type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendorProvisionTypeEnum.enumValues.map((type) => (
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email address"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter contact person name"
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter address"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Is this vendor currently active and available for work?
                      </p>
                    </div>
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
                <Button type="submit" disabled={updateVendorMutation.isPending}>
                  {updateVendorMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this vendor? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedVendor && (
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Name:</span>{" "}
                  {selectedVendor.name}
                </p>
                <p>
                  <span className="font-semibold">Service Type:</span>{" "}
                  {getserviceTypeName(selectedVendor.service_type)}
                </p>
                <p>
                  <span className="font-semibold">Phone:</span>{" "}
                  {selectedVendor.phone}
                </p>
              </div>
            )}
          </div>
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
              disabled={deleteVendorMutation.isPending}
              onClick={() => {
                if (selectedVendor) {
                  deleteVendorMutation.mutate(selectedVendor.id);
                }
              }}
            >
              {deleteVendorMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
