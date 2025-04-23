import { useState } from "react";
import { Building2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

// Simplified App component that doesn't rely on authentication or routing
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"admin" | "data_entry" | null>(null);
  
  const handleAdminLogin = () => {
    setIsLoggedIn(true);
    setUsername("Admin User");
    setRole("admin");
  };
  
  const handleDataEntryLogin = () => {
    setIsLoggedIn(true);
    setUsername("Data Entry User");
    setRole("data_entry");
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setRole(null);
  };
  
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <Toaster />
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        {!isLoggedIn ? (
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-center">Real Estate Manager</CardTitle>
              <CardDescription className="text-center">
                A property management application for tracking building income, expenses, and flat details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full mb-2 bg-blue-600 hover:bg-blue-700" 
                onClick={handleAdminLogin}
              >
                Login as Admin
              </Button>
              <Button 
                className="w-full"
                variant="outline"
                onClick={handleDataEntryLogin}
              >
                Login as Data Entry
              </Button>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="text-xs text-gray-500 text-center w-full">
                <p>This is a demonstration of the Real Estate Management application</p>
                <p>You can click the buttons above to simulate different user roles</p>
              </div>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full max-w-3xl">
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>
                Welcome, {username} ({role === "admin" ? "Administrator" : "Data Entry User"})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹432,000
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For this month
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Properties
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      18
                    </div>
                    <p className="text-xs text-muted-foreground">
                      9 1BHK, 9 2BHK
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Occupancy Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      83.3%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      15 of 18 units occupied
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-medium">Available Features</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Dashboard with income/expense charts and property statistics</li>
                  <li>Income management for tracking rent and maintenance fees</li>
                  <li>Expense tracking with categorization</li>
                  <li>Property management for flats</li>
                  <li>Reports generation with date range filtering</li>
                  {role === "admin" && (
                    <li>User management (Admin only)</li>
                  )}
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="ml-auto"
              >
                Logout
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
