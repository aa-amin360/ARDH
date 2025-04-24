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
import { Loader2, Plus, FileSpreadsheet } from "lucide-react";
import { insertIncomeSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
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
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export default function IncomePage() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("add");

  // Query to fetch incomes
  const {
    data: incomes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/incomes"],
  });

  //Dropdown for properties
  const properties = [
    { id: 0, flatNumber: "ARDH Building" },
    { id: 1, flatNumber: "Common Areas" },
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

  const propertyOptions = React.useMemo(() => {
    const rest = properties.slice(2); // skip ARDH and Common Areas for sorting
    const sortedFlats = rest.sort((a, b) =>
      a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }),
    );

    return [
      properties[0], // ARDH Building
      properties[1], // Common Areas
      ...sortedFlats,
    ];
  }, []);

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
      });
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
    },
  });

  function onSubmit(values: IncomeFormValues) {
    // Process the values for submission
    const propertyId = values.propertyId || 0;

    const formattedValues = {
      ...values,
      propertyId,
      createdBy: user?.id || 0,
    };

    addIncomeMutation.mutate(formattedValues);
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Income Management</h1>

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
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
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
                              <SelectItem value="maintenance">
                                Maintenance
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
                              {propertyOptions.map((option) => (
                                <SelectItem
                                  key={option.id}
                                  value={option.id.toString()}
                                >
                                  {option.flatNumber}
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
              <CardTitle>Bulk Upload</CardTitle>
              <CardDescription>
                Bulk upload feature is coming soon.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-12">
                <p className="text-muted-foreground">
                  Bulk upload functionality is under development.
                </p>
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
              {isLoading ? (
                <div className="flex justify-center my-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isError ? (
                <p className="text-center text-red-500 my-8">
                  Error loading income records
                </p>
              ) : Array.isArray(incomes) && incomes.length > 0 ? (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      Recent Income Entries
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
                          {incomes.slice(0, 5).map((income) => (
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
                                  ? properties?.find(
                                      (p) => p.id === income.propertyId,
                                    )?.flatNumber || `#${income.propertyId}`
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
                      Showing the 5 most recent income entries
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
                                ? properties?.find(
                                    (p) => p.id === income.propertyId,
                                  )?.flatNumber || `#${income.propertyId}`
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
