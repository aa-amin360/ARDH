import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// Property form schema
const formSchema = z.object({
  flatNumber: z.string().min(1, "Flat number is required"),
  flatType: z.string(),
  ownerName: z.string().min(1, "Owner name is required"),
  expectedRent: z.coerce.number().positive("Rent must be a positive number"),
  maintenanceFee: z.coerce.number().positive("Maintenance fee must be a positive number"),
  isRented: z.boolean(),
  currentTenant: z.string().optional(),
  floorArea: z.coerce.number().positive("Floor area must be a positive number").optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PropertyFormProps {
  propertyId?: number; // Optional ID for edit mode
  onSuccess: () => void;
  onCancel: () => void;
  propertyData?: any; // Property data for edit mode
}

export default function PropertyForm({
  propertyId,
  onSuccess,
  onCancel,
  propertyData,
}: PropertyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!propertyId;

  // Form definition
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flatNumber: "",
      flatType: "1BHK",
      ownerName: "",
      expectedRent: 0,
      maintenanceFee: 0,
      isRented: false,
      currentTenant: "",
      floorArea: 0,
      notes: "",
    },
  });

  // Update form with property data when in edit mode
  useEffect(() => {
    if (isEditMode && propertyData) {
      form.reset({
        flatNumber: propertyData.flatNumber,
        flatType: propertyData.flatType,
        ownerName: propertyData.ownerName,
        expectedRent: propertyData.expectedRent,
        maintenanceFee: propertyData.maintenanceFee,
        isRented: propertyData.isRented,
        currentTenant: propertyData.currentTenant || "",
        floorArea: propertyData.floorArea || 0,
        notes: propertyData.notes || "",
      });
    }
  }, [form, propertyData, isEditMode]);

  // Create property mutation
  const createPropertyMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("POST", "/api/properties", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Property added",
        description: "The property has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/property-summary"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add property",
        variant: "destructive",
      });
    },
  });

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("PUT", `/api/properties/${propertyId}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Property updated",
        description: "The property has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/property-summary"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updatePropertyMutation.mutateAsync(values);
      } else {
        await createPropertyMutation.mutateAsync(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set maintenance fee based on flat type
  const updateMaintenanceFee = (flatType: string) => {
    let fee = 0;
    switch (flatType) {
      case "1BHK":
        fee = 1000;
        break;
      case "2BHK":
        fee = 1500;
        break;
      case "3BHK":
        fee = 2000;
        break;
      case "penthouse":
        fee = 3000;
        break;
      default:
        fee = 0;
    }
    form.setValue("maintenanceFee", fee);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="flatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Flat Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 101" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the flat number as displayed in the building
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="flatType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Flat Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    updateMaintenanceFee(value);
                  }}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select flat type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1BHK">1 BHK</SelectItem>
                    <SelectItem value="2BHK">2 BHK</SelectItem>
                    <SelectItem value="3BHK">3 BHK</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ownerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter owner's name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedRent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Rent (₹)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter expected rent"
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
            name="maintenanceFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Fee (₹)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter maintenance fee"
                    type="number"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Standard fees: 1BHK - ₹1,000, 2BHK - ₹1,500, 3BHK - ₹2,000, Penthouse - ₹3,000
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="floorArea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Floor Area (sq ft)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter floor area"
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
            name="isRented"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Rental Status</FormLabel>
                  <FormDescription>
                    Is this flat currently rented?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("isRented") && (
            <FormField
              control={form.control}
              name="currentTenant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Tenant</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter current tenant's name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter any additional notes about the property"
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
            {isSubmitting ? "Saving..." : isEditMode ? "Update Property" : "Add Property"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
