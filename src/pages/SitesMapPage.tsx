import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Search, RotateCcw, Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

type SiteMapMarker = {
  id: string;
  name: string;
  code?: string | null;
  lat: number;
  lng: number;
  region?: string;
  status?: "active" | "warning" | "error";
};

type SiteRow = {
  id: string;
  name: string;
  code: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
};

export default function SitesMapPage() {
  const { token } = useAuth();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const mapInitializedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteMapMarker[]>([]);

  const [selectedSite, setSelectedSite] = useState<SiteMapMarker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [is3D, setIs3D] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "issues">(
    "all",
  );

  // Detect dark mode
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Fetch sites from API
  useEffect(() => {
    if (!token) return;

    let alive = true;

    async function fetchSites() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/app/admin/sites?isActive=true`,
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
          throw new Error(data?.error || "Failed to load sites");
        }

        const rawSites: SiteRow[] = Array.isArray(data.sites) ? data.sites : [];

        // Filter to only sites with coordinates
        const markers: SiteMapMarker[] = rawSites
          .filter(
            (s) =>
              typeof s.latitude === "number" && typeof s.longitude === "number",
          )
          .map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            lat: s.latitude as number,
            lng: s.longitude as number,
            region: s.location ?? undefined,
            status: s.isActive ? "active" : "warning",
          }));

        setSites(markers);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load sites");
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchSites();
    return () => {
      alive = false;
    };
  }, [token]);

  // Filter sites by search query and tab
  const filteredSites = useMemo(() => {
    let list = sites;

    // Filter by tab
    if (activeTab === "active") {
      list = list.filter((s) => s.status === "active");
    } else if (activeTab === "issues") {
      list = list.filter((s) => s.status === "warning" || s.status === "error");
    }

    // Filter by search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const haystack = [s.name, s.code ?? "", s.region ?? ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return list;
  }, [sites, searchQuery, activeTab]);

  // Initialize map
  useEffect(() => {
    if (mapInitializedRef.current) return;
    if (!MAPBOX_TOKEN) {
      setError("Missing VITE_MAPBOX_TOKEN environment variable");
      return;
    }
    if (!containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11",
      center: [24.5, -29.5], // South Africa
      zoom: 4.5,
      pitch: 45,
      bearing: -15,
      antialias: true,
      attributionControl: false,
    });

    mapRef.current = map;
    mapInitializedRef.current = true;

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      try {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.terrain-rgb",
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

        const layers = map.getStyle().layers;
        const labelLayerId = layers.find(
          (layer) => layer.type === "symbol" && layer.layout?.["text-field"],
        )?.id;

        map.addLayer(
          {
            id: "add-3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 10,
            paint: {
              "fill-extrusion-color": isDark ? "#1e293b" : "#b0bec5",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.6,
            },
          },
          labelLayerId,
        );

        map.addLayer({
          id: "building-outline",
          source: "composite",
          "source-layer": "building",
          type: "line",
          minzoom: 14,
          paint: {
            "line-color": isDark ? "#475569" : "#999",
            "line-width": 0.5,
            "line-opacity": 0.3,
          },
        });
      } catch {
        // Layers may already exist
      }
    });

    return () => {
      // Keep map alive for re-renders
    };
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    if (!mapRef.current || !mapInitializedRef.current) return;

    const map = mapRef.current;
    const newStyle = isDark
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";

    map.setStyle(newStyle);

    map.once("style.load", () => {
      try {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.terrain-rgb",
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

        const layers = map.getStyle().layers;
        const labelLayerId = layers.find(
          (layer) => layer.type === "symbol" && layer.layout?.["text-field"],
        )?.id;

        map.addLayer(
          {
            id: "add-3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 10,
            paint: {
              "fill-extrusion-color": isDark ? "#1e293b" : "#b0bec5",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.6,
            },
          },
          labelLayerId,
        );

        map.addLayer({
          id: "building-outline",
          source: "composite",
          "source-layer": "building",
          type: "line",
          minzoom: 14,
          paint: {
            "line-color": isDark ? "#475569" : "#999",
            "line-width": 0.5,
            "line-opacity": 0.3,
          },
        });
      } catch {
        // Layers may error if already present
      }

      // Re-add markers after style change
      addMarkersToMap(filteredSites);
    });
  }, [isDark]);

  // Add markers to map
  const addMarkersToMap = useCallback(
    (sitesToAdd: SiteMapMarker[]) => {
      if (!mapRef.current) return;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      sitesToAdd.forEach((site) => {
        const marker = new mapboxgl.Marker({
          color: getMarkerColor(site, selectedSite, hoveredId),
        })
          .setLngLat([site.lng, site.lat])
          .addTo(mapRef.current!);

        const element = marker.getElement();
        element.style.cursor = "pointer";
        element.style.transition = "all 0.3s ease";

        element.addEventListener("click", () => {
          setSelectedSite(site);
          focusSite(site);
        });

        element.addEventListener("mouseenter", () => {
          setHoveredId(site.id);
        });

        element.addEventListener("mouseleave", () => {
          setHoveredId(null);
        });

        markersRef.current.set(site.id, marker);
      });
    },
    [selectedSite, hoveredId, is3D],
  );

  // Update markers when filtered sites change
  useEffect(() => {
    if (!mapRef.current || !mapInitializedRef.current) return;
    addMarkersToMap(filteredSites);
  }, [filteredSites, addMarkersToMap]);

  // Update marker colors when selection/hover changes
  useEffect(() => {
    if (!mapRef.current || !mapInitializedRef.current) return;

    filteredSites.forEach((site) => {
      const marker = markersRef.current.get(site.id);
      if (marker) {
        const newColor = getMarkerColor(site, selectedSite, hoveredId);
        const element = marker.getElement();
        element.style.filter =
          hoveredId === site.id
            ? "drop-shadow(0 0 8px rgba(0, 0, 0, 0.3))"
            : "";
        const svg = element.querySelector("svg") as SVGElement | null;
        if (svg) svg.style.fill = newColor;
      }
    });
  }, [filteredSites, selectedSite, hoveredId]);

  // Clear selection if it's no longer in filtered list
  useEffect(() => {
    if (!selectedSite) return;
    if (!filteredSites.some((s) => s.id === selectedSite.id)) {
      setSelectedSite(null);
    }
  }, [filteredSites, selectedSite]);

  function focusSite(site: SiteMapMarker) {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [site.lng, site.lat],
      zoom: 16,
      pitch: is3D ? 60 : 0,
      bearing: is3D ? -25 : 0,
      duration: 1000,
    });
  }

  function handleSiteClick(site: SiteMapMarker) {
    setSelectedSite(site);
    focusSite(site);
  }

  function handleReset() {
    setSelectedSite(null);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [24.5, -29.5],
        zoom: 4.5,
        pitch: is3D ? 45 : 0,
        bearing: is3D ? -15 : 0,
        duration: 1000,
      });
    }
  }

  function toggle3D() {
    if (mapRef.current) {
      const newIs3D = !is3D;
      setIs3D(newIs3D);
      mapRef.current.flyTo({
        pitch: newIs3D ? 45 : 0,
        bearing: newIs3D ? -15 : 0,
        duration: 1000,
      });
    }
  }

  function getStatusColor(status?: string) {
    switch (status) {
      case "warning":
        return "#f59e0b";
      case "error":
        return "#ef4444";
      default:
        return "#10b981";
    }
  }

  const searchIsActive = searchQuery.trim().length > 0;
  const locationCountLabel = searchIsActive
    ? `${filteredSites.length} of ${sites.length}`
    : `${sites.length}`;

  if (error && !MAPBOX_TOKEN) {
    return (
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground" />
        <div className="text-lg font-medium text-muted-foreground">{error}</div>
        <p className="text-sm text-muted-foreground">
          Please add VITE_MAPBOX_TOKEN to your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] w-full">
      {/* Map Container */}
      <div className="relative flex-1">
        <div ref={containerRef} className="h-full w-full" />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
            <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading sites...</span>
          </div>
        )}

        {/* Header Overlay */}
        <div className="absolute left-5 top-5 z-10 rounded border border-border bg-card p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-teal-600" />
            <div>
              <div className="text-base font-bold text-foreground">
                Sites Map
              </div>
              <div className="text-xs text-muted-foreground">
                {searchIsActive
                  ? `${filteredSites.length} of ${sites.length} locations`
                  : `${sites.length} locations`}
              </div>
            </div>
          </div>
        </div>

        {/* 3D Toggle Button */}
        <button
          onClick={toggle3D}
          className="absolute bottom-20 right-5 z-10 flex items-center gap-1.5 rounded border border-border bg-card px-3.5 py-2.5 text-sm font-semibold text-teal-700 shadow-lg transition-all hover:bg-muted dark:text-teal-400"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            <path d="M12 22V2" />
            <path d="M2 7h20" />
          </svg>
          {is3D ? "2D" : "3D"}
        </button>
      </div>

      {/* Right Panel */}
      <div className="flex w-80 flex-col border-l border-border bg-card">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">Sites Locations</h2>
          <Badge
            variant="secondary"
            className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-400"
          >
            {locationCountLabel}
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchQuery("");
              }}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border px-4 pb-3">
          {(["all", "active", "issues"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded px-3 py-2 text-sm font-semibold transition-all ${
                activeTab === tab
                  ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Sites List */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredSites.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              No matching sites.
            </div>
          ) : (
            filteredSites.map((site) => (
              <div
                key={site.id}
                onClick={() => handleSiteClick(site)}
                onMouseEnter={() => setHoveredId(site.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`mb-1.5 flex cursor-pointer items-center justify-between rounded border-b-4 p-3 transition-all ${
                  selectedSite?.id === site.id
                    ? "border-green-300 bg-green-100 dark:border-teal-500 dark:bg-teal-700"
                    : hoveredId === site.id
                      ? "border-green-200 bg-green-50 dark:border-teal-700 dark:bg-teal-900"
                      : "border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getStatusColor(site.status) }}
                  />
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {site.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {site.code}
                    </div>
                  </div>
                </div>
                {site.region && (
                  <div className="text-xs font-medium text-muted-foreground">
                    {site.region}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {selectedSite && (
          <div className="p-3">
            <Button
              onClick={handleReset}
              variant="default"
              className="w-full bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset View
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function getMarkerColor(
  site: SiteMapMarker,
  selectedSite: SiteMapMarker | null,
  hoveredId: string | null,
): string {
  if (selectedSite?.id === site.id) return "#0f766e";
  if (hoveredId === site.id) return "#14b8a6";

  switch (site.status) {
    case "error":
      return "#dc2626";
    case "warning":
      return "#f59e0b";
    default:
      return "#0d9488";
  }
}
