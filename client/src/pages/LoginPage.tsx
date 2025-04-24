
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Building2 } from "lucide-react";
import ardhImg from "../assets/ARDH_Img.png";

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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { loginMutation } = useAuth();
  const [, navigate] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side with blurred building image */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <img 
          src={ardhImg} 
          alt="ARDH Building" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm z-10" />

        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-white text-center p-8 max-w-xl">
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent drop-shadow-sm">
              ARDH
            </h1>
            <p className="text-2xl font-light">AR's Dream Heights</p>
            <div className="w-16 h-1 bg-white mx-auto my-6 rounded-full opacity-70"></div>
            <p className="mt-4 text-lg max-w-md mx-auto">
              Comprehensive property management system for tracking income,
              expenses, and tenant information
            </p>
          </div>
        </div>
      </div>

      {/* Right side with login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 lg:p-12 bg-gradient-to-b from-gray-50 to-white">
        <Card className="w-full max-w-md border border-gray-100 shadow-xl">
          <CardHeader className="space-y-2 flex flex-col items-center pb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-700 to-gray-900 flex items-center justify-center mb-4 shadow-md">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              ARDH Manager
            </CardTitle>
            <CardDescription className="text-center text-base">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        Username
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username"
                          {...field}
                          autoComplete="username"
                          className="border-gray-300 focus-visible:ring-gray-500/30 h-11"
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
                      <FormLabel className="text-gray-700 font-medium">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                          autoComplete="current-password"
                          className="border-gray-300 focus-visible:ring-gray-500/30 h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 mt-2 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 text-base"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="border-t px-6 py-5 bg-gray-50/50">
            <div className="text-sm text-gray-600 text-center w-full space-y-1">
              <p className="font-medium text-gray-700">Demo Credentials</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 max-w-xs mx-auto">
                <div className="text-left">
                  <span className="font-semibold">Admin:</span>
                </div>
                <div className="text-left">admin / admin123</div>
                <div className="text-left">
                  <span className="font-semibold">Data Entry:</span>
                </div>
                <div className="text-left">dataentry / data123</div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
