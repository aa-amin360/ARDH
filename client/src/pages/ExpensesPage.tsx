import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, FileSpreadsheet } from "lucide-react";
import { insertExpenseSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
// import ExpenseBulkUpload from "@/components/bulk-upload/ExpenseBulkUpload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Extended schema with validation
const expenseFormSchema = insertExpenseSchema.extend({
  amount: z.coerce.number().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
  attachmentUrl: z.string().optional(), // Making attachmentUrl optional

  // Water tanker specific fields
  tankerNumber: z.string().optional(),
  liters: z.coerce.number().optional(),
  personInCharge: z.string().optional(),
  driverContact: z.string().optional(),
  time: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function ExpensesPage() {
  /*const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors/by-subcategory", form.watch("subcategory")],
    queryFn: () => 
      apiRequest("GET", `/api/vendors/by-subcategory/${form.watch("subcategory")}`).then((res) => res.json()),
    enabled: !!form.watch("subcategory"),
  });*/
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("view");
  const [selectedCategory, setSelectedCategory] = React.useState("utility");

  // Query to fetch expenses
  const {
    data: expenses = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: () => apiRequest("GET", "/api/expenses").then((res) => res.json()),
  });

  // Query to fetch properties for dropdown
  const properties = [
    { id: 0, flatNumber: "ARDH Building" },
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

  // Query to fetch expense categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/expenses/categories"],
    queryFn: () =>
      apiRequest("GET", "/api/expenses/categories").then((res) => res.json()),
  });

  // Query to fetch subcategories based on selected category
  const { data: subcategories = [], isLoading: isLoadingSubcategories } =
    useQuery({
      queryKey: ["/api/expenses/subcategories", watchCategory],
      queryFn: async () => {
        if (!watchCategory) return [];
        return apiRequest(
          "GET",
          `/api/expenses/subcategories/${watchCategory}`,
        ).then((res) => res.json());
      },
      enabled: !!watchCategory,
    });

  // Query to fetch vendors based on selected subcategory
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors/by-service/:serviceType", watchSubcategory],
    queryFn: async () => {
      if (!watchSubcategory) return [];
      return apiRequest(
        "GET",
        `/api/vendors/by-subcategory/${watchSubcategory}`,
      ).then((res) => res.json());
    },
    enabled: !!watchSubcategory,
  });

  // Fallback to all vendors if no subcategory-specific vendors found
  const { data: allVendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: () => apiRequest("GET", "/api/vendors").then((res) => res.json()),
  });

  // Filtered vendors based on selected sub-category
  const filteredVendors = React.useMemo(() => {
    if (!Array.isArray(vendors)) return [];

    // Map service type to category
    const serviceToCategory: Record<string, string> = {
      electrical: "utility",
      plumbing: "general_maintenance",
      construction: "capital_expense",
      security: "operational",
      housekeeping: "operational",
      internet_provider: "utility",
      general: "others",
    };

    return vendors.filter(
      (vendor) =>
        !selectedCategory ||
        serviceToCategory[vendor.serviceType] === selectedCategory,
    );
  }, [vendors, selectedCategory]);

  // Format date for display
  const formatDate = (date: string | Date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Mutation to add expense
  const addExpenseMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const res = await apiRequest("POST", "/api/expenses", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense added",
        description: "The expense has been added successfully.",
      });
      form.reset({
        category: "",
        subcategory: "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        description: "",
        vendorId: 0,
        propertyId: null,
        attachmentUrl: "",
        createdBy: 0,

        // Reset water tanker specific fields
        tankerNumber: "",
        liters: 0,
        personInCharge: "",
        driverContact: "",
        time: "",
      });
      setSelectedCategory("utility");
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: "",
      subcategory: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      description: "",
      vendorId: 0,
      propertyId: null,
      attachmentUrl: "",
      createdBy: 0,

      // Water tanker specific fields
      tankerNumber: "",
      liters: 0,
      personInCharge: "",
      driverContact: "",
      time: "",
    },
  });

  // Watch fields to update dependent dropdowns
  const watchCategory = form.watch("category");
  const watchSubcategory = form.watch("subcategory");

  // Query to fetch vendors based on selected subcategory
  const { data: vendorsBySubcategory = [], isLoading: isLoadingVendors } =
    useQuery({
      queryKey: ["/api/vendors/by-subcategory", watchSubcategory],
      queryFn: async () => {
        if (!watchSubcategory) return [];
        return apiRequest(
          "GET",
          `/api/vendors/by-subcategory/${watchSubcategory}`,
        ).then((res) => res.json());
      },
      enabled: !!watchSubcategory,
    });

  // Update category and subcategory state
  React.useEffect(() => {
    setSelectedCategory(watchCategory);

    // Reset subcategory when category changes
    if (watchCategory && subcategories && subcategories.length > 0) {
      const newSubcategory =
        subcategories.length > 0 ? subcategories[0].expense_sub_category : "";
      form.setValue("subcategory", newSubcategory);
    }
  }, [watchCategory, subcategories, form]);

  function onSubmit(values: ExpenseFormValues) {
    // Process the values for submission
    const formattedValues = {
      ...values,
      createdBy: user?.id || 0,
    };

    addExpenseMutation.mutate(formattedValues);
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Expense Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="view">View Expenses</TabsTrigger>
          <TabsTrigger value="add">Add Expense</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
              <CardDescription>
                Enter the details of the expense you want to add.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category: any) => (
                                <SelectItem
                                  key={category.expense_category}
                                  value={category.expense_category || "unknown"}
                                >
                                  {category.expense_category || "Unknown"}
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
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subcategory" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subcategories.map((subcategory: any) => (
                                <SelectItem
                                  key={subcategory.expense_sub_category}
                                  value={
                                    subcategory.expense_sub_category ||
                                    "unknown"
                                  }
                                >
                                  {subcategory.expense_sub_category ||
                                    "Unknown"}
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
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Enter amount"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={
                                field.value instanceof Date
                                  ? field.value.toISOString().split("T")[0]
                                  : field.value
                              }
                            />
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
                              const parsed = parseInt(value);
                              if (!isNaN(parsed)) field.onChange(parsed);
                            }}
                            value={
                              field.value !== null && field.value !== undefined
                                ? field.value.toString()
                                : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Common Areas</SelectItem>
                              {Array.isArray(properties) &&
                                properties
                                  .filter((property) => property.id) // Avoid nulls/undefined
                                  .map((property) => (
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
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value?.toString() || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Vendor</SelectItem>
                              {vendors && vendors.length > 0 ? (
                                vendors
                                  .filter((vendor: any) => vendor?.id)
                                  .map((vendor: any) => (
                                    <SelectItem
                                      key={vendor.id}
                                      value={vendor.id.toString()}
                                    >
                                      {vendor.name}
                                    </SelectItem>
                                  ))
                              ) : (
                                <SelectItem value="no_vendors_found" disabled>
                                  No vendors found for this subcategory
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Water Tanker specific fields */}
                  {watchCategory === "utility" &&
                    form.watch("subcategory") === "water_tank_fill" && (
                      <div className="space-y-4 border rounded-md p-4 bg-slate-50">
                        <h3 className="text-lg font-medium">
                          Water Tanker Details
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="tankerNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tanker Number</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter tanker number"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="liters"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Liters Discharged</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter liters"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="personInCharge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Driver Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter driver name"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="driverContact"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Driver Contact</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter driver contact"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="time"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Time Filled</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter expense description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="attachmentUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attachment (optional)</FormLabel>
                        <FormControl>
                          <div className="flex flex-col gap-2">
                            <Input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                              className="cursor-pointer"
                              onChange={(e) => {
                                // This just stores the file name for demo purposes
                                // In a real implementation, you would upload the file to a server
                                const fileName =
                                  e.target.files?.[0]?.name || "";
                                field.onChange(fileName);
                              }}
                            />
                            {field.value && (
                              <div className="text-xs text-muted-foreground">
                                Selected file: {field.value}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={addExpenseMutation.isPending}
                    className="w-full"
                  >
                    {addExpenseMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Expense
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Expenses</CardTitle>
              <CardDescription>
                Upload a CSV file with expense details for bulk adding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Drop your CSV file here, or click to browse
                </p>
                <Button className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Select File
                </Button>
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">
                  Expected CSV Format
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your CSV should have the following columns: category,
                  subcategory, amount, date, description, vendor_id,
                  property_id, attachment_url
                </p>
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">
                    Download Template
                  </h3>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Download CSV Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Expense Records</CardTitle>
                <CardDescription>View all expense records.</CardDescription>
              </div>
              <Button variant="outline" className="gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center my-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isError ? (
                <p className="text-center text-red-500 my-8">
                  Error loading expense records
                </p>
              ) : (
                <div>
                  {/* Debug information */}
                  <div className="text-sm text-muted-foreground mb-4">
                    Total expense records:{" "}
                    {Array.isArray(expenses) ? expenses.length : 0}
                  </div>

                  {/* Last 5 expense entries section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      Last Entered Records
                    </h3>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Subcategory</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(expenses) && expenses.length > 0 ? (
                            expenses.slice(0, 5).map((expense: any) => (
                              <TableRow key={`recent-${expense.id}`}>
                                <TableCell className="whitespace-nowrap">
                                  {formatDate(expense.date)}
                                </TableCell>
                                <TableCell className="capitalize">
                                  {expense.category}
                                </TableCell>
                                <TableCell>
                                  {expense.subcategory || "-"}
                                </TableCell>
                                <TableCell>
                                  {expense.propertyId
                                    ? properties?.find(
                                        (p) => p.id === expense.propertyId,
                                      )?.flatNumber || `#${expense.propertyId}`
                                    : "Common Areas"}
                                </TableCell>
                                <TableCell>{expense.vendorId || "-"}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(expense.amount)}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="h-24 text-center"
                              >
                                No expense records found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      Showing the 5 most recent entries
                    </p>
                  </div>

                  {/* All expenses section */}
                  <div className="overflow-x-auto">
                    <h3 className="text-lg font-semibold mb-2">
                      All Expense Entries
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Subcategory</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(expenses) && expenses.length > 0 ? (
                          expenses.map((expense: any) => (
                            <TableRow key={`all-${expense.id}`}>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(expense.date)}
                              </TableCell>
                              <TableCell className="capitalize">
                                {expense.category.replace("_", " ")}
                              </TableCell>
                              <TableCell>
                                {expense.subcategory
                                  ? expense.subcategory.replace("_", " ")
                                  : "-"}
                              </TableCell>
                              <TableCell>{expense.description}</TableCell>
                              <TableCell>
                                {expense.propertyId
                                  ? properties?.find(
                                      (p) => p.id === expense.propertyId,
                                    )?.flatNumber || `#${expense.propertyId}`
                                  : "Common"}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(expense.amount)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              No expense records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}