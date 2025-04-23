import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

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
  // Format month names (e.g., "2023-01" to "Jan")
  function formatMonth(month: string): string {
    try {
      const [year, monthNum] = month.split("-");
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return date.toLocaleString('default', { month: 'short' });
    } catch (e) {
      return month;
    }
  }

  // Combine data for chart
  const chartData = incomeData.map((incomeItem) => {
    const monthLabel = formatMonth(incomeItem.month);
    const expenseItem = expenseData.find(
      (item) => formatMonth(item.month) === monthLabel
    );

    return {
      month: monthLabel,
      income: incomeItem.amount,
      expense: expenseItem ? expenseItem.amount : 0,
    };
  });

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex justify-center items-center h-64 text-gray-500">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`₹${value}`, undefined]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend />
              <Bar dataKey="income" fill="#4f46e5" name="Income" />
              <Bar dataKey="expense" fill="#ef4444" name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}