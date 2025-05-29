import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { CalendarIcon, FileDown, PieChart, BarChart3, ChevronDown, AlertCircle, LineChart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [reportType, setReportType] = useState("occupancy");
  
  // Report generation state
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch data for reports - only when report is generated
  const { data: incomes, isLoading: incomesLoading } = useQuery({
    queryKey: ["/api/incomes", isReportGenerated],
    enabled: isReportGenerated,
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/expenses", isReportGenerated],
    enabled: isReportGenerated,
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties", isReportGenerated],
    enabled: isReportGenerated,
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/tenants", isReportGenerated],
    enabled: isReportGenerated,
  });

  // Filter data by date range
  const filteredIncomes = incomes && Array.isArray(incomes) ? incomes.filter((income: any) => {
    const incomeDate = new Date(income.date);
    return incomeDate >= dateRange.from && incomeDate <= dateRange.to;
  }) : [];

  const filteredExpenses = expenses && Array.isArray(expenses) ? expenses.filter((expense: any) => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= dateRange.from && expenseDate <= dateRange.to;
  }) : [];

  // Group income by type for pie chart
  const incomeByType = useMemo(() => {
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
  const expensesByCategory = useMemo(() => {
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

  // Calculate occupancy data
  const occupancyData = useMemo(() => {
    if (!tenants || !properties || !Array.isArray(tenants) || !Array.isArray(properties)) return [];

    const flatNumbers = properties.map((p: any) => p.flatNumber).sort();
    const results: any[] = [];

    flatNumbers.forEach((flatNumber: string) => {
      const flatTenants = tenants.filter((t: any) => t.flatNumber === flatNumber);
      
      if (flatTenants.length === 0) {
        // No tenants for this flat
        results.push({
          flatNumber,
          tenantId: null,
          tenantName: 'Vacant',
          leaseStartDate: null,
          leaseEndDate: null,
          totalDaysOccupied: 0,
          totalMonthsOccupied: 0,
          isVacant: true
        });
        return;
      }

      let flatTotalDays = 0;
      let flatTotalMonths = 0;

      flatTenants.forEach((tenant: any) => {
        const leaseStart = new Date(tenant.leaseStartDate);
        const leaseEnd = tenant.leaseEndDate ? new Date(tenant.leaseEndDate) : new Date();
        
        // Calculate overlap with date range
        const overlapStart = new Date(Math.max(leaseStart.getTime(), dateRange.from.getTime()));
        const overlapEnd = new Date(Math.min(leaseEnd.getTime(), dateRange.to.getTime()));
        
        if (overlapStart <= overlapEnd) {
          const daysOccupied = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const monthsOccupied = daysOccupied / 30.44; // Average days per month
          
          flatTotalDays += daysOccupied;
          flatTotalMonths += monthsOccupied;

          results.push({
            flatNumber,
            tenantId: tenant.id,
            tenantName: tenant.name,
            leaseStartDate: tenant.leaseStartDate,
            leaseEndDate: tenant.leaseEndDate,
            totalDaysOccupied: daysOccupied,
            totalMonthsOccupied: parseFloat(monthsOccupied.toFixed(2)),
            isVacant: false
          });
        }
      });
    });

    return results;
  }, [tenants, properties, dateRange]);

  // Calculate total occupancy statistics
  const occupancyStats = useMemo(() => {
    const totalDaysInRange = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalMonthsInRange = totalDaysInRange / 30.44;
    
    const groupedByFlat = occupancyData.reduce((acc: any, item: any) => {
      if (!acc[item.flatNumber]) {
        acc[item.flatNumber] = {
          flatNumber: item.flatNumber,
          tenants: [],
          totalDaysOccupied: 0,
          totalMonthsOccupied: 0
        };
      }
      
      if (!item.isVacant) {
        acc[item.flatNumber].tenants.push(item);
        acc[item.flatNumber].totalDaysOccupied += item.totalDaysOccupied;
        acc[item.flatNumber].totalMonthsOccupied += item.totalMonthsOccupied;
      }
      
      return acc;
    }, {});

    return Object.values(groupedByFlat).map((flat: any) => ({
      ...flat,
      totalDaysVacant: totalDaysInRange - flat.totalDaysOccupied,
      totalMonthsVacant: parseFloat((totalMonthsInRange - flat.totalMonthsOccupied).toFixed(2)),
      totalDaysInRange,
      totalMonthsInRange: parseFloat(totalMonthsInRange.toFixed(2))
    }));
  }, [occupancyData, dateRange]);

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

  // Generate report function
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // Reset previous report state
      setIsReportGenerated(false);
      // Brief delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsReportGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  };

  // Export report function
  const handleExportReport = () => {
    if (!isReportGenerated) return;

    if (reportType === "occupancy") {
      exportOccupancyReport();
    } else if (reportType === "income") {
      exportIncomeReport();
    } else if (reportType === "expense") {
      exportExpenseReport();
    }
  };

  // Export occupancy report as CSV
  const exportOccupancyReport = () => {
    const headers = ["Flat Number", "Tenant ID", "Tenant Name", "Lease Start", "Lease End", "Days Occupied", "Months Occupied"];
    const rows: string[] = [headers.join(",")];

    occupancyStats.forEach((flat: any) => {
      if (flat.tenants.length > 0) {
        flat.tenants.forEach((tenant: any) => {
          rows.push([
            flat.flatNumber,
            tenant.tenantId,
            `"${tenant.tenantName}"`,
            format(new Date(tenant.leaseStartDate), "dd/MM/yyyy"),
            tenant.leaseEndDate ? format(new Date(tenant.leaseEndDate), "dd/MM/yyyy") : "Current",
            tenant.totalDaysOccupied,
            tenant.totalMonthsOccupied
          ].join(","));
        });
        
        // Add summary row for each flat
        rows.push([
          `"Summary for ${flat.flatNumber}"`,
          "",
          "",
          "",
          "",
          `"Total Occupied: ${flat.totalDaysOccupied}"`,
          `"Total Vacant: ${flat.totalDaysVacant}"`
        ].join(","));
        rows.push(""); // Empty row separator
      }
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `occupancy_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export income report as CSV
  const exportIncomeReport = () => {
    const headers = ["Date", "Type", "Description", "Amount", "Property"];
    const rows: string[] = [headers.join(",")];

    filteredIncomes.forEach((income: any) => {
      rows.push([
        format(new Date(income.date), "dd/MM/yyyy"),
        income.type,
        `"${income.description}"`,
        income.amount,
        income.propertyId || ""
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `income_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export expense report as CSV
  const exportExpenseReport = () => {
    const headers = ["Date", "Category", "Subcategory", "Description", "Amount", "Property"];
    const rows: string[] = [headers.join(",")];

    filteredExpenses.forEach((expense: any) => {
      rows.push([
        format(new Date(expense.date), "dd/MM/yyyy"),
        expense.category,
        expense.subcategory,
        `"${expense.description}"`,
        expense.amount,
        expense.propertyId || ""
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                <SelectItem value="occupancy">Occupancy Report</SelectItem>
                <SelectItem value="income">Income Report</SelectItem>
                <SelectItem value="expense">Expense Report</SelectItem>
                <SelectItem value="summary">Financial Summary</SelectItem>
              </SelectContent>
            </Select>

            {/* Generate and Export Buttons */}
            <div className="ml-auto flex gap-2">
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                variant="default"
              >
                {isGenerating ? (
                  <>
                    <LineChart className="mr-2 h-4 w-4 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LineChart className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleExportReport}
                disabled={!isReportGenerated}
                variant="outline"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Report Content */}
          <Tabs value={reportType} onValueChange={setReportType}>
            <TabsContent value="occupancy" className="mt-0">
              {!isReportGenerated ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Generate Occupancy Report</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Select your date range and click "Generate Report" to view occupancy analysis
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Occupancy Report</CardTitle>
                      <CardDescription>
                        Flat-wise occupancy analysis for the period {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="space-y-8">
                      {occupancyStats.map((flat: any) => (
                        <div key={flat.flatNumber} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Flat {flat.flatNumber}</h3>
                            <div className="text-sm text-muted-foreground">
                              {flat.tenants.length} tenant(s) in period
                            </div>
                          </div>
                          
                          {flat.tenants.length > 0 ? (
                            <div className="space-y-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Tenant ID</TableHead>
                                    <TableHead>Tenant Name</TableHead>
                                    <TableHead>Lease Start</TableHead>
                                    <TableHead>Lease End</TableHead>
                                    <TableHead>Days Occupied</TableHead>
                                    <TableHead>Months Occupied</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {flat.tenants.map((tenant: any) => (
                                    <TableRow key={`${flat.flatNumber}-${tenant.tenantId}`}>
                                      <TableCell>{tenant.tenantId}</TableCell>
                                      <TableCell>{tenant.tenantName}</TableCell>
                                      <TableCell>{format(new Date(tenant.leaseStartDate), "dd/MM/yyyy")}</TableCell>
                                      <TableCell>
                                        {tenant.leaseEndDate ? format(new Date(tenant.leaseEndDate), "dd/MM/yyyy") : "Current"}
                                      </TableCell>
                                      <TableCell>{tenant.totalDaysOccupied}</TableCell>
                                      <TableCell>{tenant.totalMonthsOccupied}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              
                              <div className="bg-gray-50 p-4 rounded-md">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <div className="font-medium text-green-600">Total days occupied:</div>
                                    <div className="text-lg font-bold">{flat.totalDaysOccupied} Days</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-green-600">Total months occupied:</div>
                                    <div className="text-lg font-bold">{flat.totalMonthsOccupied} Months</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-red-600">Total days vacant:</div>
                                    <div className="text-lg font-bold">{flat.totalDaysVacant} Days</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-red-600">Total months vacant:</div>
                                    <div className="text-lg font-bold">{flat.totalMonthsVacant} Months</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground py-8">
                              <p>No tenants found for this flat in the selected period</p>
                              <div className="mt-4 bg-red-50 p-4 rounded-md">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="font-medium text-red-600">Total days vacant:</div>
                                    <div className="text-lg font-bold">{flat.totalDaysInRange} Days</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-red-600">Total months vacant:</div>
                                    <div className="text-lg font-bold">{flat.totalMonthsInRange} Months</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="income" className="mt-0">
              {!isReportGenerated ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Generate Income Report</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Select your date range and click "Generate Report" to view income analysis
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
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
              )}
            </TabsContent>
            
            <TabsContent value="expense" className="mt-0">
              {!isReportGenerated ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <PieChart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Generate Expense Report</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Select your date range and click "Generate Report" to view expense analysis
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
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
