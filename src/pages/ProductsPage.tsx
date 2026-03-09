import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Loader2,
  Plus,
  Power,
  Trash2,
  Package,
  Wallet,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type AdminProduct = {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
};

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(
    null,
  );
  const [toggleProduct, setToggleProduct] = useState<AdminProduct | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<AdminProduct | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadProducts = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("includeInactive", "true");
      if (query.trim()) params.set("q", query.trim());

      const url =
        API_BASE_URL + "/api/app/admin/products" + `?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        products?: AdminProduct[];
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg =
          json?.error ||
          json?.message ||
          `Failed to load products (${res.status})`;
        throw new Error(msg);
      }

      const list = Array.isArray(json?.products) ? json!.products! : [];
      setProducts(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load products";
      console.error("Failed to load products:", e);
      setProducts([]);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Live search: reload products as the search query changes
  useEffect(() => {
    if (!token) return;
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, token]);

  const handleSearch = () => {
    void loadProducts();
  };

  const handleClear = () => {
    setQuery("");
    void loadProducts();
  };

  const handleToggleActive = async () => {
    if (!token || !toggleProduct) return;
    setToggleLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/app/admin/products`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: toggleProduct.id,
          isActive: !toggleProduct.isActive,
        }),
      });
      if (res.ok) {
        setToggleProduct(null);
        void loadProducts();
      }
    } finally {
      setToggleLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!token || !deleteProduct) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/app/admin/products`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: deleteProduct.id }),
      });
      if (res.ok) {
        setDeleteProduct(null);
        void loadProducts();
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage products that can be used for product-based deductions and
            orders.
          </p>
        </div>
        <Button
          className="gap-2"
          size="lg"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-3 shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row items-end sm:justify-between">
          <div className="flex-1 w-full">
            <label
              htmlFor="product-search"
              className="block text-xs font-semibold text-foreground mb-2"
            >
              Search Products
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="product-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Search by product name..."
                  className="h-10 pl-9"
                />
              </div>
              <Button
                variant="default"
                className="h-10"
                onClick={handleSearch}
                disabled={loading}
              >
                Search
              </Button>
              <Button
                variant="outline"
                className="h-10"
                onClick={handleClear}
                disabled={loading && !query}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <ProductsTable
        data={products}
        onEdit={setEditingProduct}
        onToggle={setToggleProduct}
        onDelete={setDeleteProduct}
      />

      {/* Create Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              Create a new product that can be used for product-based
              deductions.
            </DialogDescription>
          </DialogHeader>
          <CreateProductForm
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              void loadProducts();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <EditProductDialog
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onUpdated={() => {
          setEditingProduct(null);
          void loadProducts();
        }}
      />

      {/* Toggle Active Confirmation */}
      <ConfirmationDialog
        open={!!toggleProduct}
        onOpenChange={(open) => !open && setToggleProduct(null)}
        title={
          toggleProduct?.isActive ? "Deactivate Product" : "Activate Product"
        }
        description={
          toggleProduct?.isActive
            ? `Are you sure you want to deactivate "${toggleProduct?.name}"? It will no longer be available for new deductions.`
            : `Are you sure you want to activate "${toggleProduct?.name}"?`
        }
        confirmLabel={toggleProduct?.isActive ? "Deactivate" : "Activate"}
        variant={toggleProduct?.isActive ? "destructive" : "default"}
        loading={toggleLoading}
        onConfirm={handleToggleActive}
      />

      {/* Delete Product Confirmation */}
      <ConfirmationDialog
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
        title="Delete Product"
        description={`Are you sure you want to permanently delete "${deleteProduct?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDeleteProduct}
      />
    </div>
  );
}

/* ─── Products Table ─── */

function StatusPill({ active }: { active: boolean }) {
  return (
    <div
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all ${
        active
          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-zinc-200/50 text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-400"
      }`}
    >
      <span className="mr-1.5">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            active
              ? "bg-emerald-500 dark:bg-emerald-400"
              : "bg-zinc-400 dark:bg-zinc-500"
          }`}
        />
      </span>
      {active ? "Active" : "Inactive"}
    </div>
  );
}

type ProductSortKey = "name" | "price" | "isActive";
type SortDir = "asc" | "desc";

function ProductsTable({
  data,
  onEdit,
  onToggle,
  onDelete,
}: {
  data: AdminProduct[];
  onEdit: (p: AdminProduct) => void;
  onToggle: (p: AdminProduct) => void;
  onDelete: (p: AdminProduct) => void;
}) {
  const [sortKey, setSortKey] = useState<ProductSortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPageIndex(0);
  }, [data]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "price") cmp = Number(a.price) - Number(b.price);
      else if (sortKey === "isActive")
        cmp = Number(a.isActive) - Number(b.isActive);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(
    () => sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [sorted, pageIndex, pageSize],
  );

  const toggleSort = (key: ProductSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPageIndex(0);
  };

  const SortIcon = ({ col }: { col: ProductSortKey }) =>
    sortKey === col ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    ) : (
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <div className="border bg-card rounded overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="border-collapse">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("name")}
                >
                  <Package className="h-4 w-4 text-sky-600" />
                  Name
                  <SortIcon col="name" />
                </button>
              </TableHead>
              <TableHead
                className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700"
                style={{ width: 130 }}
              >
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("price")}
                >
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  Price
                  <SortIcon col="price" />
                </button>
              </TableHead>
              <TableHead
                className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700"
                style={{ width: 110 }}
              >
                Status
              </TableHead>
              <TableHead
                className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700 text-center"
                style={{ width: 140 }}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((p) => (
                <TableRow
                  key={p.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                >
                  <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                    <span className="font-semibold">{p.name}</span>
                  </TableCell>
                  <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(p.price || "0"))}
                    </span>
                  </TableCell>
                  <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                    <StatusPill active={p.isActive} />
                  </TableCell>
                  <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(p)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={
                          p.isActive
                            ? "text-amber-600 hover:text-amber-700"
                            : "text-emerald-600 hover:text-emerald-700"
                        }
                        onClick={() => onToggle(p)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => onDelete(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
          products
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

/* ─── Create Product Form ─── */

function CreateProductForm({ onSuccess }: { onSuccess: () => void }) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPrice = price.trim();

    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    if (!trimmedPrice) {
      setError("Price is required");
      return;
    }

    const n = Number(trimmedPrice.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Price must be a positive number");
      return;
    }

    if (!token) {
      setError("You are not authenticated");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/api/app/admin/products`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmedName, price: trimmedPrice }),
      });

      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg =
          json?.error ||
          json?.message ||
          `Failed to create product (${res.status})`;
        throw new Error(msg);
      }

      setName("");
      setPrice("");
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create product";
      console.error("Failed to create product:", e);
      setError(msg);
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
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Safety boots"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Price</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 100.00"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

/* ─── Edit Product Dialog ─── */

type EditProductDialogProps = {
  product: AdminProduct | null;
  onClose: () => void;
  onUpdated: () => void;
};

function EditProductDialog({
  product,
  onClose,
  onUpdated,
}: EditProductDialogProps) {
  const { token } = useAuth();
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(product?.name ?? "");
    setPrice(product?.price ?? "");
    setError(null);
    setSubmitting(false);
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !token) return;

    const trimmedName = name.trim();
    const trimmedPrice = price.trim();

    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    if (!trimmedPrice) {
      setError("Price is required");
      return;
    }

    const n = Number(trimmedPrice.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Price must be a positive number");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/api/app/admin/products`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: product.id,
          name: trimmedName,
          price: trimmedPrice,
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg =
          json?.error ||
          json?.message ||
          `Failed to update product (${res.status})`;
        throw new Error(msg);
      }

      onUpdated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update product";
      console.error("Failed to update product:", e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the name or price of this product.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Price</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 100.00"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
