import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Loader2, Printer, CalendarDays } from "lucide-react";

import { printSites } from "@/lib/sitesPrint";

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
import SitesTable, { type SiteRow } from "@/components/sites/SitesTable";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

export default function SitesPage() {
  const { token } = useAuth();
  const { refreshRateLimitInfo } = useOffline();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [_fromCache, setFromCache] = useState(false);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"active" | "all">("active");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSites, setSelectedSites] = useState<SiteRow[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateLoading, setDateLoading] = useState(false);

  // Auto-open dialog if ?create=true in URL
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsDialogOpen(true);
      // Remove the param so it doesn't re-trigger
      searchParams.delete("create");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadSites = async (
    forceRefresh = false,
    overrideDateFrom?: string,
    overrideDateTo?: string,
  ) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (show === "active") params.set("isActive", "true");
      const df = overrideDateFrom ?? dateFrom;
      const dt = overrideDateTo ?? dateTo;
      if (df) params.set("dateFrom", df);
      if (dt) params.set("dateTo", dt);

      const result = await cachedFetch<{ sites: SiteRow[] }>(
        `${API_BASE_URL}/api/app/admin/sites?${params.toString()}`,
        {
          cacheKey: `sites-${show}-${df}-${dt}`,
          ttlMs: 10 * 60 * 1000, // 10 minutes
          forceRefresh,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setSites(result.data.sites || []);
      setFromCache(result.fromCache);
      refreshRateLimitInfo();
    } catch (error) {
      console.error("Failed to load sites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, [token, show]);

  const handleApplyDateRange = () => {
    setDateLoading(true);
    loadSites(true).finally(() => setDateLoading(false));
  };

  const handleClearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    // Reload without date filters
    loadSites(true, "", "");
  };

  function getSitesForExport() {
    return selectedSites.length > 0 ? selectedSites : filtered;
  }
  const filtered = sites.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.location && s.location.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading sites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      {/* Controls — single row */}
      <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm px-3 py-2 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 pl-8 text-sm"
            />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* Date range */}
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 w-36 text-sm"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 w-36 text-sm"
          />
          <Button
            size="sm"
            onClick={handleApplyDateRange}
            disabled={dateLoading || (!dateFrom && !dateTo)}
            className="h-8 px-3 text-sm"
          >
            {dateLoading ? "Loading..." : "Apply"}
          </Button>
          {(dateFrom || dateTo) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearDateRange}
              className="h-8 px-3 text-sm"
            >
              Clear
            </Button>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {selectedSites.length > 0 && (
              <span className="text-xs font-medium text-primary mr-1">
                {selectedSites.length} site
                {selectedSites.length === 1 ? "" : "s"} selected
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={filtered.length === 0}
              onClick={() => printSites(getSitesForExport())}
              title={
                selectedSites.length > 0
                  ? `Print ${selectedSites.length} selected`
                  : "Print all"
              }
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={show === "all" ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setShow("all")}
            >
              All
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 px-3">
                  <Plus className="h-3.5 w-3.5" />
                  New Site
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create a New Site</DialogTitle>
                  <DialogDescription>
                    Add a new work site to your organization.
                  </DialogDescription>
                </DialogHeader>
                <CreateSiteForm
                  onSuccess={() => {
                    setIsDialogOpen(false);
                    loadSites();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Sites Table */}
      {filtered.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No sites found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filters, or create a new site to get
            started.
          </p>
        </div>
      ) : (
        <SitesTable data={filtered} onSelectionChange={setSelectedSites} />
      )}
    </div>
  );
}

// Create Site Form (expanded with address, lat, lon)
function CreateSiteForm({ onSuccess }: { onSuccess: () => void }) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Site name is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/app/admin/sites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          location: location.trim() || undefined,
          address: address.trim() || undefined,
          latitude: latitude.trim() ? parseFloat(latitude) : undefined,
          longitude: longitude.trim() ? parseFloat(longitude) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create site");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Failed to create site");
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
        <label className="text-sm font-medium">Site Name *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter site name"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Site Code</label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g., SITE-001"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Location</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Midrand, Gauteng"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Street Address</label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g., 123 Main St, Sandton"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Latitude</label>
          <Input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="-26.2041"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Longitude</label>
          <Input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="28.0473"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Site"}
        </Button>
      </div>
    </form>
  );
}
