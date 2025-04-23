import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FlatTypeData {
  type: string;
  count: number;
}

interface MaintenanceCollection {
  oneBhk: number;
  twoBhk: number;
  total: number;
}

interface MaintenanceIssue {
  title: string;
  status: "pending" | "completed" | "urgent";
  date?: string;
}

interface PropertyStatusProps {
  flatTypes: FlatTypeData[];
  totalRentalUnits: number;
  rentedUnits: number;
  vacantUnits: number;
  totalMonthlyRent: number;
  maintenanceCollection: MaintenanceCollection;
  maintenanceIssues: MaintenanceIssue[];
  isLoading?: boolean;
}

export default function PropertyStatus({
  flatTypes,
  totalRentalUnits,
  rentedUnits,
  vacantUnits,
  totalMonthlyRent,
  maintenanceCollection,
  maintenanceIssues,
  isLoading = false,
}: PropertyStatusProps) {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getOccupancyRate = () => {
    if (totalRentalUnits === 0) return 0;
    return Math.round((rentedUnits / totalRentalUnits) * 100);
  };

  const getStatusBadge = (status: MaintenanceIssue["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "urgent":
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Property Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Occupancy Rate */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <h3 className="text-sm font-medium">Occupancy Rate</h3>
                <span className="text-sm text-gray-500">
                  {rentedUnits} / {totalRentalUnits} units
                </span>
              </div>
              <Progress value={getOccupancyRate()} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{getOccupancyRate()}% Occupied</span>
                <span>{Math.round(100 - getOccupancyRate())}% Vacant</span>
              </div>
            </div>

            {/* Rental Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Total Monthly Rent
                </h3>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalMonthlyRent)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Monthly Maintenance
                </h3>
                <p className="text-2xl font-bold">
                  {formatCurrency(maintenanceCollection.total)}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  <p>1BHK: {formatCurrency(maintenanceCollection.oneBhk)}</p>
                  <p>2BHK: {formatCurrency(maintenanceCollection.twoBhk)}</p>
                </div>
              </div>
            </div>

            {/* Maintenance Issues */}
            <div>
              <h3 className="text-sm font-medium mb-3">Maintenance Issues</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceIssues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-gray-500">
                        No maintenance issues
                      </TableCell>
                    </TableRow>
                  ) : (
                    maintenanceIssues.map((issue, index) => (
                      <TableRow key={index}>
                        <TableCell>{issue.title}</TableCell>
                        <TableCell>{getStatusBadge(issue.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}