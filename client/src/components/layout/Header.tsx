import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle search submit
    console.log("Search for:", searchQuery);
  };

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
      <button
        type="button"
        className="md:hidden px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
        onClick={onMobileMenuToggle}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" />
      </button>
      
      <div className="flex-1 flex justify-between px-4 md:px-0">
        <div className="flex-1 flex items-center ml-4">
          <form className="max-w-lg w-full lg:max-w-xs" onSubmit={handleSearchSubmit}>
            <label htmlFor="search" className="sr-only">Search</label>
            <div className="relative text-gray-400 focus-within:text-gray-600">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <Search className="h-5 w-5" />
              </div>
              <Input
                id="search"
                name="search"
                className="block w-full bg-white py-2 pl-10 pr-3 border border-gray-200 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Search"
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </form>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6">
          <button type="button" className="p-1 bg-white rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
