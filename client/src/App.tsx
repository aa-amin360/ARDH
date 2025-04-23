import { Switch, Route, useLocation } from "wouter";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

// Pages
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/DashboardPage";
import PropertiesPage from "@/pages/PropertiesPage";
import IncomePage from "@/pages/IncomePage";
import ExpensesPage from "@/pages/ExpensesPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";

// Admin-only route component
function AdminRoute({ path, component }: { path: string, component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  
  // If loading, render nothing yet
  if (isLoading) return null;
  
  // If user is not admin, redirect to dashboard
  if (user && user.role !== 'admin') {
    navigate('/');
    return null;
  }
  
  // Otherwise, render the protected route
  return <ProtectedRoute path={path} component={component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/properties" component={PropertiesPage} />
      {/* Income page is admin-only */}
      <AdminRoute path="/income" component={IncomePage} />
      <ProtectedRoute path="/expenses" component={ExpensesPage} />
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