import { useEffect, useMemo, useState } from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/formatCurrency";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type AdminProductDto = {
  id: string;
  name: string;
  price: string; // decimal string
  isActive: boolean;
};

type AdminForemanDto = {
  id: string; // foreman.id
  userId: string;
  name: string;
  email: string;
};

type CartItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  note: string;
};

export default function OrdersPage() {
  const { token } = useAuth();
  const [foremen, setForemen] = useState<AdminForemanDto[]>([]);
  const [products, setProducts] = useState<AdminProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedForemanId, setSelectedForemanId] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [foremenRes, productsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/app/admin/foremen`, {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/api/app/admin/products`, {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const foremenJson = (await foremenRes.json().catch(() => null)) as {
          foremen?: any[];
          error?: string;
          message?: string;
        } | null;
        const productsJson = (await productsRes.json().catch(() => null)) as {
          ok?: boolean;
          products?: AdminProductDto[];
          error?: string;
          message?: string;
        } | null;

        if (!foremenRes.ok) {
          const msg =
            foremenJson?.error ||
            foremenJson?.message ||
            `Failed to load foremen (${foremenRes.status})`;
          throw new Error(msg);
        }

        if (!productsRes.ok) {
          const msg =
            productsJson?.error ||
            productsJson?.message ||
            `Failed to load products (${productsRes.status})`;
          throw new Error(msg);
        }

        const foremenList = Array.isArray(foremenJson?.foremen)
          ? foremenJson!.foremen!.map((f: any) => ({
              id: f.foremanId ?? f.id,
              userId: f.userId,
              name: f.name || "",
              email: f.email,
            }))
          : [];

        const productList = Array.isArray(productsJson?.products)
          ? productsJson!.products!
          : [];

        if (cancelled) return;
        setForemen(foremenList);
        setProducts(productList);
        if (!selectedForemanId && foremenList.length > 0) {
          setSelectedForemanId(foremenList[0].id);
        }
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof Error ? e.message : "Failed to load orders data";
        console.error("Failed to load orders data:", e);
        setError(msg);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, selectedForemanId]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const active = products.filter((p) => p.isActive !== false);
    if (!q) return active;
    return active.filter((p) => p.name.toLowerCase().includes(q));
  }, [productSearch, products]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const selectedForeman = useMemo(
    () => foremen.find((f) => f.id === selectedForemanId) ?? null,
    [foremen, selectedForemanId],
  );

  function addToCart(product: AdminProductDto) {
    const priceNum = Number(product.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setOrderMessage("Product price is invalid");
      return;
    }
    setOrderMessage(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: priceNum,
          quantity: 1,
          note: "",
        },
      ];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function updateNote(productId: string, note: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, note } : item,
      ),
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  const handleCreateOrder = async () => {
    if (!token) {
      setOrderMessage("You are not authenticated");
      return;
    }
    if (!selectedForemanId) {
      setOrderMessage("Please select a foreman");
      return;
    }
    if (cart.length === 0) {
      setOrderMessage("Add at least one product to the order");
      return;
    }

    const itemsPayload = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      note: item.note.trim() || undefined,
    }));

    try {
      setSubmitting(true);
      setOrderMessage(null);

      const res = await fetch(`${API_BASE_URL}/api/app/admin/orders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          foremanId: selectedForemanId,
          items: itemsPayload,
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
          `Failed to create order (${res.status})`;
        throw new Error(msg);
      }

      setCart([]);
      setOrderMessage("Order created");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create order";
      console.error("Failed to create order:", e);
      setOrderMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading orders data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create Product Order</h1>
        <p className="text-sm text-muted-foreground">
          Record products taken by a foreman so they can later be applied as
          deductions on worker timesheets.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}
      {orderMessage && !error && (
        <div className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded">
          {orderMessage}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Foreman</label>
            <Select
              value={selectedForemanId}
              onValueChange={(value) => setSelectedForemanId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select foreman" />
              </SelectTrigger>
              <SelectContent>
                {foremen.length === 0 ? (
                  <SelectItem value="" disabled>
                    No foremen found
                  </SelectItem>
                ) : (
                  foremen.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name || f.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedForeman ? (
              <p className="text-xs text-muted-foreground">
                Creating order for:{" "}
                <span className="font-medium">
                  {selectedForeman.name || selectedForeman.email}
                </span>
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Order items</h2>
              <div className="text-xs text-muted-foreground">
                Total: {formatCurrency(cartTotal)}
              </div>
            </div>

            <div className="border rounded overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="border border-zinc-200 dark:border-zinc-700">
                      Product
                    </TableHead>
                    <TableHead className="border border-zinc-200 dark:border-zinc-700 w-20">
                      Qty
                    </TableHead>
                    <TableHead className="border border-zinc-200 dark:border-zinc-700 w-24">
                      Price
                    </TableHead>
                    <TableHead className="border border-zinc-200 dark:border-zinc-700 w-24">
                      Line total
                    </TableHead>
                    <TableHead className="border border-zinc-200 dark:border-zinc-700 w-40">
                      Note
                    </TableHead>
                    <TableHead className="border border-zinc-200 dark:border-zinc-700 w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground text-sm"
                      >
                        No items in order yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    cart.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="border border-zinc-200 dark:border-zinc-700">
                          {item.productName}
                        </TableCell>
                        <TableCell className="border border-zinc-200 dark:border-zinc-700">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isFinite(n)) return;
                              updateQuantity(
                                item.productId,
                                Math.max(1, Math.floor(n)),
                              );
                            }}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell className="border border-zinc-200 dark:border-zinc-700">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="border border-zinc-200 dark:border-zinc-700">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </TableCell>
                        <TableCell className="border border-zinc-200 dark:border-zinc-700">
                          <Input
                            value={item.note}
                            onChange={(e) =>
                              updateNote(item.productId, e.target.value)
                            }
                            placeholder="Optional note"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="border border-zinc-200 dark:border-zinc-700">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            X
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleCreateOrder}
                disabled={submitting || !selectedForemanId || cart.length === 0}
              >
                {submitting ? "Saving order..." : "Create Order"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Products</h2>
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="border rounded max-h-120 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="border border-zinc-200 dark:border-zinc-700">
                    Name
                  </TableHead>
                  <TableHead className="border border-zinc-200 dark:border-zinc-700 w-24">
                    Price
                  </TableHead>
                  <TableHead className="border border-zinc-200 dark:border-zinc-700 w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground text-sm"
                    >
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="border border-zinc-200 dark:border-zinc-700">
                        {p.name}
                      </TableCell>
                      <TableCell className="border border-zinc-200 dark:border-zinc-700">
                        {formatCurrency(Number(p.price || "0"))}
                      </TableCell>
                      <TableCell className="border border-zinc-200 dark:border-zinc-700 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addToCart(p)}
                        >
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
