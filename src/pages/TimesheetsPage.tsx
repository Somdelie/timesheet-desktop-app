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
import { formatCurrency } from "@/lib/formatCurrency";
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

import TimesheetGrid from "@/components/timesheets/TimesheetGrid";
import type { TimesheetGridModel } from "@/components/timesheets/gridModel";
import { normalizeTimesheetToGrid } from "@/lib/normalizeTimesheetDetail";

const API_BASE =
  import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.DEV ? "" : "http://localhost:3000");

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfDayUTC(d: Date | string) {
  const x =
    typeof d === "string"
      ? new Date(`${d}T00:00:00.000Z`)
      : new Date(d.getTime());
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDaysUTC(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function toISODateUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isSaturdayUTC(d: Date) {
  return d.getUTCDay() === 6;
}

function getFortnightForDateUTC(date: Date, anchorSat: Date) {
  const anchor = startOfDayUTC(anchorSat);
  if (!isSaturdayUTC(anchor)) throw new Error("Anchor must be Saturday (UTC)");

  const d = startOfDayUTC(date);

  const diffDays = Math.floor((d.getTime() - anchor.getTime()) / MS_DAY);
  const k = Math.floor(diffDays / 14);
  const start = addDaysUTC(anchor, k * 14);
  const end = addDaysUTC(start, 13);

  return {
    startDate: start,
    endDate: end,
    startISO: toISODateUTC(start),
    endISO: toISODateUTC(end),
    id: `${toISODateUTC(start)}_${toISODateUTC(end)}`,
  };
}

type PeriodOption = {
  id: string;
  startISO: string;
  endISO: string;
  label?: string | null;
};

type AdminRow = {
  id: string;
  startISO: string;
  endISO: string;
  status: string;
  foreman?: { id: string; name: string };
  supervisor?: { id: string; name: string } | null;
  totalWorkerDays?: number | null;
  totalWorkerWages?: number | null;
  sites?: Array<{ id: string; code?: string | null; name: string }>;
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

function SiteBadges({
  sites,
}: {
  sites?: Array<{ id: string; code?: string | null; name: string }>;
}) {
  const list = sites ?? [];
  if (!list.length) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {list.slice(0, 3).map((s) => (
        <Badge key={s.id} variant="outline" className="truncate">
          {(s.code ? `${s.code} · ` : "") + s.name}
        </Badge>
      ))}
      {list.length > 3 ? (
        <Badge variant="secondary">+{list.length - 3} more</Badge>
      ) : null}
    </div>
  );
}

interface TimesheetAction {
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
}

export default function TimesheetPage() {
  const { token } = useAuth();
  const nowYearUTC = useMemo(() => new Date().getUTCFullYear(), []);
  const [year] = useState<number>(nowYearUTC);

  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [periodId, setPeriodId] = useState<string>("");

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [status, setStatus] = useState<string>("ALL");

  const [supervisorId, setSupervisorId] = useState<string>("ALL");

  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Table sorting and pagination state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Detail sheet state
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  // Action state
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

  // Column definitions for Admin table
  const adminColumns = useMemo<ColumnDef<AdminRow>[]>(
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
            {prettyRange(row.original.startISO, row.original.endISO)}
          </span>
        ),
      },
      {
        id: "sites",
        header: "Sites",
        cell: ({ row }) => (
          <div className="max-w-xs">
            <SiteBadges sites={row.original.sites} />
          </div>
        ),
      },
      {
        id: "foreman",
        accessorFn: (row) => row.foreman?.name ?? "",
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
          <span className="font-medium">
            {row.original.foreman?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "supervisor",
        accessorFn: (row) => row.supervisor?.name ?? "",
        header: "Supervisor",
        cell: ({ row }) => row.original.supervisor?.name ?? "—",
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

  // Table instance
  const table = useReactTable({
    data: rows,
    columns: adminColumns,
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

  // supervisors list
  const [dbSupervisors, setDbSupervisors] = useState<
    Array<{ id: string; name: string | null; email: string }>
  >([]);

  const supervisors = useMemo(() => {
    return dbSupervisors
      .filter((s) => s.name)
      .map((s) => ({ id: s.id, name: s.name! }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dbSupervisors]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // load supervisors
  useEffect(() => {
    if (!token) {
      setDbSupervisors([]);
      return;
    }

    let alive = true;

    async function loadSupervisors() {
      try {
        const res = await fetch(`${API_BASE}/api/app/admin/supervisors`, {
          cache: "no-store",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (!alive) return;

        if (!res.ok) {
          console.error("Failed to load supervisors:", data?.error);
          setDbSupervisors([]);
          return;
        }

        setDbSupervisors(
          Array.isArray(data.supervisors)
            ? data.supervisors.map(
                (s: { id: string; name: string | null; email: string }) => ({
                  id: s.id,
                  name: s.name,
                  email: s.email,
                }),
              )
            : [],
        );
      } catch (e) {
        console.error("Failed to load supervisors:", e);
        if (!alive) return;
        setDbSupervisors([]);
      }
    }

    loadSupervisors();
    return () => {
      alive = false;
    };
  }, [token]);

  // Load periods
  useEffect(() => {
    if (!token) return;

    let alive = true;

    async function getYearAnchorISO(y: number): Promise<string | null> {
      try {
        const res = await fetch(
          `${API_BASE}/api/app/admin/timesheets/year-anchor?year=${y}`,
          {
            cache: "no-store",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await res.json();
        if (!res.ok) return null;
        return data.anchorISO ?? null;
      } catch {
        return null;
      }
    }

    async function loadPeriods() {
      try {
        const res = await fetch(
          `${API_BASE}/api/app/timesheets/periods?year=${year}`,
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

        // Find the current ongoing fortnight
        let defaultId = list[0]?.id ?? "";

        const anchorISO = await getYearAnchorISO(year);
        if (anchorISO) {
          try {
            const anchor = startOfDayUTC(anchorISO);
            const today = new Date();
            const current = getFortnightForDateUTC(today, anchor);
            const exists = list.some((p: PeriodOption) => p.id === current.id);
            if (exists) {
              defaultId = current.id;
            }
          } catch {
            // ignore, use first period
          }
        }

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
  }, [token, year]);

  // Abort controller for list
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
        `${API_BASE || ""}/api/app/admin/timesheets`,
        window.location.origin,
      );

      url.searchParams.set("period", periodId);
      if (qDebounced) url.searchParams.set("q", qDebounced);
      if (status !== "ALL") url.searchParams.set("status", status);
      if (supervisorId !== "ALL") {
        url.searchParams.set("supervisorId", supervisorId);
      }

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

      setRows(ensureUniqueRowKeys(list as AdminRow[]));
      if (supervisorId !== "ALL") {
        const valid = (list as AdminRow[]).some(
          (r) => r.supervisor?.id === supervisorId,
        );
        if (!valid) setSupervisorId("ALL");
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setErr(toSafeErrorText(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, periodId, qDebounced, status, supervisorId]);

  // Load list when filters change
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
        const url = `${API_BASE}/api/app/admin/timesheets/${encodeURIComponent(id)}${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`;

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

    return [
      {
        id: "approve",
        label: "Approve",
        canPerform: (s) => s === "SUBMITTED",
        handler: async () => {
          if (!activeId) return;
          await postJson(
            `${base}/timesheets/${encodeURIComponent(activeId)}/approve`,
          );
          toast.success("Approved");
          setTimeout(() => loadList(), 300);
          setTimeout(() => refreshDetail(), 300);
        },
      },
      {
        id: "reject",
        label: "Reject",
        variant: "destructive",
        canPerform: (s) => s === "SUBMITTED",
        requiresReason: true,
        handler: async (reason) => {
          if (!activeId) return;
          await postJson(
            `${base}/timesheets/${encodeURIComponent(activeId)}/reject`,
            { reason },
          );
          toast.success("Rejected");
          setTimeout(() => loadList(), 300);
          setTimeout(() => refreshDetail(), 300);
        },
      },
      {
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
      },
    ];
  }, [activeId, loadList, refreshDetail, token]);

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
      setReasonText("");
      setPendingActionId(null);

      await refreshDetail();
    } catch (err) {
      console.error(err);
      setActionErr(err instanceof Error ? err.message : "Action failed");
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  const SUGGESTED_REASONS = [
    "Missing documentation",
    "Incorrect hours",
    "Incomplete information",
    "Cannot verify details",
    "Duplicate entry",
  ];

  const reset = () => {
    setQ("");
    setStatus("ALL");
    setSupervisorId("ALL");
    if (periods[0]?.id) setPeriodId(periods[0].id);
  };

  const detailStatus =
    ((detail as Record<string, unknown>)?.status as string) ?? "—";
  const sites =
    ((detail as Record<string, unknown>)?.sites as Array<{
      id: string;
      code?: string | null;
      name: string;
    }>) ?? [];

  const foremanDisplay = String(
    (gridModel as Record<string, unknown>)?.foremanName ??
      (detail as Record<string, unknown>)?.foremanName ??
      ((detail as Record<string, unknown>)?.foreman as Record<string, unknown>)
        ?.name ??
      "—",
  ).trim();

  const contractManagerDisplay = String(
    (detail as Record<string, unknown>)?.supervisorName ??
      (
        (detail as Record<string, unknown>)?.supervisor as Record<
          string,
          unknown
        >
      )?.name ??
      "—",
  ).trim();

  // Totals from grid model
  const foremanTotals = {
    days: Number(
      (
        (gridModel as Record<string, unknown>)?.totals as Record<
          string,
          unknown
        >
      )?.foremanDays ?? 0,
    ),
    pay: Number(
      (
        (gridModel as Record<string, unknown>)?.totals as Record<
          string,
          unknown
        >
      )?.foremanPay ?? 0,
    ),
  };
  const teamTotals = {
    days: Number(
      (
        (gridModel as Record<string, unknown>)?.totals as Record<
          string,
          unknown
        >
      )?.teamDays ?? 0,
    ),
    pay: Number(
      (
        (gridModel as Record<string, unknown>)?.totals as Record<
          string,
          unknown
        >
      )?.teamPay ?? 0,
    ),
  };

  const totalDays = foremanTotals.days + teamTotals.days;
  const totalPay = foremanTotals.pay + teamTotals.pay;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
          <p className="text-sm text-muted-foreground">
            Fortnights are pulled from the database periods.
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
              Supervisor
            </div>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger className="w-full rounded">
                <SelectValue placeholder="All supervisors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Spinner className="mx-auto size-5" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const original = row.original;
                  const handleClick = () => {
                    openDetail(
                      original.id,
                      Array.isArray(original.sites) && original.sites.length
                        ? original.sites[0]?.id
                        : undefined,
                    );
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No timesheets found for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
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
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 25, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={String(pageSize)}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="w-full h-full p-0 m-0 gap-0 overflow-hidden overflow-y-scroll"
        >
          <SheetHeader className="px-3 pt-6">
            <SheetTitle className="hidden">Timesheet</SheetTitle>

            {detail && (
              <div className="rounded border py-2 mt-4 text-left flex items-start justify-between px-3 gap-3">
                <div className="text-sm text-muted-foreground flex flex-col gap-1 flex-1 pr-4">
                  <span>Fortnight Range</span>
                  <div className="font-semibold py-1 border rounded px-3">
                    {prettyRange(
                      String(
                        (detail as Record<string, unknown>).startISO ?? "",
                      ),
                      String((detail as Record<string, unknown>).endISO ?? ""),
                    )}{" "}
                    (Sat–Fri)
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-bold">
                      {detailStatus || "—"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 flex-1 px-4 border-l-2 border-card">
                  <div className="text-sm text-muted-foreground">Foreman</div>
                  <div className="font-medium py-1 border rounded px-3">
                    {foremanDisplay}
                  </div>
                </div>

                <div className="flex flex-col gap-1 border-l-2 border-card px-4 flex-1">
                  <div className="text-sm text-muted-foreground">
                    Contract Manager
                  </div>
                  <div className="font-medium py-1 border rounded px-3">
                    {contractManagerDisplay}
                  </div>
                </div>

                <div className="flex flex-col gap-1 border-l-2 border-card px-4 flex-1">
                  <div className="text-sm text-muted-foreground">Site Info</div>
                  <div className="mt-1 flex flex-col gap-1">
                    {Array.isArray(sites) && sites.length ? (
                      sites.map((s) => {
                        const code = String(s?.code ?? "").trim();
                        const name = String(s?.name ?? "").trim();
                        return (
                          <div
                            key={String(s?.id ?? `${code}-${name}`)}
                            className="font-medium py-1 border rounded px-3 w-full"
                          >
                            {(code ? `${code} · ` : "") + (name || "—")}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ACTION BAR */}
            {detail ? (
              <div className="mt-3 px-3 flex flex-col gap-2">
                {actionErr ? (
                  <div className="text-sm text-rose-600 dark:text-rose-400">
                    {actionErr}
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <Button
                        key={action.id}
                        variant={action.variant || "default"}
                        disabled={
                          !action.canPerform(detailStatus) ||
                          actionLoading !== null
                        }
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
                            const meta = {
                              foremanName:
                                foremanDisplay !== "—"
                                  ? foremanDisplay
                                  : undefined,
                              contractManagerName:
                                contractManagerDisplay !== "—"
                                  ? contractManagerDisplay
                                  : undefined,
                              startDate: String(
                                (detail as Record<string, unknown>)?.startISO ??
                                  "",
                              ),
                              endDate: String(
                                (detail as Record<string, unknown>)?.endISO ??
                                  "",
                              ),
                              sites: sites.map((s) => ({
                                code: s.code ?? undefined,
                                name: s.name,
                              })),
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
                            const meta = {
                              foremanName:
                                foremanDisplay !== "—"
                                  ? foremanDisplay
                                  : undefined,
                              contractManagerName:
                                contractManagerDisplay !== "—"
                                  ? contractManagerDisplay
                                  : undefined,
                              startDate: String(
                                (detail as Record<string, unknown>)?.startISO ??
                                  "",
                              ),
                              endDate: String(
                                (detail as Record<string, unknown>)?.endISO ??
                                  "",
                              ),
                              sites: sites.map((s) => ({
                                code: s.code ?? undefined,
                                name: s.name,
                              })),
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
                </div>
              </div>
            ) : null}
          </SheetHeader>

          {/* REJECT REASON DIALOG */}
          <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rejection Reason</DialogTitle>
                <DialogDescription>
                  Please provide a reason for rejecting this timesheet.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {actionErr ? (
                  <div className="text-sm text-rose-600 dark:text-rose-400">
                    {actionErr}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason</label>
                  <Textarea
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="Type reason…"
                    className="min-h-20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Suggested reasons
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_REASONS.map((reason) => (
                      <Button
                        key={reason}
                        variant="outline"
                        size="sm"
                        onClick={() => setReasonText(reason)}
                      >
                        {reason}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setReasonDialogOpen(false);
                    setReasonText("");
                    setActionErr(null);
                    setPendingActionId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!reasonText.trim() || actionLoading !== null}
                  onClick={confirmRejectionWithReason}
                >
                  {actionLoading === pendingActionId ? "Rejecting…" : "Reject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* GRID/DETAIL CONTENT */}
          <div className="mt-4">
            {detailLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="size-8" />
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
            ) : detail ? (
              <div className="h-[70vh] px-3 overflow-auto flex flex-col gap-4">
                <div
                  className="max-w-7xl"
                  style={{
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  {gridNode}
                </div>

                {/* Totals cards */}
                <div className="flex gap-4 flex-wrap justify-end items-stretch">
                  <div className="text-sm border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-xs text-right">
                    <div className="text-muted-foreground text-xs font-semibold">
                      FOREMAN TOTAL
                    </div>
                    <div className="font-medium mt-1">
                      Total amount to be paid to {foremanDisplay}:
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-semibold">
                      {formatCurrency(totalPay)}
                    </div>
                  </div>

                  <div className="flex gap-4 flex-wrap justify-end">
                    <div className="text-sm border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <div className="text-muted-foreground text-xs font-semibold">
                        TOTAL
                      </div>
                      <div className="font-medium mt-1">
                        {totalDays} days • {formatCurrency(totalPay)}
                      </div>
                    </div>

                    {foremanTotals.days > 0 ? (
                      <div className="text-sm border rounded px-3 py-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                        <div className="text-muted-foreground text-xs font-semibold">
                          FOREMAN
                        </div>
                        <div className="font-medium mt-1">
                          {foremanTotals.days} days ×{" "}
                          {formatCurrency(
                            foremanTotals.days > 0
                              ? foremanTotals.pay / foremanTotals.days
                              : 0,
                          )}
                          /day
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Total: {formatCurrency(foremanTotals.pay)}
                        </div>
                      </div>
                    ) : null}

                    {teamTotals.days > 0 ? (
                      <div className="text-sm border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <div className="text-muted-foreground text-xs font-semibold">
                          TEAM
                        </div>
                        <div className="font-medium mt-1">
                          {teamTotals.days} days ×{" "}
                          {formatCurrency(
                            teamTotals.days > 0
                              ? teamTotals.pay / teamTotals.days
                              : 0,
                          )}
                          /day
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Total: {formatCurrency(teamTotals.pay)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-3 text-sm text-muted-foreground">
                Select a timesheet to view details.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
