import React, { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, FileSpreadsheet, Upload, Image as ImageIcon, XCircle, AlertCircle } from "lucide-react";
import { insertExpenseSchema } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ExpensesBulkUpload from "@/components/bulk-upload/ExpensesBulkUpload";
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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in the format YYYY-MM-DD",
  }).transform(val => new Date(val)),
  time: z.string().optional(),
  propertyId: z.string().optional().transform(val => val ? parseInt(val, 10) : null),
  vendor: z.string().optional(),
  receipt: z.string().optional(), // Adding a receipt field which will be mapped to vendor in the final submission
  tankerNumber: z.string().optional(),
  liters: z.coerce.number().optional(),
  personInCharge: z.string().optional(),
  attachmentUrl: z.string().optional(),
  createdBy: z.number().optional() // This will be handled by the server
  // Ensure the data is properly transformed before sending to the server
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function ExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("add");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filteredVendors, setFilteredVendors] = useState<any[]>([]);

  // Query to fetch expenses
  const {
    data: expenses = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/expenses"],
  });
  
  // Query to fetch vendors
  const {
    data: vendors = [],
    isLoading: vendorsLoading,
  } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // Form
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: "electricity", // Set a default category
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      description: "",
      receipt: "",
      propertyId: "0", // Set default to common areas
      vendor: "",
      createdBy: 0, // Will be set on the server
      time: new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}),
      tankerNumber: "",
      liters: 0,
      personInCharge: "",
      attachmentUrl: "",
    },
  } as any);

  // Watch for category changes to conditionally render fields
  const selectedCategory = useWatch({
    control: form.control,
    name: "category"
  });

  // Watch for attachmentUrl to validate form
  const attachmentUrl = useWatch({
    control: form.control,
    name: "attachmentUrl"
  });
  
  // Filter vendors based on selected category
  useEffect(() => {
    if (vendors?.length > 0 && selectedCategory) {
      const filtered = vendors.filter((vendor: any) => 
        vendor.serviceType === selectedCategory || 
        vendor.serviceType === 'general'
      );
      setFilteredVendors(filtered);
    }
  }, [selectedCategory, vendors]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // In a real app, you would upload the file to a server and get a URL back
      // For now, we'll simulate this with a fake URL
      setIsUploading(true);
      setTimeout(() => {
        // In a real implementation, this would be the URL returned from the server
        const fakeUploadedUrl = `https://example.com/uploads/${Date.now()}-${file.name}`;
        form.setValue("attachmentUrl", fakeUploadedUrl);
        setIsUploading(false);
      }, 1500);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    form.setValue("attachmentUrl", "");
  };

  // Mutation to add a new expense
  const createExpenseMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      // Validate attachment for all expenses
      if (!values.attachmentUrl) {
        throw new Error("Please attach a receipt or image for this expense");
      }
      
      // Additional validation for water_tank category
      if (values.category === "water_tank") {
        if (!values.tankerNumber) {
          throw new Error("Tanker number is required for water tank expenses");
        }
        if (!values.liters) {
          throw new Error("Liters discharged is required for water tank expenses");
        }
        if (!values.personInCharge) {
          throw new Error("Person in charge is required for water tank expenses");
        }
        if (!values.time) {
          throw new Error("Time is required for water tank expenses");
        }
      }
      
      const res = await apiRequest("POST", "/api/expenses", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense added",
        description: "The expense has been added successfully.",
      });
      form.reset({
        category: "electricity",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        description: "",
        receipt: "",
        propertyId: "0",
        vendor: "",
        createdBy: 0,
        time: new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}),
        tankerNumber: "",
        liters: 0,
        personInCharge: "",
        attachmentUrl: "",
      });
      setSelectedFile(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: ExpenseFormValues) {
    // Map receipt to vendor since we're using receipt field in the UI
    // Convert date to ISO string for API submission
    const formattedValues = {
      ...values,
      vendor: values.receipt,
      date: values.date instanceof Date 
        ? values.date.toISOString() 
        : new Date(values.date as any).toISOString(), // Ensure date is formatted as ISO string
      amount: typeof values.amount === 'string' 
        ? parseFloat(values.amount) 
        : values.amount, // Ensure amount is a number
      propertyId: values.propertyId === "0" || !values.propertyId 
        ? null 
        : parseInt(values.propertyId as string, 10) // Convert propertyId to number or null
    };
    createExpenseMutation.mutate(formattedValues as any);
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Expenses Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add">Add Expense</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="view">View Expenses</TabsTrigger>
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                              <SelectItem value="electricity">Electricity</SelectItem>
                              <SelectItem value="water_tank">Water Tanker</SelectItem>
                              <SelectItem value="generator_fuel">Generator Fuel</SelectItem>
                              <SelectItem value="cctv_maintenance">CCTV Maintenance</SelectItem>
                              <SelectItem value="internet">Internet</SelectItem>
                              <SelectItem value="elevator_maintenance">Elevator Maintenance</SelectItem>
                              <SelectItem value="general_building_maintenance">Building Maintenance</SelectItem>
                              <SelectItem value="donation">Donation</SelectItem>
                              <SelectItem value="drainage_cleaning">Drainage Cleaning</SelectItem>
                              <SelectItem value="guest_expense">Guest Expense</SelectItem>
                              <SelectItem value="misc">Miscellaneous</SelectItem>
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
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Common Area / All Properties</SelectItem>
                              <SelectItem value="1">101</SelectItem>
                              <SelectItem value="2">102</SelectItem>
                              <SelectItem value="3">103</SelectItem>
                              <SelectItem value="4">201</SelectItem>
                              <SelectItem value="5">202</SelectItem>
                              <SelectItem value="6">203</SelectItem>
                              <SelectItem value="7">204</SelectItem>
                              <SelectItem value="8">301</SelectItem>
                              <SelectItem value="9">302</SelectItem>
                              <SelectItem value="10">303</SelectItem>
                              <SelectItem value="11">304</SelectItem>
                              <SelectItem value="12">401</SelectItem>
                              <SelectItem value="13">402</SelectItem>
                              <SelectItem value="14">403</SelectItem>
                              <SelectItem value="15">404</SelectItem>
                              <SelectItem value="16">501</SelectItem>
                              <SelectItem value="17">502</SelectItem>
                              <SelectItem value="18">503</SelectItem>
                              <SelectItem value="19">504</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Leave blank if expense applies to all properties
                          </FormDescription>
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
                          <Textarea
                            placeholder="Enter expense description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Water tanker specific fields - only show when water_tank category is selected */}
                  {selectedCategory === "water_tank" && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4 p-4 border rounded-lg bg-slate-50">
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

                      <FormField
                        control={form.control}
                        name="tankerNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tanker Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter tanker number" {...field} />
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
                                placeholder="Enter liters discharged" 
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
                              <Input placeholder="Enter name of person in charge" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="receipt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">-- Select Vendor --</SelectItem>
                            {vendorsLoading ? (
                              <SelectItem value="" disabled>Loading vendors...</SelectItem>
                            ) : filteredVendors && filteredVendors.length > 0 ? (
                              filteredVendors.map((vendor: any) => (
                                <SelectItem key={vendor.id} value={vendor.name}>
                                  {vendor.name} ({vendor.serviceType})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>No vendors available for this category</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the vendor for this expense
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* File attachment field */}
                  <div className="space-y-2">
                    <Label htmlFor="attachment">
                      Attachment <span className="text-red-500">*</span>
                    </Label>
                    {!attachmentUrl && (
                      <div className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg border-gray-300 cursor-pointer hover:bg-gray-50">
                        <input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div className="flex flex-col items-center justify-center">
                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG, or JPEG (max. 10MB)
                            </p>
                          </div>
                        </label>
                      </div>
                    )}

                    {isUploading && (
                      <div className="flex items-center justify-center w-full p-4 border rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                        <p>Uploading file...</p>
                      </div>
                    )}

                    {imagePreview && !isUploading && (
                      <div className="relative border rounded-lg overflow-hidden">
                        <div className="absolute top-2 right-2 z-10">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={removeFile}
                            className="h-8 w-8 rounded-full"
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </div>
                        <div className="relative aspect-video bg-gray-100 flex items-center justify-center">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-[300px] max-w-full object-contain"
                          />
                        </div>
                        <div className="p-2 bg-gray-50 text-sm">
                          {selectedFile?.name}
                        </div>
                      </div>
                    )}

                    {!attachmentUrl && !isUploading && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Required</AlertTitle>
                        <AlertDescription>
                          An attachment is required for all expenses. Please upload an image.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" type="button" onClick={() => form.reset()}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createExpenseMutation.isPending}
                      className="gap-1"
                    >
                      {createExpenseMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add Expense
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <ExpensesBulkUpload />
        </TabsContent>

        <TabsContent value="view" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Expense Records</CardTitle>
                <CardDescription>
                  View all expense records.
                </CardDescription>
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
                  Error loading expenses
                </p>
              ) : expenses && expenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(expense.date)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {expense.category.replace("_", " ")}
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>
                            {expense.propertyId
                              ? `#${expense.propertyId}`
                              : "Common"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No expense records found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}