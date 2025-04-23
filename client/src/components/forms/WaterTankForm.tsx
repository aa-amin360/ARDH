import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Water Tank form schema
const formSchema = z.object({
  date: z.date(),
  liters: z.coerce.number().positive("Liters must be a positive number"),
  tankerNumber: z.string().min(1, "Tanker number is required"),
  personInCharge: z.string().min(1, "Person in charge is required"),
  cost: z.coerce.number().positive("Cost must be a positive number"),
});

type FormValues = z.infer<typeof formSchema>;

interface WaterTankFormProps {
  waterTankId?: number; // Optional ID for edit mode
  onSuccess: () => void;
  onCancel: () => void;
  waterTankData?: any; // Water tank data for edit mode
}

export default function WaterTankForm({
  waterTankId,
  onSuccess,
  onCancel,
  waterTankData,
}: WaterTankFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!waterTankId;

  // Form definition
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      liters: 5000,
      tankerNumber: "",
      personInCharge: "Building Manager",
      cost: 3200,
    },
  });

  // Update form with water tank data when in edit mode
  useEffect(() => {
    if (isEditMode && waterTankData) {
      form.reset({
        date: new Date(waterTankData.date),
        liters: waterTankData.liters,
        tankerNumber: waterTankData.tankerNumber,
        personInCharge: waterTankData.personInCharge,
        cost: waterTankData.cost,
      });
    }
  }, [form, waterTankData, isEditMode]);

  // Create water tank mutation
  const createWaterTankMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("POST", "/api/water-tanks", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Water tank record added",
        description: "The water tank record has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/water-tanks"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add water tank record",
        variant: "destructive",
      });
    },
  });

  // Update water tank mutation
  const updateWaterTankMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("PUT", `/api/water-tanks/${waterTankId}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Water tank record updated",
        description: "The water tank record has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/water-tanks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/water-tanks", waterTankId] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update water tank record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateWaterTankMutation.mutateAsync(values);
      } else {
        await createWaterTankMutation.mutateAsync(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Delivery Date</FormLabel>
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
            name="liters"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Liters of Water</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter liters"
                    type="number"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Standard tanker typically delivers 5,000 liters
                </FormDescription>
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
                  <Input
                    placeholder="e.g. TN-1234"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Enter the registration or identification number of the water tanker
                </FormDescription>
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
                  <Input
                    placeholder="Enter name of person responsible"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Person who supervised the water delivery
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost (₹)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter cost"
                    type="number"
                    {...field}
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
            {isSubmitting ? "Saving..." : isEditMode ? "Update Record" : "Add Record"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
