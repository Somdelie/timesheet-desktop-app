import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  X,
  RotateCw,
  Package,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type ProcurementProduct = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  category: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  _count?: { orderItems: number; supplierPrices: number };
};

type Category = { id: string; name: string };

type Supplier = { id: string; name: string };

export default function AdminProcurementProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<ProcurementProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterSupplier, setFilterSupplier] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProcurementProduct | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    categoryId: "",
    supplierId: "",
    thumbnailUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<ProcurementProduct | null>(
    null,
  );

  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"name" | "category" | "supplier">(
    "name",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Load lookup data
  useEffect(() => {
    if (!token) return;
    async function loadLookups() {
      try {
        const [catRes, supRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/app/admin/product-categories`, {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(
            `${API_BASE_URL}/api/app/admin/suppliers?includeInactive=false`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
          ),
        ]);
        const [catJson, supJson] = await Promise.all([
          catRes.json().catch(() => null),
          supRes.json().catch(() => null),
        ]);
        if (catRes.ok && catJson)
          setCategories(Array.isArray(catJson.data) ? catJson.data : []);
        if (supRes.ok && supJson)
          setSuppliers(Array.isArray(supJson.data) ? supJson.data : []);
      } catch (e) {
        console.error("Failed to load procurement lookups", e);
      }
    }
    void loadLookups();
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (showInactive) params.set("includeInactive", "true");
      if (filterCategory) params.set("categoryId", filterCategory);
      if (filterSupplier) params.set("supplierId", filterSupplier);
      // Fetch up to 500 products once; paginate on the client only
      params.set("limit", "500");
      params.set("page", "1");

      const url = `${API_BASE_URL}/api/app/admin/procurement-products?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json().catch(() => null)) as {
        data?: ProcurementProduct[];
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to load products";
        throw new Error(msg);
      }

      setProducts(Array.isArray(json?.data) ? json!.data! : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load products";
      console.error("Failed to load procurement products:", e);
      setProducts([]);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, showInactive, filterCategory, filterSupplier]);

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token, load]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const name = p.name.toLowerCase();
      const sku = p.sku ? p.sku.toLowerCase() : "";
      return name.includes(term) || sku.includes(term);
    });
  }, [products, search]);

  useEffect(() => {
    setPage(1);
  }, [search, showInactive, filterCategory, filterSupplier, products.length]);

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sortIcon = (k: typeof sortKey) =>
    sortKey !== k ? (
      <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    ) : sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );

  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "category")
        cmp = (a.category?.name ?? "").localeCompare(b.category?.name ?? "");
      else cmp = (a.supplier?.name ?? "").localeCompare(b.supplier?.name ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredProducts, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const paginatedProducts = useMemo(
    () => sortedProducts.slice((page - 1) * pageSize, page * pageSize),
    [sortedProducts, page, pageSize],
  );

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      supplierId: "",
      thumbnailUrl: "",
    });
    setDialogOpen(true);
  }

  function openEdit(p: ProcurementProduct) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      description: p.description ?? "",
      categoryId: p.category?.id ?? "",
      supplierId: p.supplier?.id ?? "",
      thumbnailUrl: p.thumbnailUrl ?? "",
    });
    setDialogOpen(true);
  }

  async function handleThumbnailUpload(file: File) {
    if (!file || !token) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "procurement-products");

      const res = await fetch(`${API_BASE_URL}/api/uploads/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Upload failed");

      const url = String(payload.url ?? "");
      if (!url) throw new Error("Upload did not return a URL.");

      setForm((f) => ({ ...f, thumbnailUrl: url }));
    } catch (err: any) {
      setError(err?.message || "Failed to upload thumbnail");
    } finally {
      setUploading(false);
    }
  }

  function handleThumbnailFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleThumbnailUpload(file);
    e.target.value = "";
  }

  function handleThumbnailDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }

  function handleThumbnailDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleThumbnailUpload(file);
    else setError("Please drop an image file");
  }

  async function handleSubmit() {
    if (!token) return;
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const url = editing
        ? `${API_BASE_URL}/api/app/admin/procurement-products/${editing.id}`
        : `${API_BASE_URL}/api/app/admin/procurement-products`;
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          description: form.description.trim() || null,
          categoryId: form.categoryId || null,
          supplierId: form.supplierId || null,
          thumbnailUrl: form.thumbnailUrl || null,
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to save product";
        throw new Error(msg);
      }

      setDialogOpen(false);
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save product";
      console.error("Failed to save procurement product:", e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/procurement-products/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to delete";
        throw new Error(msg);
      }

      setDeleteTarget(null);
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      console.error("Failed to delete procurement product:", e);
      setError(msg);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Materials</h1>
          <p className="text-sm text-muted-foreground">
            Manage procurement materials that can be ordered from suppliers.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Add Material
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select
          value={filterCategory}
          onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterSupplier}
          onValueChange={(v) => setFilterSupplier(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "Hide Inactive" : "Show Inactive"}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => void load()}>
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <div className="border bg-card rounded overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700 w-[50px]">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  SKU
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  <button
                    className="inline-flex items-center"
                    onClick={() => toggleSort("name")}
                  >
                    <Package className="mr-1 h-3 w-3" /> Material{" "}
                    {sortIcon("name")}
                  </button>
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  <button
                    className="inline-flex items-center"
                    onClick={() => toggleSort("category")}
                  >
                    Category {sortIcon("category")}
                  </button>
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  <button
                    className="inline-flex items-center"
                    onClick={() => toggleSort("supplier")}
                  >
                    Supplier {sortIcon("supplier")}
                  </button>
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <Package className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    No materials found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  >
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 w-[50px]">
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt={p.name}
                          className="h-9 w-9 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                      {p.sku ?? "—"}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 align-top dark:border-zinc-700">
                      <div className="font-medium">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-muted-foreground">
                          {p.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                      {p.category?.name ?? "—"}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                      {p.supplier?.name ?? "—"}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 text-right dark:border-zinc-700">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteTarget(p)}
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

        {sortedProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t px-4 py-3 bg-muted/60 text-sm">
            <span className="text-muted-foreground">
              Showing{" "}
              <b>
                {sortedProducts.length === 0 ? 0 : (page - 1) * pageSize + 1}
              </b>{" "}
              to <b>{Math.min(page * pageSize, sortedProducts.length)}</b> of{" "}
              <b>{sortedProducts.length}</b>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Rows</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Material" : "Add Material"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the material details."
                : "Add a new procurement material."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Thumbnail upload */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Thumbnail</label>
              {form.thumbnailUrl ? (
                <div className="relative">
                  <div className="rounded border-2 border-dashed border-green-500 bg-green-50/30 p-3 dark:bg-green-950/20">
                    <div className="flex items-end gap-3">
                      <img
                        src={form.thumbnailUrl}
                        alt="Thumbnail"
                        className="h-20 w-20 rounded object-cover shadow-sm"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          ✓ Image uploaded
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, thumbnailUrl: "" })}
                        className="rounded bg-card p-1.5 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/30 transition"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragEnter={handleThumbnailDrag}
                  onDragLeave={handleThumbnailDrag}
                  onDragOver={handleThumbnailDrag}
                  onDrop={handleThumbnailDrop}
                  className={`relative rounded border-2 border-dashed transition-colors p-4 text-center cursor-pointer ${
                    dragActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-border bg-muted hover:border-blue-400 dark:hover:border-blue-400"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailFileChange}
                    disabled={uploading}
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-950/50">
                      <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-medium">
                      {uploading
                        ? "Uploading..."
                        : "Click to upload or drag image"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Material name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">SKU</label>
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="Stock keeping unit (optional)"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Short description (optional)"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={form.categoryId || "NONE"}
                  onValueChange={(v) =>
                    setForm({ ...form, categoryId: v === "NONE" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Preferred Supplier
                </label>
                <Select
                  value={form.supplierId || "NONE"}
                  onValueChange={(v) =>
                    setForm({ ...form, supplierId: v === "NONE" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No preferred supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No preferred supplier</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Material"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : "Are you sure you want to delete this material?"
        }
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
