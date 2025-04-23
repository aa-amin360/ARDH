import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, PlusCircle } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ExpensesTable from "@/components/tables/ExpensesTable";
import ExpenseForm from "@/components/forms/ExpenseForm";
import WaterTankForm from "@/components/forms/WaterTankForm";

export default function ExpensesPage() {
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const [isWaterTankDialogOpen, setIsWaterTankDialogOpen] = useState(false);
  const [selectedWaterTank, setSelectedWaterTank] = useState<any>(null);
  const [isWaterTankEditDialogOpen, setIsWaterTankEditDialogOpen] = useState(false);
  const [isWaterTankDeleteDialogOpen, setIsWaterTankDeleteDialogOpen] = useState(false);
  const [waterTankDeleteId, setWaterTankDeleteId] = useState<number | null>(null);

  // Fetch expenses
  const { data: expenses, isLoading, isError } = useQuery({
    queryKey: ["/api/expenses"],
  });

  // Fetch water tanks
  const { data: waterTanks, isLoading: waterTanksLoading } = useQuery({
    queryKey: ["/api/water-tanks"],
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/expenses/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense deleted",
        description: "The expense record has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/expense-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-transactions"] });
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  // Delete water tank mutation
  const deleteWaterTankMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/water-tanks/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Water tank record deleted",
        description: "The water tank record has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/water-tanks"] });
      setIsWaterTankDeleteDialogOpen(false);
      setWaterTankDeleteId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete water tank record",
        variant: "destructive",
      });
    },
  });

  // Handle edit expense
  const handleEditExpense = (expense: any) => {
    setSelectedExpense(expense);
    setIsEditDialogOpen(true);
  };

  // Handle delete expense
  const handleDeleteExpense = (id: number) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  // Handle edit water tank
  const handleEditWaterTank = (waterTank: any) => {
    setSelectedWaterTank(waterTank);
    setIsWaterTankEditDialogOpen(true);
  };

  // Handle delete water tank
  const handleDeleteWaterTank = (id: number) => {
    setWaterTankDeleteId(id);
    setIsWaterTankDeleteDialogOpen(true);
  };

  // Confirm delete expense
  const confirmDeleteExpense = () => {
    if (deleteId) {
      deleteExpenseMutation.mutate(deleteId);
    }
  };

  // Confirm delete water tank
  const confirmDeleteWaterTank = () => {
    if (waterTankDeleteId) {
      deleteWaterTankMutation.mutate(waterTankDeleteId);
    }
  };

  // Format water tank data for table
  const formatWaterTankForTable = (waterTanks: any[]) => {
    return waterTanks?.map(tank => ({
      ...tank,
      category: "water_tank",
      description: `Water tank delivery - ${tank.liters} liters`,
      vendor: tank.tankerNumber
    })) || [];
  };

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        Error loading expense data. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="py-4">
      <Tabs defaultValue="expenses">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="expenses">General Expenses</TabsTrigger>
            <TabsTrigger value="water-tanks">Water Tank Records</TabsTrigger>
          </TabsList>
          
          <div>
            <TabsContent value="expenses" className="mt-0">
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </TabsContent>
            
            <TabsContent value="water-tanks" className="mt-0">
              <Button onClick={() => setIsWaterTankDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Water Tank Record
              </Button>
            </TabsContent>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <TabsContent value="expenses">
              <CardTitle>Expense Management</CardTitle>
            </TabsContent>
            <TabsContent value="water-tanks">
              <CardTitle>Water Tank Records</CardTitle>
            </TabsContent>
          </CardHeader>
          <CardContent>
            <TabsContent value="expenses" className="mt-0">
              {isLoading ? (
                <div className="text-center py-10">Loading expense data...</div>
              ) : (
                <ExpensesTable
                  data={expenses || []}
                  onEdit={handleEditExpense}
                  onDelete={handleDeleteExpense}
                />
              )}
            </TabsContent>
            
            <TabsContent value="water-tanks" className="mt-0">
              {waterTanksLoading ? (
                <div className="text-center py-10">Loading water tank records...</div>
              ) : (
                <ExpensesTable
                  data={formatWaterTankForTable(waterTanks || [])}
                  onEdit={handleEditWaterTank}
                  onDelete={handleDeleteWaterTank}
                />
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Create a new expense record in the system
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            onSuccess={() => setIsAddDialogOpen(false)}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the expense record details
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <ExpenseForm
              expenseId={selectedExpense.id}
              onSuccess={() => setIsEditDialogOpen(false)}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              expense record from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteExpense}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Water Tank Dialog */}
      <Dialog open={isWaterTankDialogOpen} onOpenChange={setIsWaterTankDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Water Tank Record</DialogTitle>
            <DialogDescription>
              Record a new water tank delivery
            </DialogDescription>
          </DialogHeader>
          <WaterTankForm
            onSuccess={() => setIsWaterTankDialogOpen(false)}
            onCancel={() => setIsWaterTankDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Water Tank Dialog */}
      <Dialog open={isWaterTankEditDialogOpen} onOpenChange={setIsWaterTankEditDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Water Tank Record</DialogTitle>
            <DialogDescription>
              Update the water tank delivery details
            </DialogDescription>
          </DialogHeader>
          {selectedWaterTank && (
            <WaterTankForm
              waterTankId={selectedWaterTank.id}
              waterTankData={selectedWaterTank}
              onSuccess={() => setIsWaterTankEditDialogOpen(false)}
              onCancel={() => setIsWaterTankEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Water Tank Confirmation Dialog */}
      <AlertDialog
        open={isWaterTankDeleteDialogOpen}
        onOpenChange={setIsWaterTankDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              water tank delivery record from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteWaterTank}
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
