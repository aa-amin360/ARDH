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

import IncomesTable from "@/components/tables/IncomesTable";
import IncomeForm from "@/components/forms/IncomeForm";
import { useAuth } from "@/contexts/AuthContext";

export default function IncomePage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Fetch incomes
  const { data: incomes, isLoading, isError } = useQuery({
    queryKey: ["/api/incomes"],
  });

  // Delete income mutation
  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/incomes/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Income deleted",
        description: "The income record has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/income-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-transactions"] });
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete income",
        variant: "destructive",
      });
    },
  });

  // Handle edit income
  const handleEditIncome = (income: any) => {
    setSelectedIncome(income);
    setIsEditDialogOpen(true);
  };

  // Handle delete income
  const handleDeleteIncome = (id: number) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (deleteId) {
      deleteIncomeMutation.mutate(deleteId);
    }
  };

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        Error loading income data. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="py-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Income Management</CardTitle>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Income
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Loading income data...</div>
          ) : (
            <IncomesTable
              data={incomes || []}
              onEdit={handleEditIncome}
              onDelete={handleDeleteIncome}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Income Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
            <DialogDescription>
              Create a new income record in the system
            </DialogDescription>
          </DialogHeader>
          <IncomeForm
            onSuccess={() => setIsAddDialogOpen(false)}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Income Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Income</DialogTitle>
            <DialogDescription>
              Update the income record details
            </DialogDescription>
          </DialogHeader>
          {selectedIncome && (
            <IncomeForm
              incomeId={selectedIncome.id}
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
              income record from the system.
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
