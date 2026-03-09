import { useEffect, useState } from "react";
import {
  Loader2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Users,
  MapPin,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type Preview = {
  inactiveEmployees: number;
  inactiveSites: number;
  paidTimesheets: number;
};

type CleanupResult = {
  task: string;
  deletedCount?: number;
  prunedCount?: number;
  employees?: { id: string; name: string }[];
  sites?: { id: string; name: string }[];
};

export default function AdminCleanupPage() {
  const { token } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cleanup action states
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);

  // Confirmation dialogs
  const [confirmTask, setConfirmTask] = useState<string | null>(null);

  const loadPreview = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/cleanup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load preview");
      setPreview(json?.preview || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const runTask = async (task: string) => {
    if (!token) return;
    setTaskLoading(true);
    setActiveTask(task);
    setLastResult(null);
    setConfirmTask(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/cleanup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ task }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Cleanup failed");
      setLastResult(json);
      loadPreview(); // Refresh preview
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cleanup failed");
    } finally {
      setTaskLoading(false);
      setActiveTask(null);
    }
  };

  if (loading && !preview) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading cleanup preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Admin Cleanup
          </h1>
          <p className="text-sm text-muted-foreground">
            Remove stale data: inactive employees, inactive sites, and prune
            paid timesheet scan data.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={loadPreview}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {lastResult && (
        <div className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded">
          <strong>Cleanup complete:</strong>{" "}
          {lastResult.task === "prune-paid"
            ? `Pruned ${lastResult.prunedCount || 0} paid timesheet scan records.`
            : `Deleted ${lastResult.deletedCount || 0} ${lastResult.task === "inactive-employees" ? "inactive employees" : "inactive sites"}.`}
          {lastResult.employees && lastResult.employees.length > 0 && (
            <ul className="mt-1 ml-4 list-disc">
              {lastResult.employees.map((e) => (
                <li key={e.id}>{e.name}</li>
              ))}
            </ul>
          )}
          {lastResult.sites && lastResult.sites.length > 0 && (
            <ul className="mt-1 ml-4 list-disc">
              {lastResult.sites.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {preview && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Inactive Employees */}
          <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-sm">Inactive Employees</h3>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {preview.inactiveEmployees}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              No scans in the last 2 months
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              disabled={taskLoading || preview.inactiveEmployees === 0}
              onClick={() => setConfirmTask("inactive-employees")}
            >
              {activeTask === "inactive-employees" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove
            </Button>
          </div>

          {/* Inactive Sites */}
          <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-sm">Inactive Sites</h3>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {preview.inactiveSites}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              No scans in the last 6 months
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              disabled={taskLoading || preview.inactiveSites === 0}
              onClick={() => setConfirmTask("inactive-sites")}
            >
              {activeTask === "inactive-sites" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove
            </Button>
          </div>

          {/* Prune Paid */}
          <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-sm">Paid Timesheets</h3>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {preview.paidTimesheets}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Scan data that can be pruned
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              disabled={taskLoading || preview.paidTimesheets === 0}
              onClick={() => setConfirmTask("prune-paid")}
            >
              {activeTask === "prune-paid" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Prune
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={!!confirmTask}
        onOpenChange={(open) => !open && setConfirmTask(null)}
        title={`Run Cleanup: ${confirmTask === "inactive-employees" ? "Inactive Employees" : confirmTask === "inactive-sites" ? "Inactive Sites" : "Prune Paid Timesheets"}`}
        description={
          confirmTask === "inactive-employees"
            ? `This will permanently delete ${preview?.inactiveEmployees || 0} employees who have not been scanned in the last 2 months.`
            : confirmTask === "inactive-sites"
              ? `This will permanently delete ${preview?.inactiveSites || 0} sites with no scans in the last 6 months.`
              : `This will prune scan data from ${preview?.paidTimesheets || 0} paid timesheets to free up storage.`
        }
        confirmLabel="Run Cleanup"
        variant="destructive"
        loading={taskLoading}
        onConfirm={() => confirmTask && runTask(confirmTask)}
      />
    </div>
  );
}
