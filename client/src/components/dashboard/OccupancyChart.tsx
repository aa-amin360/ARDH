import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface FlatTypeData {
  type: string;
  count: number;
}

interface OccupancyChartProps {
  propertyData: FlatTypeData[];
  isLoading?: boolean;
}

export default function OccupancyChart({
  propertyData,
  isLoading = false,
}: OccupancyChartProps) {
  // Define colors for each flat type
  const colorMap: Record<string, string> = {
    "1BHK": "#1E88E5",
    "2BHK": "#26A69A",
    "3BHK": "#FFC107",
    "penthouse": "#9C27B0",
    // Add more colors as needed
  };

  // Format the data for the chart
  const chartData = useMemo(() => {
    return propertyData.map((item) => ({
      name: formatFlatType(item.type),
      value: item.count,
      color: colorMap[item.type] || "#888888",
    }));
  }, [propertyData]);

  // Helper function to format flat type
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Flat Occupancy Status</CardTitle>
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
        <CardTitle>Flat Occupancy Status</CardTitle>
      </CardHeader>
      <CardContent className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={40} // Makes it a donut chart
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} Units`, "Count"]}
            />
            <Legend 
              layout="vertical" 
              verticalAlign="middle" 
              align="right"
              wrapperStyle={{ paddingLeft: "10px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
