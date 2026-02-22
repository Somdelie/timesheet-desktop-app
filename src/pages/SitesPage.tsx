import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Loader2, Download } from "lucide-react";

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
  import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.DEV ? "" : "http://localhost:3000");

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

  // Auto-open dialog if ?create=true in URL
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsDialogOpen(true);
      // Remove the param so it doesn't re-trigger
      searchParams.delete("create");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadSites = async (forceRefresh = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (show === "active") params.set("isActive", "true");

      const result = await cachedFetch<{ sites: SiteRow[] }>(
        `${API_BASE_URL}/api/app/admin/sites?${params.toString()}`,
        {
          cacheKey: `sites-${show}-${query}`,
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

  const handleSearch = () => {
    loadSites(true); // Force refresh on manual search
  };

  const filtered = sites;

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
      {/* Controls */}
      <div className="rounded border border-zinc-200/50 bg-white/80 backdrop-blur-sm p-3 shadow-sm transition-all hover:shadow-md dark:border-zinc-700/50 dark:bg-card/40">
        <div className="flex flex-col gap-4 sm:flex-row items-end sm:justify-between">
          <div className="flex-3">
            <label
              htmlFor="search"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Search Sites Manage and organize all your work sites in one place.
              Use the search to quickly find sites by name, code, or location.
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                <Input
                  id="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Search by name, code, location..."
                  className="h-10 pl-9 dark:bg-zinc-800/50 dark:border-zinc-700/50 dark:text-white dark:placeholder-zinc-500"
                />
              </div>
              <Button
                variant="outline"
                className="h-10 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:text-white dark:hover:bg-zinc-700/50"
                disabled={filtered.length === 0}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-1 gap-2">
            <Button
              variant={show === "active" ? "default" : "outline"}
              className="h-10 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:text-white dark:hover:bg-zinc-700/50"
              onClick={() => setShow("active")}
            >
              Active
            </Button>
            <Button
              variant={show === "all" ? "default" : "outline"}
              className="h-10 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:text-white dark:hover:bg-zinc-700/50"
              onClick={() => setShow("all")}
            >
              All
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" size="lg">
                  <Plus className="h-4 w-4" />
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
        <div className="rounded border border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-700/50 dark:bg-card/30">
          <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-slate-950 flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            No sites found
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Try adjusting your search or filters, or create a new site to get
            started.
          </p>
        </div>
      ) : (
        <SitesTable data={filtered} />
      )}
    </div>
  );
}

// Simplified Create Site Form
function CreateSiteForm({ onSuccess }: { onSuccess: () => void }) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
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
          placeholder="e.g., 123 Main St, City"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Site"}
        </Button>
      </div>
    </form>
  );
}
