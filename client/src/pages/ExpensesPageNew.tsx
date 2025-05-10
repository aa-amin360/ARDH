import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function ExpensesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("view");
  const [selectedCategory, setSelectedCategory] = React.useState("");
  const [flatOptions, setFlatOptions] = useState<
    { id: number; flat_number: string; nestaway_id?: string }[]
  >([]);
  // Date range filter states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = useState<any[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [editAttachmentFile, setEditAttachmentFile] = useState<File | null>(null);
  
  // Bulk upload states
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      category: "",
      subcategory: "",
      description: "",
      propertyId: undefined,
      vendorId: undefined,
    },
  });

  const editForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      category: "",
      subcategory: "",
      description: "",
      propertyId: undefined,
      vendorId: undefined,
    },
  });

  // Fetch expense categories
  const { data: expenseCategories } = useQuery({
    queryKey: ["/api/expenses/categories"],
    queryFn: async () => {
      const response = await fetch("/api/expenses/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch expense categories");
      }
      return response.json();
    },
  });

  // Fetch expense subcategories based on selected category
  const { data: expenseSubcategories, refetch: refetchSubcategories } = useQuery({
    queryKey: ["/api/expenses/subcategories", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const response = await fetch(
        `/api/expenses/subcategories?category=${encodeURIComponent(
          selectedCategory
        )}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch expense subcategories");
      }
      return response.json();
    },
    enabled: !!selectedCategory,
  });

  // Fetch properties (flats)
  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties");
      if (!response.ok) {
        throw new Error("Failed to fetch properties");
      }
      return response.json();
    },
  });

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await fetch("/api/vendors");
      if (!response.ok) {
        throw new Error("Failed to fetch vendors");
      }
      return response.json();
    },
  });

  // Fetch expenses
  const {
    data: expenses,
    isLoading,
    isError,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: async () => {
      const response = await fetch("/api/expenses");
      if (!response.ok) {
        throw new Error("Failed to fetch expenses");
      }
      return response.json();
    },
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      const formData = new FormData();
      
      // Convert date object to string if necessary
      const expenseData = {
        ...data,
        date: typeof data.date === "object" ? data.date.toISOString() : data.date,
      };
      
      // Add all expense data fields to FormData
      Object.entries(expenseData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      // Add attachment if exists
      if (attachmentFile) {
        formData.append("attachment", attachmentFile);
      }
      
      const response = await fetch("/api/expenses", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create expense");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense created successfully",
      });
      form.reset({
        date: new Date().toISOString().slice(0, 10),
        amount: 0,
        category: "",
        subcategory: "",
        description: "",
        propertyId: undefined,
        vendorId: undefined,
      });
      setAttachmentFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues & { id: number }) => {
      const { id, ...expenseData } = data;
      const formData = new FormData();
      
      // Convert date object to string if necessary
      const processedData = {
        ...expenseData,
        date: typeof expenseData.date === "object" 
          ? expenseData.date.toISOString() 
          : expenseData.date,
      };
      
      // Add all expense data fields to FormData
      Object.entries(processedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      // Add attachment if exists
      if (editAttachmentFile) {
        formData.append("attachment", editAttachmentFile);
      }
      
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update expense");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      setEditDialogOpen(false);
      setSelectedExpense(null);
      setEditAttachmentFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete expense");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedExpense(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (properties) {
      setFlatOptions(properties);
    }
  }, [properties]);

  useEffect(() => {
    if (expenseCategories) {
      setCategoryOptions(expenseCategories);
    }
  }, [expenseCategories]);

  useEffect(() => {
    if (expenseSubcategories) {
      setSubcategoryOptions(expenseSubcategories);
    }
  }, [expenseSubcategories]);

  useEffect(() => {
    if (vendors) {
      setVendorOptions(vendors);
    }
  }, [vendors]);

  useEffect(() => {
    // Update subcategory options when category changes
    if (selectedCategory) {
      refetchSubcategories();
      form.setValue("subcategory", "");
    }
  }, [selectedCategory, refetchSubcategories, form]);

  useEffect(() => {
    if (isFilterApplied && expenses) {
      let filtered = [...expenses];
      
      // Apply date filter if dates are selected
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set end date to end of day
        
        filtered = filtered.filter((expense) => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= start && expenseDate <= end;
        });
      }
      
      setFilteredExpenses(filtered);
      setCurrentPage(1); // Reset to first page when filter changes
    } else {
      setFilteredExpenses([]);
    }
  }, [expenses, isFilterApplied, startDate, endDate]);

  // For pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Handle pagination
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Handle filter application
  const applyFilter = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }
    
    setIsFilterApplied(true);
  };

  const resetFilter = () => {
    setStartDate("");
    setEndDate("");
    setIsFilterApplied(false);
    setFilteredExpenses([]);
  };

  // Handle form submission for creating expenses
  const onSubmit = (data: ExpenseFormValues) => {
    createExpenseMutation.mutate(data);
  };

  // Handle edit form submission
  const onEditSubmit = (data: ExpenseFormValues) => {
    if (selectedExpense) {
      updateExpenseMutation.mutate({ ...data, id: selectedExpense.id });
    }
  };

  // Handle delete confirmation
  const confirmDelete = () => {
    if (selectedExpense) {
      deleteExpenseMutation.mutate(selectedExpense.id);
    }
  };

  // Open edit dialog with expense data
  const openEditDialog = (expense: any) => {
    setSelectedExpense(expense);
    editForm.reset({
      date: new Date(expense.date).toISOString().slice(0, 10),
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory,
      description: expense.description,
      propertyId: expense.propertyId,
      vendorId: expense.vendorId,
    });
    
    // Update selected category for subcategory dropdown
    setSelectedCategory(expense.category);
    
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (expense: any) => {
    setSelectedExpense(expense);
    setDeleteDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
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
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense Management</h1>
        <div className="space-x-2">
          <Button onClick={() => setShowBulkUpload(!showBulkUpload)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {showBulkUpload ? "Cancel Bulk Upload" : "Bulk Upload"}
          </Button>
        </div>
      </div>

      {/* Bulk Upload Section */}
      {showBulkUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Upload Expenses</CardTitle>
            <CardDescription>
              Upload multiple expenses at once using a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseBulkUpload />
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="view">View Expenses</TabsTrigger>
          <TabsTrigger value="add">Add Expense</TabsTrigger>
        </TabsList>
        
        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>Expense Records</CardTitle>
              <CardDescription>
                View and manage all expense records
              </CardDescription>
              <div className="flex flex-wrap gap-4 mt-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={applyFilter}>Apply Filter</Button>
                  <Button variant="outline" onClick={resetFilter}>
                    Reset
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
              ) : !isFilterApplied ? (
                <div className="text-center py-10 text-muted-foreground">
                  Please select a date range and apply the filter to view expense records.
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No expense records found for the selected date range.
                </div>
              ) : (
                <div className="space-y-4">
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
                        {filteredExpenses
                          .slice(startIndex, endIndex)
                          .map((expense) => (
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
                                      (p) => p.id === expense.propertyId
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
                                    onClick={() => window.open(`/api/attachments/${expense.attachmentId}`, "_blank")}
                                  >
                                    View
                                  </Button>
                                ) : (
                                  "None"
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => openEditDialog(expense)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => openDeleteDialog(expense)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination controls */}
                  {filteredExpenses.length > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to{" "}
                        {Math.min(endIndex, filteredExpenses.length)} of{" "}
                        {filteredExpenses.length} entries
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage >= totalPages}
                        >
                          Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
              <CardDescription>
                Enter details for a new expense record
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedCategory(value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryOptions.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
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
                            disabled={!selectedCategory}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subcategory" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subcategoryOptions.map((subcategory) => (
                                <SelectItem
                                  key={subcategory}
                                  value={subcategory}
                                >
                                  {subcategory}
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
                      name="propertyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value) || undefined)}
                            defaultValue={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Common Areas</SelectItem>
                              {flatOptions.map((flat) => (
                                <SelectItem
                                  key={flat.id}
                                  value={flat.id.toString()}
                                >
                                  {flat.flat_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Leave blank for common area expenses
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value) || undefined)}
                            defaultValue={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No Vendor</SelectItem>
                              {vendorOptions.map((vendor) => (
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
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <Label>Attachment (Optional)</Label>
                    <AttachmentUploader
                      entityType="expense"
                      attachmentId={null}
                      setAttachmentFile={setAttachmentFile}
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={createExpenseMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {createExpenseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Expense
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the expense details below
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedCategory(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedCategory}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subcategory" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subcategoryOptions.map((subcategory) => (
                            <SelectItem key={subcategory} value={subcategory}>
                              {subcategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value) || undefined)}
                        defaultValue={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Common Areas</SelectItem>
                          {flatOptions.map((flat) => (
                            <SelectItem
                              key={flat.id}
                              value={flat.id.toString()}
                            >
                              {flat.flat_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Leave blank for common area expenses
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value) || undefined)}
                        defaultValue={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No Vendor</SelectItem>
                          {vendorOptions.map((vendor) => (
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
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <Label>Attachment</Label>
                {selectedExpense?.attachmentId ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/attachments/${selectedExpense.attachmentId}`, "_blank")}
                      >
                        View Current Attachment
                      </Button>
                    </div>
                    <AttachmentUploader
                      entityType="expense"
                      attachmentId={selectedExpense.attachmentId}
                      setAttachmentFile={setEditAttachmentFile}
                    />
                  </div>
                ) : (
                  <AttachmentUploader
                    entityType="expense"
                    attachmentId={null}
                    setAttachmentFile={setEditAttachmentFile}
                  />
                )}
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateExpenseMutation.isPending}
                >
                  {updateExpenseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Expense"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-4">
              <div className="border rounded p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Date:</div>
                  <div>{formatDate(selectedExpense.date)}</div>
                  
                  <div className="font-medium">Amount:</div>
                  <div>{formatCurrency(selectedExpense.amount)}</div>
                  
                  <div className="font-medium">Category:</div>
                  <div>{selectedExpense.category}</div>
                  
                  <div className="font-medium">Subcategory:</div>
                  <div>{selectedExpense.subcategory}</div>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteExpenseMutation.isPending}
                >
                  {deleteExpenseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Expense"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}