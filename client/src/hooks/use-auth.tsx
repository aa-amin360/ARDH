import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Define the shape of the user data returned from API
interface UserResponse {
  id: number;
  username: string;
  name: string;
  role: "admin" | "data_entry";
  email?: string | null;
}

type AuthContextType = {
  user: UserResponse | null;
  isLoading: boolean;
  error: Error | null;
  isAdmin: boolean;
  loginMutation: UseMutationResult<UserResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserResponse, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserResponse | null, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const isAdmin = user?.role === "admin";

  const loginMutation = useMutation<UserResponse, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: (user) => {
      // Update user data in cache
      queryClient.setQueryData(["/api/auth/me"], user);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
      
      // Force a hard navigation to the dashboard (more reliable than navigate)
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<UserResponse, Error, InsertUser>({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/auth/register", credentials);
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name}!`,
      });
      // Navigate to dashboard immediately after successful registration
      setTimeout(() => {
        navigate("/");
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // First remove the user data from cache
      queryClient.setQueryData(["/api/auth/me"], null);
      
      // Invalidate all queries to refresh any data
      queryClient.invalidateQueries();
      
      // Show logout success toast
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
      // Force a hard navigation to auth page (this is more reliable than just using navigate)
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isAdmin: !!isAdmin,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}