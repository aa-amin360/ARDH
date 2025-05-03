import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Building2,
  Home,
  Receipt,
  CreditCard,
  PieChart,
  Settings,
  LogOut,
  Users,
  X,
  Hammer,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({
  isSidebarOpen,
  toggleSidebar,
}: SidebarProps) {
  const [location] = useLocation();
  const { user, isAdmin, logoutMutation } = useAuth();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Navigation categories and items
  const navCategories = [
    {
      name: null, // No category name for dashboard
      items: [
        {
          label: "Dashboard",
          href: "/",
          icon: <Home className="w-5 h-5" />,
          isVisible: true,
        },
      ],
    },
    {
      name: "Master Data",
      items: [
        {
          label: "Properties",
          href: "/properties",
          icon: <Building2 className="w-5 h-5" />,
          isVisible: isAdmin,
        },
        {
          label: "Tenants",
          href: "/tenants",
          icon: <Users className="w-5 h-5" />,
          isVisible: true,
        },
        {
          label: "Property Owners",
          href: "/property-owners",
          icon: <UsersRound className="w-5 h-5" />,
          isVisible: isAdmin,
        },
        {
          label: "Vendors",
          href: "/vendors",
          icon: <Hammer className="w-5 h-5" />,
          isVisible: true,
        },
      ],
    },
    {
      name: "Transactional Data",
      items: [
        {
          label: "Income",
          href: "/income",
          icon: <Receipt className="w-5 h-5" />,
          isVisible: isAdmin,
        },
        {
          label: "Expenses",
          href: "/expenses",
          icon: <CreditCard className="w-5 h-5" />,
          isVisible: true,
        },
        {
          label: "Maintenance Tracker",
          href: "#",
          icon: <Wrench className="w-5 h-5" />,
          isVisible: true,
          badge: "Coming Soon",
          disabled: true,
        },
      ],
    },
    {
      name: null, // No category name for these items
      items: [
        {
          label: "Reports",
          href: "/reports",
          icon: <PieChart className="w-5 h-5" />,
          isVisible: isAdmin,
        },
        {
          label: "Settings",
          href: "/settings",
          icon: <Settings className="w-5 h-5" />,
          isVisible: true,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full border-r shadow-sm">
      {/* Sidebar header */}
      <div className="p-4 border-b flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-black ml-2">
              ARDH Management
            </span>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* User info */}
      <div className="p-4 border-b">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500">
              {isAdmin ? "Administrator" : "Data Entry User"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {navItems
            .filter((item) => item.isVisible)
            .map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100",
                      {
                        "bg-gray-100 text-primary": location === item.href,
                        "text-gray-700": location !== item.href,
                      },
                    )}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </div>
                </Link>
              </li>
            ))}
        </ul>
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t mt-auto">
        <button
          className="w-full flex items-center px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="ml-3">Logout</span>
        </button>
      </div>
    </div>
  );
}
