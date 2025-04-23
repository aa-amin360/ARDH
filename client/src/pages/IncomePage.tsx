import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, FileSpreadsheet } from "lucide-react";
import { insertIncomeSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import IncomeBulkUpload from "@/components/bulk-upload/IncomeBulkUpload";
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
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
  propertyId: z.coerce.number().optional(),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export default function IncomePage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("add");

  // Query to fetch incomes
  const {
    data: incomes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/incomes"]
  });

  // Mutation to add a new income
  const createIncomeMutation = useMutation({
    mutationFn: async (values: IncomeFormValues) => {
      const res = await apiRequest("POST", "/api/incomes", values);
      return await res.json();
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
        propertyId: "0",
        createdBy: 0
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
    },
    onError: (error: any) => {
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
      propertyId: "0", // Set default to common areas
      createdBy: 0, // Will be set on the server
    },
  } as any);

  function onSubmit(values: IncomeFormValues) {
    // Process the values for submission
    const propertyId = values.propertyId ? parseInt(values.propertyId as unknown as string) : 0;
    
    const formattedValues = {
      ...values,
      receivedFrom: values.receivedFrom || "Unknown",
      propertyId: propertyId === 0 ? null : propertyId,
      date: new Date(values.date).toISOString(), // Ensure date is formatted as ISO string
      amount: Number(values.amount), // Ensure amount is a number
    };
    createIncomeMutation.mutate(formattedValues as any);
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

  // If not admin, redirect or show access denied
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              You do not have permission to access income records. Please contact an administrator for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Income Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add">Add Income</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="view">View Income</TabsTrigger>
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                              <SelectItem value="maintenance">Maintenance Fee</SelectItem>
                              <SelectItem value="tax_return">Tax Return</SelectItem>
                              <SelectItem value="rental_advance">Rental Advance</SelectItem>
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
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Common / All Properties</SelectItem>
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
                            Required for rent and maintenance income
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
                            placeholder="Enter income description"
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
                            placeholder="Who the income was received from"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" type="button" onClick={() => form.reset()}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createIncomeMutation.isPending}
                      className="gap-1"
                    >
                      {createIncomeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add Income
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <IncomeBulkUpload />
        </TabsContent>

        <TabsContent value="view" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Income Records</CardTitle>
                <CardDescription>
                  View all income records.
                </CardDescription>
              </div>
              <Button variant="outline" className="gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            {/* Last income entered section */}
            {incomes && incomes.length > 0 && (
              <div className="mx-6 mb-4 p-4 bg-muted rounded-md">
                <h3 className="text-sm font-medium mb-2">Last Income Entered:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(incomes[0].date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{incomes[0].type.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-medium">{formatCurrency(incomes[0].amount)}</p>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p>{incomes[0].description}</p>
                  </div>
                </div>
              </div>
            )}
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center my-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isError ? (
                <p className="text-center text-red-500 my-8">
                  Error loading income records
                </p>
              ) : incomes && incomes.length > 0 ? (
                <div className="overflow-x-auto">
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
                      {incomes.map((income) => (
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
                              ? `#${income.propertyId}`
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