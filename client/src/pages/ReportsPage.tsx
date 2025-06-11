import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  CalendarIcon,
  LineChart,
  FileDown,
  BarChart3,
  PieChart,
  TrendingDown,
  Droplets,
} from "lucide-react";

interface DateRange {
  from: Date;
  to: Date;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string>("occupancy");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date(),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReportGenerated, setIsReportGenerated] = useState(false);

  // Fetch data based on report type
  const {
    data: occupancies,
    isLoading: occupanciesLoading,
    error: occupanciesError,
  } = useQuery({
    queryKey: ["/api/occupancy-report"],
    queryFn: async () => {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      const response = await fetch(
        `/api/occupancy-report?fromDate=${fromDate}&toDate=${toDate}`,
      );

      if (!response.ok) throw new Error("Failed to fetch occupancy data");
      return response.json();
    },
    enabled: isReportGenerated && reportType === "occupancy",
  });

  const {
    data: incomes,
    isLoading: incomesLoading,
    error: incomesError,
  } = useQuery({
    queryKey: ["/api/incomes"],
    enabled: isReportGenerated && reportType === "income",
  });

  const {
    data: expenses,
    isLoading: expensesLoading,
    error: expensesError,
  } = useQuery({
    queryKey: ["/api/expenses"],
    enabled: isReportGenerated && reportType === "summary",
  });

  // New queries for expense and water tanker reports
  const {
    data: expenseReportData,
    isLoading: expenseReportLoading,
    error: expenseReportError,
  } = useQuery({
    queryKey: ["/api/expense-report"],
    queryFn: async () => {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      const response = await fetch(
        `/api/expense-report?fromDate=${fromDate}&toDate=${toDate}`,
      );

      if (!response.ok) throw new Error("Failed to fetch expense report");
      return response.json();
    },
    enabled: isReportGenerated && reportType === "expense",
  });

  const {
    data: waterTankerReportData,
    isLoading: waterTankerReportLoading,
    error: waterTankerReportError,
  } = useQuery({
    queryKey: ["/api/water-tanker-report"],
    queryFn: async () => {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      const response = await fetch(
        `/api/water-tanker-report?fromDate=${fromDate}&toDate=${toDate}`,
      );
      if (!response.ok) throw new Error("Failed to fetch water tanker report");
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

  // Calculate totals for new report types
  const totalExpenseReportAmount = (expenseReportData || []).reduce(
    (sum: number, expense: any) => sum + (expense.amount || 0),
    0,
  );
  const totalWaterTankerAmount = (waterTankerReportData || []).reduce(
    (sum: number, record: any) => sum + (record.amount || 0),
    0,
  );

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsReportGenerated(true);
    setIsGenerating(false);
  };

  const handleExportReport = () => {
    let csvContent = "";
    let filename = "";

    switch (reportType) {
      case "occupancy":
        csvContent = "data:text/csv;charset=utf-8,";
        csvContent +=
          "Flat Number,Tenant,Occupancy Status,Start Date,End Date\n";
        if (occupancies) {
          occupancies.forEach((item: any) => {
            csvContent += `${item.flat_number},${item.tenant_name || ""},${
              item.status
            },${item.start_date || ""},${item.end_date || ""}\n`;
          });
        }
        filename = `occupancy_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
        break;

      case "income":
        csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Type,Description,Amount\n";
        filteredIncomes.forEach((income: any) => {
          csvContent += `${format(new Date(income.date), "dd/MM/yyyy")},${
            income.type
          },${income.description},${income.amount}\n`;
        });
        filename = `income_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
        break;

      case "expense":
        csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Category,Description,Amount\n";
        if (expenseReportData) {
          expenseReportData.forEach((expense: any) => {
            csvContent += `${format(new Date(expense.date), "dd/MM/yyyy")},${
              expense.category
            },${expense.description},${expense.amount}\n`;
          });
        }
        filename = `expense_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
        break;

      case "water-tanker":
        csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Amount,Description,Tanker Number,Liters\n";
        if (waterTankerReportData) {
          waterTankerReportData.forEach((record: any) => {
            csvContent += `${format(new Date(record.date), "dd/MM/yyyy")},${
              record.amount
            },${record.description || ""},${record.tanker_number || ""},${
              record.liters || ""
            }\n`;
          });
        }
        filename = `water_tanker_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
        break;

      case "summary":
        csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Metric,Amount\n";
        csvContent += `Total Income,${totalIncome}\n`;
        csvContent += `Total Expenses,${totalExpenses}\n`;
        csvContent += `Net Profit,${profit}\n`;
        filename = `financial_summary_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
        break;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderEmptyReportState = (reportName: string, icon: any) => (
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
          <div className="space-y-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
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
                          date &&
                          setDateRange((prev) => ({ ...prev, to: date }))
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
                    <SelectItem value="water-tanker">
                      Water Tanker Report
                    </SelectItem>
                    <SelectItem value="summary">Financial Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Generate and Export Buttons */}
            <div className="flex gap-2 justify-start">
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
                      Property occupancy data for the period{" "}
                      {format(dateRange.from, "MMM d, yyyy")} -{" "}
                      {format(dateRange.to, "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {occupanciesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">
                          Loading occupancy data...
                        </p>
                      </div>
                    ) : !occupancies || occupancies.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No occupancy data found for the selected date range
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Property</TableHead>
                            <TableHead>Flat Number</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Lease Status</TableHead>
                            <TableHead>Rental Income</TableHead>
                            <TableHead>Maintenance Fee</TableHead>
                            <TableHead>Water Fee</TableHead>
                            <TableHead>Tenants Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {occupancies.map((property: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {property.flatType} - Floor {property.apartmentFloor}
                              </TableCell>
                              <TableCell>{property.flatNumber}</TableCell>
                              <TableCell>{property.ownerName}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    property.leaseStatus === "Rented"
                                      ? "bg-green-100 text-green-800"
                                      : property.leaseStatus === "Vacant"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {property.leaseStatus}
                                </span>
                              </TableCell>
                              <TableCell>
                                {property.totalRentIncome > 0
                                  ? formatCurrency(property.totalRentIncome)
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {property.totalMaintenanceFees > 0
                                  ? formatCurrency(property.totalMaintenanceFees)
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {property.totalWaterFees > 0
                                  ? formatCurrency(property.totalWaterFees)
                                  : "-"}
                              </TableCell>
                              <TableCell>{property.tenantsCount}</TableCell>
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
                  <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />,
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
                          {formatCurrency(totalExpenseReportAmount)}
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
                      <CardTitle>Expense Report</CardTitle>
                      <CardDescription>
                        Expense breakdown (excluding Water Tanker) for the
                        period {format(dateRange.from, "MMM d, yyyy")} -{" "}
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
                      ) : !expenseReportData ||
                        expenseReportData.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No expense data found for the selected date range
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {expenseReportData.map((expense: any) => (
                              <TableRow key={expense.id}>
                                <TableCell>
                                  {format(new Date(expense.date), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>{expense.category}</TableCell>
                                <TableCell>{expense.description}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(expense.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="water-tanker" className="mt-0">
              {!isReportGenerated ? (
                renderEmptyReportState(
                  "Water Tanker Report",
                  <Droplets className="h-12 w-12 text-muted-foreground mb-4" />,
                )
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-blue-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Water Tanker Cost
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(totalWaterTankerAmount)}
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
                      ) : !waterTankerReportData ||
                        waterTankerReportData.length === 0 ? (
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
                                <TableCell>
                                  {record.description || "-"}
                                </TableCell>
                                <TableCell>
                                  {record.tanker_number || "-"}
                                </TableCell>
                                <TableCell>{record.liters || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
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
                          className={`text-2xl font-bold ${
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(profit)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
