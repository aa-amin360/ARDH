import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface Transaction {
  id: number;
  date: string;
  type?: "rent" | "maintenance" | "tax_return" | "other";
  category?: string;
  amount: number;
  description: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export default function RecentTransactions({
  transactions,
  isLoading = false,
}: RecentTransactionsProps) {
  const { isAdmin } = useAuth();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getTransactionTypeInfo = (transaction: Transaction) => {
    // Income transaction
    if (transaction.type) {
      return {
        icon: <ArrowUpRight className="h-4 w-4 text-green-500" />,
        badgeColor: "bg-green-100 text-green-800",
        badgeText: transaction.type.replace("_", " "),
        isIncome: true,
      };
    }
    
    // Expense transaction
    return {
      icon: <ArrowDownRight className="h-4 w-4 text-red-500" />,
      badgeColor: "bg-red-100 text-red-800",
      badgeText: transaction.category || "expense",
      isIncome: false,
    };
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex justify-center items-center h-32 text-gray-500">
            No recent transactions
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const { icon, badgeColor, badgeText, isIncome } = getTransactionTypeInfo(transaction);
                
                // For data entry users, hide income transactions
                if (!isAdmin && isIncome) {
                  return null;
                }
                
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {icon}
                        <Badge className={`ml-2 ${badgeColor}`}>
                          {badgeText}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}