import * as React from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowRight,
  Camera,
  MoreHorizontal,
  CheckCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Hash,
  Building2,
  User,
  Wallet,
  CalendarDays,
  Briefcase,
  Hammer,
  Calculator,
  Package,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type SiteMaterialRow = {
  id: string;
  siteId: string;
  productId: string;
  quantity: number | null;
  note: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    uom: string | null;
    unitSize: number | null;
    category: { id: string; name: string } | null;
  };
};

export type SiteRow = {
  id: string;
  name: string;
  code: string | null;
  client?: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  supervisorName?: string | null;
  totalWages?: number;
  totalMaterialCost?: number;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function SiteRowActions({
  site,
  onRequestPhoto,
  onMarkFinished,
}: {
  site: SiteRow;
  onRequestPhoto?: () => void;
  onMarkFinished?: () => void;
}) {
  const navigate = useNavigate();
  const { token } = useAuth();

  // Site Products dialog state
  const [showProductsDialog, setShowProductsDialog] = React.useState(false);
  const [siteProducts, setSiteProducts] = React.useState<SiteMaterialRow[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);

  React.useEffect(() => {
    if (!showProductsDialog || !token) return;
    setLoadingProducts(true);
    fetch(`${API_BASE_URL}/api/app/admin/sites/${site.id}/materials`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : { materials: [] }))
      .then((data) => setSiteProducts(data.materials || []))
      .finally(() => setLoadingProducts(false));
  }, [showProductsDialog, site.id, token]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Row actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            className="flex items-center gap-2"
            onSelect={(e) => {
              e.preventDefault();
              navigate(`/sites/${site.id}`);
            }}
          >
            <ArrowRight className="h-4 w-4" />
            Manage
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2"
            onSelect={(e) => {
              e.preventDefault();
              setShowProductsDialog(true);
            }}
          >
            <Package className="h-4 w-4" />
            Site Products
          </DropdownMenuItem>
          {onRequestPhoto && (
            <>
              <DropdownMenuItem
                className="flex items-center gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  onRequestPhoto();
                }}
              >
                <Camera className="h-4 w-4" />
                Request Photo
              </DropdownMenuItem>
            </>
          )}
          {onMarkFinished && site.isActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  onMarkFinished();
                }}
              >
                <CheckCircle className="h-4 w-4" />
                Mark Finished
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Site Products Dialog */}
      <Dialog open={showProductsDialog} onOpenChange={setShowProductsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Site Products — {site.name}</DialogTitle>
            <DialogDescription>
              Materials expected to be used on this job site.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : siteProducts.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                No materials assigned to this site yet.
              </p>
            ) : (
              <Table className="border-collapse [&_th]:border [&_th]:border-slate-200 [&_th]:dark:border-slate-700 [&_td]:border [&_td]:border-slate-200 [&_td]:dark:border-slate-700">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteProducts.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-400" />
                          {m.product.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {m.product.category ? (
                          <Badge variant="secondary">
                            {m.product.category.name}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">\u2014</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {m.product.sku || "\u2014"}
                      </TableCell>
                      <TableCell>{m.quantity ?? "\u2014"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => navigate(`/sites/${site.id}`)}
            >
              <ArrowRight className="mr-1 h-4 w-4" />
              Manage Site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SitesTableProps {
  data: SiteRow[];
  onRequestPhoto?: (site: SiteRow) => void;
  onMarkFinished?: (site: SiteRow) => void;
  onSelectionChange?: (selectedSites: SiteRow[]) => void;
}

export default function SitesTable({
  data,
  onRequestPhoto,
  onMarkFinished,
  onSelectionChange,
}: SitesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "code", desc: true },
  ]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Notify parent of selection changes
  React.useEffect(() => {
    if (!onSelectionChange) return;
    const selectedRows = Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => data[Number(k)])
      .filter(Boolean);
    onSelectionChange(selectedRows);
    // Only re-run when rowSelection actually changes, not on every data reference change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  const columns: ColumnDef<SiteRow>[] = React.useMemo(
    () => [
      {
        id: "select",
        size: 48,
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 accent-primary"
              checked={table.getIsAllPageRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomePageRowsSelected();
              }}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 accent-primary"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              aria-label="Select row"
            />
          </div>
        ),
      },
      {
        id: "code",
        accessorKey: "code",
        size: 120,
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(isSorted === "asc")}
            >
              <Hash className="h-4 w-4 text-indigo-600" />
              Job Number
              {isSorted === "asc" ? (
                <ChevronUp className="h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          );
        },
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code ?? "—"}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(isSorted === "asc")}
            >
              <Building2 className="h-4 w-4 text-sky-600" />
              Name
              {isSorted === "asc" ? (
                <ChevronUp className="h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          );
        },
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.name}</span>
        ),
      },
      {
        id: "client",
        accessorKey: "client",
        size: 150,
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(isSorted === "asc")}
            >
              <Briefcase className="h-4 w-4 text-amber-600" />
              Client
              {isSorted === "asc" ? (
                <ChevronUp className="h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          );
        },
        cell: ({ row }) => (
          <span className="text-sm">{row.original.client ?? "—"}</span>
        ),
      },
      {
        id: "supervisorName",
        accessorKey: "supervisorName",
        size: 180,
        header: () => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-violet-600" />
            Supervisor
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.supervisorName ?? "—"}</span>
        ),
      },
      {
        id: "totalWages",
        accessorKey: "totalWages",
        size: 130,
        header: () => (
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600" />
            Total Wages
          </div>
        ),
        cell: ({ row }) => (
          <span className="block text-right text-sm font-medium">
            {formatCurrency(row.original.totalWages ?? 0)}
          </span>
        ),
      },
      {
        id: "totalMaterialCost",
        accessorKey: "totalMaterialCost",
        size: 150,
        header: () => (
          <div className="flex items-center gap-2">
            <Hammer className="h-4 w-4 text-orange-600" />
            Total Material Cost
          </div>
        ),
        cell: ({ row }) => (
          <span className="block text-right text-sm font-medium">
            {formatCurrency(row.original.totalMaterialCost ?? 0)}
          </span>
        ),
      },
      {
        id: "totalCost",
        size: 140,
        header: () => (
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-rose-600" />
            Total Cost
          </div>
        ),
        cell: ({ row }) => (
          <span className="block text-right text-sm font-semibold">
            {formatCurrency(
              (row.original.totalWages ?? 0) +
                (row.original.totalMaterialCost ?? 0),
            )}
          </span>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        size: 110,
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(isSorted === "asc")}
            >
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              Created
              {isSorted === "asc" ? (
                <ChevronUp className="h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          );
        },
        cell: ({ row }) => (
          <span className="text-xs">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "actions",
        size: 80,
        header: () => <div className="text-center">Actions</div>,
        cell: ({ row }) => (
          <div className="text-center">
            <SiteRowActions
              site={row.original}
              onRequestPhoto={
                onRequestPhoto ? () => onRequestPhoto(row.original) : undefined
              }
              onMarkFinished={
                onMarkFinished ? () => onMarkFinished(row.original) : undefined
              }
            />
          </div>
        ),
      },
    ],
    [onRequestPhoto, onMarkFinished],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="border bg-card rounded overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="border-collapse">
          <TableHeader className="bg-muted/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.column.getSize(),
                      minWidth: header.column.id === "select" ? 48 : undefined,
                      maxWidth: header.column.id === "select" ? 48 : undefined,
                    }}
                    className={cn(
                      "border border-zinc-200 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700",
                      header.column.id === "select"
                        ? "px-3 py-2 text-center"
                        : "px-3 py-1",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.id === "select" ? 48 : undefined,
                        maxWidth: cell.column.id === "select" ? 48 : undefined,
                      }}
                      className={cn(
                        "border border-zinc-200 dark:border-zinc-700",
                        cell.column.id === "select"
                          ? "px-3 py-2 text-center"
                          : "px-3 py-1",
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/60">
        <div className="text-muted-foreground hidden text-sm lg:flex">
          Showing{" "}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}{" "}
          to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            data.length,
          )}{" "}
          of {data.length} sites
        </div>
        <div className="flex w-full items-center gap-4 lg:w-fit lg:gap-8">
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm font-medium">Rows per page</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
