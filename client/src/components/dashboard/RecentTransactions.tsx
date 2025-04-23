import { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: number;
  date: string;
  description: string;
  type?: string;
  category?: string;
  amount: number;
  transactionType: 'income' | 'expense';
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export default function RecentTransactions({
  transactions,
  isLoading = false,
}: RecentTransactionsProps) {
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter transactions based on the selected filter
  const filteredTransactions = transactions.filter((transaction) => {
    if (filter === "all") return true;
    return transaction.transactionType === filter;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Format amount with currency symbol
  const formatAmount = (amount: number, type: 'income' | 'expense') => {
    const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
    if (type === 'income') {
      return `+${formattedAmount}`;
    }
    return `-${formattedAmount}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Loading transactions...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p>Loading transaction data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial activities</CardDescription>
        </div>
        <div className="mt-2 sm:mt-0">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Transactions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="income">Income Only</SelectItem>
              <SelectItem value="expense">Expenses Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(transaction.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {transaction.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${
                          transaction.transactionType === "income"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        } px-2 inline-flex text-xs leading-5 font-semibold rounded-full`}
                      >
                        {transaction.transactionType === "income"
                          ? transaction.type || "Income"
                          : transaction.category || "Expense"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap font-medium ${
                        transaction.transactionType === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatAmount(transaction.amount, transaction.transactionType)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-500">
                      Completed
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex items-center justify-between border-t">
          <div className="flex-1 text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(startIndex + itemsPerPage, filteredTransactions.length)}
            </span>{" "}
            of <span className="font-medium">{filteredTransactions.length}</span> results
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNumber)}
                      isActive={pageNumber === currentPage}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {totalPages > 5 && (
                <>
                  <PaginationItem>
                    <PaginationLink>...</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink 
                      onClick={() => setCurrentPage(totalPages)}
                      isActive={totalPages === currentPage}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={
                    currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      )}
    </Card>
  );
}
