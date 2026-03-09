import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  DollarSign,
  Package,
  User,
  Briefcase,
  Hash,
  Wallet,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/formatCurrency";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type Deduction = {
  id: string;
  type: "CASH" | "PRODUCT";
  applyTo: "CURRENT" | "NEXT";
  employee: { id: string; name: string };
  foreman: { id: string; name: string };
  product: { id: string; name: string; price: string } | null;
  quantity: number | null;
  amount: string;
  note: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
};

type Employee = { id: string; name: string };
type Foreman = { id: string; name: string };
type Product = { id: string; name: string; price: string };

export default function DeductionsPage() {
  const { token } = useAuth();
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterApplyTo, setFilterApplyTo] = useState<string>("all");

  const loadDeductions = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterApplyTo !== "all") params.set("applyTo", filterApplyTo);

      const url =
        API_BASE_URL +
        "/api/app/admin/deductions" +
        (params.toString() ? `?${params}` : "");
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load deductions");
      setDeductions(json?.deductions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load deductions");
      setDeductions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadDeductions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filterType, filterApplyTo]);

  const handleDelete = async () => {
    if (!token || !deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/deductions/${deleteId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        setDeleteId(null);
        loadDeductions();
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && deductions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading deductions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deductions</h1>
          <p className="text-sm text-muted-foreground">
            Manage cash and product deductions for employees.
          </p>
        </div>
        <Button
          className="gap-2"
          size="lg"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Deduction
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="w-44">
            <label className="block text-xs font-semibold text-foreground mb-1">
              Type
            </label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="PRODUCT">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <label className="block text-xs font-semibold text-foreground mb-1">
              Apply To
            </label>
            <Select value={filterApplyTo} onValueChange={setFilterApplyTo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="CURRENT">Current Fortnight</SelectItem>
                <SelectItem value="NEXT">Next Fortnight</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <DeductionsTable data={deductions} onDelete={setDeleteId} />

      {/* Create Deduction Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Deduction</DialogTitle>
            <DialogDescription>
              Create a cash or product deduction for an employee.
            </DialogDescription>
          </DialogHeader>
          <CreateDeductionForm
            onSuccess={() => {
              setIsCreateOpen(false);
              loadDeductions();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Deduction"
        description="Are you sure you want to delete this deduction? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ─── Deductions Table ─── */

function DeductionsTable({
  data,
  onDelete,
}: {
  data: Deduction[];
  onDelete: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<string>("employee");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPageIndex(0);
  }, [data]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "employee")
        cmp = a.employee.name.localeCompare(b.employee.name);
      else if (sortKey === "foreman")
        cmp = a.foreman.name.localeCompare(b.foreman.name);
      else if (sortKey === "amount") cmp = Number(a.amount) - Number(b.amount);
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(
    () => sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [sorted, pageIndex, pageSize],
  );

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPageIndex(0);
  };

  const SI = ({ col }: { col: string }) =>
    sortKey === col ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    ) : (
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
    );

  const hCls =
    "border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700";
  const cCls = "border border-zinc-200 px-3 py-1 dark:border-zinc-700";

  return (
    <div className="border bg-card rounded overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="border-collapse">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className={hCls}>
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("employee")}
                >
                  <User className="h-4 w-4 text-sky-600" /> Employee{" "}
                  <SI col="employee" />
                </button>
              </TableHead>
              <TableHead className={hCls}>
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("foreman")}
                >
                  <Briefcase className="h-4 w-4 text-violet-600" /> Foreman{" "}
                  <SI col="foreman" />
                </button>
              </TableHead>
              <TableHead className={hCls} style={{ width: 110 }}>
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("type")}
                >
                  <Hash className="h-4 w-4 text-indigo-600" /> Type{" "}
                  <SI col="type" />
                </button>
              </TableHead>
              <TableHead className={hCls}>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" /> Product
                </div>
              </TableHead>
              <TableHead className={hCls} style={{ width: 80 }}>
                Qty
              </TableHead>
              <TableHead className={hCls} style={{ width: 120 }}>
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("amount")}
                >
                  <Wallet className="h-4 w-4 text-emerald-600" /> Amount{" "}
                  <SI col="amount" />
                </button>
              </TableHead>
              <TableHead className={hCls} style={{ width: 110 }}>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-orange-600" /> Apply To
                </div>
              </TableHead>
              <TableHead
                className={`${hCls} text-center`}
                style={{ width: 80 }}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No deductions found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((d) => (
                <TableRow
                  key={d.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                >
                  <TableCell className={`${cCls} font-semibold`}>
                    {d.employee.name}
                  </TableCell>
                  <TableCell className={cCls}>
                    <span className="text-sm">{d.foreman.name}</span>
                  </TableCell>
                  <TableCell className={cCls}>
                    {d.type === "CASH" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <DollarSign className="h-3 w-3" /> Cash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        <Package className="h-3 w-3" /> Product
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={cCls}>
                    <span className="text-sm">{d.product?.name || "—"}</span>
                  </TableCell>
                  <TableCell className={cCls}>
                    <span className="text-sm">{d.quantity ?? "—"}</span>
                  </TableCell>
                  <TableCell className={`${cCls} font-mono`}>
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(d.amount || "0"))}
                    </span>
                  </TableCell>
                  <TableCell className={cCls}>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${d.applyTo === "CURRENT" ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"}`}
                    >
                      {d.applyTo === "CURRENT" ? "Current" : "Next"}
                    </span>
                  </TableCell>
                  <TableCell className={`${cCls} text-center`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => onDelete(d.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/60">
        <div className="text-muted-foreground hidden text-sm lg:flex">
          Showing {data.length === 0 ? 0 : pageIndex * pageSize + 1} to{" "}
          {Math.min((pageIndex + 1) * pageSize, data.length)} of {data.length}{" "}
          deductions
        </div>
        <div className="flex w-full items-center gap-4 lg:w-fit lg:gap-8">
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm font-medium">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 25, 50, 100].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {pageIndex + 1} of {totalPages}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => setPageIndex(0)}
              disabled={pageIndex === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setPageIndex((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={pageIndex >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => setPageIndex(totalPages - 1)}
              disabled={pageIndex >= totalPages - 1}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Create Deduction Form ─── */

function CreateDeductionForm({ onSuccess }: { onSuccess: () => void }) {
  const { token } = useAuth();
  const [type, setType] = useState<"CASH" | "PRODUCT">("CASH");
  const [applyTo, setApplyTo] = useState<"CURRENT" | "NEXT">("CURRENT");
  const [employeeId, setEmployeeId] = useState("");
  const [foremanId, setForemanId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Options
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [foremen, setForemen] = useState<Foreman[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!token) return;
    // Load employees
    fetch(`${API_BASE_URL}/api/employees`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees || d || []))
      .catch(() => {});

    // Load foremen
    fetch(`${API_BASE_URL}/api/app/admin/users?role=FOREMAN`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setForemen(d.users || []))
      .catch(() => {});

    // Load products
    fetch(`${API_BASE_URL}/api/app/admin/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {});
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!employeeId) {
      setError("Employee is required");
      return;
    }
    if (!foremanId) {
      setError("Foreman is required");
      return;
    }
    if (type === "CASH" && !amount) {
      setError("Amount is required for cash deductions");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        employeeId,
        foremanId,
        type,
        applyTo,
        note: note.trim() || undefined,
      };

      if (type === "CASH") {
        body.amount = amount;
      } else {
        if (productId) body.productId = productId;
        if (quantity) body.quantity = parseInt(quantity, 10);
        if (amount) body.amount = amount;
      }

      const res = await fetch(`${API_BASE_URL}/api/app/admin/deductions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Failed to create deduction");
      }

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create deduction",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as "CASH" | "PRODUCT")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="PRODUCT">Product</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Apply To</Label>
          <Select
            value={applyTo}
            onValueChange={(v) => setApplyTo(v as "CURRENT" | "NEXT")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CURRENT">Current Fortnight</SelectItem>
              <SelectItem value="NEXT">Next Fortnight</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Employee</Label>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger>
            <SelectValue placeholder="Select an employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Foreman</Label>
        <Select value={foremanId} onValueChange={setForemanId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a foreman" />
          </SelectTrigger>
          <SelectContent>
            {foremen.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === "PRODUCT" && (
        <>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(Number(p.price || "0"))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>{type === "CASH" ? "Amount (R)" : "Amount Override (R)"}</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={type === "CASH" ? "e.g. 200.00" : "Optional override"}
        />
      </div>

      <div className="space-y-2">
        <Label>Note (optional)</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason or description"
          maxLength={2000}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            "Create Deduction"
          )}
        </Button>
      </div>
    </form>
  );
}
