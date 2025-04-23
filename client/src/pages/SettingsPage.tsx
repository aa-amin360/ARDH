import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  User, 
  Settings,
  Lock,
  UserPlus,
  Edit,
  Trash2,
  MoreHorizontal 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Form schema for password change
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Form schema for adding a user
const userFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  role: z.enum(["admin", "data_entry"]),
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type UserFormValues = z.infer<typeof userFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  // Password change form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Add user form
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "data_entry",
    },
  });

  // Fetch users (for admin only)
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  // Change password mutation (would be implemented in a real app)
  const changePasswordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      // This endpoint doesn't exist in the provided backend code
      // In a real app, you would implement this endpoint
      const response = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
      passwordForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const response = await apiRequest("POST", "/api/users", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Added",
        description: "The new user has been successfully added.",
      });
      setIsAddUserDialogOpen(false);
      userForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      // This endpoint doesn't exist in the provided backend code
      // In a real app, you would implement this endpoint
      const response = await apiRequest("DELETE", `/api/users/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "The user has been successfully deleted.",
      });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Submit handlers
  const onPasswordSubmit = (values: PasswordFormValues) => {
    changePasswordMutation.mutate(values);
  };

  const onUserSubmit = (values: UserFormValues) => {
    addUserMutation.mutate(values);
  };

  const handleDeleteUser = (id: number) => {
    setUserToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete !== null) {
      deleteUserMutation.mutate(userToDelete);
    }
  };

  return (
    <div className="py-4">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage your account settings and application preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full md:w-auto grid-cols-2 md:inline-flex">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Account
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  User Management
                </TabsTrigger>
              )}
            </TabsList>
            
            {/* Account Settings */}
            <TabsContent value="account" className="mt-6">
              <div className="space-y-6">
                {/* User Information */}
                <div>
                  <h3 className="text-lg font-medium">User Information</h3>
                  <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <div className="mt-1 border rounded-md px-3 py-2 bg-gray-50">
                          {user?.name || "N/A"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Username</label>
                        <div className="mt-1 border rounded-md px-3 py-2 bg-gray-50">
                          {user?.username || "N/A"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <div className="mt-1 border rounded-md px-3 py-2 bg-gray-50">
                          {user?.email || "N/A"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Role</label>
                        <div className="mt-1 border rounded-md px-3 py-2 bg-gray-50">
                          {user?.role === "admin" ? "Administrator" : "Data Entry User"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Change Password */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium">Change Password</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Update your password to keep your account secure
                  </p>
                  
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="mt-4 space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter current password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter new password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirm new password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        disabled={changePasswordMutation.isPending}
                      >
                        {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  </Form>
                </div>
              </div>
            </TabsContent>
            
            {/* User Management (Admin Only) */}
            {isAdmin && (
              <TabsContent value="users" className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">User Management</h3>
                  <Button onClick={() => setIsAddUserDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-10">Loading users...</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users && users.length > 0 ? (
                          users.map((user: any) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell>{user.username}</TableCell>
                              <TableCell>{user.email || "-"}</TableCell>
                              <TableCell>
                                {user.role === "admin" ? "Administrator" : "Data Entry User"}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              No users found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with specific permissions.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="data_entry">Data Entry User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Administrators have full access to all features.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddUserDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addUserMutation.isPending}
                >
                  {addUserMutation.isPending ? "Adding..." : "Add User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user account and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
