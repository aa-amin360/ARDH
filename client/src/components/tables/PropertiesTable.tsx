import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ArrowUpDown, Edit, Trash2, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface Property {
  id: number;
  flatNumber: string;
  flatType: string;
  ownerName: string;
  expectedRent: number;
  maintenanceFee: number;
  isRented: boolean;
  currentTenant?: string;
  floorArea?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PropertiesTableProps {
  data: Property[];
  onEdit: (property: Property) => void;
  onDelete: (id: number) => void;
}

export default function PropertiesTable({
  data,
  onEdit,
  onDelete,
}: PropertiesTableProps) {
  const { isAdmin } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "flatNumber", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [flatType, setFlatType] = useState<string>("all");
  const [rentalStatus, setRentalStatus] = useState<string>("all");

  // Format flat type for display
  const formatFlatType = (type: string): string => {
    switch (type) {
      case "1BHK":
        return "1 BHK";
      case "2BHK":
        return "2 BHK";
      case "3BHK":
        return "3 BHK";
      case "penthouse":
        return "Penthouse";
      default:
        return type;
    }
  };

  // Table columns definition
  const columns: ColumnDef<Property>[] = [
    {
      accessorKey: "flatNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Flat Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    },
    {
      accessorKey: "flatType",
      header: "Type",
      cell: ({ row }) => {
        const flatType = row.getValue("flatType") as string;
        return formatFlatType(flatType);
      },
    },
    {
      accessorKey: "ownerName",
      header: "Owner",
    },
    {
      accessorKey: "expectedRent",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Rent (₹)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = row.getValue("expectedRent") as number;
        return <div className="font-medium">₹{amount.toLocaleString("en-IN")}</div>;
      },
    },
    {
      accessorKey: "maintenanceFee",
      header: "Maintenance (₹)",
      cell: ({ row }) => {
        const amount = row.getValue("maintenanceFee") as number;
        return <div>₹{amount.toLocaleString("en-IN")}</div>;
      },
    },
    {
      accessorKey: "isRented",
      header: "Status",
      cell: ({ row }) => {
        const isRented = row.getValue("isRented") as boolean;
        return (
          <div className="flex items-center">
            {isRented ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600">Rented</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600 mr-1" />
                <span className="text-red-600">Vacant</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "currentTenant",
      header: "Tenant",
      cell: ({ row }) => {
        return row.original.currentTenant || "-";
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  onClick={() => onDelete(row.original.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter data based on flat type and rental status
  const filteredData = data.filter(
    (property) =>
      (flatType === "all" || property.flatType === flatType) &&
      (rentalStatus === "all" ||
        (rentalStatus === "rented" && property.isRented) ||
        (rentalStatus === "vacant" && !property.isRented))
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-4">
        <Input
          placeholder="Filter by flat number..."
          value={(table.getColumn("flatNumber")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("flatNumber")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Select
            value={flatType}
            onValueChange={setFlatType}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Flat Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="1BHK">1 BHK</SelectItem>
              <SelectItem value="2BHK">2 BHK</SelectItem>
              <SelectItem value="3BHK">3 BHK</SelectItem>
              <SelectItem value="penthouse">Penthouse</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={rentalStatus}
            onValueChange={setRentalStatus}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rental Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="rented">Rented</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No properties found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of {data.length} properties
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
