import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Building2 } from "lucide-react";
import ardhImg from "@assets/ARDH_Img.png";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const success = await login(data.username, data.password);
      if (success) {
        navigate("/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side with blurred building image */}
      <div className="hidden md:flex md:w-1/2 relative">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-10" />
        <img 
          src={ardhImg} 
          alt="ARDH Building" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-white text-center p-8">
            <h1 className="text-4xl font-bold mb-2">ARDH</h1>
            <p className="text-xl font-light">AR's Dream Heights</p>
            <p className="mt-4 text-sm max-w-md">Property Management System</p>
          </div>
        </div>
      </div>
      
      {/* Right side with login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="space-y-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#154c79]/10 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-[#154c79]" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Real Estate Manager</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username"
                          {...field}
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-[#154c79] hover:bg-[#154c79]/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <div className="text-xs text-gray-500 text-center w-full">
              <p>Demo Credentials:</p>
              <p>Admin: username: <strong>admin</strong>, password: <strong>admin123</strong></p>
              <p>Data Entry: username: <strong>dataentry</strong>, password: <strong>data123</strong></p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
