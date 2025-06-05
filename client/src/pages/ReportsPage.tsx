import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  CalendarIcon,
  FileDown,
  PieChart,
  BarChart3,
  LineChart,
  TrendingDown,
  Droplets,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
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
    enabled:
      isReportGenerated &&
      (reportType === "income" || reportType === "summary"),
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/expenses", isReportGenerated],
    enabled:
      isReportGenerated &&
      (reportType === "expense" || reportType === "summary"),
  });

  // Fetch occupancy report data using the new API endpoint
  const { data: occupancyData, isLoading: occupancyLoading } = useQuery({
    queryKey: [
      "/api/occupancy-report",
      isReportGenerated,
      dateRange.from,
      dateRange.to,
    ],
    queryFn: async () => {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      const response = await fetch(
        `/api/occupancy-report?fromDate=${fromDate}&toDate=${toDate}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch occupancy report");
      }
      return response.json();
    },
    enabled: isReportGenerated && reportType === "occupancy",
  });

  // Fetch expense report data
  const { data: expenseReportData, isLoading: expenseReportLoading } = useQuery({
    queryKey: [
      "/api/expense-report",
      isReportGenerated,
      dateRange.from,
      dateRange.to,
    ],
    queryFn: async () => {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      const response = await fetch(
        `/api/expense-report?fromDate=${fromDate}&toDate=${toDate}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch expense report");
      }
      return response.json();
    },
    enabled: isReportGenerated && reportType === "expense",
  });

  // Fetch water tanker report data
  const { data: waterTankerReportData, isLoading: waterTankerReportLoading } = useQuery({
    queryKey: [
      "/api/water-tanker-report",
      isReportGenerated,
      dateRange.from,
      dateRange.to,
    ],
    queryFn: async () => {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      const response = await fetch(
        `/api/water-tanker-report?fromDate=${fromDate}&toDate=${toDate}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch water tanker report");
      }
      return response.json();
    },
    enabled: isReportGenerated && reportType === "water-tanker",
  });

  // Filter data by date range
  const filteredIncomes =
    incomes && Array.isArray(incomes)
      ? incomes.filter((income: any) => {
          const incomeDate = new Date(income.date);
          return incomeDate >= dateRange.from && incomeDate <= dateRange.to;
        })
      : [];

  const filteredExpenses =
    expenses && Array.isArray(expenses)
      ? expenses.filter((expense: any) => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= dateRange.from && expenseDate <= dateRange.to;
        })
      : [];

  // Calculate totals
  const totalIncome = filteredIncomes.reduce(
    (sum: number, income: any) => sum + (income.amount || 0),
    0,
  );
  const totalExpenses = filteredExpenses.reduce(
    (sum: number, expense: any) => sum + (expense.amount || 0),
    0,
  );
  const profit = totalIncome - totalExpenses;

  // Calculate income by type
  const incomeByType = useMemo(() => {
    const typeMap = new Map();
    filteredIncomes.forEach((income: any) => {
      const type = income.type || "Unknown";
      typeMap.set(type, (typeMap.get(type) || 0) + income.amount);
    });
    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredIncomes]);

  // Calculate expense by category
  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map();
    filteredExpenses.forEach((expense: any) => {
      const category = expense.category || "Unknown";
      categoryMap.set(
        category,
        (categoryMap.get(category) || 0) + expense.amount,
      );
    });
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredExpenses]);

  // Use occupancy data from the API endpoint
  const occupancyStats = useMemo(() => {
    if (!occupancyData || !Array.isArray(occupancyData)) return [];

    return occupancyData.map((record: any) => ({
      flatNumber: record.flat_number,
      tenantId: record.tenant_id,
      tenantName: record.tenant_name,
      startDate: record.start_date,
      endDate: record.end_date,
      originalLeaseStart: record.original_lease_start,
      originalLeaseEnd: record.original_lease_end,
      totalDaysOccupied: record.total_days_occupied,
      totalMonthsOccupied: record.total_months_occupied,
    }));
  }, [occupancyData]);

  // Colors for charts
  const INCOME_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];
  const EXPENSE_COLORS = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
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
      await new Promise((resolve) => setTimeout(resolve, 500));
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
      exportExpenseReportNew();
    } else if (reportType === "water-tanker") {
      exportWaterTankerReport();
    }
  };

  // Export occupancy report as CSV
  const exportOccupancyReport = () => {
    const headers = [
      "Flat Number",
      "Start Date",
      "End Date",
      "Total Days Occupied",
      "Total Months Occupied",
    ];
    const rows: string[] = [headers.join(",")];

    occupancyStats.forEach((record: any) => {
      rows.push(
        [
          record.flatNumber,
          format(new Date(record.startDate), "dd/MM/yyyy"),
          format(new Date(record.endDate), "dd/MM/yyyy"),
          record.totalDaysOccupied,
          record.totalMonthsOccupied,
        ].join(","),
      );
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
      rows.push(
        [
          format(new Date(income.date), "dd/MM/yyyy"),
          income.type,
          `"${income.description}"`,
          income.amount,
          income.propertyId || "",
        ].join(","),
      );
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
    const headers = [
      "Date",
      "Category",
      "Subcategory",
      "Description",
      "Amount",
      "Property",
    ];
    const rows: string[] = [headers.join(",")];

    filteredExpenses.forEach((expense: any) => {
      rows.push(
        [
          format(new Date(expense.date), "dd/MM/yyyy"),
          expense.category,
          expense.subcategory,
          `"${expense.description}"`,
          expense.amount,
          expense.propertyId || "",
        ].join(","),
      );
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

  // Export expense report as CSV (new version for the specific report)
  const exportExpenseReportNew = () => {
    const headers = ["Date", "Amount", "Category", "SubCategory"];
    const rows: string[] = [headers.join(",")];

    (expenseReportData || []).forEach((expense: any) => {
      rows.push([
        format(new Date(expense.date), "dd/MM/yyyy"),
        expense.amount,
        expense.category,
        expense.subcategory
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

  // Export water tanker report as CSV
  const exportWaterTankerReport = () => {
    const headers = ["Date", "Amount", "Description", "Tanker Number", "Liters"];
    const rows: string[] = [headers.join(",")];

    (waterTankerReportData || []).forEach((record: any) => {
      rows.push([
        format(new Date(record.date), "dd/MM/yyyy"),
        record.amount,
        `"${record.description || ''}"`,
        record.tanker_number || '',
        record.liters || ''
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `water_tanker_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderEmptyReportState = (
    reportName: string,
    icon: React.ReactNode,
  ) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon}
        <h3 className="text-lg font-semibold mb-2">Generate {reportName}</h3>
        <p className="text-muted-foreground text-center mb-4">
          Select your date range and click "Generate Report" to view{" "}
          {reportName.toLowerCase()}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="py-4">
      <Card>
        <CardHeader>
          <CardTitle>Reports & Analytics</CardTitle>
          <CardDescription>
            Generate comprehensive reports for income, expenses, and occupancy
            analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        format(dateRange.from, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) =>
                        date &&
                        setDateRange((prev) => ({ ...prev, from: date }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? (
                        format(dateRange.to, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) =>
                        date && setDateRange((prev) => ({ ...prev, to: date }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Report Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="occupancy">Occupancy Report</SelectItem>
                  <SelectItem value="income">Income Report</SelectItem>
                  <SelectItem value="expense">Expense Report</SelectItem>
                  <SelectItem value="water-tanker">Water Tanker Report</SelectItem>
                  <SelectItem value="summary">Financial Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate and Export Buttons */}
            <div className="ml-auto flex gap-2">
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                variant="default"
                className="min-w-[140px]"
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
                className="min-w-[140px]"
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
                renderEmptyReportState(
                  "Occupancy Report",
                  <LineChart className="h-12 w-12 text-muted-foreground mb-4" />,
                )
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Occupancy Report</CardTitle>
                    <CardDescription>
                      Flat-wise occupancy analysis for the period{" "}
                      {format(dateRange.from, "MMM d, yyyy")} -{" "}
                      {format(dateRange.to, "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {occupancyLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">
                          Loading occupancy data...
                        </p>
                      </div>
                    ) : occupancyStats.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No occupancy data found for the selected date range
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Flat Number</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead className="text-right">
                              Total Days Occupied
                            </TableHead>
                            <TableHead className="text-right">
                              Total Months Occupied
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {occupancyStats.map((record: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {record.flatNumber}
                              </TableCell>
                              <TableCell>
                                {format(
                                  new Date(record.startDate),
                                  "dd/MM/yyyy",
                                )}
                              </TableCell>
                              <TableCell>
                                {format(new Date(record.endDate), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                {record.totalDaysOccupied}
                              </TableCell>
                              <TableCell className="text-right">
                                {record.totalMonthsOccupied}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="income" className="mt-0">
              {!isReportGenerated ? (
                renderEmptyReportState(
                  "Income Report",
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />,
                )
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
                          For period {format(dateRange.from, "MMM d, yyyy")} -{" "}
                          {format(dateRange.to, "MMM d, yyyy")}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

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
                          {filteredIncomes.map((income: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>
                                {format(new Date(income.date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>{income.type}</TableCell>
                              <TableCell>{income.description}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(income.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="expense" className="mt-0">
              {!isReportGenerated ? (
                renderEmptyReportState(
                  "Expense Report",
                  <PieChart className="h-12 w-12 text-muted-foreground mb-4" />,
                )
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
                          For period {format(dateRange.from, "MMM d, yyyy")} -{" "}
                          {format(dateRange.to, "MMM d, yyyy")}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

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
                          {filteredExpenses.map(
                            (expense: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {format(new Date(expense.date), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>{expense.category}</TableCell>
                                <TableCell>{expense.description}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(expense.amount)}
                                </TableCell>
                              </TableRow>
                            ),
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
                renderEmptyReportState(
                  "Expense Report",
                  <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />,
                )
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Report</CardTitle>
                    <CardDescription>
                      Expense breakdown (excluding Water Tanker) for the period{" "}
                      {format(dateRange.from, "MMM d, yyyy")} -{" "}
                      {format(dateRange.to, "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {expenseReportLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">
                          Loading expense data...
                        </p>
                      </div>
                    ) : !expenseReportData || expenseReportData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No expense data found for the selected date range
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>SubCategory</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenseReportData.map((expense: any) => (
                            <TableRow key={expense.id}>
                              <TableCell>
                                {format(new Date(expense.date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(expense.amount)}
                              </TableCell>
                              <TableCell>{expense.category}</TableCell>
                              <TableCell>{expense.subcategory}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="water-tanker" className="mt-0">
              {!isReportGenerated ? (
                renderEmptyReportState(
                  "Water Tanker Report",
                  <Droplets className="h-12 w-12 text-muted-foreground mb-4" />,
                )
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Water Tanker Report</CardTitle>
                    <CardDescription>
                      Water tanker records for the period{" "}
                      {format(dateRange.from, "MMM d, yyyy")} -{" "}
                      {format(dateRange.to, "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {waterTankerReportLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">
                          Loading water tanker data...
                        </p>
                      </div>
                    ) : !waterTankerReportData || waterTankerReportData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No water tanker data found for the selected date range
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Tanker Number</TableHead>
                            <TableHead>Liters</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {waterTankerReportData.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell>
                                {format(new Date(record.date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(record.amount)}
                              </TableCell>
                              <TableCell>{record.description || '-'}</TableCell>
                              <TableCell>{record.tanker_number || '-'}</TableCell>
                              <TableCell>{record.liters || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="summary" className="mt-0">
              {!isReportGenerated ? (
                renderEmptyReportState(
                  "Financial Summary",
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />,
                )
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Income
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(totalIncome)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Expenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(totalExpenses)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Net Profit
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          className={`text-2xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(profit)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Summary</CardTitle>
                      <CardDescription>
                        Summary for period{" "}
                        {format(dateRange.from, "MMM d, yyyy")} -{" "}
                        {format(dateRange.to, "MMM d, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">
                              Percentage
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">
                              Total Income
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totalIncome)}
                            </TableCell>
                            <TableCell className="text-right">100%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              Total Expenses
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totalExpenses)}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalIncome > 0
                                ? `${((totalExpenses / totalIncome) * 100).toFixed(1)}%`
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                          <TableRow
                            className={
                              profit >= 0 ? "bg-green-50" : "bg-red-50"
                            }
                          >
                            <TableCell className="font-medium">
                              Net Profit
                            </TableCell>
                            <TableCell
                              className={`text-right ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {formatCurrency(profit)}
                            </TableCell>
                            <TableCell
                              className={`text-right ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {totalIncome > 0
                                ? `${((profit / totalIncome) * 100).toFixed(1)}%`
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
