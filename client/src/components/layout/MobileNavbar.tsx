import { useState } from "react";
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
  Menu,
  X,
  LogOut
} from "lucide-react";

export default function MobileNavbar() {
  const { user, isAdmin, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
    <div className="md:hidden">
      {/* Top header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-primary">ARDH Management</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="bg-white border-b border-gray-200 py-1">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500">
              {isAdmin ? 'Administrator' : 'Data Entry'}
            </p>
          </div>
          {filteredNavItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium",
                item.current
                  ? "bg-primary bg-opacity-10 text-primary"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}