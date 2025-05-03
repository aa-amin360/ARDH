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

// Modify this schema based on your actual data model
const formSchema = z.object({
  date: z.date(),
  amount: z.coerce.number().positive("Amount must be a positive number"),
  type: z.string(),
  description: z.string().min(1, "Description is required"),
  propertyId: z.coerce.number().nullable().optional(),
  receivedFrom: z.string().min(1, "Received from is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface IncomeFormProps {
  incomeId?: number; // Optional ID for edit mode
  onSuccess: () => void;
  onCancel: () => void;
}

export default function IncomeForm({
  incomeId,
  onSuccess,
  onCancel,
}: IncomeFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expectedIncome, setExpectedIncome] = useState(0);
  const [difference, setDifference] = useState(0);

  // Query to fetch expected income when property and type are selected
  const { data: propertyCharge } = useQuery({
    queryKey: ['/api/property-charges', form.watch('propertyId'), form.watch('type')],
    queryFn: async () => {
      const propertyId = form.watch('propertyId');
      const type = form.watch('type');
      if (!propertyId || !type) return null;

      const property = properties?.find(p => p.id === propertyId);
      if (!property) return null;

      const res = await apiRequest('GET', `/api/properties/${property.flatNumber}/current-charges`);
      if (!res.ok) return null;
      
      const charges = await res.json();
      const chargeType = type === 'rent' ? 'rent' : 
                        type === 'maintenance' ? 'maint_fee' :
                        type === 'water_fee' ? 'water_fee' : null;
      
      return charges.find(c => c.chargeType === chargeType);
    },
    enabled: !!(form.watch('propertyId') && form.watch('type'))
  });

  // Update expected income and difference when charge data changes
  useEffect(() => {
    const amount = propertyCharge?.amount || 0;
    setExpectedIncome(amount);
    setDifference(amount - (form.watch('amount') || 0));
  }, [propertyCharge, form.watch('amount')]);
  const isEditMode = !!incomeId;

  // Get properties for the dropdown
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties"],
  });

  // Fetch income data if in edit mode
  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: ["/api/incomes", incomeId],
    enabled: isEditMode,
  });

  // Form definition
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      type: "rent",
      description: "",
      propertyId: null,
      receivedFrom: "Nestaway",
    },
  });

  // Update form with income data when in edit mode
  useEffect(() => {
    if (isEditMode && incomeData) {
      form.reset({
        date: new Date(incomeData.date),
        amount: incomeData.amount,
        type: incomeData.type,
        description: incomeData.description,
        propertyId: incomeData.propertyId || null,
        receivedFrom: incomeData.receivedFrom,
      });
    }
  }, [form, incomeData, isEditMode]);

  // Create income mutation
  const createIncomeMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("POST", "/api/incomes", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Income added",
        description: "The income has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/income-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-transactions"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add income",
        variant: "destructive",
      });
    },
  });

  // Update income mutation
  const updateIncomeMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("PUT", `/api/incomes/${incomeId}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Income updated",
        description: "The income has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incomes", incomeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/income-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-transactions"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update income",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateIncomeMutation.mutateAsync(values);
      } else {
        await createIncomeMutation.mutateAsync(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && incomeLoading) {
    return <p>Loading income data...</p>;
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
                    onChange={(e) => {
                      field.onChange(e);
                      const amount = parseInt(e.target.value) || 0;
                      setDifference(expectedIncome - amount);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedIncome"
            render={() => (
              <FormItem>
                <FormLabel>Expected Income (₹)</FormLabel>
                <FormControl>
                  <Input
                    value={expectedIncome}
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
                    value={difference}
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
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select income type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="tax_return">Tax Return</SelectItem>
                    <SelectItem value="water_fee">Water Fee</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
                  Select the property this income is associated with
                </FormDescription>
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
                  <Input placeholder="Enter source" {...field} />
                </FormControl>
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
                    placeholder="Enter income description"
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
            {isSubmitting ? "Saving..." : isEditMode ? "Update Income" : "Add Income"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
