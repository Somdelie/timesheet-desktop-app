import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  User,
  Mail,
  CalendarDays,
  Loader2,
  Eye,
  Plus,
  X,
  Briefcase,
  DollarSign,
  Calendar,
  Edit2,
  MoreHorizontal,
  UserPlus,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { cachedFetch } from "@/lib/apiCache";

type ForemanRow = {
  foremanId: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  foreman: {
    id: string;
    defaultDayRate: string | null;
    createdAt: string;
  } | null;
  isAssistant: boolean;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  qrCodeValue: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatMoney(s: string | null) {
  if (!s) return "—";
  const n = Number(String(s).replace(",", "."));
  if (!Number.isFinite(n)) return `R ${s}`;
  return `R ${n.toFixed(2)}`;
}

export default function ForemanPage() {
  const { token, user } = useAuth();
  const { refreshRateLimitInfo } = useOffline();
  const [foremen, setForemen] = useState<ForemanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [_fromCache, setFromCache] = useState(false);
  const [query, setQuery] = useState("");

  // View dialog
  const [selectedForeman, setSelectedForeman] = useState<ForemanRow | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Add assistant dialog
  const [assistantDialogOpen, setAssistantDialogOpen] = useState(false);
  const [selectedForemanForAssistant, setSelectedForemanForAssistant] =
    useState<ForemanRow | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [isNewUserAssistant, setIsNewUserAssistant] = useState(true);
  const [createAssistantLoading, setCreateAssistantLoading] = useState(false);
  const [createAssistantData, setCreateAssistantData] = useState({
    employeeId: "",
    assistantName: "",
    assistantEmail: "",
    assistantPassword: "",
  });

  // Credentials dialog
  const [showCredentials, setShowCredentials] = useState<{
    assistantName: string;
    assistantEmail: string;
    assistantPassword: string;
  } | null>(null);

  // Sorting
  const [sortKey, setSortKey] = useState<"name" | "createdAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadForemen = async (forceRefresh = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);

      const result = await cachedFetch<{ foremen: any[] }>(
        `${API_BASE_URL}/api/app/admin/foremen?${params.toString()}`,
        {
          cacheKey: `foremen-${query}`,
          ttlMs: 10 * 60 * 1000, // 10 minutes
          forceRefresh,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Map API response to ForemanRow format
      const mapped: ForemanRow[] = (result.data.foremen || []).map(
        (f: any) => ({
          foremanId: f.foremanId,
          userId: f.userId,
          name: f.name || "",
          email: f.email,
          role: "FOREMAN",
          createdAt: f.createdAt,
          foreman: {
            id: f.foremanId,
            defaultDayRate: f.defaultDayRate || null,
            createdAt: f.createdAt,
          },
          isAssistant: f.isAssistant || false,
        }),
      );
      setForemen(mapped);
      setFromCache(result.fromCache);
      refreshRateLimitInfo();
    } catch (error) {
      console.error("Failed to load foremen:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (!token) return;
    try {
      const result = await cachedFetch<{ employees: any[] }>(
        `${API_BASE_URL}/api/employees`,
        {
          cacheKey: "employees-for-foremen",
          ttlMs: 10 * 60 * 1000,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setEmployees(
        (result.data.employees || []).map((e: any) => ({
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          qrCodeValue: e.code || e.qrCodeValue || "",
          userId: e.userId,
          userName: e.userName,
          userEmail: e.userEmail,
        })),
      );
      refreshRateLimitInfo();
    } catch (e) {
      console.error("Failed to load employees:", e);
    }
  };

  useEffect(() => {
    loadForemen();
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadForemen();
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // Filtered + sorted data
  const filtered = useMemo(() => {
    let result = foremen;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (f) =>
          (f.name || "").toLowerCase().includes(q) ||
          f.email.toLowerCase().includes(q),
      );
    }
    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.name || "").localeCompare(b.name || "");
      } else if (sortKey === "createdAt") {
        cmp = a.createdAt.localeCompare(b.createdAt);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [foremen, query, sortKey, sortDir]);

  // Paginated
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = useMemo(() => {
    const start = pageIndex * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageIndex, pageSize]);

  const toggleSort = (key: "name" | "createdAt") => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const openDialog = (foreman: ForemanRow) => {
    setSelectedForeman(foreman);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedForeman(null);
  };

  const handleOpenAddAssistant = async (foreman: ForemanRow) => {
    setSelectedForemanForAssistant(foreman);
    setSelectedEmployee(null);
    setIsNewUserAssistant(true);
    setCreateAssistantData({
      employeeId: "",
      assistantName: "",
      assistantEmail: "",
      assistantPassword: "",
    });
    await loadEmployees();
    setAssistantDialogOpen(true);
  };

  const handleSelectEmployeeForAssistant = (emp: Employee) => {
    setSelectedEmployee(emp);
    setCreateAssistantData({
      employeeId: emp.id,
      assistantName: emp.userId ? emp.userName || "" : "",
      assistantEmail: emp.userId ? emp.userEmail || "" : "",
      assistantPassword: "",
    });
    setIsNewUserAssistant(!emp.userId);
  };

  const handleCreateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForemanForAssistant?.foreman?.id) {
      alert("No foreman selected");
      return;
    }
    if (!createAssistantData.employeeId) {
      alert("Please select an employee");
      return;
    }
    if (isNewUserAssistant && !createAssistantData.assistantPassword) {
      alert("Password is required for new users");
      return;
    }
    if (
      isNewUserAssistant &&
      createAssistantData.assistantPassword.length < 8
    ) {
      alert("Password must be at least 8 characters");
      return;
    }

    setCreateAssistantLoading(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/app/admin/foremen/${selectedForemanForAssistant.foreman.id}/assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeeId: createAssistantData.employeeId,
            assistantName: createAssistantData.assistantName,
            assistantEmail: createAssistantData.assistantEmail,
            assistantPassword: createAssistantData.assistantPassword,
          }),
        },
      );

      if (res.ok) {
        const result = await res.json();
        setShowCredentials({
          assistantName:
            result.assistant?.assistantName ||
            createAssistantData.assistantName,
          assistantEmail:
            result.assistant?.assistantEmail ||
            createAssistantData.assistantEmail,
          assistantPassword: createAssistantData.assistantPassword,
        });
        setAssistantDialogOpen(false);
        setCreateAssistantData({
          employeeId: "",
          assistantName: "",
          assistantEmail: "",
          assistantPassword: "",
        });
        loadForemen();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `HTTP ${res.status}`);
      }
    } catch (e: any) {
      alert(e?.message || "Failed to create assistant");
    } finally {
      setCreateAssistantLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading foremen...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 ">
        {/* Search */}
        <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm px-5 py-3 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row items-end sm:justify-between">
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Search Foremen, Manage all foremen in the system.
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <Button asChild className="gap-2" size="lg">
              <Link to="/users/new">
                <Plus className="h-4 w-4" />
                Create Foreman
              </Link>
            </Button>
          </div>
        </div>

        {/* Table */}
        {paged.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No foremen found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or create a new foreman to get started.
            </p>
          </div>
        ) : (
          <div className="border bg-card rounded overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("name")}
                      >
                        <User className="h-3 w-3" />
                        Name
                        {sortKey === "name" ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        Email
                      </div>
                    </TableHead>
                    <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        Day Rate
                      </div>
                    </TableHead>
                    <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700">
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("createdAt")}
                      >
                        <CalendarDays className="h-3 w-3" />
                        Added
                        {sortKey === "createdAt" ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:border-zinc-700 text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((foreman) => {
                    const name = foreman.name || "—";
                    const initials =
                      name !== "—"
                        ? name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                        : "?";

                    return (
                      <TableRow
                        key={foreman.foremanId}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                      >
                        <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border bg-primary text-white text-xs font-semibold">
                              {initials}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{name}</span>
                              {foreman.isAssistant && (
                                <Badge
                                  variant="secondary"
                                  className="text-[11px] bg-orange-700/20 text-orange-700 dark:bg-orange-300/20 dark:text-orange-300"
                                >
                                  Assistant
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                          <span className="text-sm">{foreman.email}</span>
                        </TableCell>
                        <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                          {foreman.isAssistant ? (
                            <span className="text-xs text-muted-foreground italic">
                              Assistant
                            </span>
                          ) : (
                            <span className="text-sm">
                              {formatMoney(
                                foreman.foreman?.defaultDayRate ?? null,
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-xs">
                          {formatDate(foreman.createdAt)}
                        </TableCell>
                        <TableCell className="border border-zinc-200 px-3 py-1 dark:border-zinc-700 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                aria-label="Row actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                className="flex items-center gap-2"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  openDialog(foreman);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {!foreman.isAssistant &&
                                user?.role === "ADMIN" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="flex items-center gap-2"
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        handleOpenAddAssistant(foreman);
                                      }}
                                    >
                                      <UserPlus className="h-4 w-4" />
                                      Add Assistant
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t px-4 py-3 bg-muted/60 text-sm">
              <span className="text-muted-foreground">
                Showing{" "}
                <b>{filtered.length === 0 ? 0 : pageIndex * pageSize + 1}</b> to{" "}
                <b>{Math.min((pageIndex + 1) * pageSize, filtered.length)}</b>{" "}
                of <b>{filtered.length}</b>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Rows</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPageIndex(0)}
                    disabled={pageIndex === 0}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    disabled={pageIndex === 0}
                  >
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
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPageIndex(totalPages - 1)}
                    disabled={pageIndex >= totalPages - 1}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Foreman Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md border-0 shadow-lg">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                Foreman Details
              </DialogTitle>
              <button
                onClick={closeDialog}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </DialogHeader>

          {selectedForeman && (
            <div className="space-y-5 py-4 grid grid-cols-2 gap-4">
              {/* Name */}
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-sky-50 dark:bg-sky-950 rounded">
                  <User size={18} className="text-sky-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                    NAME
                  </p>
                  <p className="mt-1.5 font-semibold text-foreground">
                    {selectedForeman.name}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-emerald-50 dark:bg-emerald-950 rounded">
                  <Mail size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                    EMAIL
                  </p>
                  <p className="mt-1.5 font-semibold text-foreground break-all">
                    {selectedForeman.email}
                  </p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-purple-50 dark:bg-purple-950 rounded">
                  <Briefcase size={18} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                    ROLE
                  </p>
                  <p className="mt-1.5 font-semibold text-foreground">
                    {selectedForeman.role}
                  </p>
                </div>
              </div>

              {/* Default Day Rate */}
              {selectedForeman.foreman?.defaultDayRate && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950 rounded">
                    <DollarSign size={18} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                      DEFAULT DAY RATE
                    </p>
                    <p className="mt-1.5 font-semibold text-foreground">
                      R {selectedForeman.foreman.defaultDayRate}
                    </p>
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-muted rounded">
                  <Calendar size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                    CREATED
                  </p>
                  <p className="mt-1.5 font-semibold text-foreground">
                    {formatDate(selectedForeman.createdAt)}
                  </p>
                </div>
              </div>

              {/* Foreman Created Date */}
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-muted rounded">
                  <Calendar size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                    FOREMAN CREATED
                  </p>
                  <p className="mt-1.5 font-semibold text-foreground">
                    {selectedForeman.foreman?.createdAt
                      ? formatDate(selectedForeman.foreman.createdAt)
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="col-span-2 flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => {
                    console.log("Edit foreman:", selectedForeman);
                  }}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium h-10 gap-2"
                >
                  <Edit2 size={16} />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={closeDialog}
                  className="flex-1 font-medium h-10 border-border hover:bg-muted"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Assistant Dialog */}
      <Dialog open={assistantDialogOpen} onOpenChange={setAssistantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assistant</DialogTitle>
            <DialogDescription>
              Create an assistant account for{" "}
              {selectedForemanForAssistant?.name ||
                selectedForemanForAssistant?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAssistant} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Employee</label>
              <Select
                value={createAssistantData.employeeId}
                onValueChange={(value) => {
                  const emp = employees.find((e) => e.id === value);
                  if (emp) {
                    handleSelectEmployeeForAssistant(emp);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No employees available
                    </div>
                  ) : (
                    employees.map((emp) => (
                      <SelectItem
                        key={emp.id}
                        value={emp.id}
                        className="border-b"
                      >
                        <span>
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({emp.qrCodeValue})
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedEmployee && (
              <div className="rounded bg-blue-50 dark:bg-blue-950 p-3 text-sm">
                {isNewUserAssistant ? (
                  <p className="text-muted-foreground">
                    Creating new user account for this employee
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Linking existing user account
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">
                Assistant Name {!isNewUserAssistant && "(Auto-filled)"}
              </label>
              <Input
                type="text"
                placeholder="Assistant name"
                value={createAssistantData.assistantName}
                onChange={(e) =>
                  setCreateAssistantData({
                    ...createAssistantData,
                    assistantName: e.target.value,
                  })
                }
                disabled={!isNewUserAssistant}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Assistant Email {!isNewUserAssistant && "(Auto-filled)"}
              </label>
              <Input
                type="email"
                placeholder="assistant@example.com"
                value={createAssistantData.assistantEmail}
                onChange={(e) =>
                  setCreateAssistantData({
                    ...createAssistantData,
                    assistantEmail: e.target.value,
                  })
                }
                disabled={!isNewUserAssistant}
                required
              />
            </div>
            {isNewUserAssistant && (
              <div>
                <label className="text-sm font-medium">
                  Assistant Password
                </label>
                <Input
                  type="password"
                  placeholder="Min 8 characters"
                  value={createAssistantData.assistantPassword}
                  onChange={(e) =>
                    setCreateAssistantData({
                      ...createAssistantData,
                      assistantPassword: e.target.value,
                    })
                  }
                  required
                  minLength={8}
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssistantDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAssistantLoading}>
                {createAssistantLoading ? "Creating..." : "Create Assistant"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      {showCredentials && (
        <Dialog
          open={!!showCredentials}
          onOpenChange={() => setShowCredentials(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assistant Created Successfully</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please save these credentials securely:
              </p>
              <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded space-y-4 border border-border">
                <div>
                  <label className="text-sm font-semibold block mb-2">
                    Name
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background dark:bg-slate-900 p-3 rounded border border-border text-sm font-mono select-all">
                      {showCredentials.assistantName}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          showCredentials.assistantName,
                        );
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2">
                    Email
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background dark:bg-slate-900 p-3 rounded border border-border text-sm font-mono select-all break-all">
                      {showCredentials.assistantEmail}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          showCredentials.assistantEmail,
                        );
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2">
                    Password
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background dark:bg-slate-900 p-3 rounded border border-border text-sm font-mono select-all">
                      {showCredentials.assistantPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          showCredentials.assistantPassword,
                        );
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
              <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-900">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  ℹ️ Share these credentials with the assistant securely. They
                  will not be shown again.
                </p>
              </div>
              <Button
                onClick={() => setShowCredentials(null)}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
