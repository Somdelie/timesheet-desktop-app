import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { cachedFetch } from "@/lib/apiCache";
import EmployeesTable, {
  type Employee,
} from "@/components/employees/EmployeesTable";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

export default function EmployeesPage() {
  const { token } = useAuth();
  const { refreshRateLimitInfo } = useOffline();
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [_fromCache, setFromCache] = useState(false);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"active" | "all">("active");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Auto-open dialog if ?create=true in URL
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsDialogOpen(true);
      // Remove the param so it doesn't re-trigger
      searchParams.delete("create");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadEmployees = async (forceRefresh = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("show", show);

      const result = await cachedFetch<{
        employees: (Employee & { photoUrl?: string | null })[];
      }>(`${API_BASE_URL}/api/employees?${params.toString()}`, {
        cacheKey: `employees-${show}`,
        ttlMs: 10 * 60 * 1000, // 10 minutes
        forceRefresh,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Map photoUrl to faceImageUrl for table component compatibility
      const mappedEmployees = (result.data.employees || []).map((e) => ({
        ...e,
        faceImageUrl: e.faceImageUrl ?? e.photoUrl ?? null,
      }));
      setEmployees(mappedEmployees);
      setFromCache(result.fromCache);
      refreshRateLimitInfo();
    } catch (error) {
      console.error("Failed to load employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [token, show]);

  const filtered = employees.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const fullName = e.fullName ?? `${e.firstName} ${e.lastName}`;
    return (
      fullName.toLowerCase().includes(q) ||
      (e.code ?? "").toLowerCase().includes(q) ||
      (e.qrCodeValue ?? "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      {/* Header row */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Workers visible to you based on your role.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="lg">
              <Plus className="h-4 w-4" />
              New Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create a New Employee</DialogTitle>
              <DialogDescription>
                Add a new worker to your organization.
              </DialogDescription>
            </DialogHeader>
            <CreateEmployeeForm
              onSuccess={() => {
                setIsDialogOpen(false);
                loadEmployees();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search controls */}
      <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-3 shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row items-end sm:justify-between">
          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQuery("");
                }}
                placeholder="Search by name or QR code..."
                className="h-10 pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={show === "active" ? "default" : "outline"}
              className="h-10"
              onClick={() => setShow("active")}
            >
              Active
            </Button>
            <Button
              variant={show === "all" ? "default" : "outline"}
              className="h-10"
              onClick={() => setShow("all")}
            >
              All
            </Button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      {filtered.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No employees found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust your filters or add a new employee.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <EmployeesTable data={filtered} />
        </div>
      )}
    </div>
  );
}

// Create Employee Form (with phone field)
function CreateEmployeeForm({ onSuccess }: { onSuccess: () => void }) {
  const { token } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create employee");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Failed to create employee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">First Name *</label>
        <Input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Enter first name"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Last Name *</label>
        <Input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Enter last name"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Phone</label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 0812345678"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}
