import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Loader2,
  Mail,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Shield,
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type SupervisorRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  supervisorId: string | null;
  sites: { id: string; name: string; code: string | null }[];
  foremen: { id: string; name: string }[];
};

export default function SupervisorsPage() {
  const { token } = useAuth();
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const PAGE_SIZE_OPTIONS = [10, 20, 50];
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadSupervisors = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/app/admin/supervisors`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setSupervisors(json?.supervisors ?? []);
    } catch (e) {
      console.error("Failed to load supervisors:", e);
      setSupervisors([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSupervisors();
  }, [loadSupervisors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return supervisors;
    return supervisors.filter(
      (s) =>
        (s.name ?? "").toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.sites.some(
          (site) =>
            site.name.toLowerCase().includes(q) ||
            (site.code ?? "").toLowerCase().includes(q),
        ) ||
        s.foremen.some((f) => f.name.toLowerCase().includes(q)),
    );
  }, [supervisors, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Supervisors</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, site..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} supervisor{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border bg-card rounded overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Name
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Email
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Assigned Sites
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Foremen
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Joined
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <Loader2 className="mx-auto h-5 w-5 animate-spin mb-1" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <Shield className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    {query
                      ? "No supervisors match your search."
                      : "No supervisors found."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((s) => (
                  <TableRow
                    key={s.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  >
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                      <div className="font-medium text-[13px]">
                        {s.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-[13px]">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {s.email}
                      </div>
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-center">
                      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {s.sites.length}
                      </span>
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                      {s.foremen.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {s.foremen.map((f) => (
                            <Badge
                              key={f.id}
                              variant="outline"
                              className="text-[11px]"
                            >
                              <Users className="h-3 w-3 mr-0.5" />
                              {f.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-[13px] text-muted-foreground">
                      {fmtDate(s.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t px-4 py-3 bg-muted/60 text-sm">
            <span className="text-muted-foreground">
              Showing{" "}
              <b>{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</b> to{" "}
              <b>{Math.min(page * pageSize, filtered.length)}</b> of{" "}
              <b>{filtered.length}</b>
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
                <SelectTrigger className="h-8 w-17.5">
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
    </div>
  );
}
