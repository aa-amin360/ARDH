import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import PropertiesTable from "@/components/tables/PropertiesTable";
import PropertyForm from "@/components/forms/PropertyForm";

export default function PropertiesPage() {
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Fetch properties
  const { data: properties, isLoading, isError } = useQuery({
    queryKey: ["/api/properties"],
  });

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/properties/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Property deleted",
        description: "The property has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/property-summary"] });
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  // Handle edit property
  const handleEditProperty = (property: any) => {
    setSelectedProperty(property);
    setIsEditDialogOpen(true);
  };

  // Handle delete property
  const handleDeleteProperty = (id: number) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (deleteId) {
      deletePropertyMutation.mutate(deleteId);
    }
  };

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        Error loading property data. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="py-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Property Management</CardTitle>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Property
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Loading property data...</div>
          ) : (
            <PropertiesTable
              data={properties || []}
              onEdit={handleEditProperty}
              onDelete={handleDeleteProperty}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Property Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
            <DialogDescription>
              Create a new property in the system
            </DialogDescription>
          </DialogHeader>
          <PropertyForm
            onSuccess={() => setIsAddDialogOpen(false)}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update the property details
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <PropertyForm
              propertyId={selectedProperty.id}
              propertyData={selectedProperty}
              onSuccess={() => setIsEditDialogOpen(false)}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              property from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
