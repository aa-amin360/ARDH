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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const expenseFormSchema = insertExpenseSchema.extend({
  amount: z.coerce.number().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
  vendorId: z.string().optional(),
  propertyId: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function ExpensesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("view");

  // Queries
  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: () => apiRequest("GET", "/api/expenses").then((res) => res.json()),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/expenses/categories"],
    queryFn: () => apiRequest("GET", "/api/expenses/categories").then((res) => res.json()),
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: "",
      subcategory: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      description: "",
      vendorId: undefined,
      propertyId: undefined,
    },
  });

  const watchCategory = form.watch("category");
  const watchSubcategory = form.watch("subcategory");

  const { data: subcategories = [] } = useQuery({
    queryKey: ["/api/expenses/subcategories", watchCategory],
    queryFn: () => 
      watchCategory 
        ? apiRequest("GET", `/api/expenses/subcategories/${watchCategory}`).then((res) => res.json())
        : Promise.resolve([]),
    enabled: !!watchCategory,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors/by-subcategory", watchSubcategory],
    queryFn: () =>
      watchSubcategory
        ? apiRequest("GET", `/api/vendors/by-subcategory/${watchSubcategory}`).then((res) => res.json())
        : Promise.resolve([]),
    enabled: !!watchSubcategory,
  });

  const properties = [
    { id: "0", flatNumber: "Common Areas" },
    { id: "1", flatNumber: "101" },
    { id: "2", flatNumber: "102" },
    // Add other properties as needed
  ];

  const addExpenseMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const formattedValues = {
        ...values,
        vendorId: values.vendorId ? parseInt(values.vendorId) : null,
        propertyId: values.propertyId ? parseInt(values.propertyId) : null,
        createdBy: user?.id || 0,
      };
      const res = await apiRequest("POST", "/api/expenses", formattedValues);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: ExpenseFormValues) {
    addExpenseMutation.mutate(values);
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Expense Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="add">Add Expense</TabsTrigger>
          <TabsTrigger value="view">View Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
              <CardDescription>Enter expense details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <Select onValueChange={field.onChange} value={field.value}>
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

                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Vendor</SelectItem>
                              {vendors.map((vendor: any) => (
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

                    <FormField
                      control={form.control}
                      name="propertyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Property</SelectItem>
                              {properties.map((property) => (
                                <SelectItem
                                  key={property.id}
                                  value={property.id}
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
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
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
                          <Textarea {...field} />
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
                    {addExpenseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
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

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>Expense Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>₹{expense.amount}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}