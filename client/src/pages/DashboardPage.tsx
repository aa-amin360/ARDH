import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DollarSign,
  CreditCard,
  CheckCircle,
  Building2,
} from "lucide-react";

import StatsCard from "@/components/dashboard/StatsCard";
import IncomeExpensesChart from "@/components/dashboard/IncomeExpensesChart";
import OccupancyChart from "@/components/dashboard/OccupancyChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import PropertyStatus from "@/components/dashboard/PropertyStatus";

export default function DashboardPage() {
  // Fetch dashboard data
  const { data: incomeSummary, isLoading: incomeLoading } = useQuery({
    queryKey: ["/api/dashboard/income-summary"],
  });

  const { data: expenseSummary, isLoading: expenseLoading } = useQuery({
    queryKey: ["/api/dashboard/expense-summary"],
  });

  const { data: propertySummary, isLoading: propertyLoading } = useQuery({
    queryKey: ["/api/dashboard/property-summary"],
  });

  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-transactions", { limit: 5 }],
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  // Calculate maintenance collection by flat type
  const calculateMaintenanceCollection = () => {
    if (!propertySummary) return { oneBhk: 0, twoBhk: 0, total: 0 };
    
    const oneBhkCount = propertySummary.byType.find(type => type.type === "1BHK")?.count || 0;
    const twoBhkCount = propertySummary.byType.find(type => type.type === "2BHK")?.count || 0;
    
    const oneBhk = oneBhkCount * 1000;
    const twoBhk = twoBhkCount * 1500;
    
    return {
      oneBhk,
      twoBhk,
      total: oneBhk + twoBhk
    };
  };

  // Sample maintenance issues (could be fetched from API in a real implementation)
  const maintenanceIssues = [
    {
      title: "Elevator maintenance - Scheduled for next week",
      status: "pending" as const,
    },
    {
      title: "Water tank cleaning - Last done 2 weeks ago",
      status: "completed" as const,
      date: "May 15, 2023"
    },
    {
      title: "CCTV Camera - Replace damaged unit",
      status: "urgent" as const,
    },
  ];

  return (
    <div className="py-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          icon={<DollarSign />}
          iconBgColor="bg-primary-100"
          iconColor="text-primary-600"
          title="Total Income"
          value={incomeLoading ? "Loading..." : formatCurrency(incomeSummary?.total || 0)}
          linkText="View details"
          linkHref="/income"
        />
        
        <StatsCard
          icon={<CreditCard />}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          title="Total Expenses"
          value={expenseLoading ? "Loading..." : formatCurrency(expenseSummary?.total || 0)}
          linkText="View details"
          linkHref="/expenses"
        />
        
        <StatsCard
          icon={<CheckCircle />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          title="Occupancy Rate"
          value={propertyLoading ? "Loading..." : `${Math.round(propertySummary?.occupancyRate || 0)}%`}
          linkText="View details"
          linkHref="/properties"
        />
        
        <StatsCard
          icon={<Building2 />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          title="Total Units"
          value={propertyLoading ? "Loading..." : propertySummary?.total || 0}
          linkText="View details"
          linkHref="/properties"
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8">
        <IncomeExpensesChart
          incomeData={incomeSummary?.byMonth || []}
          expenseData={expenseSummary?.byMonth || []}
          isLoading={incomeLoading || expenseLoading}
        />
        
        <OccupancyChart
          propertyData={propertySummary?.byType || []}
          isLoading={propertyLoading}
        />
      </div>
      
      {/* Recent Transactions */}
      <div className="mb-8">
        <RecentTransactions
          transactions={recentTransactions || []}
          isLoading={transactionsLoading}
        />
      </div>
      
      {/* Property Status */}
      <div>
        <PropertyStatus
          flatTypes={propertySummary?.byType || []}
          totalRentalUnits={
            (propertySummary?.byType.find(t => t.type === "1BHK")?.count || 0) +
            (propertySummary?.byType.find(t => t.type === "2BHK")?.count || 0)
          }
          rentedUnits={propertyLoading ? 0 : Math.round((propertySummary?.occupancyRate || 0) * propertySummary?.total / 100)}
          vacantUnits={
            propertyLoading
              ? 0
              : Math.round(
                  propertySummary?.total -
                    (propertySummary?.occupancyRate || 0) * propertySummary?.total / 100
                )
          }
          totalMonthlyRent={propertyLoading ? 0 : propertySummary?.totalMonthlyRent || 0}
          maintenanceCollection={calculateMaintenanceCollection()}
          maintenanceIssues={maintenanceIssues}
          isLoading={propertyLoading}
        />
      </div>
    </div>
  );
}
