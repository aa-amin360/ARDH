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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  FileSpreadsheet,
  Download,
  Pencil,
  Trash,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import { insertIncomeSchema, PropertyCharge } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import { format, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";
// Bulk upload component will be implemented later
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
import { getNestawayIdByFlatNumber } from "@shared/constants";

// Extended schema with validation
const incomeFormSchema = insertIncomeSchema.extend({
  amount: z.coerce.number().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
  propertyId: z.coerce.number().optional(),
  expectedIncome: z.number().optional(), // Added expectedIncome field
  difference: z.number().optional(),
  NestawayId: z.string().optional(), // Added difference field
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export default function IncomePage() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("add");
  const [flatOptions, setFlatOptions] = useState<
    { id: number; flat_number: string; nestaway_id?: string }[]
  >([]);
  // Date range filter states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filteredIncomes, setFilteredIncomes] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  
  // Calculate pagination details
  const totalPages = Math.ceil(filteredIncomes.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredIncomes.length);
  const [attachmentId, setAttachmentId] = useState<number | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<any | null>(null);

  // Query to fetch incomes
  const {
    data: incomes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/incomes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/incomes");
      const data = await res.json();
      console.log("Fetched incomes:", data); // Debug log to check incoming data
      return data;
    },
    // Enable query to fetch incomes
    enabled: true,
  });

  // Filter incomes based on date range - only show data after filter is applied
  useEffect(() => {
    if (!incomes || !Array.isArray(incomes)) {
      console.log("No incomes array to filter:", incomes);
      setFilteredIncomes([]);
      return;
    }

    if (!isFilterApplied) {
      // Don't show any data until filter is applied
      setFilteredIncomes([]);
      return;
    }

    console.log("Starting with incomes:", incomes.length, incomes);
    let filtered = [...incomes];

    if (startDate && endDate) {
      console.log("Filtering by date range:", startDate, "to", endDate);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter((income) => {
        // Use date field for filtering, not createdAt
        const incomeDate = new Date(income.date);
        return incomeDate >= start && incomeDate <= end;
      });
    }

    console.log("Filtered incomes:", filtered.length, filtered);
    setFilteredIncomes(filtered);
  }, [incomes, startDate, endDate, isFilterApplied]);

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
  
  // Apply date filter function
  const applyDateFilter = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates to filter records.",
        variant: "destructive",
      });
      return;
    }
    setIsFilterApplied(true);
    setCurrentPage(1);
  };

  // Mutation to add income
  const addIncomeMutation = useMutation({
    mutationFn: async (values: IncomeFormValues) => {
      const res = await apiRequest("POST", "/api/incomes", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Income added",
        description: "The income has been added successfully.",
      });
      form.reset({
        type: "rent",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        description: "",
        receivedFrom: "",
        propertyId: 0,
        createdBy: 0,
        expectedIncome: 0, // Added default values for new fields
        difference: 0,
        NestawayId: "",
      });
      // Reset attachment states
      setAttachmentId(null);
      setAttachmentFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding income",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to update income
  const updateIncomeMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: IncomeFormValues;
    }) => {
      console.log("Update income mutation running with values:", values);
      const res = await apiRequest("PUT", `/api/incomes/${id}`, values);
      if (!res.ok) {
        throw new Error(`Error updating income: ${res.status}`);
      }
      return await res.json().catch(() => ({}));
    },
    onSuccess: () => {
      toast({
        title: "Income updated",
        description: "The income has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedIncome(null);
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating income",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete income
  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/incomes/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Income deleted",
        description: "The income has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedIncome(null);
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting income",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      type: "rent", // Default to rent
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      description: "",
      receivedFrom: "",
      propertyId: 0, // Set default to common areas
      createdBy: 0, // Will be set on the server
      expectedIncome: 0, // Added default values for new fields
      difference: 0,
      NestawayId: "",
    },
  });

  useEffect(() => {
    fetch("/api/properties/flats")
      .then((res) => res.json())
      .then(setFlatOptions)
      .catch((err) => console.error("Failed to load flats:", err));
  }, []);

  const selectedPropertyId = form.watch("propertyId");
  const selectedIncomeType = form.watch("type");
  const enteredAmount = form.watch("amount");

  const [expectedIncome, setExpectedIncome] = useState<number>(0);
  const [difference, setDifference] = useState<number>(0);

  const fetchExpectedCharge = async (
    flatNumber: string,
    incomeType: string,
  ) => {
    console.log("Fetching expected charge for flat:", flatNumber);
    console.log("Fetching expected charge for type:", incomeType);

    if (!flatNumber || !incomeType) return;

    try {
      const response = await apiRequest(
        "GET",
        `/api/properties/${flatNumber}/charges`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch charges: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format");
      }

      console.log("Fetched charges:", data);

      // Filter current charges (effectiveTo === null)
      const currentCharges = data.filter(
        (item: any) => item.effectiveTo === null,
      );

      // Find the most relevant charge for the given incomeType
      const matched = currentCharges.find(
        (item: any) =>
          item.chargeType?.toLowerCase().trim() ===
          incomeType?.toLowerCase().trim(),
      );

      const amount = matched?.amount || 0;
      setExpectedIncome(amount);
      console.log("Expected charge:", amount);
    } catch (error) {
      console.error("Error fetching expected charges:", error);
      toast({
        title: "Error",
        description: "Failed to load expected charge",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const selectedProperty = flatOptions.find(
      (p) => p.id === selectedPropertyId,
    );

    if (selectedProperty?.flat_number && selectedIncomeType) {
      fetchExpectedCharge(selectedProperty.flat_number, selectedIncomeType);
      //const nestawayId = selectedProperty?.nestawayId || "Not Found";
    }
  }, [form.watch("propertyId"), selectedIncomeType]);
  useEffect(() => {
    setDifference(enteredAmount - expectedIncome);
  }, [enteredAmount, expectedIncome]);

  {
    /*React.useEffect(() => {
    // Placeholder calculation - replace with actual logic
    setExpectedIncome(1000); // Replace with actual expected income calculation
    setDifference(expectedIncome - enteredAmount);
  }, [form.getValues("amount")]);*/
  }

  // Function to handle edit income dialog
  function openEditDialog(income: any) {
    setSelectedIncome(income);

    // Create edit form with values from selected income
    const editForm = {
      type: income.type || "rent",
      amount: income.amount || 0,
      date: new Date(income.date).toISOString().split("T")[0],
      description: income.description || "",
      receivedFrom: income.receivedFrom || "",
      propertyId: income.propertyId || 0,
      createdBy: income.createdBy || user?.id || 0,
      expectedIncome: income.expectedIncome || 0,
      difference: income.difference || 0,
      NestawayId: income.NestawayId || "",
    };

    // Set form values
    form.reset(editForm);

    // Set attachment ID if exists
    if (income.attachmentId) {
      setAttachmentId(income.attachmentId);
    } else {
      setAttachmentId(null);
    }
    setAttachmentFile(null);

    // Open the edit dialog
    setIsEditDialogOpen(true);
  }

  // Function to handle delete income dialog
  function openDeleteDialog(income: any) {
    setSelectedIncome(income);
    setIsDeleteDialogOpen(true);
  }

  async function onSubmit(values: IncomeFormValues) {
    try {
      // If there's a file selected, upload it first
      let finalAttachmentId = attachmentId;

      if (attachmentFile) {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        formData.append("entityType", "income");

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
      const propertyId = values.propertyId || 0;

      const formattedValues = {
        ...values,
        propertyId,
        createdBy: user?.id || 0,
        attachmentId: finalAttachmentId, // Include the attachment ID from upload or existing
        expectedIncome: parseFloat(expectedIncome.toString()) || 0,
        difference: parseFloat(difference.toString()) || 0,
      };

      if (isEditDialogOpen && selectedIncome) {
        // Update existing income
        updateIncomeMutation.mutate({
          id: selectedIncome.id,
          values: formattedValues,
        });
      } else {
        // Add new income
        addIncomeMutation.mutate(formattedValues);
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
      <h1 className="text-2xl font-bold mb-6">Income Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add">Add Income</TabsTrigger>
          <TabsTrigger value="view">View Incomes</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Income</CardTitle>
              <CardDescription>
                Enter the details of the income you want to add.
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
                      name="expectedIncome"
                      render={() => (
                        <FormItem>
                          <FormLabel>Expected Income (₹)</FormLabel>
                          <FormControl>
                            <Input
                              value={expectedIncome ?? ""}
                              type="number"
                              disabled
                              readOnly
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="difference"
                      render={() => (
                        <FormItem>
                          <FormLabel>Difference (₹)</FormLabel>
                          <FormControl>
                            <Input
                              value={difference ?? ""}
                              type="number"
                              disabled
                              readOnly
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Income Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select income type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="rent">Rent</SelectItem>
                              <SelectItem value="maint_fee">
                                Maintenance
                              </SelectItem>
                              <SelectItem value="water_fee">
                                Water Fee
                              </SelectItem>
                              <SelectItem value="tax_return">
                                Tax Return
                              </SelectItem>
                              <SelectItem value="other">Other</SelectItem>
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
                        <FormItem className="relative">
                          <FormLabel>Property</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                          <FormMessage />
                          {/* Nestaway ID Display */}
                          {field.value && field.value > 0 && (
                            <div className="absolute top-0 right-0 text-xs text-gray-700 bg-gray-100 px-5 py-1 rounded-md">
                              Nestaway ID:{" "}
                              {flatOptions.find((f) => f.id === field.value)
                                ?.nestaway_id || "N/A"}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="receivedFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Received From</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter source of income"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter any additional details"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="col-span-2">
                      <FormLabel>Attachment (Optional)</FormLabel>
                      <AttachmentUploader
                        onFileSelected={(file) => setAttachmentFile(file)}
                        entityType="income"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={addIncomeMutation.isPending}
                    className="ml-auto"
                  >
                    {addIncomeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Income
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>View Income Records</CardTitle>
              <CardDescription>
                Select a date range and click "Apply Filter" to view income records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={applyDateFilter}
                  >
                    Apply Filter
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setIsFilterApplied(false);
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                </div>
              ) : isError ? (
                <div className="text-center py-12 text-red-500">
                  Failed to load income data.
                </div>
              ) : !isFilterApplied ? (
                <div className="text-center py-12 text-muted-foreground">
                  Please select a date range and click "Apply Filter" to view income records.
                </div>
              ) : filteredIncomes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No income records found for the selected date range.
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        Income Entries ({filteredIncomes.length} total)
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        Showing {filteredIncomes.length > 0 ? startIndex + 1 : 0} to {endIndex} of {filteredIncomes.length}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Received From</TableHead>
                            <TableHead>Attachment</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredIncomes.slice(startIndex, endIndex).map((income) => (
                            <TableRow key={income.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(income.date)}
                              </TableCell>
                              <TableCell className="capitalize">
                                {income.type.replace("_", " ")}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(income.amount)}
                              </TableCell>
                              <TableCell>
                                {income.propertyId
                                  ? flatOptions?.find(
                                      (p) => p.id === income.propertyId,
                                    )?.flat_number || `#${income.propertyId}`
                                  : "Common"}
                              </TableCell>
                              <TableCell>{income.receivedFrom}</TableCell>
                              <TableCell>
                                {income.attachmentId ? (
                                  <a
                                    href={`/api/attachments/${income.attachmentId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="flex items-center text-blue-600 hover:text-blue-800"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Download
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-sm">
                                    None
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedIncome(income);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedIncome(income);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    // Handle edit action
                                    openEditDialog(income);
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                  >
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                    <path d="m15 5 4 4" />
                                  </svg>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    // Handle delete action
                                    openDeleteDialog(income);
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  </svg>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No income records found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Income</CardTitle>
              <CardDescription>
                Upload a CSV file to add multiple income records at once.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-lg font-medium">Download Template</h3>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Download CSV Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Edit Income Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Income</DialogTitle>
            <DialogDescription>
              Update the details of this income record.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Income Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="maintenance">
                            Maintenance
                          </SelectItem>
                          <SelectItem value="tax_return">Tax Return</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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
                            <SelectValue placeholder="Select property" />
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter description"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receivedFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Received From</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter source of income"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Label>Attachment</Label>
                  <AttachmentUploader
                    entityType="income"
                    attachmentId={attachmentId}
                    onAttachmentUploaded={(id) => setAttachmentId(id)}
                    onFileSelected={(file) => setAttachmentFile(file)}
                    className="w-full"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedIncome(null);
                    form.reset({
                      type: "rent",
                      amount: 0,
                      date: new Date().toISOString().split("T")[0],
                      description: "",
                      receivedFrom: "",
                      propertyId: 0,
                      createdBy: 0,
                      expectedIncome: 0,
                      difference: 0,
                      NestawayId: "",
                    });
                    setAttachmentId(null);
                    setAttachmentFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateIncomeMutation.isPending}>
                  {updateIncomeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Income"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Income Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Income</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this income record? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedIncome && (
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Type:</span>{" "}
                  {selectedIncome.type || "N/A"}
                </p>
                <p>
                  <span className="font-semibold">Amount:</span>{" "}
                  {formatCurrency(selectedIncome.amount || 0)}
                </p>
                <p>
                  <span className="font-semibold">Date:</span>{" "}
                  {formatDate(selectedIncome.date)}
                </p>
                <p>
                  <span className="font-semibold">Description:</span>{" "}
                  {selectedIncome.description || "N/A"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedIncome(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteIncomeMutation.isPending}
              onClick={() => {
                if (selectedIncome) {
                  deleteIncomeMutation.mutate(selectedIncome.id);
                }
              }}
            >
              {deleteIncomeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
