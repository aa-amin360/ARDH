import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { AlertCircle, Search, CheckCircle } from "lucide-react";

interface FlatTypeSummary {
  type: string;
  count: number;
}

interface PropertyStatusProps {
  flatTypes: FlatTypeSummary[];
  totalRentalUnits: number;
  rentedUnits: number;
  vacantUnits: number;
  totalMonthlyRent: number;
  maintenanceCollection: {
    oneBhk: number;
    twoBhk: number;
    total: number;
  };
  maintenanceIssues?: {
    title: string;
    status: 'pending' | 'completed' | 'urgent';
    date?: string;
  }[];
  isLoading?: boolean;
}

export default function PropertyStatus({
  flatTypes,
  totalRentalUnits,
  rentedUnits,
  vacantUnits,
  totalMonthlyRent,
  maintenanceCollection,
  maintenanceIssues = [],
  isLoading = false,
}: PropertyStatusProps) {
  
  // Helper to get color for flat type indicators
  const getFlatTypeColor = (type: string): string => {
    switch (type) {
      case "1BHK":
        return "bg-primary-500";
      case "2BHK":
        return "bg-secondary-500";
      case "3BHK":
        return "bg-amber-500";
      case "penthouse":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };
  
  // Helper to get status badge styling
  const getStatusBadge = (status: 'pending' | 'completed' | 'urgent') => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
            Pending
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
            Completed
          </Badge>
        );
      case 'urgent':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
            Urgent
          </Badge>
        );
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Status Overview</CardTitle>
          <CardDescription>Loading property data...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p>Loading property status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Status Overview</CardTitle>
        <CardDescription>Current status of all building units</CardDescription>
      </CardHeader>
      
      <CardContent>
        <dl className="divide-y divide-gray-200">
          {/* Flat Type Summary */}
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">
              Flat Types
            </dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {flatTypes.map((item) => (
                  <div key={item.type} className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${getFlatTypeColor(item.type)} mr-2`}></div>
                    <span>{item.type === "penthouse" ? "Penthouse" : item.type}: {item.count} Units</span>
                  </div>
                ))}
              </div>
            </dd>
          </div>
          
          {/* Rental Status */}
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">
              Rental Status
            </dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-4">
                <div className="flex justify-between border-b pb-2">
                  <span>Total Rental Units:</span>
                  <span className="font-medium">{totalRentalUnits}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Currently Rented:</span>
                  <span className="font-medium">{rentedUnits}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Vacant Units:</span>
                  <span className="font-medium">{vacantUnits}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Total Monthly Rent:</span>
                  <span className="font-medium">₹{totalMonthlyRent.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </dd>
          </div>
          
          {/* Maintenance */}
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">
              Maintenance Collection
            </dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-4">
                <div className="flex justify-between border-b pb-2">
                  <span>1 BHK Units (₹1,000 each):</span>
                  <span className="font-medium">₹{maintenanceCollection.oneBhk.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>2 BHK Units (₹1,500 each):</span>
                  <span className="font-medium">₹{maintenanceCollection.twoBhk.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Total Monthly Collection:</span>
                  <span className="font-medium">₹{maintenanceCollection.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </dd>
          </div>
          
          {/* Recent Maintenance Issues */}
          {maintenanceIssues.length > 0 && (
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                Recent Maintenance Issues
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                  {maintenanceIssues.map((issue, index) => (
                    <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                      <div className="w-0 flex-1 flex items-center">
                        {issue.status === 'urgent' ? (
                          <AlertCircle className="flex-shrink-0 h-5 w-5 text-red-500" />
                        ) : issue.status === 'completed' ? (
                          <CheckCircle className="flex-shrink-0 h-5 w-5 text-green-500" />
                        ) : (
                          <Search className="flex-shrink-0 h-5 w-5 text-gray-400" />
                        )}
                        <span className="ml-2 flex-1 w-0 truncate">
                          {issue.title}
                          {issue.date && <span className="ml-2 text-gray-500">- {issue.date}</span>}
                        </span>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {getStatusBadge(issue.status)}
                      </div>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
      
      <CardFooter className="border-t border-gray-200 px-4 py-4">
        <Link href="/properties">
          <a className="text-sm font-medium text-primary-600 hover:text-primary-500">
            View all property details &rarr;
          </a>
        </Link>
      </CardFooter>
    </Card>
  );
}
