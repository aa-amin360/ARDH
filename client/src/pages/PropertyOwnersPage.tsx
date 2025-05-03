import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Edit, Trash, Plus, Check, X } from "lucide-react";

type PropertyOwner = {
  id: string;
  fullName: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  adhar: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIFSC: string | null;
  createdAt: string;
  modifiedAt: string;
  createdBy: number;
};

const ownerFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  phone: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
  altPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  adhar: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIFSC: z.string().optional(),
});

type OwnerFormValues = z.infer<typeof ownerFormSchema>;

export default function PropertyOwnersPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("view");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<PropertyOwner | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all property owners
  const {
    data: propertyOwners = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/property-owners"],
    queryFn: ({ signal }) =>
      fetch("/api/property-owners", { signal }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch property owners");
        return res.json();
      }),
  });

  // Fetch linked flats for the selected owner
  const { data: linkedFlats = [], isLoading: isLoadingFlats } = useQuery({
    queryKey: ["/api/property-owners", selectedOwner?.id, "linked-flats"],
    queryFn: ({ signal }) =>
      selectedOwner
        ? fetch(`/api/property-owners/${selectedOwner.id}/linked-flats`, {
            signal,
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to fetch linked flats");
            return res.json();
          })
        : Promise.resolve([]),
    enabled: !!selectedOwner,
  });

  // Create owner mutation
  const createOwnerMutation = useMutation({
    mutationFn: async (newOwner: OwnerFormValues) => {
      const response = await apiRequest(
        "POST",
        "/api/property-owners",
        newOwner,
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create property owner");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property owner created successfully",
      });
      refetch();
      setActiveTab("view");
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update owner mutation
  const updateOwnerMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<OwnerFormValues>;
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/property-owners/${id}`,
        data,
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update property owner");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property owner updated successfully",
      });
      refetch();
      setActiveTab("view");
      setSelectedOwner(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete owner mutation
  const deleteOwnerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/property-owners/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete property owner");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property owner deleted successfully",
      });
      refetch();
      setSelectedOwner(null);
      setIsDeleting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsDeleting(false);
    },
  });

  // Create form
  const createForm = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      altPhone: "",
      email: "",
      adhar: "",
      bankName: "",
      bankAccount: "",
      bankIFSC: "",
    },
  });

  // Edit form
  const editForm = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      altPhone: "",
      email: "",
      adhar: "",
      bankName: "",
      bankAccount: "",
      bankIFSC: "",
    },
  });

  function onCreateSubmit(values: OwnerFormValues) {
    createOwnerMutation.mutate(values);
  }

  function onEditSubmit(values: OwnerFormValues) {
    if (!selectedOwner) return;
    updateOwnerMutation.mutate({ id: selectedOwner.id, data: values });
  }

  function handleEditOwner(owner: PropertyOwner) {
    setSelectedOwner(owner);
    editForm.reset({
      fullName: owner.fullName,
      phone: owner.phone,
      altPhone: owner.altPhone || "",
      email: owner.email || "",
      adhar: owner.adhar || "",
      bankName: owner.bankName || "",
      bankAccount: owner.bankAccount || "",
      bankIFSC: owner.bankIFSC || "",
    });
    setActiveTab("modify");
  }

  function handleDeleteOwner() {
    if (!selectedOwner) return;
    deleteOwnerMutation.mutate(selectedOwner.id);
  }

  function handleSearch() {
    if (!searchTerm.trim()) {
      refetch();
      return;
    }

    queryClient.fetchQuery({
      queryKey: ["/api/property-owners/search", searchTerm],
      queryFn: () =>
        fetch(
          `/api/property-owners/search?term=${encodeURIComponent(searchTerm)}`,
        )
          .then((res) => {
            if (!res.ok) throw new Error("Search failed");
            return res.json();
          })
          .then((data) => {
            queryClient.setQueryData(["/api/property-owners"], data);
            return data;
          }),
    });
  }

  function resetSearch() {
    setSearchTerm("");
    refetch();
  }

  const filteredOwners = propertyOwners;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Property Owners</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="view">View Owners</TabsTrigger>
          <TabsTrigger
            value="modify"
            disabled={!selectedOwner}
          >
            Modify Owner
          </TabsTrigger>
          <TabsTrigger value="add">Add Owner</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Owners List</CardTitle>
              <CardDescription>
                View and manage property owners in the ARDH building
              </CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  placeholder="Search owners by name, phone, or bank details"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" /> Search
                </Button>
                {searchTerm && (
                  <Button variant="ghost" onClick={resetSearch}>
                    <X className="h-4 w-4 mr-2" /> Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading property owners...</p>
              ) : error ? (
                <p className="text-red-500">
                  Error loading property owners: {(error as Error).message}
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOwners.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            No property owners found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOwners.map((owner) => (
                          <TableRow key={owner.id}>
                            <TableCell className="font-medium">
                              {owner.fullName}
                            </TableCell>
                            <TableCell>{owner.phone}</TableCell>
                            <TableCell>{owner.email || "—"}</TableCell>
                            <TableCell>
                              {linkedFlats.length > 0 &&
                              selectedOwner?.id === owner.id ? (
                                <Badge className="bg-green-600">
                                  Linked to {linkedFlats.length} flat(s)
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer"
                                  onClick={() => setSelectedOwner(owner)}
                                >
                                  Check Status
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {owner.bankName && owner.bankAccount
                                ? `${owner.bankName} - ${owner.bankAccount.slice(-4).padStart(owner.bankAccount.length, "*")}`
                                : "No bank details"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditOwner(owner)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog
                                open={isDeleting}
                                onOpenChange={setIsDeleting}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedOwner(owner);
                                      setIsDeleting(true);
                                    }}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the property
                                      owner. If the owner is linked to any
                                      properties, you must first unlink them.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDeleteOwner}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {selectedOwner && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">
                        {selectedOwner.fullName}'s Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Full Name:{" "}
                            <span className="font-medium text-foreground">
                              {selectedOwner.fullName}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Phone:{" "}
                            <span className="font-medium text-foreground">
                              {selectedOwner.phone}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Alt. Phone:{" "}
                            <span className="font-medium text-foreground">
                              {selectedOwner.altPhone || "—"}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Email:{" "}
                            <span className="font-medium text-foreground">
                              {selectedOwner.email || "—"}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Adhar:{" "}
                            <span className="font-medium text-foreground">
                              {selectedOwner.adhar || "—"}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Bank Name:{" "}
                            <span className="font-medium text-foreground">
                              {selectedOwner.bankName || "—"}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Account Number:{" "}
                            <span className="font-medium text-foreground">
                              {selectedOwner.bankAccount
                                ? selectedOwner.bankAccount
                                    .slice(-4)
                                    .padStart(
                                      selectedOwner.bankAccount.length,
                                      "*",
                                    )
                                : "—"}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            IFSC Code:{" "}
                            <span className="font-medium text-foreground">
                              {selectedOwner.bankIFSC || "—"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium mb-3">
                          Linked Properties
                        </h3>
                        {isLoadingFlats ? (
                          <p>Loading linked properties...</p>
                        ) : linkedFlats.length === 0 ? (
                          <p>No properties linked to this owner</p>
                        ) : (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Flat Number</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Floor</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {linkedFlats.map((flat) => {
                                  const isLeasable =
                                    flat.leaseStatus?.trim().toLowerCase() ===
                                    "leasable";

                                  return (
                                    <TableRow key={flat.id}>
                                      <TableCell className="font-medium">
                                        {flat.flatNumber}
                                      </TableCell>
                                      <TableCell>{flat.flatType}</TableCell>
                                      <TableCell>
                                        {flat.apartmentFloor}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={
                                            isLeasable ? "default" : "outline"
                                          }
                                        >
                                          {isLeasable ? "Leased" : "Not-Leased"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modify" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Modify Property Owner</CardTitle>
              <CardDescription>
                Update details for {selectedOwner?.fullName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedOwner ? (
                <Form {...editForm}>
                  <form
                    onSubmit={editForm.handleSubmit(onEditSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name*</FormLabel>
                            <FormControl>
                              <Input placeholder="Full Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number*</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone Number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="altPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alternative Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Alternative Phone"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={editForm.control}
                      name="adhar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Adhar Card Number"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <h3 className="text-lg font-medium">Bank Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={editForm.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Bank Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="bankAccount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Account Number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="bankIFSC"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IFSC Code</FormLabel>
                            <FormControl>
                              <Input placeholder="IFSC Code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setActiveTab("view");
                          setSelectedOwner(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateOwnerMutation.isPending}
                      >
                        {updateOwnerMutation.isPending
                          ? "Updating..."
                          : "Update Owner"}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <p>Please select an owner to modify</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Property Owner</CardTitle>
              <CardDescription>
                Enter details for the new property owner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit(onCreateSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name*</FormLabel>
                          <FormControl>
                            <Input placeholder="Full Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number*</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="altPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternative Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Alternative Phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="adhar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adhar Number</FormLabel>
                        <FormControl>
                          <Input
                            type="adhar"
                            placeholder="Adhar card Number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <h3 className="text-lg font-medium">Bank Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Bank Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="bankAccount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Account Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="bankIFSC"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
                          <FormControl>
                            <Input placeholder="IFSC Code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        createForm.reset();
                        setActiveTab("view");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createOwnerMutation.isPending}
                    >
                      {createOwnerMutation.isPending
                        ? "Adding..."
                        : "Add Owner"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
