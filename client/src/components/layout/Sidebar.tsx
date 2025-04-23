import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Home,
  Building2,
  PiggyBank, 
  Banknote,
  FileText,
  Settings,
  User
} from "lucide-react";

export default function Sidebar() {
  const { user, isAdmin, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Navigation items
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
      current: location === "/",
      showFor: "all",
    },
    {
      name: "Properties",
      href: "/properties",
      icon: Building2,
      current: location === "/properties",
      showFor: "all",
    },
    {
      name: "Income",
      href: "/income",
      icon: PiggyBank,
      current: location === "/income",
      showFor: "admin",
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: Banknote,
      current: location === "/expenses",
      showFor: "all",
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
      current: location === "/reports",
      showFor: "admin",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      current: location === "/settings",
      showFor: "all",
    },
  ];
  
  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter(item => 
    item.showFor === "all" || (isAdmin && item.showFor === "admin")
  );
  
  return (
    <div className="hidden md:flex flex-col h-screen w-64 bg-white border-r border-gray-200">
      {/* Logo area */}
      <div className="py-6 px-4">
        <h1 className="text-xl font-bold text-primary">ARDH Management</h1>
        <p className="text-sm text-gray-500">AR's Dream Heights</p>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 px-2 py-4 space-y-1">
        {filteredNavItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium rounded-md",
              item.current
                ? "bg-primary text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </div>
      
      {/* User info */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500">
              {isAdmin ? 'Administrator' : 'Data Entry'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full px-4 py-2 text-sm text-center text-red-600 bg-red-50 hover:bg-red-100 rounded-md"
        >
          Logout
        </button>
      </div>
    </div>
  );
}