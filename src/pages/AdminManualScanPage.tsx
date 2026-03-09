import { useEffect, useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  RotateCw,
  User,
  Building2,
  Clock,
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
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type PendingScan = {
  id: string;
  employeeName: string;
  employeeCode: string | null;
  siteName: string;
  scannedAt: string;
};

export default function AdminManualScanPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PendingScan[]>([]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const url = `${API_BASE_URL}/api/app/admin/manual-scan?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json().catch(() => null)) as {
        data?: PendingScan[];
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to load scans";
        throw new Error(msg);
      }

      setResults(Array.isArray(json?.data) ? json!.data! : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load scans";
      console.error("Failed to load scans:", e);
      setResults([]);
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

  // Live search: reload results as the query changes
  useEffect(() => {
    if (!token) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, token]);

  const handleSearch = () => {
    void load();
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Manual Scan</h1>
          <p className="text-sm text-muted-foreground">
            Search for employees and manually create scan entries when needed.
          </p>
        </div>
      </div>

      <div className="rounded border p-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-border/50 bg-card/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-foreground mb-1">
            Search Employee or Site
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Search by employee name, code or site..."
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setQuery("");
                void load();
              }}
            >
              <RotateCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
        <Button type="button" variant="outline" disabled className="gap-2">
          <UserPlus className="h-4 w-4" />
          New Manual Scan
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <ManualScanTable data={results} loading={loading} />
    </div>
  );
}

/* ─── Table ─── */

type SortKey = "employeeName" | "siteName" | "scannedAt";
type SortDir = "asc" | "desc";

function ManualScanTable({
  data,
  loading,
}: {
  data: PendingScan[];
  loading: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("scannedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when data changes
  useEffect(() => {
    setPageIndex(0);
  }, [data]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "scannedAt") {
        cmp = a.scannedAt.localeCompare(b.scannedAt);
      } else {
        cmp = (a[sortKey] ?? "").localeCompare(b[sortKey] ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(
    () => sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [sorted, pageIndex, pageSize],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPageIndex(0);
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
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
                  onClick={() => toggleSort("employeeName")}
                >
                  <User className="h-4 w-4 text-sky-600" />
                  Employee
                  <SortIcon col="employeeName" />
                </button>
              </TableHead>
              <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("siteName")}
                >
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  Site
                  <SortIcon col="siteName" />
                </button>
              </TableHead>
              <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort("scannedAt")}
                >
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Scanned At
                  <SortIcon col="scannedAt" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  No scans found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((r) => (
                <TableRow
                  key={r.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                >
                  <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                    <div className="font-semibold">{r.employeeName}</div>
                    {r.employeeCode && (
                      <div className="text-xs text-muted-foreground">
                        Code: {r.employeeCode}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                    <span className="text-sm">{r.siteName}</span>
                  </TableCell>
                  <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                    <span className="text-xs">
                      {new Date(r.scannedAt).toLocaleString()}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/60">
        <div className="text-muted-foreground hidden text-sm lg:flex">
          Showing {data.length === 0 ? 0 : pageIndex * pageSize + 1} to{" "}
          {Math.min((pageIndex + 1) * pageSize, data.length)} of {data.length}{" "}
          scans
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
                {[5, 10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
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
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
            >
              <span className="sr-only">Go to previous page</span>
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
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => setPageIndex(totalPages - 1)}
              disabled={pageIndex >= totalPages - 1}
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
