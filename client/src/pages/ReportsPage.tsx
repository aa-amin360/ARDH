import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { CalendarIcon, FileDown, PieChart, BarChart3, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

export default function ReportsPage() {
  // Date range state
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfMonth(subMonths(new Date(), 3)),
    to: endOfMonth(new Date()),
  });

  // Report type state
  const [reportType, setReportType] = useState("income");

  // Fetch data for reports
  const { data: incomes, isLoading: incomesLoading } = useQuery({
    queryKey: ["/api/incomes"],
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties"],
  });

  // Filter data by date range
  const filteredIncomes = incomes?.filter((income: any) => {
    const incomeDate = new Date(income.date);
    return incomeDate >= dateRange.from && incomeDate <= dateRange.to;
  });

  const filteredExpenses = expenses?.filter((expense: any) => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= dateRange.from && expenseDate <= dateRange.to;
  });

  // Group income by type for pie chart
  const incomeByType = React.useMemo(() => {
    if (!filteredIncomes) return [];
    
    const typeGroups: Record<string, number> = {};
    filteredIncomes.forEach((income: any) => {
      if (!typeGroups[income.type]) {
        typeGroups[income.type] = 0;
      }
      typeGroups[income.type] += income.amount;
    });
    
    return Object.entries(typeGroups).map(([type, amount]) => ({
      name: type === "rent" ? "Rent" : 
            type === "maintenance" ? "Maintenance" : 
            type === "tax_return" ? "Tax Return" : "Other",
      value: amount,
    }));
  }, [filteredIncomes]);

  // Group expenses by category for pie chart
  const expensesByCategory = React.useMemo(() => {
    if (!filteredExpenses) return [];
    
    const categoryGroups: Record<string, number> = {};
    filteredExpenses.forEach((expense: any) => {
      if (!categoryGroups[expense.category]) {
        categoryGroups[expense.category] = 0;
      }
      categoryGroups[expense.category] += expense.amount;
    });
    
    return Object.entries(categoryGroups).map(([category, amount]) => ({
      name: category
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      value: amount,
    }));
  }, [filteredExpenses]);

  // Calculate total income
  const totalIncome = filteredIncomes?.reduce(
    (sum: number, income: any) => sum + income.amount,
    0
  ) || 0;

  // Calculate total expenses
  const totalExpenses = filteredExpenses?.reduce(
    (sum: number, expense: any) => sum + expense.amount,
    0
  ) || 0;

  // Calculate profit
  const profit = totalIncome - totalExpenses;

  // Colors for pie charts
  const INCOME_COLORS = ["#1E88E5", "#26A69A", "#FFC107", "#9C27B0"];
  const EXPENSE_COLORS = ["#EF4444", "#F59E0B", "#22C55E", "#6366F1", "#EC4899"];

  // Sample monthly data (use calculated data if available)
  const monthlyData = [
    { month: "Jan", Income: 425000, Expenses: 85000 },
    { month: "Feb", Income: 430000, Expenses: 90000 },
    { month: "Mar", Income: 420000, Expenses: 82000 },
    { month: "Apr", Income: 435000, Expenses: 79000 },
    { month: "May", Income: 440000, Expenses: 87500 },
    { month: "Jun", Income: 435000, Expenses: 88000 },
  ];

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="py-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
          <CardDescription>
            Generate financial reports for your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Date Range Picker */}
            <div className="grid gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className="w-full md:w-[300px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      if (range && range.from && range.to) {
                        setDateRange(range);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Report Type Selector */}
            <Select
              value={reportType}
              onValueChange={setReportType}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income Report</SelectItem>
                <SelectItem value="expense">Expense Report</SelectItem>
                <SelectItem value="summary">Financial Summary</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button
              className="ml-auto"
              onClick={() => alert('Export functionality would be implemented here')}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>

          {/* Report Content */}
          <Tabs value={reportType} onValueChange={setReportType}>
            <TabsContent value="income" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-primary-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalIncome)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For period {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Rent Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        filteredIncomes?.filter((i: any) => i.type === "rent").reduce(
                          (sum: number, income: any) => sum + income.amount,
                          0
                        ) || 0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(((filteredIncomes?.filter((i: any) => i.type === "rent").reduce(
                        (sum: number, income: any) => sum + income.amount,
                        0
                      ) || 0) / totalIncome) * 100).toFixed(1)}% of total income
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Maintenance Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        filteredIncomes?.filter((i: any) => i.type === "maintenance").reduce(
                          (sum: number, income: any) => sum + income.amount,
                          0
                        ) || 0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(((filteredIncomes?.filter((i: any) => i.type === "maintenance").reduce(
                        (sum: number, income: any) => sum + income.amount,
                        0
                      ) || 0) / totalIncome) * 100).toFixed(1)}% of total income
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Income by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={incomeByType}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                          >
                            {incomeByType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Income Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Income Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomesLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                          </TableRow>
                        ) : filteredIncomes && filteredIncomes.length > 0 ? (
                          filteredIncomes.slice(0, 10).map((income: any) => (
                            <TableRow key={income.id}>
                              <TableCell>{format(new Date(income.date), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                {income.type === "rent" ? "Rent" : 
                                  income.type === "maintenance" ? "Maintenance" : 
                                  income.type === "tax_return" ? "Tax Return" : "Other"}
                              </TableCell>
                              <TableCell>{income.description}</TableCell>
                              <TableCell className="text-right">{formatCurrency(income.amount)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">No income records found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="expense" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalExpenses)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For period {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Utilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        filteredExpenses?.filter((e: any) => 
                          ["electricity", "generator_fuel", "internet"].includes(e.category)
                        ).reduce(
                          (sum: number, expense: any) => sum + expense.amount,
                          0
                        ) || 0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Electricity, Generator, Internet
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Maintenance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        filteredExpenses?.filter((e: any) => 
                          ["cctv_maintenance", "elevator_maintenance", "general_building_maintenance"].includes(e.category)
                        ).reduce(
                          (sum: number, expense: any) => sum + expense.amount,
                          0
                        ) || 0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      CCTV, Elevator, General Building
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expense Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Expenses by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={expensesByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                          >
                            {expensesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Expense Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expensesLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                          </TableRow>
                        ) : filteredExpenses && filteredExpenses.length > 0 ? (
                          filteredExpenses.slice(0, 10).map((expense: any) => (
                            <TableRow key={expense.id}>
                              <TableCell>{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                {expense.category
                                  .split("_")
                                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(" ")}
                              </TableCell>
                              <TableCell>{expense.description}</TableCell>
                              <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">No expense records found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="summary" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-primary-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalIncome)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalExpenses)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className={`${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Net Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profit)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Income vs Expenses Bar Chart */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Monthly Income vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis 
                          tickFormatter={(value) => `₹${value/1000}K`}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Bar dataKey="Income" fill="#1E88E5" />
                        <Bar dataKey="Expenses" fill="#EF4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Total Income</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalIncome)}</TableCell>
                        <TableCell className="text-right">100%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Expenses</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                        <TableCell className="text-right">
                          {totalIncome > 0 ? `${((totalExpenses / totalIncome) * 100).toFixed(1)}%` : 'N/A'}
                        </TableCell>
                      </TableRow>
                      <TableRow className={profit >= 0 ? 'bg-green-50' : 'bg-red-50'}>
                        <TableCell className="font-medium">Net Profit</TableCell>
                        <TableCell className={`text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profit)}
                        </TableCell>
                        <TableCell className={`text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {totalIncome > 0 ? `${((profit / totalIncome) * 100).toFixed(1)}%` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
