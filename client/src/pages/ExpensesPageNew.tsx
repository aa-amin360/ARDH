import React, { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
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
import { AttachmentUploader } from "@/components/AttachmentUploader";

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

  //
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function ExpensesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("add");
  const [selectedCategory, setSelectedCategory] = React.useState("");
  const [flatOptions, setFlatOptions] = useState<
    { id: number; flat_number: string }[]
  >([]);
  // Date range filter states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [attachmentId, setAttachmentId] = useState<number | null>(null);

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

  useEffect(() => {
    fetch("/api/properties/flats")
      .then((res) => res.json())
      .then(setFlatOptions)
      .catch((err) => console.error("Failed to load flats:", err));
  }, []);

  // Watch fields to trigger dependent queries
  const watchCategory = form.watch("category");
  const watchSubcategory = form.watch("subcategory");

  // Query to fetch expenses for the view tab
  const {
    data: expenses = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: () => apiRequest("GET", "/api/expenses").then((res) => res.json()),
  });

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

  // Update subcategory when category changes
  React.useEffect(() => {
    if (watchCategory && subcategories && subcategories.length > 0) {
      const firstSubcategory = subcategories[0]?.expense_sub_category;
      if (firstSubcategory) {
        form.setValue("subcategory", firstSubcategory);
      }
    }
  }, [watchCategory, subcategories, form]);

  // Filter expenses based on date range
  useEffect(() => {
    if (!expenses || !Array.isArray(expenses)) {
      setFilteredExpenses([]);
      return;
    }

    let filtered = [...expenses];

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter((expense) => {
        const createdAt = new Date(expense.createdAt);
        return createdAt >= start && createdAt <= end;
      });
    }

    setFilteredExpenses(filtered);
  }, [expenses, startDate, endDate]);

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
      
      // Reset attachment ID state
      setAttachmentId(null);
      
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

  function onSubmit(values: ExpenseFormValues) {
    // Process the values for submission
    const formattedValues = {
      ...values,
      createdBy: user?.id || 0,
      attachmentId, // Include the attachment ID in the submission
    };

    addExpenseMutation.mutate(formattedValues);
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Expense Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add">Add Expense</TabsTrigger>
          <TabsTrigger value="view">View Expenses</TabsTrigger>
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
                                  value={category.expense_category}
                                >
                                  {category.expense_category}
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
                            value={field.value || ""}
                            disabled={!watchCategory || isLoadingSubcategories}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    isLoadingSubcategories
                                      ? "Loading..."
                                      : "Select subcategory"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subcategories.length > 0 ? (
                                subcategories.map((subcategory: any) => (
                                  <SelectItem
                                    key={subcategory.expense_sub_category}
                                    value={subcategory.expense_sub_category}
                                  >
                                    {subcategory.expense_sub_category}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  No subcategories found
                                </div>
                              )}
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
                            <Input type="date" {...field} />
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
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(flatOptions) &&
                                flatOptions.map((property) => (
                                  <SelectItem
                                    key={property.id}
                                    value={property.id.toString()}
                                  >
                                    {property.flat_number}
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
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                            value={field.value?.toString() || "none"}
                            disabled={!watchSubcategory || isLoadingVendors}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    isLoadingVendors
                                      ? "Loading vendors..."
                                      : "Select vendor (optional)"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">
                                Select Vendor
                              </SelectItem>
                              {vendorsBySubcategory &&
                              vendorsBySubcategory.length > 0 ? (
                                vendorsBySubcategory.map((vendor: any) => (
                                  <SelectItem
                                    key={vendor.id}
                                    value={vendor.id.toString()}
                                  >
                                    {vendor.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no_vendors">
                                  No vendors found
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
                  {watchCategory === "Utility" &&
                    watchSubcategory === "Water Tanker" && (
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
                                <FormLabel>Person In Charge</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter person in charge"
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
                                <FormLabel>Time</FormLabel>
                                <FormControl>
                                  <Input
                                    type="time"
                                    placeholder="Enter time"
                                    {...field}
                                  />
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
                            placeholder="Enter description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 border rounded-md p-4 bg-slate-50">
                    <h3 className="text-lg font-medium">Attachment</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a receipt or invoice for this expense (optional)
                    </p>
                    <AttachmentUploader
                      entityType="expense"
                      attachmentId={attachmentId}
                      onAttachmentUploaded={(id) => setAttachmentId(id)}
                      className="w-full"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={addExpenseMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {addExpenseMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add Expense
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expenses List</CardTitle>
              <CardDescription>
                View all expenses and their details.
              </CardDescription>

              {/* Date Range Filter */}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="startDate">From Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="endDate">To Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>

                <div className="flex items-end">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                
              
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isError ? (
                <div className="text-center text-destructive">
                  Error loading expenses. Please try again.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Subcategory</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.length > 0 ? (
                        filteredExpenses.map((expense: any) => (
                          <TableRow key={expense.id}>
                            <TableCell>{formatDate(expense.date)}</TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell>{expense.subcategory}</TableCell>
                            <TableCell>
                              {formatCurrency(expense.amount)}
                            </TableCell>
                            <TableCell>
                              {expense.propertyId
                                ? flatOptions.find(
                                    (p) => p.id === expense.propertyId,
                                  )?.flat_number || "Unknown"
                                : "Common Areas"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {expense.description}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-6 text-muted-foreground"
                          >
                            No expenses found. Add an expense to see it here.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Expenses</CardTitle>
              <CardDescription>
                Upload multiple expenses at once using a template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground">
                    Download the template, fill it with your expense data, and
                    upload it back to import multiple expenses at once.
                  </p>
                  <Button variant="outline" className="w-full md:w-auto">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                {/* <ExpenseBulkUpload /> */}
                <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
                  <p className="text-muted-foreground mb-2">
                    Bulk upload feature coming soon...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
