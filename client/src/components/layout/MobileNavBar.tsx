import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  DollarSign,
  CreditCard,
  Building2,
} from "lucide-react";

export default function MobileNavBar() {
  const [location] = useLocation();
  
  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <Home className="h-6 w-6" />,
    },
    {
      name: "Income",
      href: "/income",
      icon: <DollarSign className="h-6 w-6" />,
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: <CreditCard className="h-6 w-6" />,
    },
    {
      name: "Properties",
      href: "/properties",
      icon: <Building2 className="h-6 w-6" />,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                "group flex flex-col items-center py-3 px-2",
                location === item.href
                  ? "text-primary-600"
                  : "text-gray-500"
              )}
            >
              {item.icon}
              <span className="text-xs font-medium mt-1">{item.name}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
