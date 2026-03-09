import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  RotateCw,
  CalendarCheck,
  Trash2,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type MeetingSummary = {
  id: string;
  startDate: string;
  endDate: string;
  meetingOn: string;
  createdAt: string;
  totals: {
    totalMaterialCost: number;
    totalWagesCost: number;
    totalOvertimeCost: number;
    totalProjectCost: number;
  } | null;
  createdBy: { id: string; name: string } | null;
  siteCount: number;
};

type MeetingDetail = {
  id: string;
  startDate: string;
  endDate: string;
  meetingOn: string;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
  totals: {
    totalMaterialCost: number;
    totalWagesCost: number;
    totalOvertimeCost: number;
    totalProjectCost: number;
    totalRevenueClaimed: number;
    totalRevenueReceived: number;
    totalProfitOrLoss: number;
  } | null;
  rows: MeetingRow[];
};

type MeetingRow = {
  id: string;
  site: { id: string; name: string; code: string | null };
  materialCost: number;
  wagesCost: number;
  overtimeCost: number;
  projectCost: number;
  revenueClaimed: number;
  revenueReceived: number;
  profitOrLoss: number;
  materialPct: number | null;
  wagesPct: number | null;
  profitPct: number | null;
  prevMaterialCost: number | null;
  prevWagesCost: number | null;
  prevProjectCost: number | null;
  materialCostDeltaPct: number | null;
  wagesCostDeltaPct: number | null;
  projectCostDeltaPct: number | null;
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminFortnightMeetingsPage() {
  const { token } = useAuth();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<MeetingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [generating, setGenerating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MeetingSummary | null>(null);

  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(meetings.length / pageSize));
  const paginatedMeetings = useMemo(
    () => meetings.slice((page - 1) * pageSize, page * pageSize),
    [meetings, page, pageSize],
  );

  const loadMeetings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/api/app/admin/fortnight-meetings`;
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = (await res.json().catch(() => null)) as {
        data?: MeetingSummary[];
        error?: string;
        message?: string;
      } | null;
      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to load meetings";
        throw new Error(msg);
      }
      setMeetings(Array.isArray(json?.data) ? json!.data! : []);
      setPage(1);
    } catch (e) {
      console.error("Failed to load meetings", e);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadMeetings();
  }, [token, loadMeetings]);

  function openGenerate() {
    setRangeEnd(new Date().toISOString().slice(0, 10));
    setMeetingDate(new Date().toISOString().slice(0, 10));
    setGenerateOpen(true);
  }

  async function handleGenerate() {
    if (!token) return;
    if (!rangeStart || !rangeEnd) return;
    if (rangeStart >= rangeEnd) return;

    setGenerating(true);
    try {
      const url = `${API_BASE_URL}/api/app/admin/fortnight-meetings`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startDate: rangeStart,
          endDate: rangeEnd,
          meetingOn: meetingDate || undefined,
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to generate";
        throw new Error(msg);
      }

      setGenerateOpen(false);
      setRangeStart("");
      void loadMeetings();
    } catch (e) {
      console.error("Failed to generate meeting", e);
    } finally {
      setGenerating(false);
    }
  }

  async function viewDetail(id: string) {
    if (!token) return;
    setDetailLoading(true);
    try {
      const url = `${API_BASE_URL}/api/app/admin/fortnight-meetings/${id}`;
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = (await res.json().catch(() => null)) as {
        data?: MeetingDetail;
        error?: string;
        message?: string;
      } | null;
      if (!res.ok) {
        const msg =
          json?.error || json?.message || "Failed to load meeting detail";
        throw new Error(msg);
      }
      setDetail(json?.data ?? null);
    } catch (e) {
      console.error("Failed to load meeting detail", e);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    try {
      const url = `${API_BASE_URL}/api/app/admin/fortnight-meetings/${deleteTarget.id}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to delete";
        throw new Error(msg);
      }
      setDeleteTarget(null);
      void loadMeetings();
    } catch (e) {
      console.error("Failed to delete meeting", e);
    }
  }

  if (detail) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-xl font-semibold">Fortnight Meeting Detail</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void loadMeetings()}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {detail.totals && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Material Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {fmtCurrency(detail.totals.totalMaterialCost)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Wages Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {fmtCurrency(detail.totals.totalWagesCost)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Overtime Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {fmtCurrency(detail.totals.totalOvertimeCost)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Project Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {fmtCurrency(detail.totals.totalProjectCost)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="border bg-card rounded overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                    Site
                  </TableHead>
                  <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                    Material
                  </TableHead>
                  <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                    Wages
                  </TableHead>
                  <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                    Overtime
                  </TableHead>
                  <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                    Project Cost
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No site data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  detail.rows.map((r) => (
                    <TableRow
                      key={r.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                    >
                      <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                        <div className="font-medium text-[13px]">
                          {r.site.name}
                        </div>
                        {r.site.code && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {r.site.code}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="border border-zinc-200 px-3 py-1 text-right dark:border-zinc-700 tabular-nums">
                        {fmtCurrency(r.materialCost)}
                      </TableCell>
                      <TableCell className="border border-zinc-200 px-3 py-1 text-right dark:border-zinc-700 tabular-nums">
                        {fmtCurrency(r.wagesCost)}
                      </TableCell>
                      <TableCell className="border border-zinc-200 px-3 py-1 text-right dark:border-zinc-700 tabular-nums">
                        {fmtCurrency(r.overtimeCost)}
                      </TableCell>
                      <TableCell className="border border-zinc-200 px-3 py-1 text-right dark:border-zinc-700 font-semibold tabular-nums">
                        {fmtCurrency(r.projectCost)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fortnight Meetings</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void loadMeetings()}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button onClick={openGenerate} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Generate Report
          </Button>
        </div>
      </div>

      <div className="border bg-card rounded overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Date Range
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                  Meeting Date
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                  Material Cost
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                  Wages Cost
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                  Overtime
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                  Total Cost
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-center dark:border-zinc-700">
                  Sites
                </TableHead>
                <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-right dark:border-zinc-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : meetings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <CalendarCheck className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    No meetings generated yet. Click "Generate Report" to create
                    one.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMeetings.map((m) => (
                  <TableRow
                    key={m.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  >
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                      <div className="font-medium text-[13px]">
                        {fmtDate(m.startDate)} – {fmtDate(m.endDate)}
                      </div>
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-[13px]">
                      {fmtDate(m.meetingOn)}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-right tabular-nums">
                      {m.totals ? fmtCurrency(m.totals.totalMaterialCost) : "—"}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-right tabular-nums">
                      {m.totals ? fmtCurrency(m.totals.totalWagesCost) : "—"}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-right tabular-nums">
                      {m.totals ? fmtCurrency(m.totals.totalOvertimeCost) : "—"}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-right font-semibold tabular-nums">
                      {m.totals ? fmtCurrency(m.totals.totalProjectCost) : "—"}
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-center">
                      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {m.siteCount}
                      </span>
                    </TableCell>
                    <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => void viewDetail(m.id)}
                          disabled={detailLoading}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {meetings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t px-4 py-3 bg-muted/60 text-sm">
            <span className="text-muted-foreground">
              Showing{" "}
              <b>{meetings.length === 0 ? 0 : (page - 1) * pageSize + 1}</b> to{" "}
              <b>{Math.min(page * pageSize, meetings.length)}</b> of{" "}
              <b>{meetings.length}</b>
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

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Fortnight Meeting Report</DialogTitle>
            <DialogDescription>
              Select a date range to calculate material costs and wages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">From Date *</label>
              <Input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">To Date *</label>
              <Input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Meeting Date</label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Meeting"
        description="Are you sure you want to delete this fortnight meeting report? This cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
