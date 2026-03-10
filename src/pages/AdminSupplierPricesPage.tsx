import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  RotateCw,
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

type SupplierPrice = {
  id: string;
  supplierId: string;
  productId: string;
  uom: string | null;
  unitSize: number | null;
  price: number;
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
  supplier: { id: string; name: string };
  product: {
    id: string;
    name: string;
    uom: string | null;
    unitSize: number | null;
  };
};

type LookupItem = { id: string; name: string; sku?: string | null };

type UomOption = { value: string; label: string; group: string };

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(n);
}

const UOM_LABELS: Record<string, string> = {
  MM: "mm",
  CM: "cm",
  M: "m",
  M2: "m²",
  M3: "m³",
  G: "g",
  KG: "kg",
  TON: "ton",
  ML: "ml",
  L: "L",
  UNIT: "unit",
  PIECE: "piece",
  PACK: "pack",
  BOX: "box",
  BAG: "bag",
  BUCKET: "bucket",
  DRUM: "drum",
  CAN: "can",
  BOTTLE: "bottle",
  TUBE: "tube",
  BAR: "bar",
  ROLL: "roll",
  SHEET: "sheet",
  BUNDLE: "bundle",
  PALLET: "pallet",
  HOUR: "hour",
  DAY: "day",
};

function uomLabel(uom: string) {
  return UOM_LABELS[uom] ?? uom;
}

/* ─── Sortable Supplier Prices Table ─── */
type SPSortKey = "supplier" | "product" | "price";
type SPSortDir = "asc" | "desc";

function SupplierPricesTable({
  data,
  loading,
  onEdit,
  onDelete,
}: {
  data: SupplierPrice[];
  loading: boolean;
  onEdit: (p: SupplierPrice) => void;
  onDelete: (p: SupplierPrice) => void;
}) {
  const [sortKey, setSortKey] = useState<SPSortKey>("supplier");
  const [sortDir, setSortDir] = useState<SPSortDir>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const toggle = (k: SPSortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sortIcon = (k: SPSortKey) =>
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
      if (sortKey === "supplier")
        cmp = a.supplier.name.localeCompare(b.supplier.name);
      else if (sortKey === "product")
        cmp = a.product.name.localeCompare(b.product.name);
      else if (sortKey === "price") cmp = a.price - b.price;
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
    <div className="rounded border mt-2">
      <div className="overflow-x-auto">
        <Table className="[&_th]:border-x [&_td]:border-x">
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>
                <button
                  className="inline-flex items-center"
                  onClick={() => toggle("product")}
                >
                  Product {sortIcon("product")}
                </button>
              </TableHead>
              <TableHead>Size</TableHead>
              <TableHead>
                <button
                  className="inline-flex items-center"
                  onClick={() => toggle("supplier")}
                >
                  Supplier {sortIcon("supplier")}
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  className="inline-flex items-center ml-auto"
                  onClick={() => toggle("price")}
                >
                  Price {sortIcon("price")}
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No prices found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">
                    {(p.product as any).sku ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.product.name}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {p.uom ? `${p.unitSize ?? ""}${uomLabel(p.uom)}` : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{p.supplier.name}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
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

export default function AdminSupplierPricesPage() {
  const { token } = useAuth();
  const [prices, setPrices] = useState<SupplierPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [products, setProducts] = useState<LookupItem[]>([]);
  const [suppliers, setSuppliers] = useState<LookupItem[]>([]);
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierPrice | null>(null);
  const [form, setForm] = useState({
    supplierId: "",
    productId: "",
    uom: "",
    unitSize: "",
    price: "",
    startsOn: "",
    endsOn: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SupplierPrice | null>(null);
  const [filterProductSearch, setFilterProductSearch] = useState("");
  const [dialogProductSearch, setDialogProductSearch] = useState("");

  // Lookups
  useEffect(() => {
    if (!token) return;
    async function loadLookups() {
      try {
        const [pRes, sRes, uomRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/api/app/admin/procurement-products?includeInactive=true&limit=500&page=1`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
          ),
          fetch(
            `${API_BASE_URL}/api/app/admin/suppliers?includeInactive=false&limit=500&page=1`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
          ),
          fetch(`${API_BASE_URL}/api/app/admin/product-uoms`, {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);
        const [pJson, sJson, uomJson] = await Promise.all([
          pRes.json().catch(() => null),
          sRes.json().catch(() => null),
          uomRes.json().catch(() => null),
        ]);
        if (pRes.ok && pJson)
          setProducts(
            Array.isArray(pJson.data)
              ? pJson.data.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  sku: p.sku ?? null,
                }))
              : [],
          );
        if (sRes.ok && sJson)
          setSuppliers(
            Array.isArray(sJson.data)
              ? sJson.data.map((s: any) => ({ id: s.id, name: s.name }))
              : [],
          );
        if (uomRes.ok && uomJson)
          setUomOptions(Array.isArray(uomJson.data) ? uomJson.data : []);
      } catch (e) {
        console.error("Failed to load supplier price lookups", e);
      }
    }
    void loadLookups();
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProduct) params.set("productId", filterProduct);
      if (filterSupplier) params.set("supplierId", filterSupplier);
      if (showInactive) params.set("includeInactive", "true");

      const url = `${API_BASE_URL}/api/app/admin/supplier-prices?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json().catch(() => null)) as {
        data?: SupplierPrice[];
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to load prices";
        throw new Error(msg);
      }

      setPrices(Array.isArray(json?.data) ? json!.data! : []);
    } catch (e) {
      console.error("Failed to load supplier prices:", e);
      setPrices([]);
    } finally {
      setLoading(false);
    }
  }, [token, filterProduct, filterSupplier, showInactive]);

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token, load]);

  function openCreate() {
    setEditing(null);
    setForm({
      supplierId: "",
      productId: "",
      uom: "",
      unitSize: "",
      price: "",
      startsOn: "",
      endsOn: "",
    });
    setDialogOpen(true);
  }

  function openEdit(p: SupplierPrice) {
    setEditing(p);
    setForm({
      supplierId: p.supplierId,
      productId: p.productId,
      uom: p.uom ?? "",
      unitSize: p.unitSize != null ? String(p.unitSize) : "",
      price: String(p.price),
      startsOn: p.startsOn ? p.startsOn.slice(0, 10) : "",
      endsOn: p.endsOn ? p.endsOn.slice(0, 10) : "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!token) return;
    if (!form.supplierId) return;
    if (!form.productId) return;

    const priceNum = Number(form.price);
    if (!form.price || !Number.isFinite(priceNum) || priceNum < 0) return;

    setSubmitting(true);
    try {
      const url = editing
        ? `${API_BASE_URL}/api/app/admin/supplier-prices/${editing.id}`
        : `${API_BASE_URL}/api/app/admin/supplier-prices`;
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierId: form.supplierId,
          productId: form.productId,
          uom: form.uom || null,
          unitSize: form.unitSize ? Number(form.unitSize) : null,
          price: priceNum,
          startsOn: form.startsOn || null,
          endsOn: form.endsOn || null,
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to save price";
        throw new Error(msg);
      }

      setDialogOpen(false);
      void load();
    } catch (e) {
      console.error("Failed to save supplier price:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/supplier-prices/${deleteTarget.id}`,
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
      console.error("Failed to delete supplier price:", e);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Supplier Prices</h1>
          <p className="text-sm text-muted-foreground">
            Maintain negotiated material prices per supplier.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Add Price
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterProduct}
          onValueChange={(v) => setFilterProduct(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1.5">
              <Input
                placeholder="Search products..."
                value={filterProductSearch}
                onChange={(e) => setFilterProductSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-8 text-xs"
              />
            </div>
            <SelectItem value="all">All products</SelectItem>
            {products
              .filter((p) => {
                const term = filterProductSearch.trim().toLowerCase();
                if (!term) return true;
                return (
                  p.name.toLowerCase().includes(term) ||
                  (p.sku?.toLowerCase().includes(term) ?? false)
                );
              })
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.sku ? `${p.name} (${p.sku})` : p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select
          value={filterSupplier}
          onValueChange={(v) => setFilterSupplier(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[220px]">
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

      <SupplierPricesTable
        data={prices}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Supplier Price" : "Add Supplier Price"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the supplier price details."
                : "Record a negotiated supplier price for a product."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Supplier *</label>
                <Select
                  value={form.supplierId}
                  onValueChange={(v) => setForm({ ...form, supplierId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Product *</label>
                <Select
                  value={form.productId}
                  onValueChange={(v) => setForm({ ...form, productId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5">
                      <Input
                        placeholder="Search products..."
                        value={dialogProductSearch}
                        onChange={(e) => setDialogProductSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-8 text-xs"
                      />
                    </div>
                    {products
                      .filter((p) => {
                        const term = dialogProductSearch.trim().toLowerCase();
                        if (!term) return true;
                        return (
                          p.name.toLowerCase().includes(term) ||
                          (p.sku?.toLowerCase().includes(term) ?? false)
                        );
                      })
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.sku ? `${p.name} (${p.sku})` : p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">UOM</label>
                <Select
                  value={form.uom}
                  onValueChange={(v) => setForm({ ...form, uom: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {uomOptions.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Unit Size</label>
                <Input
                  value={form.unitSize}
                  onChange={(e) =>
                    setForm({ ...form, unitSize: e.target.value })
                  }
                  placeholder="e.g. 1, 25, 100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Price *</label>
                <Input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 123.45"
                />
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
        title="Delete Supplier Price"
        description="Are you sure you want to delete this supplier price? This cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
