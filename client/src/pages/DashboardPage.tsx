import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CreditCard, Receipt, LineChart, TrendingUp } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import IncomeExpensesChart from "@/components/dashboard/IncomeExpensesChart";
import OccupancyChart from "@/components/dashboard/OccupancyChart";
import PropertyStatus from "@/components/dashboard/PropertyStatus";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { isAdmin, user } = useAuth();

  // Fetch dashboard summary data
  const { data: incomeSummary, isLoading: isIncomeLoading } = useQuery({
    queryKey: ["/api/dashboard/income-summary"],
    enabled: isAdmin, // Only fetch if admin
  });

  const { data: expenseSummary, isLoading: isExpenseLoading } = useQuery({
    queryKey: ["/api/dashboard/expense-summary"],
  });

  const { data: propertySummary, isLoading: isPropertyLoading } = useQuery({
    queryKey: ["/api/dashboard/property-summary"],
  });

  const { data: recentTransactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-transactions"],
  });

  // Use real data from API
  const incomeData = incomeSummary?.byMonth || [];
  const expenseData = expenseSummary?.byMonth || [];

  const placeholderPropertyTypeData = [
    { type: "1BHK", count: 9 },
    { type: "2BHK", count: 7 },
    { type: "3BHK", count: 1 },
    { type: "penthouse", count: 1 },
  ];

  const placeholderTransactions = [
    {
      id: 1,
      date: new Date().toISOString(),
      type: "rent",
      amount: 20000,
      description: "Rent payment for Flat 101",
    },
    {
      id: 2,
      date: new Date().toISOString(),
      category: "electricity",
      amount: 5000,
      description: "Electricity bill for common areas",
    },
    {
      id: 3,
      date: new Date().toISOString(),
      type: "maintenance",
      amount: 1500,
      description: "Maintenance fee for Flat 204",
    },
    {
      id: 4,
      date: new Date().toISOString(),
      category: "repair",
      amount: 8500,
      description: "Plumbing repair for Flat 302",
    },
    {
      id: 5,
      date: new Date().toISOString(),
      type: "rent",
      amount: 25000,
      description: "Rent payment for Flat 201",
    },
  ];

  // Use real data if available, otherwise use placeholder data
  const incomeData = (incomeSummary?.byMonth || placeholderIncomeData);
  const expenseData = (expenseSummary?.byMonth || placeholderExpenseData);
  const propertyTypeData = (propertySummary?.byType || placeholderPropertyTypeData);
  const transactions = (recentTransactions || placeholderTransactions);

  // Derived values for stats cards
  const totalIncome = isAdmin 
    ? incomeSummary?.total || placeholderIncomeData.reduce((sum, item) => sum + item.amount, 0)
    : null;
    
  const totalExpense = expenseSummary?.total || placeholderExpenseData.reduce((sum, item) => sum + item.amount, 0);
  const occupancyRate = propertySummary?.occupancyRate || 85;
  const netIncome = isAdmin ? (totalIncome ? totalIncome - totalExpense : null) : null;

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user?.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {isAdmin && (
          <StatsCard
            icon={<Receipt className="h-6 w-6" />}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            title="Total Income"
            value={totalIncome ? formatCurrency(totalIncome) : "Loading..."}
            linkText="View Income"
            linkHref="/income"
          />
        )}
        
        <StatsCard
          icon={<CreditCard className="h-6 w-6" />}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          title="Total Expenses"
          value={formatCurrency(totalExpense)}
          linkText="View Expenses"
          linkHref="/expenses"
        />
        
        {isAdmin && (
          <StatsCard
            icon={<TrendingUp className="h-6 w-6" />}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            title="Net Income"
            value={netIncome ? formatCurrency(netIncome) : "Loading..."}
            linkText="View Reports"
            linkHref="/reports"
          />
        )}
        
        <StatsCard
          icon={<Building2 className="h-6 w-6" />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          title="Occupancy Rate"
          value={`${occupancyRate}%`}
          linkText="View Properties"
          linkHref="/properties"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {isAdmin && (
          <IncomeExpensesChart
            incomeData={incomeData}
            expenseData={expenseData}
            isLoading={isIncomeLoading || isExpenseLoading}
          />
        )}
        
        <OccupancyChart
          propertyData={propertyTypeData}
          isLoading={isPropertyLoading}
        />
      </div>

      {/* Property Status and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PropertyStatus
          flatTypes={propertyTypeData}
          totalRentalUnits={18}
          rentedUnits={16}
          vacantUnits={2}
          totalMonthlyRent={(propertySummary?.totalMonthlyRent || 325000)}
          maintenanceCollection={{
            oneBhk: 9000,
            twoBhk: 10500,
            total: 19500,
          }}
          maintenanceIssues={[
            { title: "Water tank cleaning", status: "pending" },
            { title: "Elevator maintenance", status: "completed" },
            { title: "Basement flooding issue", status: "urgent" },
          ]}
          isLoading={isPropertyLoading}
        />
        
        <RecentTransactions
          transactions={transactions}
          isLoading={isTransactionsLoading}
        />
      </div>
    </div>
  );
}