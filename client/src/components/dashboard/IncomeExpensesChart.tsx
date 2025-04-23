import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface IncomeExpensesChartProps {
  incomeData: { month: string; amount: number }[];
  expenseData: { month: string; amount: number }[];
  isLoading?: boolean;
}

export default function IncomeExpensesChart({
  incomeData,
  expenseData,
  isLoading = false,
}: IncomeExpensesChartProps) {
  // Format the data for Recharts
  const chartData = useMemo(() => {
    // Create a map of all months
    const months = new Set([
      ...incomeData.map((item) => item.month),
      ...expenseData.map((item) => item.month),
    ]);

    // Create the combined array with both income and expense data
    return Array.from(months)
      .map((month) => {
        const income = incomeData.find((item) => item.month === month);
        const expense = expenseData.find((item) => item.month === month);

        return {
          month: formatMonth(month),
          Income: income ? income.amount : 0,
          Expenses: expense ? expense.amount : 0,
        };
      })
      .sort((a, b) => {
        // Sort by month (assuming format is YYYY-MM)
        const monthA = a.month;
        const monthB = b.month;
        
        // Since we've reformatted, we need to compare differently
        // For simplicity, let's assume they're all from the same year
        // and just compare the month name
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
      });
  }, [incomeData, expenseData]);

  // Helper function to format month from YYYY-MM to abbreviated month name
  function formatMonth(month: string): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // If the month is in YYYY-MM format, extract the month number
    if (month.includes('-')) {
      const monthNumber = parseInt(month.split('-')[1]) - 1; // 0-indexed
      return monthNames[monthNumber];
    }
    
    return month;
  }

  // Custom tooltip formatter
  const formatTooltipValue = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent className="h-[240px] flex items-center justify-center">
          <p>Loading chart data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis 
              tickFormatter={(value) => `₹${value/1000}K`} 
              width={60}
            />
            <Tooltip 
              formatter={(value: number) => formatTooltipValue(value)}
              labelStyle={{ color: '#111', fontWeight: 'bold' }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="Income" fill="#1E88E5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
