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
import {
  Loader2,
  Plus,
  FileSpreadsheet,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";
import { insertExpenseSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import ExpenseBulkUpload from "@/components/bulk-upload/ExpenseBulkUpload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    { id: number; flat_number: string; nestaway_id?: string }[]
  >([]);
  // Date range filter states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [attachmentId, setAttachmentId] = useState<number | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

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
        const expenseDate = new Date(expense.date);
        return expenseDate >= start && expenseDate <= end;
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

      // Reset attachment states
      setAttachmentId(null);
      setAttachmentFile(null);

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

  // Mutation to delete expense
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Expense deleted",
        description: "The expense has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Dialog state for editing and deleting
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  // Function to handle edit expense dialog
  const handleEditExpense = (expense: any) => {
    setSelectedExpense(expense);

    // Set form values from selected expense
    form.reset({
      category: expense.category,
      subcategory: expense.subcategory,
      amount: expense.amount,
      date: new Date(expense.date).toISOString().split("T")[0],
      description: expense.description || "",
      vendorId: expense.vendorId || 0,
      propertyId: expense.propertyId,
      attachmentUrl: "",
      createdBy: expense.createdBy || user?.id || 0,

      // Set water tanker specific fields if available
      tankerNumber: expense.tankerNumber || "",
      liters: expense.liters || 0,
      personInCharge: expense.personInCharge || "",
      driverContact: expense.driverContact || "",
      time: expense.time || "",
    });

    // Set attachment ID if exists
    if (expense.attachmentId) {
      setAttachmentId(expense.attachmentId);
    } else {
      setAttachmentId(null);
    }
    setAttachmentFile(null);

    // Open edit dialog
    setIsEditDialogOpen(true);
  };

  // Function to handle delete expense dialog
  const handleDeleteExpense = (expense: any) => {
    setSelectedExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  // Mutation to update expense
  const updateExpenseMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: ExpenseFormValues;
    }) => {
      const res = await apiRequest("PUT", `/api/expenses/${id}`, values);
      if (!res.ok) {
        throw new Error(`Error updating expense: ${res.status}`);
      }
      return await res.json().catch(() => ({}));
    },
    onSuccess: () => {
      toast({
        title: "Expense updated",
        description: "The expense has been updated successfully.",
      });
      // Reset form and editing state
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

      setIsEditDialogOpen(false);
      setSelectedExpense(null);
      setAttachmentId(null);
      setAttachmentFile(null);

      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  async function onSubmit(values: ExpenseFormValues) {
    try {
      // If there's a file selected, upload it first
      let finalAttachmentId = attachmentId;

      if (attachmentFile) {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        formData.append("entityType", "expense");

        // Upload the file
        const response = await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload attachment");
        }

        const attachmentData = await response.json();
        finalAttachmentId = attachmentData.id;

        console.log("Attachment uploaded with ID:", finalAttachmentId);
      }

      // Process the values for submission
      const formattedValues = {
        ...values,
        createdBy: user?.id || 0,
        attachmentId: finalAttachmentId, // Include the attachment ID from upload or existing
      };

      // Handle update vs. create
      if (isEditDialogOpen && selectedExpense) {
        updateExpenseMutation.mutate({
          id: selectedExpense.id,
          values: formattedValues,
        });
      } else {
        addExpenseMutation.mutate(formattedValues);
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
      toast({
        title: "Error uploading attachment",
        description: (error as Error).message || "Failed to upload attachment",
        variant: "destructive",
      });
    }
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
                                    {property.nestaway_id &&
                                      ` (Nestaway ID: ${property.nestaway_id})`}
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
                      onFileSelected={(file) => setAttachmentFile(file)}
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
                        <TableHead>Attachment</TableHead>
                        <TableHead>Actions</TableHead>
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
                            <TableCell>
                              {expense.attachmentId ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  onClick={() =>
                                    window.open(
                                      `/api/attachments/${expense.attachmentId}`,
                                      "_blank",
                                    )
                                  }
                                >
                                  <Download size={16} className="mr-1" />
                                  Download
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  None
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditExpense(expense)}
                                >
                                  <Pencil size={16} className="text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteExpense(expense)}
                                >
                                  <Trash2 size={16} className="text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={8}
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
          <ExpenseBulkUpload />
        </TabsContent>
      </Tabs>
      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the details of this expense.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Form {...form}>
              <form
                id="edit-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Form fields - same as add form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                value={subcategory.expense_sub_category}
                              >
                                {subcategory.expense_sub_category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter amount"
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
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("category") === "Water Tanker" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <FormLabel>Liters</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Enter liters"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="personInCharge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Person in Charge</FormLabel>
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
                    </div>

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          defaultValue={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
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

                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property (Flat)</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          defaultValue={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Common Area</SelectItem>
                            {Array.isArray(flatOptions) &&
                              flatOptions.map((property: any) => (
                                <SelectItem
                                  key={property.id}
                                  value={property.id.toString()}
                                >
                                  {property.flat_number}{" "}
                                  {property.nestaway_id
                                    ? `(${property.nestaway_id})`
                                    : ""}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Attachment upload */}
                <div className="space-y-2">
                  <Label htmlFor="attachment">Attachment (optional)</Label>
                  <AttachmentUploader
                    attachmentId={attachmentId}
                    setAttachmentId={setAttachmentId}
                    attachmentFile={attachmentFile}
                    setAttachmentFile={setAttachmentFile}
                    className="w-full"
                  />
                </div>
              </form>
            </Form>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-form"
              disabled={updateExpenseMutation.isPending}
            >
              {updateExpenseMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="mr-2 h-4 w-4" />
              )}
              Update Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Category:</div>
                <div>{selectedExpense.category}</div>

                <div className="font-medium">Subcategory:</div>
                <div>{selectedExpense.subcategory}</div>

                <div className="font-medium">Amount:</div>
                <div>₹{selectedExpense.amount.toFixed(2)}</div>

                <div className="font-medium">Date:</div>
                <div>{new Date(selectedExpense.date).toLocaleDateString()}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedExpense) {
                  deleteExpenseMutation.mutate(selectedExpense.id);
                  setIsDeleteDialogOpen(false);
                }
              }}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
