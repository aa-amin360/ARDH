import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Expense form schema
const formSchema = z.object({
  date: z.date(),
  amount: z.coerce.number().positive("Amount must be a positive number"),
  category: z.string(),
  description: z.string().min(1, "Description is required"),
  vendor: z.string().optional(),
  propertyId: z.coerce.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expenseId?: number; // Optional ID for edit mode
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ExpenseForm({
  expenseId,
  onSuccess,
  onCancel,
}: ExpenseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!expenseId;

  // Get properties for the dropdown
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties"],
  });

  // Fetch expense data if in edit mode
  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ["/api/expenses", expenseId],
    enabled: isEditMode,
  });

  // Form definition
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      category: "electricity",
      description: "",
      vendor: "",
      propertyId: null,
    },
  });

  // Update form with expense data when in edit mode
  useEffect(() => {
    if (isEditMode && expenseData) {
      form.reset({
        date: new Date(expenseData.date),
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description,
        vendor: expenseData.vendor || "",
        propertyId: expenseData.propertyId || null,
      });
    }
  }, [form, expenseData, isEditMode]);

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("POST", "/api/expenses", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense added",
        description: "The expense has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/expense-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-transactions"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("PUT", `/api/expenses/${expenseId}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense updated",
        description: "The expense has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", expenseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/expense-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-transactions"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateExpenseMutation.mutateAsync(values);
      } else {
        await createExpenseMutation.mutateAsync(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && expenseLoading) {
    return <p>Loading expense data...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
                    placeholder="Enter amount"
                    type="number"
                    {...field}
                  />
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
                <FormLabel>Expense Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expense category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="generator_fuel">Generator Fuel</SelectItem>
                    <SelectItem value="cctv_maintenance">CCTV Maintenance</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="elevator_maintenance">Elevator Maintenance</SelectItem>
                    <SelectItem value="general_building_maintenance">General Building Maintenance</SelectItem>
                    <SelectItem value="water_tank">Water Tank</SelectItem>
                    <SelectItem value="donation">Local Donation</SelectItem>
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
            name="vendor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor</FormLabel>
                <FormControl>
                  <Input placeholder="Enter vendor name (optional)" {...field} />
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
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                  value={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {!propertiesLoading &&
                      properties?.map((property: any) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.flatNumber} - {property.flatType}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the property this expense is associated with (if applicable)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter expense description"
                    {...field}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditMode ? "Update Expense" : "Add Expense"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
