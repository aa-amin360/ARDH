import { useState } from "react";
import { Building2, Upload, User, Filter, ListFilter, PlusCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Simplified App component that doesn't rely on authentication or routing
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"admin" | "data_entry" | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  
  const owners = [
    { id: "1", name: "Rakesh Sharma" },
    { id: "2", name: "Akshay Patel" },
    { id: "3", name: "Sunita Verma" },
    { id: "4", name: "Rajiv Kumar" },
    { id: "5", name: "Preeti Singh" }
  ];
  
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
    setActiveTab("dashboard");
  };
  
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <Toaster />
      <div className="min-h-screen bg-gray-50">
        {!isLoggedIn ? (
          <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
              <CardHeader className="space-y-1 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-center">ARDH Property Manager</CardTitle>
                <CardDescription className="text-center">
                  AR's Dream Heights Management System
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
                  <p>This is a demonstration of the ARDH Property Management application</p>
                  <p>You can click the buttons above to simulate different user roles</p>
                </div>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">ARDH Manager</h1>
                    <p className="text-sm text-gray-500">AR's Dream Heights</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{username}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </header>
            
            {/* Main content */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                  <TabsTrigger value="income">Income</TabsTrigger>
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                  {role === "admin" && (
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="dashboard" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                    <Select
                      value={selectedOwner}
                      onValueChange={setSelectedOwner}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by Owner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Owners</SelectItem>
                        {owners.map(owner => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Expenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ₹87,500
                        </div>
                        <p className="text-xs text-muted-foreground">
                          For this month
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recent Income & Expenses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center bg-gray-100 rounded-md">
                          [Income/Expense Chart]
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Property Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center bg-gray-100 rounded-md">
                          [Property Distribution Chart]
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs uppercase bg-gray-50">
                            <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Description</th>
                              <th className="px-6 py-3">Type</th>
                              <th className="px-6 py-3">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="bg-white border-b">
                              <td className="px-6 py-4">2023-04-15</td>
                              <td className="px-6 py-4">Rent - Flat 101</td>
                              <td className="px-6 py-4">Income</td>
                              <td className="px-6 py-4 text-green-600">₹12,000</td>
                            </tr>
                            <tr className="bg-white border-b">
                              <td className="px-6 py-4">2023-04-12</td>
                              <td className="px-6 py-4">Electricity Bill</td>
                              <td className="px-6 py-4">Expense</td>
                              <td className="px-6 py-4 text-red-600">₹4,500</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="px-6 py-4">2023-04-10</td>
                              <td className="px-6 py-4">Maintenance - Flat 205</td>
                              <td className="px-6 py-4">Income</td>
                              <td className="px-6 py-4 text-green-600">₹1,500</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="income" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Income Management</h2>
                    <div className="flex space-x-3">
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Upload
                      </Button>
                      <Button size="sm">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Income
                      </Button>
                    </div>
                  </div>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs uppercase bg-gray-50">
                            <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Type</th>
                              <th className="px-6 py-3">Property</th>
                              <th className="px-6 py-3">Owner</th>
                              <th className="px-6 py-3">Description</th>
                              <th className="px-6 py-3">Amount</th>
                              <th className="px-6 py-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="bg-white border-b">
                              <td className="px-6 py-4">2023-04-15</td>
                              <td className="px-6 py-4">Rent</td>
                              <td className="px-6 py-4">Flat 101 (1BHK)</td>
                              <td className="px-6 py-4">Rakesh Sharma</td>
                              <td className="px-6 py-4">Monthly Rent</td>
                              <td className="px-6 py-4 text-green-600">₹12,000</td>
                              <td className="px-6 py-4">
                                <Button variant="ghost" size="sm">Edit</Button>
                              </td>
                            </tr>
                            <tr className="bg-white border-b">
                              <td className="px-6 py-4">2023-04-10</td>
                              <td className="px-6 py-4">Maintenance</td>
                              <td className="px-6 py-4">Flat 205 (2BHK)</td>
                              <td className="px-6 py-4">Akshay Patel</td>
                              <td className="px-6 py-4">Monthly Maintenance</td>
                              <td className="px-6 py-4 text-green-600">₹1,500</td>
                              <td className="px-6 py-4">
                                <Button variant="ghost" size="sm">Edit</Button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="properties">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Management</h2>
                  <p className="text-gray-500 text-center py-12">Property management interface would be shown here</p>
                </TabsContent>
                
                <TabsContent value="expenses">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Expense Tracking</h2>
                  <p className="text-gray-500 text-center py-12">Expense tracking interface would be shown here</p>
                </TabsContent>
                
                <TabsContent value="reports">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Reports</h2>
                  <p className="text-gray-500 text-center py-12">Reports interface would be shown here</p>
                </TabsContent>
                
                <TabsContent value="settings">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
                  <p className="text-gray-500 text-center py-12">Settings interface would be shown here</p>
                </TabsContent>
              </Tabs>
            </main>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
