import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Receipt,
  CreditCard,
  Building2,
  Users,
  Hammer,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function MobileNavBar() {
  const [location] = useLocation();
  const { isAdmin } = useAuth();
  
  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: <Home className="h-6 w-6" />,
      isVisible: true,
    },
    {
      name: "Properties",
      href: "/properties",
      icon: <Building2 className="h-6 w-6" />,
      isVisible: true,
    },
    {
      name: "Tenants",
      href: "/tenants",
      icon: <Users className="h-6 w-6" />,
      isVisible: true,
    },
    {
      name: "Income",
      href: "/income",
      icon: <Receipt className="h-6 w-6" />,
      isVisible: isAdmin,
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: <CreditCard className="h-6 w-6" />,
      isVisible: true,
    },
    {
      name: "Vendors",
      href: "/vendors",
      icon: <Hammer className="h-6 w-6" />,
      isVisible: true,
    },
  ];

  const filteredNavItems = navItems.filter(item => item.isVisible);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
      <div className="flex justify-around">
        {filteredNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "group flex flex-col items-center py-3 px-2",
                location === item.href
                  ? "text-primary"
                  : "text-gray-500"
              )}
            >
              {item.icon}
              <span className="text-xs font-medium mt-1">{item.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
