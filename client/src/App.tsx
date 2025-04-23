import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";

import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import IncomePage from "@/pages/IncomePage";
import ExpensesPage from "@/pages/ExpensesPage";
import PropertiesPage from "@/pages/PropertiesPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import TestPage from "@/pages/TestPage";
import Layout from "@/components/layout/Layout";

// Protected route component
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    // Here you could show a loading spinner
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    // Redirect to login if not authenticated
    navigate("/login");
    return null;
  }

  return <Component {...rest} />;
};

function AppRoutes() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      <Route path="/">
        <Redirect to="/test" />
      </Route>
      
      <Route path="/test" component={TestPage} />
      
      <Route path="/dashboard">
        <Layout>
          <ProtectedRoute component={DashboardPage} />
        </Layout>
      </Route>
      
      <Route path="/income">
        <Layout>
          <ProtectedRoute component={IncomePage} />
        </Layout>
      </Route>
      
      <Route path="/expenses">
        <Layout>
          <ProtectedRoute component={ExpensesPage} />
        </Layout>
      </Route>
      
      <Route path="/properties">
        <Layout>
          <ProtectedRoute component={PropertiesPage} />
        </Layout>
      </Route>
      
      <Route path="/reports">
        <Layout>
          <ProtectedRoute component={ReportsPage} />
        </Layout>
      </Route>
      
      <Route path="/settings">
        <Layout>
          <ProtectedRoute component={SettingsPage} />
        </Layout>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
