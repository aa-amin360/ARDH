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
  amount: z.number().positive().or(z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in the format YYYY-MM-DD",
  }),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export default function IncomePage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("add");

  // Query to fetch incomes
  const {
    data: incomes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/incomes"],
    onError: (error: any) => {
      toast({
        title: "Error fetching income records",
        description: error.message,
        variant: "destructive",
      });
    },
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
        type: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
        propertyId: "",
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
      type: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      reference: "",
      propertyId: "",
    },
  });

  function onSubmit(values: IncomeFormValues) {
    createIncomeMutation.mutate(values);
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add">Add Income</TabsTrigger>
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
                              <SelectItem value="">Common / All Properties</SelectItem>
                              <SelectItem value="1">101 - 1BHK</SelectItem>
                              <SelectItem value="2">102 - 2BHK</SelectItem>
                              <SelectItem value="3">103 - 3BHK</SelectItem>
                              <SelectItem value="4">201 - 1BHK</SelectItem>
                              <SelectItem value="5">202 - 2BHK</SelectItem>
                              <SelectItem value="6">203 - 2BHK</SelectItem>
                              <SelectItem value="7">204 - 1BHK</SelectItem>
                              <SelectItem value="8">301 - 1BHK</SelectItem>
                              <SelectItem value="9">302 - 2BHK</SelectItem>
                              <SelectItem value="10">303 - 2BHK</SelectItem>
                              <SelectItem value="11">304 - 1BHK</SelectItem>
                              <SelectItem value="12">401 - 1BHK</SelectItem>
                              <SelectItem value="13">402 - 1BHK</SelectItem>
                              <SelectItem value="14">403 - 1BHK</SelectItem>
                              <SelectItem value="15">404 - 1BHK</SelectItem>
                              <SelectItem value="16">501 - 1BHK</SelectItem>
                              <SelectItem value="17">502 - 2BHK</SelectItem>
                              <SelectItem value="18">503 - 2BHK</SelectItem>
                              <SelectItem value="19">504 - Penthouse</SelectItem>
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
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference/Receipt Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional reference or receipt number"
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