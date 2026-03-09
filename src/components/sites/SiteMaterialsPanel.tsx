import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Plus,
  Trash2,
  Search,
  Loader2,
  ClipboardList,
  X,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

type AvailableProduct = {
  id: string;
  name: string;
  sku: string | null;
  uom: string | null;
  unitSize: number | null;
  category: { id: string; name: string } | null;
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function SiteMaterialsPanel({ siteId }: { siteId: string }) {
  const { token } = useAuth();
  const [materials, setMaterials] = useState<SiteMaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${siteId}/materials`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch (err) {
      console.error("Failed to load site materials:", err);
    } finally {
      setLoading(false);
    }
  }, [siteId, token]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---- Remove ---- */
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  async function handleRemove() {
    if (!confirmRemove || !token) return;
    setRemoving(confirmRemove);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${siteId}/materials`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ materialId: confirmRemove }),
        },
      );
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== confirmRemove));
      }
    } catch (err) {
      console.error("Failed to remove material:", err);
    } finally {
      setRemoving(null);
      setConfirmRemove(null);
    }
  }

  /* ---- Inline editing ---- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(m: SiteMaterialRow) {
    setEditingId(m.id);
    setEditQty(m.quantity != null ? String(m.quantity) : "");
  }

  async function saveEdit() {
    if (!editingId || !token) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${siteId}/materials`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            materialId: editingId,
            quantity: editQty ? parseInt(editQty, 10) : null,
          }),
        },
      );
      if (res.ok) {
        await load();
      }
    } catch (err) {
      console.error("Failed to update material:", err);
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  }

  return (
    <div className="rounded border border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Site Materials
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Products expected to be used on this job
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Materials
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : materials.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No materials assigned to this site yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="border-collapse [&_th]:border [&_th]:border-slate-200 [&_th]:dark:border-slate-700 [&_td]:border [&_td]:border-slate-200 [&_td]:dark:border-slate-700">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
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
                      <span className="text-slate-400">{"\u2014"}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {m.product.sku || "\u2014"}
                  </TableCell>

                  {/* Quantity */}
                  <TableCell>
                    {editingId === m.id ? (
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-20"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => startEdit(m)}
                      >
                        {m.quantity ?? "\u2014"}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {editingId === m.id ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={saveEdit}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => setConfirmRemove(m.id)}
                          disabled={removing === m.id}
                        >
                          {removing === m.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add materials dialog */}
      <AddMaterialsDialog
        siteId={siteId}
        open={addOpen}
        onOpenChange={setAddOpen}
        existingProductIds={materials.map((m) => m.productId)}
        onAdded={load}
      />

      {/* Confirm remove */}
      <ConfirmationDialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
        title="Remove Material"
        description="Are you sure you want to remove this material from the site?"
        onConfirm={handleRemove}
        loading={!!removing}
        confirmLabel="Remove"
        variant="destructive"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Materials Dialog                                               */
/* ------------------------------------------------------------------ */

function AddMaterialsDialog({
  siteId,
  open,
  onOpenChange,
  existingProductIds,
  onAdded,
}: {
  siteId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingProductIds: string[];
  onAdded: () => void;
}) {
  const { token } = useAuth();
  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Load available products
  const loadProducts = useCallback(
    async (q: string) => {
      if (!token) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        const res = await fetch(
          `${API_BASE_URL}/api/app/admin/procurement-products?${params}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (open) {
      loadProducts("");
      setSelected(new Set());
      setSearch("");
    }
  }, [open, loadProducts]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => loadProducts(search), 300);
    return () => clearTimeout(timer);
  }, [search, open, loadProducts]);

  const existingSet = new Set(existingProductIds);

  function toggleProduct(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0 || !token) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${siteId}/materials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productIds: Array.from(selected) }),
        },
      );
      if (res.ok) {
        onAdded();
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Failed to add materials:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Materials to Site</DialogTitle>
          <DialogDescription>
            Select the products that will be used on this job site.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-100 border rounded">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No products found.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((p) => {
                const alreadyAdded = existingSet.has(p.id);
                const isSelected = selected.has(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${alreadyAdded ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 accent-primary"
                      checked={isSelected}
                      disabled={alreadyAdded}
                      onChange={() => toggleProduct(p.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {p.name}
                        </span>
                        {alreadyAdded && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px]"
                          >
                            Added
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                        {p.category && <span>{p.category.name}</span>}
                        {p.sku && <span className="font-mono">{p.sku}</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selected.size === 0 || submitting}
          >
            {submitting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Add {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
