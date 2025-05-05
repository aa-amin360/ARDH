import { Switch, Route, useLocation } from "wouter";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Pages
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/DashboardPage";
import PropertiesPage from "@/pages/PropertiesPage";
import TenantsPage from "@/pages/TenantsPage";
import IncomePage from "@/pages/IncomePage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import VendorsPage from "@/pages/VendorsPage";
import ExpensesPageNew from "@/pages/ExpensesPageNew";
import PropertyOwnersPage from "@/pages/PropertyOwnersPage";
import MaintenanceTrackerPage from "@/pages/MaintenanceTrackerPage";


// Admin-only route component
function AdminRoute({ path, component }: { path: string, component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  
  // Check if user is an admin and redirect if needed
  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin' && location.startsWith(path)) {
      // Redirect non-admin users to dashboard using hard navigation
      window.location.href = '/';
    }
  }, [user, isLoading, path, location]);
  
  // If loading, show loading state
  if (isLoading) {
    return (
      <Route path={path}>
        {() => (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </Route>
    );
  }
  
  // If user is not admin, don't render component
  if (user && user.role !== 'admin') {
    return (
      <Route path={path}>
        {() => null}
      </Route>
    );
  }
  
  // User is admin, render the protected route
  return <ProtectedRoute path={path} component={component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      {/* Properties page is admin-only */}
      <AdminRoute path="/properties" component={PropertiesPage} />
      <ProtectedRoute path="/tenants" component={TenantsPage} />
      {/* Income page is admin-only */}
      <AdminRoute path="/income" component={IncomePage} />
      <ProtectedRoute path="/expenses" component={ExpensesPageNew} />
      <ProtectedRoute path="/vendors" component={VendorsPage} />
      <AdminRoute path="/property-owners" component={PropertyOwnersPage} />
      <ProtectedRoute path="/maintenance-tracker" component={MaintenanceTrackerPage} />

      <AdminRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <Toaster />
          <div className="min-h-screen bg-gray-50">
            <Router />
          </div>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;