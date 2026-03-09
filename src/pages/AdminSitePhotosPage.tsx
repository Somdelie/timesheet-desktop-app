import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ImageIcon,
  RefreshCw,
  X,
  Check,
  XCircle,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

interface SitePhoto {
  id: string;
  imageUrl: string;
  dateTakenISO: string;
  uploadedAtISO: string;
  siteName: string;
  siteId: string;
  foremanName: string;
  foremanId: string;
  supervisorName: string | null;
  supervisorId: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "FLAGGED" | "REJECTED";
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

interface FilterOption {
  id: string;
  name: string;
}

interface GroupedPhotos {
  label: string;
  date: string;
  photos: SitePhoto[];
}

function formatDateHeading(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const photoDate = new Date(dateStr);
  photoDate.setHours(0, 0, 0, 0);

  if (photoDate.getTime() === today.getTime()) {
    return "Today's Submissions";
  }
  if (photoDate.getTime() === yesterday.getTime()) {
    return "Yesterday's Submissions";
  }

  return photoDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

function groupPhotosByDate(photos: SitePhoto[]): GroupedPhotos[] {
  const groups: Record<string, SitePhoto[]> = {};

  for (const photo of photos) {
    const dateKey = photo.dateTakenISO.split("T")[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(photo);
  }

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return sortedDates.map((date) => ({
    label: formatDateHeading(date),
    date,
    photos: groups[date],
  }));
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "VERIFIED":
      return "default";
    case "FLAGGED":
      return "destructive";
    case "REJECTED":
      return "destructive";
    default:
      return "secondary";
  }
}

export default function AdminSitePhotosPage() {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<SitePhoto | null>(null);
  const [foremen, setForemen] = useState<FilterOption[]>([]);
  const [supervisors, setSupervisors] = useState<FilterOption[]>([]);
  const [selectedForemanId, setSelectedForemanId] = useState<string>("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
  const [verifying, setVerifying] = useState(false);

  const loadPhotos = async (foremanId?: string, supervisorId?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (foremanId) params.set("foremanId", foremanId);
      if (supervisorId) params.set("supervisorId", supervisorId);
      const url = `${API_BASE}/api/app/admin/site-day-photos${
        params.toString() ? `?${params}` : ""
      }`;
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to load photos");
      }
      const data = await res.json();
      setPhotos(data.photos || []);
      if (!foremanId && !supervisorId) {
        setForemen(data.foremen || []);
        setSupervisors(data.supervisors || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [token]);

  const handleVerify = async (
    photoId: string,
    status: "VERIFIED" | "REJECTED",
  ) => {
    if (!token) return;
    setVerifying(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/app/admin/site-day-photos/${photoId}/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update verification status");
      }
      toast.success(
        status === "VERIFIED"
          ? "Photo verified"
          : "Photo rejected - foreman notified",
      );

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, verificationStatus: status } : p,
        ),
      );
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto((prev) =>
          prev ? { ...prev, verificationStatus: status } : null,
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update verification status");
    } finally {
      setVerifying(false);
    }
  };

  const groupedPhotos = groupPhotosByDate(photos);

  const handleForemanChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setSelectedForemanId(newValue);
    loadPhotos(newValue, selectedSupervisorId);
  };

  const handleSupervisorChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setSelectedSupervisorId(newValue);
    loadPhotos(selectedForemanId, newValue);
  };

  const clearFilters = () => {
    setSelectedForemanId("");
    setSelectedSupervisorId("");
    loadPhotos();
  };

  const hasFilters = selectedForemanId || selectedSupervisorId;

  return (
    <div className="">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Photos</h1>
          <p className="text-muted-foreground">
            Review photos submitted by foremen in the last 7 days
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedSupervisorId || "all"}
            onValueChange={handleSupervisorChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Supervisors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Supervisors</SelectItem>
              {supervisors.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedForemanId || "all"}
            onValueChange={handleForemanChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Foremen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Foremen</SelectItem>
              {foremen.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPhotos(selectedForemanId, selectedSupervisorId)}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : groupedPhotos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No photos found for the selected filters
        </div>
      ) : (
        <div className="space-y-4">
          {groupedPhotos.map((group) => (
            <div key={group.date} className="space-y-4 border-b pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{group.label}</h2>
                <span className="text-sm text-muted-foreground">
                  {group.photos.length} photo(s)
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.photos.map((photo) => (
                  <Card
                    key={photo.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle className="text-base">
                          {photo.siteName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {photo.foremanName}
                        </p>
                      </div>
                      <Badge
                        variant={getStatusVariant(photo.verificationStatus)}
                      >
                        {photo.verificationStatus}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex h-40 items-center justify-center rounded bg-muted">
                        {photo.imageUrl ? (
                          <img
                            src={photo.imageUrl}
                            alt={photo.siteName}
                            className="h-full w-full rounded object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Taken: {new Date(photo.dateTakenISO).toLocaleString()}
                        </span>
                        <span>
                          Uploaded:{" "}
                          {new Date(photo.uploadedAtISO).toLocaleString()}
                        </span>
                      </div>
                      {photo.address && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{photo.address}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-3xl">
          {selectedPhoto && (
            <div className="space-y-4">
              <DialogTitle>Photo Details</DialogTitle>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="rounded bg-muted p-2 flex items-center justify-center">
                    {selectedPhoto.imageUrl ? (
                      <img
                        src={selectedPhoto.imageUrl}
                        alt={selectedPhoto.siteName}
                        className="max-h-80 rounded object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Site:</span>{" "}
                    {selectedPhoto.siteName}
                  </p>
                  <p>
                    <span className="font-medium">Foreman:</span>{" "}
                    {selectedPhoto.foremanName}
                  </p>
                  {selectedPhoto.supervisorName && (
                    <p>
                      <span className="font-medium">Supervisor:</span>{" "}
                      {selectedPhoto.supervisorName}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Taken:</span>{" "}
                    {new Date(selectedPhoto.dateTakenISO).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Uploaded:</span>{" "}
                    {new Date(selectedPhoto.uploadedAtISO).toLocaleString()}
                  </p>
                  {selectedPhoto.address && (
                    <p className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedPhoto.address}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={verifying}
                  onClick={() => handleVerify(selectedPhoto.id, "REJECTED")}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={verifying}
                  onClick={() => handleVerify(selectedPhoto.id, "VERIFIED")}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Verify
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
