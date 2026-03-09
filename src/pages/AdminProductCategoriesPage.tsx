import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  X,
  RotateCw,
  FolderTree,
  Pencil,
  Trash2,
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
  DialogFooter,
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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type Category = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

/* ─── Sortable Categories Table ─── */
type CatSortKey = "name" | "code" | "status";
type CatSortDir = "asc" | "desc";

const catH =
  "border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700";
const catC = "border border-zinc-200 px-3 py-1 dark:border-zinc-700";

function CategoriesTable({
  data,
  loading,
  onEdit,
  onDelete,
}: {
  data: Category[];
  loading: boolean;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const [sortKey, setSortKey] = useState<CatSortKey>("name");
  const [sortDir, setSortDir] = useState<CatSortDir>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const toggle = (k: CatSortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sortIcon = (k: CatSortKey) =>
    sortKey !== k ? (
      <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    ) : sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "code")
        cmp = (a.code ?? "").localeCompare(b.code ?? "");
      else cmp = Number(a.isActive) - Number(b.isActive);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );
  const from = sorted.length === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(safePage * pageSize + pageSize, sorted.length);

  return (
    <div className="border bg-card rounded overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="border-collapse">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className={catH}>
                <button
                  className="inline-flex items-center"
                  onClick={() => toggle("name")}
                >
                  <FolderTree className="mr-1 h-3 w-3" /> Name{" "}
                  {sortIcon("name")}
                </button>
              </TableHead>
              <TableHead className={catH}>
                <button
                  className="inline-flex items-center"
                  onClick={() => toggle("code")}
                >
                  Code {sortIcon("code")}
                </button>
              </TableHead>
              <TableHead className={catH}>
                <button
                  className="inline-flex items-center"
                  onClick={() => toggle("status")}
                >
                  Status {sortIcon("status")}
                </button>
              </TableHead>
              <TableHead className={`${catH} text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  <FolderTree className="mx-auto h-8 w-8 mb-2 opacity-40" /> No
                  categories found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((c) => (
                <TableRow
                  key={c.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                >
                  <TableCell className={catC}>{c.name}</TableCell>
                  <TableCell className={catC}>{c.code || "—"}</TableCell>
                  <TableCell className={catC}>
                    {c.isActive ? "Active" : "Inactive"}
                  </TableCell>
                  <TableCell className={`${catC} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => onDelete(c)}
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

      {sorted.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t px-4 py-3 bg-muted/60 text-sm">
          <span className="text-muted-foreground">
            Showing <b>{from}</b> to <b>{to}</b> of <b>{sorted.length}</b>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((n) => (
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
                disabled={safePage === 0}
                onClick={() => setPage(0)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(totalPages - 1)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProductCategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (showInactive) params.set("includeInactive", "true");

      const url = `${API_BASE_URL}/api/app/admin/product-categories?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json().catch(() => null)) as {
        data?: Category[];
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to load categories";
        throw new Error(msg);
      }

      setCategories(Array.isArray(json?.data) ? json!.data! : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load categories";
      console.error("Failed to load categories:", e);
      setCategories([]);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Live search: reload categories as the search text changes
  useEffect(() => {
    if (!token) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, token]);

  const handleSearch = () => {
    void load();
  };

  const handleClear = () => {
    setSearch("");
    void load();
  };

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "" });
    setDialogOpen(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({ name: c.name, code: c.code ?? "" });
    setDialogOpen(true);
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
        ? `${API_BASE_URL}/api/app/admin/product-categories/${editing.id}`
        : `${API_BASE_URL}/api/app/admin/product-categories`;
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
          code: form.code.trim() || null,
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to save category";
        throw new Error(msg);
      }

      setDialogOpen(false);
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save category";
      console.error("Failed to save category:", e);
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
        `${API_BASE_URL}/api/app/admin/product-categories/${deleteTarget.id}`,
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
      console.error("Failed to delete category:", e);
      setError(msg);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Product Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organise procurement products into categories.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="pl-9"
          />
          {search && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowInactive(!showInactive);
            void load();
          }}
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

      <CategoriesTable
        data={categories}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the category details."
                : "Add a new product category."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Code</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Short code (optional)"
              />
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
        title="Delete Category"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : "Are you sure you want to delete this category?"
        }
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
