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
import { Loader2, Plus, FileSpreadsheet, Download } from "lucide-react";
import { insertIncomeSchema, PropertyCharge } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { AttachmentUploader } from "@/components/AttachmentUploader";
// Bulk upload component will be implemented later
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Extended schema with validation
const incomeFormSchema = insertIncomeSchema.extend({
  amount: z.coerce.number().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
  propertyId: z.coerce.number().optional(),
  expectedIncome: z.number().optional(), // Added expectedIncome field
  difference: z.number().optional(), // Added difference field
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export default function IncomePage() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("add");
  const [flatOptions, setFlatOptions] = useState<
    { id: number; flat_number: string }[]
  >([]);
  // Date range filter states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filteredIncomes, setFilteredIncomes] = useState<any[]>([]);
  const [attachmentId, setAttachmentId] = useState<number | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Query to fetch incomes
  const {
    data: incomes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/incomes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/incomes");
      return res.json(); // assuming your `apiRequest` returns a Response object
    },
  });
  
  // Filter incomes based on date range
  useEffect(() => {
    if (!incomes || !Array.isArray(incomes)) {
      setFilteredIncomes([]);
      return;
    }
    
    let filtered = [...incomes];
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(income => {
        const createdAt = new Date(income.createdAt);
        return createdAt >= start && createdAt <= end;
      });
    }
    
    setFilteredIncomes(filtered);
  }, [incomes, startDate, endDate]);

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

  async function onSubmit(values: IncomeFormValues) {
    try {
      // If there's a file selected, upload it first
      let finalAttachmentId = attachmentId;
      
      if (attachmentFile) {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        formData.append('entityType', 'income');
        
        // Upload the file
        const response = await fetch('/api/attachments', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload attachment');
        }
        
        const attachmentData = await response.json();
        finalAttachmentId = attachmentData.id;
        
        console.log('Attachment uploaded with ID:', finalAttachmentId);
      }
      
      // Process the values for submission
      const propertyId = values.propertyId || 0;
      
      const formattedValues = {
        ...values,
        propertyId,
        createdBy: user?.id || 0,
        attachmentId: finalAttachmentId, // Include the attachment ID from upload or existing
      };

      addIncomeMutation.mutate(formattedValues);
    } catch (error) {
      console.error('Error uploading attachment:', error);
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
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Attachment uploader component */}
                  <div className="col-span-2 mt-4">
                    <FormLabel>Attachment</FormLabel>
                    <AttachmentUploader
                      entityType="income"
                      attachmentId={attachmentId}
                      onAttachmentUploaded={setAttachmentId}
                      onFileSelected={(file) => setAttachmentFile(file)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={addIncomeMutation.isPending}
                  >
                    {addIncomeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
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

        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Income</CardTitle>
              <CardDescription>
                Upload a CSV file with income details for bulk adding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Drop your CSV file here, or click to browse
                </p>
                <Button className="gap-2">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Select File
                </Button>
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">
                  Expected CSV Format
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your CSV should have the following columns: date, amount,
                  type, description, flatNumber, receivedFrom, notes
                </p>
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">
                    Download Template
                  </h3>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
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
                <CardTitle>Income Records</CardTitle>
                <CardDescription>View all income records.</CardDescription>
              </div>
              <Button variant="outline" className="gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {/* Date range filter */}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="toDate">To Date</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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

              {isLoading ? (
                <div className="flex justify-center my-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isError ? (
                <p className="text-center text-red-500 my-8">
                  Error loading income records
                </p>
              ) : Array.isArray(filteredIncomes) && filteredIncomes.length > 0 ? (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      Last Entered Records
                    </h3>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Show only last 5 entries */}
                          {filteredIncomes.slice(-5).map((income) => (
                            <TableRow key={income.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(income.date)}
                              </TableCell>
                              <TableCell className="capitalize">
                                {income.type.replace("_", " ")}
                              </TableCell>
                              <TableCell>{income.description}</TableCell>
                              <TableCell>
                                {income.propertyId
                                  ? flatOptions?.find(
                                      (p) => p.id === income.propertyId,
                                    )?.flat_number || `#${income.propertyId}`
                                  : "Common"}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(income.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      Showing the 5 most recent entries
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <h3 className="text-lg font-semibold mb-2">
                      All Income Entries
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIncomes.map((income) => (
                          <TableRow key={income.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(income.date)}
                            </TableCell>
                            <TableCell className="capitalize">
                              {income.type.replace("_", " ")}
                            </TableCell>
                            <TableCell>{income.description}</TableCell>
                            <TableCell>
                              {income.propertyId
                                ? flatOptions?.find(
                                    (p) => p.id === income.propertyId,
                                  )?.flat_number || `#${income.propertyId}`
                                : "Common"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(income.amount)}
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
      </Tabs>
    </div>
  );
}
