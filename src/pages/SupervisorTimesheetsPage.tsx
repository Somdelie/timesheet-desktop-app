import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Printer,
  Download,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { printTimesheet, downloadTimesheetCSV } from "@/lib/timesheetExport";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import TimesheetGrid from "@/components/timesheets/TimesheetGrid";
import type { TimesheetGridModel } from "@/components/timesheets/gridModel";
import { normalizeTimesheetToGrid } from "@/lib/normalizeTimesheetDetail";

const API_BASE =
  import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.DEV ? "" : "http://localhost:3000");

type PeriodOption = {
  id: string;
  startISO: string;
  endISO: string;
  label?: string | null;
};

type SupervisorRow = {
  id: string;
  startISO: string;
  endISO: string;
  status: string;
  foremanName?: string | null;
  siteId?: string | null;
  siteCode?: string | null;
  siteName?: string | null;
  totalWorkerDays?: number | null;
  totalWorkerWages?: number | null;
  rowKey?: string;
};

function ensureUniqueRowKeys<T extends { id: string; rowKey?: string }>(
  rows: T[],
): T[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.id, (counts.get(r.id) ?? 0) + 1);

  const seen = new Map<string, number>();
  return rows.map((r) => {
    if ((counts.get(r.id) ?? 0) <= 1) return r;
    if (r.rowKey) return r;

    const n = (seen.get(r.id) ?? 0) + 1;
    seen.set(r.id, n);
    return { ...r, rowKey: `${r.id}__dup${n}` };
  });
}

function toSafeErrorText(e: unknown) {
  if (e instanceof Error) return e.message;
  return "Request failed.";
}

function money(n?: number | null) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x.toFixed(2) : "0.00";
}

function prettyRange(startISO: string, endISO: string) {
  const a = new Date(`${startISO}T00:00:00.000Z`);
  const b = new Date(`${endISO}T00:00:00.000Z`);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${fmt(a)} – ${fmt(b)}`;
}

function iso10(v: unknown) {
  return String(v ?? "").slice(0, 10);
}

function statusClass(s: string) {
  if (s === "APPROVED")
    return "border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (s === "REJECTED")
    return "border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-300";
  if (s === "SUBMITTED")
    return "border-sky-600/25 bg-sky-600/15 text-sky-700 dark:text-sky-300";
  if (s === "PAID")
    return "border-purple-500/25 bg-purple-500/15 text-purple-700 dark:text-purple-300";
  return "border-slate-500/25 bg-slate-500/15 text-slate-700 dark:text-slate-300";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-extrabold",
        statusClass(status),
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function SiteBadgeFromListRow({
  siteCode,
  siteName,
}: {
  siteCode?: string | null;
  siteName?: string | null;
}) {
  const code = String(siteCode ?? "").trim();
  const name = String(siteName ?? "").trim();
  if (!code && !name) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant="outline" className="truncate">
      {code ? `${code} · ` : ""}
      {name || "—"}
    </Badge>
  );
}

type TimesheetAction = {
  id: string;
  label: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  canPerform: (status: string) => boolean;
  handler: (reason?: string) => Promise<void>;
  requiresReason?: boolean;
};

export default function SupervisorTimesheetsPage() {
  const { token } = useAuth();

  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [periodId, setPeriodId] = useState<string>("");

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [status, setStatus] = useState<string>("ALL");

  const [rows, setRows] = useState<SupervisorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");

  const totalWages = useMemo(() => {
    return rows.reduce(
      (sum, row) => sum + Number(row.totalWorkerWages ?? 0),
      0,
    );
  }, [rows]);

  const gridModel = useMemo<TimesheetGridModel | null>(() => {
    if (!detail) return null;
    const dto = (detail?.timesheet ?? detail) as Record<string, unknown>;
    return normalizeTimesheetToGrid(dto);
  }, [detail]);

  const gridNode = useMemo(() => {
    if (!gridModel) return null;
    return <TimesheetGrid model={gridModel} />;
  }, [gridModel]);

  const columns = useMemo<ColumnDef<SupervisorRow>[]>(
    () => [
      {
        id: "fortnight",
        accessorFn: (row) => row.startISO,
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(isSorted === "asc")}
            >
              Fortnight
              {isSorted === "asc" ? (
                <ChevronUp className="h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          );
        },
        cell: ({ row }) => (
          <span className="font-medium">
            {prettyRange(
              iso10(row.original.startISO),
              iso10(row.original.endISO),
            )}
          </span>
        ),
      },
      {
        id: "site",
        header: "Site",
        cell: ({ row }) => (
          <div className="max-w-xs">
            <SiteBadgeFromListRow
              siteCode={row.original.siteCode}
              siteName={row.original.siteName}
            />
          </div>
        ),
      },
      {
        id: "foreman",
        accessorFn: (row) => row.foremanName ?? "",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(isSorted === "asc")}
            >
              Foreman
              {isSorted === "asc" ? (
                <ChevronUp className="h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          );
        },
        cell: ({ row }) => (
          <span className="font-medium">{row.original.foremanName ?? "—"}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(isSorted === "asc")}
            >
              Status
              {isSorted === "asc" ? (
                <ChevronUp className="h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          );
        },
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        id: "days",
        accessorKey: "totalWorkerDays",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <div className="text-right">
              <button
                className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                onClick={() => column.toggleSorting(isSorted === "asc")}
              >
                Days
                {isSorted === "asc" ? (
                  <ChevronUp className="h-4 w-4" />
                ) : isSorted === "desc" ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          );
        },
        cell: ({ row }) => (
          <div className="text-right font-semibold">
            {row.original.totalWorkerDays ?? 0}
          </div>
        ),
      },
      {
        id: "wages",
        accessorKey: "totalWorkerWages",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <div className="text-right">
              <button
                className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                onClick={() => column.toggleSorting(isSorted === "asc")}
              >
                Wages
                {isSorted === "asc" ? (
                  <ChevronUp className="h-4 w-4" />
                ) : isSorted === "desc" ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          );
        },
        cell: ({ row }) => (
          <div className="text-right font-semibold">
            {money(row.original.totalWorkerWages)}
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row, index) => row.rowKey ?? `${row.id}__${index}`,
  });

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!token) return;

    let alive = true;

    async function loadPeriods() {
      try {
        const res = await fetch(
          `${API_BASE}/api/app/supervisor/timesheets/periods`,
          {
            cache: "no-store",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json();
        if (!alive) return;

        if (!res.ok) {
          console.error("Failed to load periods:", data?.error);
          setPeriods([]);
          setPeriodId("");
          return;
        }

        const list = Array.isArray(data.periods) ? data.periods : [];
        setPeriods(list);

        const defaultId =
          (data.currentId &&
          list.some((p: PeriodOption) => p.id === data.currentId)
            ? data.currentId
            : list[0]?.id) ?? "";

        setPeriodId(defaultId);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setPeriods([]);
        setPeriodId("");
      }
    }

    loadPeriods();
    return () => {
      alive = false;
    };
  }, [token]);

  const listAbortRef = useRef<AbortController | null>(null);

  const loadList = useCallback(async () => {
    if (!periodId || !token) {
      setLoading(false);
      setErr(null);
      setRows([]);
      return;
    }

    listAbortRef.current?.abort();
    const ac = new AbortController();
    listAbortRef.current = ac;

    setLoading(true);
    setErr(null);

    try {
      const url = new URL(
        `${API_BASE || ""}/api/app/supervisor/timesheets`,
        window.location.origin,
      );
      url.searchParams.set("period", periodId);
      if (qDebounced) url.searchParams.set("q", qDebounced);
      if (status !== "ALL") url.searchParams.set("status", status);

      const res = await fetch(url.toString(), {
        cache: "no-store",
        signal: ac.signal,
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          payload?.error ||
          payload?.message ||
          `Failed to load timesheets (${res.status})`;
        throw new Error(msg);
      }

      const list =
        (Array.isArray(payload?.timesheets) && payload.timesheets) || [];

      setRows(ensureUniqueRowKeys(list as SupervisorRow[]));
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setErr(toSafeErrorText(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, periodId, qDebounced, status]);

  useEffect(() => {
    if (!periodId) return;
    loadList();
    return () => listAbortRef.current?.abort();
  }, [loadList, periodId]);

  const openDetail = useCallback(
    async (id: string, siteId?: string | null) => {
      if (!token) return;

      setOpen(true);
      setActiveId(id);
      setActiveSiteId(siteId ?? null);
      setDetail(null);
      setDetailErr(null);
      setDetailLoading(true);
      setActionErr(null);

      try {
        const url = `${API_BASE}/api/app/supervisor/timesheets/${encodeURIComponent(id)}${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`;

        const res = await fetch(url, {
          cache: "no-store",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            payload?.error ||
            payload?.message ||
            `Failed to load timesheet (${res.status})`;
          throw new Error(msg);
        }

        setDetail(payload?.timesheet ?? payload);
      } catch (e) {
        setDetailErr(toSafeErrorText(e));
      } finally {
        setDetailLoading(false);
      }
    },
    [token],
  );

  const refreshDetail = useCallback(async () => {
    if (!activeId) return;
    await openDetail(activeId, activeSiteId);
  }, [activeId, activeSiteId, openDetail]);

  async function postJson(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        payload?.error || payload?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return payload;
  }

  const actions = useMemo((): TimesheetAction[] => {
    const base = `${API_BASE}/api/app/supervisor`;

    let endISO: string | null = null;
    let startISO: string | null = null;
    if (detail) {
      endISO = (detail as any)?.endISO ?? null;
      startISO = (detail as any)?.startISO ?? null;
    } else if (activeId) {
      const parts = activeId.split("_");
      if (parts.length >= 2) {
        startISO = parts[0];
        endISO = parts[1];
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const isLastDayOrLater = endISO ? today >= endISO : false;
    const isWithinPeriod =
      startISO && endISO ? today >= startISO && today <= endISO : false;

    const result: TimesheetAction[] = [];

    if (isWithinPeriod && !isLastDayOrLater) {
      result.push({
        id: "accept-day",
        label: `Accept Today (${today})`,
        canPerform: (s) => s === "SUBMITTED" || s === "ACCEPTED",
        handler: async () => {
          if (!activeId) return;
          await postJson(
            `${base}/timesheets/${encodeURIComponent(activeId)}/accept-day`,
            { date: today, action: "accept" },
          );
          toast.success("Day accepted");
          setTimeout(() => loadList(), 300);
          setTimeout(() => refreshDetail(), 300);
        },
      });

      result.push({
        id: "reject-day",
        label: `Reject Today (${today})`,
        variant: "destructive",
        canPerform: (s) => s === "SUBMITTED" || s === "ACCEPTED",
        requiresReason: true,
        handler: async (reason) => {
          if (!activeId) return;
          await postJson(
            `${base}/timesheets/${encodeURIComponent(activeId)}/accept-day`,
            { date: today, action: "reject", reason },
          );
          toast.success("Day rejected");
          setTimeout(() => loadList(), 300);
          setTimeout(() => refreshDetail(), 300);
        },
      });
    }

    if (isLastDayOrLater) {
      result.push({
        id: "approve",
        label: "Final Approve",
        canPerform: (s) => s === "SUBMITTED" || s === "ACCEPTED",
        handler: async () => {
          if (!activeId) return;
          await postJson(
            `${base}/timesheets/${encodeURIComponent(activeId)}/approve`,
          );
          toast.success("Timesheet approved");
          setTimeout(() => loadList(), 300);
          setTimeout(() => refreshDetail(), 300);
        },
      });

      result.push({
        id: "reject",
        label: "Reject",
        variant: "destructive",
        canPerform: (s) => s === "SUBMITTED" || s === "ACCEPTED",
        requiresReason: true,
        handler: async (reason) => {
          if (!activeId) return;
          await postJson(
            `${base}/timesheets/${encodeURIComponent(activeId)}/reject`,
            { reason },
          );
          toast.success("Timesheet rejected");
          setTimeout(() => loadList(), 300);
          setTimeout(() => refreshDetail(), 300);
        },
      });
    }

    result.push({
      id: "paid",
      label: "Mark Paid",
      variant: "outline",
      canPerform: (s) => s === "APPROVED",
      handler: async () => {
        if (!activeId) return;
        await postJson(
          `${base}/timesheets/${encodeURIComponent(activeId)}/paid`,
        );
        toast.success("Marked paid");
        setTimeout(() => loadList(), 300);
        setTimeout(() => refreshDetail(), 300);
      },
    });

    return result;
  }, [API_BASE, activeId, detail, loadList, refreshDetail]);

  async function runAction(actionId: string) {
    const action = actions.find((a) => a.id === actionId);
    if (!action || !detail) return;

    const detailStatus =
      ((detail as Record<string, unknown>)?.status as string) ?? "—";

    if (!action.canPerform(detailStatus)) {
      toast.info("Action not available for this status");
      return;
    }

    if (action.requiresReason) {
      setPendingActionId(actionId);
      setActionErr(null);
      setReasonText("");
      setReasonDialogOpen(true);
      return;
    }

    setActionErr(null);
    setActionLoading(actionId);
    try {
      await action.handler();
      toast.success(action.label);
      await refreshDetail();
    } catch (err) {
      console.error(err);
      setActionErr(err instanceof Error ? err.message : "Action failed");
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function confirmRejectionWithReason() {
    const actionId = pendingActionId;
    if (!actionId) return;

    const action = actions.find((a) => a.id === actionId);
    if (!action) return;

    const reason = reasonText.trim();
    if (!reason) {
      toast.error("Please enter a reason");
      return;
    }

    setActionErr(null);
    setActionLoading(actionId);
    try {
      await action.handler(reason);
      toast.success(action.label);

      setReasonDialogOpen(false);
      setPendingActionId(null);
      setReasonText("");

      await refreshDetail();
    } catch (err) {
      console.error(err);
      setActionErr(err instanceof Error ? err.message : "Action failed");
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  const reset = () => {
    setQ("");
    setStatus("ALL");
    if (periods[0]?.id) setPeriodId(periods[0].id);
  };

  const detailStatus =
    ((detail as Record<string, unknown>)?.status as string) ?? "—";

  const reasonAction = actions.find((a) => a.requiresReason);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Supervisor Timesheets
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and action timesheets submitted by your foremen.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Total wages:{" "}
            <span className="font-semibold">{money(totalWages)}</span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadList}
              disabled={loading || !periodId}
            >
              Refresh
            </Button>

            <Button
              className="bg-sky-600 hover:bg-sky-600/90 text-white"
              onClick={reset}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded flex-1 border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Search
            </div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search foreman name…"
            />
          </div>

          <div className="space-y-1 flex-1">
            <div className="text-xs font-medium text-muted-foreground">
              Fortnight
            </div>
            <Select
              value={periodId}
              onValueChange={setPeriodId}
              disabled={!periods.length}
            >
              <SelectTrigger className="w-full rounded">
                <SelectValue
                  placeholder={
                    periods.length ? "Select fortnight" : "No periods"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {prettyRange(p.startISO, p.endISO)} (Sat–Fri)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Status
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full rounded">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {err ? (
          <div className="text-sm text-rose-600 dark:text-rose-400">{err}</div>
        ) : null}
      </div>

      <div className="border bg-card">
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="border border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Spinner className="mx-auto size-5" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const original = row.original as SupervisorRow;
                  const handleClick = () => {
                    openDetail(original.id, original.siteId);
                  };
                  return (
                    <TableRow
                      key={row.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors"
                      onClick={handleClick}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="border border-zinc-200 px-3 py-2 dark:border-zinc-700"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No timesheets found for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className="text-muted-foreground hidden text-sm lg:flex">
            Showing{" "}
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}{" "}
            to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              rows.length,
            )}{" "}
            of {rows.length} timesheets
          </div>
          <div className="flex w-full items-center gap-4 lg:w-fit lg:gap-8">
            <div className="hidden items-center gap-2 lg:flex">
              <span className="text-sm font-medium">Rows per page</span>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(value) =>
                  table.setPageSize(Number.parseInt(value, 10))
                }
              >
                <SelectTrigger className="h-8 w-17.5 rounded">
                  <SelectValue
                    placeholder={String(table.getState().pagination.pageSize)}
                  />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={String(pageSize)}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-1 md:gap-2">
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm">
                <span>
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="w-full h-full p-0 m-0 gap-0">
          <SheetHeader className="px-3 pt-6">
            <SheetTitle className="hidden">Timesheet</SheetTitle>

            {detail && (
              <div className="rounded border py-2 mt-4 text-left flex items-start justify-between px-3 gap-3">
                <div className="text-sm text-muted-foreground flex flex-col gap-1 flex-1 pr-4">
                  <span>Fortnight Range</span>
                  <div className="font-semibold text-amber-50 py-1 border rounded px-3">
                    {prettyRange(
                      (detail as any).startISO,
                      (detail as any).endISO,
                    )}{" "}
                    (Sat–Fri)
                  </div>
                  <div className="pt-2">
                    <StatusPill status={detailStatus} />
                  </div>
                </div>

                <div className="flex flex-col gap-1 flex-1 px-4 border-l-2 border-card">
                  <div className="text-sm text-muted-foreground">Foreman</div>
                  <div className="font-medium py-1 border rounded px-3">
                    {(detail as any)?.foreman?.name ?? "—"}
                  </div>
                </div>

                <div className="flex flex-col gap-1 border-l-2 border-card px-4 flex-1">
                  <div className="text-sm text-muted-foreground">Site Info</div>
                  <div className="mt-1 flex flex-col gap-1">
                    {Array.isArray((detail as any)?.sites) &&
                    (detail as any).sites.length ? (
                      (detail as any).sites.map((s: any) => (
                        <div
                          key={s.id}
                          className="font-medium py-1 border rounded px-3 w-full"
                        >
                          {(s.code ? `${s.code} · ` : "") + s.name}
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {detail ? (
              <div className="mt-3 px-3 flex flex-col gap-2">
                {actionErr ? (
                  <div className="text-sm text-rose-600 dark:text-rose-400">
                    {actionErr}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {actions
                    .filter((action) => action.canPerform(detailStatus))
                    .map((action) => (
                      <Button
                        key={action.id}
                        variant={action.variant || "default"}
                        disabled={actionLoading !== null}
                        onClick={() => runAction(action.id)}
                      >
                        {actionLoading === action.id
                          ? `${action.label}…`
                          : action.label}
                      </Button>
                    ))}

                  {gridModel && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const d = detail as any;
                          const meta = {
                            foremanName: d?.foreman?.name ?? undefined,
                            startDate: String(d?.startISO ?? ""),
                            endDate: String(d?.endISO ?? ""),
                            sites: Array.isArray(d?.sites)
                              ? d.sites.map((s: any) => ({
                                  code: s.code,
                                  name: s.name,
                                }))
                              : [],
                            status: detailStatus,
                          };
                          printTimesheet(gridModel, meta);
                        }}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const d = detail as any;
                          const meta = {
                            foremanName: d?.foreman?.name ?? undefined,
                            startDate: String(d?.startISO ?? ""),
                            endDate: String(d?.endISO ?? ""),
                            sites: Array.isArray(d?.sites)
                              ? d.sites.map((s: any) => ({
                                  code: s.code,
                                  name: s.name,
                                }))
                              : [],
                            status: detailStatus,
                          };
                          downloadTimesheetCSV(gridModel, meta);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download CSV
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    onClick={refreshDetail}
                    disabled={!activeId}
                  >
                    Refresh Detail
                  </Button>

                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>

                {reasonAction && reasonAction.canPerform(detailStatus) ? (
                  <div className="mt-2 max-w-2xl">
                    <div className="text-xs text-muted-foreground mb-1">
                      {reasonAction.label} reason (required)
                    </div>
                    <Textarea
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      placeholder="Type reason…"
                      className="min-h-20"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </SheetHeader>

          <div className="mt-4">
            {detailLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="size-6" />
              </div>
            ) : detailErr ? (
              <div className="px-3 space-y-3">
                <div className="text-sm text-rose-600 dark:text-rose-400">
                  {detailErr}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={refreshDetail}
                    disabled={!activeId}
                  >
                    Retry
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : gridNode ? (
              <ScrollArea className="h-[90vh] px-3">
                <div className="space-y-3 pb-10">{gridNode}</div>
              </ScrollArea>
            ) : (
              <div className="px-3 text-sm text-muted-foreground">
                Select a timesheet to view details.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this timesheet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Enter rejection reason"
            />
            {actionErr ? (
              <div className="text-sm text-rose-600 dark:text-rose-400">
                {actionErr}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReasonDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmRejectionWithReason}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
