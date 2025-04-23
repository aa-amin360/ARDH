import React from "react";
import { Button } from "@/components/ui/button";
import { Menu, Building2 } from "lucide-react";
import { Link } from "wouter";

interface MobileNavbarProps {
  toggleSidebar: () => void;
}

export default function MobileNavbar({ toggleSidebar }: MobileNavbarProps) {
  return (
    <div className="bg-white px-4 py-3 border-b md:hidden">
      <div className="flex items-center justify-between">
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
          aria-label="Open Menu"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}