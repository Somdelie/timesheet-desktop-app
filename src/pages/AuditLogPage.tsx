import { useEffect, useState } from "react";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
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
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  entityName: string | null;
};

type RecentLogin = {
  id: string;
  action: string;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: string };
};

export default function AuditLogPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [recentLogins, setRecentLogins] = useState<RecentLogin[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination + filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const loadLogs = async (p = page) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (filterAction !== "all") params.set("action", filterAction);

      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/audit-logs?${params}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load audit logs");

      setLogs(json?.logs || []);
      setTotal(json?.total || 0);
      setTotalPages(json?.totalPages || 1);
      setPage(json?.page || p);
      if (json?.actions) setActions(json.actions);
      if (json?.recentLogins) setRecentLogins(json.recentLogins);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filterAction]);

  // Live search: reload logs as the search text changes
  useEffect(() => {
    if (!token) return;
    loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, token]);

  const handleSearch = () => {
    loadLogs(1);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-ZA", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  if (loading && logs.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          View all system actions and recent logins.
        </p>
      </div>

      {/* Recent Logins */}
      {recentLogins.length > 0 && (
        <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Recent Logins
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentLogins.map((login) => (
              <div
                key={login.id}
                className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs"
              >
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{login.actor.name}</span>
                <span className="text-muted-foreground">
                  {formatDate(login.createdAt)}
                </span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {login.actor.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by entity, action, or actor..."
                  className="h-10 pl-9"
                />
              </div>
              <Button
                className="h-10"
                onClick={handleSearch}
                disabled={loading}
              >
                Search
              </Button>
            </div>
          </div>
          <div className="w-52">
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="border bg-card rounded overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700 w-44">
                  Date
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Action
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Entity
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Actor
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell className="border border-border px-3 py-1 text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell className="border border-border px-3 py-1">
                      <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs font-medium">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="border border-border px-3 py-1">
                      <div>
                        <span className="text-sm font-medium">
                          {log.entity}
                        </span>
                        {log.entityName && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({log.entityName})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border border-border px-3 py-1">
                      <div>
                        <span className="text-sm">{log.actor.name}</span>
                        <span className="text-xs text-muted-foreground block">
                          {log.actor.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="border border-border px-3 py-1 max-w-[200px] truncate text-xs text-muted-foreground">
                      {log.metadata &&
                        Object.keys(log.metadata).length > 0 &&
                        JSON.stringify(log.metadata).slice(0, 120)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t px-4 py-3 bg-muted/60 text-sm">
            <span className="text-muted-foreground">
              Page <b>{page}</b> of <b>{totalPages}</b> &mdash; <b>{total}</b>{" "}
              total
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1 || loading}
                onClick={() => loadLogs(1)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1 || loading}
                onClick={() => loadLogs(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages || loading}
                onClick={() => loadLogs(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages || loading}
                onClick={() => loadLogs(totalPages)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
