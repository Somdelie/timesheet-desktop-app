import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  MapPin,
  Hash,
  Users,
  Loader2,
  Trash2,
  Calendar,
  TrendingUp,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

type SiteDetail = {
  id: string;
  name: string;
  code: string | null;
  location: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: string;
};

type Assignment = {
  id: string;
  personId: string;
  name: string;
  email: string | null;
  startsOn: string;
  endsOn: string | null;
};

type PersonOption = {
  id: string;
  name: string;
  email: string;
};

type WageData = {
  totals: {
    totalDays: number;
    totalWorkers: number;
    totalWages: number;
  };
  daily: Array<{
    date: string;
    workers: number;
    wages: number;
  }>;
  foremen: Array<{
    foremanId: string;
    name: string;
    wages: number;
    days: number;
    workers: number;
  }>;
};

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.DEV ? "" : "http://localhost:3000");

function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2)}`;
}

// Card Component matching web styling
function Card({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded border border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-6 flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// Assignment Row Component
function AssignmentRow({
  assignment,
  onEnd,
  isLoading,
}: {
  assignment: Assignment;
  onEnd: () => void;
  isLoading: boolean;
}) {
  const isActive = !assignment.endsOn;

  return (
    <div className="group flex items-start justify-between gap-3 rounded border border-slate-200/30 bg-slate-50/30 p-4 transition-all hover:bg-slate-100/50 dark:border-slate-700/30 dark:bg-slate-800/20 dark:hover:bg-slate-800/40">
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-semibold text-slate-900 dark:text-white">
          {assignment.name}
        </h4>
        <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
          {assignment.email || "No email"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-full bg-slate-200/40 px-2 py-1 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500 dark:bg-emerald-400" : "bg-slate-400"}`}
            />
            {isActive ? "Active" : "Ended"}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-slate-200/40 px-2 py-1 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300">
            <Calendar className="h-3 w-3" />
            {new Date(assignment.startsOn).toLocaleDateString()}
          </div>
        </div>
      </div>

      {isActive && (
        <Button
          variant="outline"
          size="sm"
          onClick={onEnd}
          disabled={isLoading}
          className="h-9 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-red-500/50 dark:hover:bg-red-500/10"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">End</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export default function SiteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [site, setSite] = useState<SiteDetail | null>(null);
  const [totalProjectWages, setTotalProjectWages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Assignments state
  const [supervisors, setSupervisors] = useState<Assignment[]>([]);
  const [foremen, setForemen] = useState<Assignment[]>([]);
  const [supervisorOptions, setSupervisorOptions] = useState<PersonOption[]>(
    [],
  );
  const [foremanOptions, setForemanOptions] = useState<PersonOption[]>([]);
  const [_assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");
  const [selectedForeman, setSelectedForeman] = useState<string>("");
  const [assigningSuper, setAssigningSuper] = useState(false);
  const [assigningForeman, setAssigningForeman] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  // Wage totals state
  const [wageFrom, setWageFrom] = useState("");
  const [wageTo, setWageTo] = useState("");
  const [wageData, setWageData] = useState<WageData | null>(null);
  const [wageLoading, setWageLoading] = useState(false);

  const hasCoords =
    typeof site?.latitude === "number" && typeof site?.longitude === "number";

  const loadSiteDetails = async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/app/admin/sites/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError("Site not found");
        } else if (res.status === 401) {
          setError("Unauthorized");
        } else {
          setError("Failed to load site details");
        }
        return;
      }

      const data = await res.json();
      setSite(data.site);
      setTotalProjectWages(data.totalProjectWages || 0);

      // Transform assignments to our format
      const sups: Assignment[] = (data.supervisors || []).map((s: any) => ({
        id: s.userId,
        personId: s.userId,
        name: s.name,
        email: s.email,
        startsOn: s.startsOn,
        endsOn: s.endsOn,
      }));
      const fores: Assignment[] = (data.foremen || []).map((f: any) => ({
        id: f.foremanId,
        personId: f.userId,
        name: f.name,
        email: f.email,
        startsOn: f.startsOn,
        endsOn: f.endsOn,
      }));
      setSupervisors(sups);
      setForemen(fores);
    } catch (err) {
      console.error("Failed to load site details:", err);
      setError("Failed to load site details");
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentOptions = async () => {
    if (!token) return;
    setAssignmentsLoading(true);
    try {
      // Load supervisor options
      const supRes = await fetch(
        `${API_BASE_URL}/api/app/admin/users?role=SUPERVISOR`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (supRes.ok) {
        const supData = await supRes.json();
        setSupervisorOptions(
          (supData.users || []).map((u: any) => ({
            id: u.id,
            name: u.name || u.email || "Unknown",
            email: u.email || "",
          })),
        );
      }

      // Load foreman options
      const foreRes = await fetch(
        `${API_BASE_URL}/api/app/admin/users?role=FOREMAN`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (foreRes.ok) {
        const foreData = await foreRes.json();
        setForemanOptions(
          (foreData.users || []).map((u: any) => ({
            id: u.id,
            name: u.name || u.email || "Unknown",
            email: u.email || "",
          })),
        );
      }
    } catch (err) {
      console.error("Failed to load assignment options:", err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const assignSupervisor = async () => {
    if (!selectedSupervisor || !id || !token) return;
    setAssigningSuper(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${id}/supervisors`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: selectedSupervisor }),
        },
      );
      if (res.ok) {
        setSelectedSupervisor("");
        loadSiteDetails();
      }
    } finally {
      setAssigningSuper(false);
    }
  };

  const assignForeman = async () => {
    if (!selectedForeman || !id || !token) return;
    setAssigningForeman(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${id}/foremen`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: selectedForeman }),
        },
      );
      if (res.ok) {
        setSelectedForeman("");
        loadSiteDetails();
      }
    } finally {
      setAssigningForeman(false);
    }
  };

  const endSupervisorAssignment = async (userId: string) => {
    if (!id || !token) return;
    setEndingId(userId);
    try {
      await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${id}/supervisors/${userId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      loadSiteDetails();
    } finally {
      setEndingId(null);
    }
  };

  const endForemanAssignment = async (foremanId: string) => {
    if (!id || !token) return;
    setEndingId(foremanId);
    try {
      await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${id}/foremen/${foremanId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      loadSiteDetails();
    } finally {
      setEndingId(null);
    }
  };

  const generateWageReport = async () => {
    if (!wageFrom || !wageTo || !id || !token) return;
    setWageLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${id}/wages?from=${wageFrom}&to=${wageTo}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setWageData(data);
      }
    } finally {
      setWageLoading(false);
    }
  };

  useEffect(() => {
    loadSiteDetails();
    loadAssignmentOptions();
  }, [token, id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">
            Loading site details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded border border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm p-8 text-center max-w-md">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Site Not Found
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The site you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Link
            to="/sites"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-7xl py-3 px-4">
        {/* Header Navigation */}
        <div className="mb-2">
          <Link
            to="/sites"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sites
          </Link>
        </div>

        {/* Header Card */}
        <div className="mb-3 rounded border border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm p-4 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {site.name}
                </h1>
                {site.isActive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Active
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                {site.code && (
                  <div className="flex items-center">
                    <Hash className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                      Job Number:{" "}
                      <span className="font-mono text-slate-900 dark:text-slate-200">
                        {site.code}
                      </span>
                    </span>
                  </div>
                )}
                {site.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {site.location}
                    </span>
                  </div>
                )}

                {site.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Address: {site.address}
                    </span>
                  </div>
                )}

                {hasCoords && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Pin:{" "}
                      <span className="font-mono text-slate-900 dark:text-slate-200">
                        {site.latitude!.toFixed(6)},{" "}
                        {site.longitude!.toFixed(6)}
                      </span>
                    </span>
                  </div>
                )}

                {!site.address && !hasCoords && (
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-500">
                    No address/pin set yet.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit location
              </Button>

              <div className="rounded border border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-4 text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Total Wages Cost
                </p>
                <p className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                  {formatCurrency(totalProjectWages)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Site Assignments Panel */}
          <Card
            title="Site Assignments"
            description="Manage supervisors and foremen assigned to this site"
            icon={Users}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Supervisors Section */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                  Supervisors
                </h3>

                {/* Add Supervisor */}
                <div className="flex gap-2 mb-4">
                  <Select
                    value={selectedSupervisor}
                    onValueChange={setSelectedSupervisor}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select supervisor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisorOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={assignSupervisor}
                    disabled={!selectedSupervisor || assigningSuper}
                    size="sm"
                  >
                    {assigningSuper ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>

                {/* Supervisor List */}
                <div className="space-y-2">
                  {supervisors.filter((s) => !s.endsOn).length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                      No supervisors assigned
                    </p>
                  ) : (
                    supervisors
                      .filter((s) => !s.endsOn)
                      .map((s) => (
                        <AssignmentRow
                          key={s.id}
                          assignment={s}
                          onEnd={() => endSupervisorAssignment(s.id)}
                          isLoading={endingId === s.id}
                        />
                      ))
                  )}
                </div>
              </div>

              {/* Foremen Section */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                  Foremen
                </h3>

                {/* Add Foreman */}
                <div className="flex gap-2 mb-4">
                  <Select
                    value={selectedForeman}
                    onValueChange={setSelectedForeman}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select foreman..." />
                    </SelectTrigger>
                    <SelectContent>
                      {foremanOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={assignForeman}
                    disabled={!selectedForeman || assigningForeman}
                    size="sm"
                  >
                    {assigningForeman ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>

                {/* Foremen List */}
                <div className="space-y-2">
                  {foremen.filter((f) => !f.endsOn).length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                      No foremen assigned
                    </p>
                  ) : (
                    foremen
                      .filter((f) => !f.endsOn)
                      .map((f) => (
                        <AssignmentRow
                          key={f.id}
                          assignment={f}
                          onEnd={() => endForemanAssignment(f.id)}
                          isLoading={endingId === f.id}
                        />
                      ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Wage Totals Panel */}
          <Card
            title="Wage Totals"
            description="Calculate site wages by date range"
            icon={TrendingUp}
          >
            <div className="space-y-6">
              {/* Date Range Selector */}
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={wageFrom}
                    onChange={(e) => setWageFrom(e.target.value)}
                    disabled={wageLoading}
                    className="dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={wageTo}
                    onChange={(e) => setWageTo(e.target.value)}
                    disabled={wageLoading}
                    className="dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-white"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <Button
                    onClick={generateWageReport}
                    disabled={wageLoading || !wageFrom || !wageTo}
                    className="gap-2"
                  >
                    {wageLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Results */}
              {wageData && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded border border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Total Days
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                        {wageData.totals.totalDays}
                      </p>
                    </div>
                    <div className="rounded border border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Total Workers
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                        {wageData.totals.totalWorkers}
                      </p>
                    </div>
                    <div className="rounded border border-slate-200/50 dark:border-slate-700/50 bg-emerald-50/50 dark:bg-emerald-900/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Total Wages
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(wageData.totals.totalWages)}
                      </p>
                    </div>
                  </div>

                  {/* Foremen Breakdown */}
                  {wageData.foremen && wageData.foremen.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                        By Foreman
                      </h3>
                      <div className="space-y-2">
                        {wageData.foremen.map((f) => (
                          <div
                            key={f.foremanId}
                            className="flex items-center justify-between rounded border border-slate-200/30 bg-slate-50/30 p-3 dark:border-slate-700/30 dark:bg-slate-800/20"
                          >
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {f.name}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {f.days} days, {f.workers} workers
                              </p>
                            </div>
                            <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(f.wages)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Site Location Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Site location
            </DialogTitle>
            <DialogDescription>
              Address and pin are optional. You can save either, both, or none.
            </DialogDescription>
          </DialogHeader>
          <EditSiteLocationForm
            site={site}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              loadSiteDetails();
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Site Location Form
function EditSiteLocationForm({
  site,
  onSuccess,
  onCancel,
}: {
  site: SiteDetail;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const [location, setLocation] = useState(site.location || "");
  const [address, setAddress] = useState(site.address || "");
  const [latitude, setLatitude] = useState(site.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(site.longitude?.toString() || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/sites/${site.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            location: location.trim() || null,
            address: address.trim() || null,
            latitude: latitude.trim() ? parseFloat(latitude) : null,
            longitude: longitude.trim() ? parseFloat(longitude) : null,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update site");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Failed to update site");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label
          htmlFor="location"
          className="text-sm font-semibold text-slate-700 dark:text-slate-300"
        >
          Location label{" "}
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            (Optional)
          </span>
        </Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Midrand, Gauteng"
          disabled={submitting}
          className="dark:bg-slate-800/50 dark:border-slate-700/50"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="address"
          className="text-sm font-semibold text-slate-700 dark:text-slate-300"
        >
          Street address{" "}
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            (Optional)
          </span>
        </Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 123 Main Street, Sandton"
          disabled={submitting}
          className="dark:bg-slate-800/50 dark:border-slate-700/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label
            htmlFor="latitude"
            className="text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            Latitude
          </Label>
          <Input
            id="latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="-26.2041"
            type="number"
            step="any"
            disabled={submitting}
            className="dark:bg-slate-800/50 dark:border-slate-700/50"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="longitude"
            className="text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            Longitude
          </Label>
          <Input
            id="longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="28.0473"
            type="number"
            step="any"
            disabled={submitting}
            className="dark:bg-slate-800/50 dark:border-slate-700/50"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
