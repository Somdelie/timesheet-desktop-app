import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  RotateCw,
  DollarSign,
  Pencil,
  Check,
  X,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/formatCurrency";

/* ─── Constants ─── */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

/* ─── Types ─── */

type OvertimePrice = {
  id: string;
  label: string;
  rate: number;
  isActive: boolean;
  createdAt: string;
};

/* ─── Component ─── */

export default function AdminOvertimePricesPage() {
  const { token } = useAuth();

  const [prices, setPrices] = useState<OvertimePrice[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newLabel, setNewLabel] = useState("");
  const [newRate, setNewRate] = useState("");
  const [creating, setCreating] = useState(false);

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editRate, setEditRate] = useState("");

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── Auth headers ── */
  function headers(json = false) {
    const h: Record<string, string> = {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (json) h["content-type"] = "application/json";
    return h;
  }

  /* ── Load ── */
  const loadPrices = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/overtime-prices?includeInactive=true`,
        { headers: headers() },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setPrices(json?.data ?? []);
    } catch {
      setPrices([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  /* ── Create ── */
  async function handleCreate() {
    if (!newLabel.trim() || !newRate || isNaN(Number(newRate))) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/app/admin/overtime-prices`, {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({ label: newLabel.trim(), rate: Number(newRate) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      setNewLabel("");
      setNewRate("");
      loadPrices();
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  }

  /* ── Save edit ── */
  async function handleSaveEdit() {
    if (!editId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/overtime-prices/${editId}`,
        {
          method: "PUT",
          headers: headers(true),
          body: JSON.stringify({
            label: editLabel.trim(),
            rate: Number(editRate),
          }),
        },
      );
      if (!res.ok) throw new Error("Failed");
      setEditId(null);
      loadPrices();
    } catch {
      /* ignore */
    }
  }

  /* ── Toggle active ── */
  async function toggleActive(id: string, current: boolean) {
    try {
      await fetch(`${API_BASE_URL}/api/app/admin/overtime-prices/${id}`, {
        method: "PUT",
        headers: headers(true),
        body: JSON.stringify({ isActive: !current }),
      });
      loadPrices();
    } catch {
      /* ignore */
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!deleteId) return;
    try {
      await fetch(`${API_BASE_URL}/api/app/admin/overtime-prices/${deleteId}`, {
        method: "DELETE",
        headers: headers(),
      });
      setDeleteId(null);
      loadPrices();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overtime Prices</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage hourly overtime rates used when creating overtime entries.
        </p>
      </div>

      {/* Create form */}
      <div className="border rounded bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Add New Price</h3>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Label
            </label>
            <Input
              placeholder="e.g. Weekend OT, Night OT"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <div className="w-40">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Rate (R/hr)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Creating..." : "Add Price"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border bg-card rounded overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium">
            {prices.length} overtime price{prices.length !== 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="sm" onClick={loadPrices}>
            <RotateCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : prices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <DollarSign className="mx-auto h-10 w-10 mb-2 opacity-30" />
            No overtime prices yet. Add one above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Rate (R/hr)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {editId === p.id ? (
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-8 w-full max-w-[200px]"
                      />
                    ) : (
                      <span className="font-medium">{p.label}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editId === p.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        className="h-8 w-28 ml-auto"
                      />
                    ) : (
                      formatCurrency(p.rate)
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.isActive ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive(p.id, p.isActive)}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editId === p.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSaveEdit}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditId(p.id);
                            setEditLabel(p.label);
                            setEditRate(String(p.rate));
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Overtime Price</DialogTitle>
            <DialogDescription>
              Are you sure? If this price is linked to entries it will be
              deactivated instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
