import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Home,
  DollarSign,
  CreditCard,
  Building2,
  FileText,
  Settings,
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <Home className="w-6 h-6 mr-3" />,
    },
    {
      name: "Income",
      href: "/income",
      icon: <DollarSign className="w-6 h-6 mr-3" />,
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: <CreditCard className="w-6 h-6 mr-3" />,
    },
    {
      name: "Properties",
      href: "/properties",
      icon: <Building2 className="w-6 h-6 mr-3" />,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: <FileText className="w-6 h-6 mr-3" />,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: <Settings className="w-6 h-6 mr-3" />,
    },
  ];

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="flex items-center h-16 px-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-700">Real Estate Manager</h1>
        </div>
        
        <div className="flex flex-col flex-grow px-4 pt-5 pb-4 overflow-y-auto">
          <div className="flex-grow flex flex-col">
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                      location === item.href
                        ? "bg-gray-100 text-primary-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </a>
                </Link>
              ))}
            </nav>
          </div>
          
          {user && (
            <div className="pt-5 mt-5 border-t border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.name}</p>
                  <p className="text-xs font-medium text-gray-500">
                    {user.role === "admin" ? "Administrator" : "Data Entry User"}
                  </p>
                </div>
                <button 
                  onClick={() => logout()}
                  className="ml-auto text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
