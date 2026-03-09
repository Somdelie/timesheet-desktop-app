import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Package,
  Loader2,
  RotateCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPriceAtOrder: number;
  uomAtOrder: string | null;
  unitSizeAtOrder: number | null;
  note: string | null;
  product: {
    id: string;
    name: string;
    uom: string | null;
    unitSize: number | null;
  };
};

type Order = {
  id: string;
  siteId: string;
  supplierId: string | null;
  reference: string | null;
  note: string | null;
  totalCost: number | null;
  createdAt: string;
  supplier: { id: string; name: string } | null;
  createdByUser: { id: string; name: string } | null;
  items: OrderItem[];
};

function fmtCurrency(n: number) {
  return `R ${n.toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function SiteMaterialOrdersPanel({
  siteId,
}: {
  siteId: string;
}) {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadOrders = useCallback(
    async (from?: string, to?: string) => {
      if (!token) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const qs = params.toString();
        const res = await fetch(
          `${API_BASE_URL}/api/app/admin/sites/${siteId}/product-orders${qs ? `?${qs}` : ""}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (res.ok) {
          const json = await res.json();
          setOrders(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    },
    [siteId, token],
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const totalItems = useMemo(
    () => orders.reduce((sum, o) => sum + o.items.length, 0),
    [orders],
  );
  const grandTotal = useMemo(
    () =>
      orders.reduce(
        (sum, o) =>
          sum +
          o.items.reduce((s, i) => s + i.quantity * i.unitPriceAtOrder, 0),
        0,
      ),
    [orders],
  );

  return (
    <div className="rounded border border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-blue-600 flex items-center justify-center shadow-sm">
              <Package
                className="text-white"
                style={{ height: 18, width: 18 }}
              />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white tracking-tight">
                Material Orders
              </h2>
              <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                Procurement tracking &amp; history
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-900 dark:text-white"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-900 dark:text-white"
            />
            <button
              onClick={() =>
                loadOrders(dateFrom || undefined, dateTo || undefined)
              }
              disabled={loading}
              className="h-8 px-3 rounded bg-primary hover:bg-primary/90 text-white text-[13px] font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "..." : "Filter"}
            </button>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  loadOrders();
                }}
                className="h-8 px-3 rounded border border-slate-200 dark:border-slate-700 text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() =>
                loadOrders(dateFrom || undefined, dateTo || undefined)
              }
              className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <StatCard label="Orders" value={String(orders.length)} />
          <StatCard label="Total Items" value={String(totalItems)} />
          <StatCard label="Grand Total" value={fmtCurrency(grandTotal)} />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No material orders found for this site.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const orderTotal = order.items.reduce(
                (s, i) => s + i.quantity * i.unitPriceAtOrder,
                0,
              );
              return (
                <div
                  key={order.id}
                  className="rounded border border-slate-200/50 dark:border-slate-700/50 overflow-hidden"
                >
                  {/* Order header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-left"
                    onClick={() =>
                      setExpandedOrderId(isExpanded ? null : order.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {fmtDate(order.createdAt)}
                          </span>
                          {order.supplier && (
                            <Badge variant="secondary" className="text-[10px]">
                              {order.supplier.name}
                            </Badge>
                          )}
                          {order.reference && (
                            <span className="text-xs text-slate-500 font-mono">
                              #{order.reference}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {order.items.length} item(s)
                          {order.createdByUser &&
                            ` \u2022 by ${order.createdByUser.name}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {fmtCurrency(orderTotal)}
                    </span>
                  </button>

                  {/* Order items */}
                  {isExpanded && (
                    <div className="border-t border-slate-200/50 dark:border-slate-700/50">
                      <Table className="border-collapse [&_th]:border [&_th]:border-slate-200 [&_th]:dark:border-slate-700 [&_td]:border [&_td]:border-slate-200 [&_td]:dark:border-slate-700">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium text-sm">
                                {item.product.name}
                              </TableCell>
                              <TableCell className="text-sm">
                                {item.quantity}
                                {item.uomAtOrder && (
                                  <span className="text-xs text-slate-400 ml-1">
                                    {item.uomAtOrder}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm font-mono">
                                {fmtCurrency(item.unitPriceAtOrder)}
                              </TableCell>
                              <TableCell className="text-sm font-mono font-semibold">
                                {fmtCurrency(
                                  item.quantity * item.unitPriceAtOrder,
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
