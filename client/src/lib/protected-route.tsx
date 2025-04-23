import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useEffect } from "react";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  // Check if user is authenticated and redirect if needed
  useEffect(() => {
    if (!isLoading && !user && location.startsWith(path)) {
      // Use hard navigation to auth page for more reliable redirection
      window.location.href = "/auth";
    }
  }, [user, isLoading, path, location]);

  // Show loading state while checking authentication
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

  // If user is not authenticated, don't render component
  // The useEffect above will handle the redirect
  if (!user) {
    return (
      <Route path={path}>
        {() => null}
      </Route>
    );
  }

  // User is authenticated, render the protected component
  return (
    <Route path={path}>
      {(params) => (
        <AppLayout>
          <Component {...params} />
        </AppLayout>
      )}
    </Route>
  );
}