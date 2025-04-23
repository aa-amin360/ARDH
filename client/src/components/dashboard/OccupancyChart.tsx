import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

interface FlatTypeData {
  type: string;
  count: number;
}

interface OccupancyChartProps {
  propertyData: FlatTypeData[];
  isLoading?: boolean;
}

// Format flat type labels
function formatFlatType(type: string): string {
  switch (type) {
    case "1BHK":
      return "1 BHK";
    case "2BHK":
      return "2 BHK";
    case "3BHK":
      return "3 BHK";
    case "penthouse":
      return "Penthouse";
    default:
      return type;
  }
}

// Colors for different flat types
const COLORS = ["#4f46e5", "#3b82f6", "#0ea5e9", "#0d9488"];

export default function OccupancyChart({
  propertyData,
  isLoading = false,
}: OccupancyChartProps) {
  // Format data for chart
  const chartData = propertyData.map((item) => ({
    name: formatFlatType(item.type),
    value: item.count,
  }));

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Property Distribution</CardTitle>
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
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, "Units"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}