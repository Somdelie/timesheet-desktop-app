import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MapPin,
  QrCode,
  UserPlus,
  Calendar,
  Clock,
  Building,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE =
  import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.DEV ? "" : "http://localhost:3000");

interface Scan {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeePhotoUrl?: string | null;
  siteId: string;
  siteName: string;
  foremanId: string;
  foremanName: string;
  supervisorId: string | null;
  supervisorName: string | null;
  workDateISO: string;
  scannedAtISO: string;
  scanType: "REGULAR" | "MANUAL";
  overtimeType: "NONE" | "HALF_DAY" | "FULL_DAY";
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

interface FilterOption {
  id: string;
  name: string;
}

function groupScansByDate(scans: Scan[]) {
  const groups: Map<string, Scan[]> = new Map();

  for (const scan of scans) {
    const dateKey = scan.workDateISO.split("T")[0];
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(scan);
  }

  const sortedEntries = Array.from(groups.entries()).sort(
    (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
  );

  return sortedEntries.map(([date, entries]) => {
    const d = new Date(date + "T00:00:00Z");
    const label = d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return { date, label, scans: entries };
  });
}

export default function AdminAttendanceScansPage() {
  const { token } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<FilterOption[]>([]);
  const [foremen, setForemen] = useState<FilterOption[]>([]);
  const [supervisors, setSupervisors] = useState<FilterOption[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedForemanId, setSelectedForemanId] = useState<string>("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  const loadScans = async (
    siteId?: string,
    foremanId?: string,
    supervisorId?: string,
  ) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (siteId) params.set("siteId", siteId);
      if (foremanId) params.set("foremanId", foremanId);
      if (supervisorId) params.set("supervisorId", supervisorId);
      const url = `${API_BASE}/api/app/admin/attendance-scans${
        params.toString() ? `?${params}` : ""
      }`;
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to load scans");
      }
      const data = await res.json();
      setScans(data.scans || []);
      if (!siteId && !foremanId && !supervisorId) {
        setSites(data.sites || []);
        setForemen(data.foremen || []);
        setSupervisors(data.supervisors || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load scans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScans();
  }, [token]);

  const handleSiteChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setSelectedSiteId(newValue);
    loadScans(newValue, selectedForemanId, selectedSupervisorId);
  };

  const handleForemanChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setSelectedForemanId(newValue);
    loadScans(selectedSiteId, newValue, selectedSupervisorId);
  };

  const handleSupervisorChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setSelectedSupervisorId(newValue);
    loadScans(selectedSiteId, selectedForemanId, newValue);
  };

  const groupedScans = groupScansByDate(scans);

  return (
    <div className="">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attendance Scans</CardTitle>
          <CardDescription>
            View all attendance scans with location data (last 7 days)
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardContent>
          <div className="mb-6 grid sm:grid-cols-2 md:grid-cols-3 gap-4 w-full ">
            <Select
              value={selectedSiteId || "all"}
              onValueChange={handleSiteChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedForemanId || "all"}
              onValueChange={handleForemanChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Foremen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Foremen</SelectItem>
                {foremen.map((foreman) => (
                  <SelectItem key={foreman.id} value={foreman.id}>
                    {foreman.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSupervisorId || "all"}
              onValueChange={handleSupervisorChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Supervisors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Supervisors</SelectItem>
                {supervisors.map((supervisor) => (
                  <SelectItem key={supervisor.id} value={supervisor.id}>
                    {supervisor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : scans.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No scans found for the selected filters
            </div>
          ) : (
            <div className="space-y-8">
              {groupedScans.map((group) => (
                <div key={group.date}>
                  <h2 className="mb-4 text-lg font-semibold">{group.label}</h2>
                  <div className="rounded border">
                    <Table className="border-collapse">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="border">Employee</TableHead>
                          <TableHead className="border">Site</TableHead>
                          <TableHead className="border">Foreman</TableHead>
                          <TableHead className="border">Scanned At</TableHead>
                          <TableHead className="border">Type</TableHead>
                          <TableHead className="border">Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.scans.map((scan) => (
                          <TableRow key={scan.id}>
                            <TableCell
                              className="border cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => setSelectedScan(scan)}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={scan.employeePhotoUrl || undefined}
                                    alt={scan.employeeName}
                                  />
                                  <AvatarFallback>
                                    {scan.employeeName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-primary underline-offset-2 hover:underline">
                                    {scan.employeeName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {scan.employeeCode}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="border">
                              {scan.siteName}
                            </TableCell>
                            <TableCell className="border">
                              {scan.foremanName}
                            </TableCell>
                            <TableCell className="border">
                              {new Date(scan.scannedAtISO).toLocaleTimeString(
                                "en-GB",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </TableCell>
                            <TableCell className="border">
                              {scan.scanType === "REGULAR" ? (
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  <QrCode className="h-3 w-3" /> QR
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  <UserPlus className="h-3 w-3" /> Manual
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="border">
                              {scan.address ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-50">
                                    {scan.address}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  No location data
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Details Modal */}
      <Dialog
        open={!!selectedScan}
        onOpenChange={(open) => !open && setSelectedScan(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Details</DialogTitle>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-6">
              {/* Employee Info with Photo */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={selectedScan.employeePhotoUrl || undefined}
                    alt={selectedScan.employeeName}
                  />
                  <AvatarFallback className="text-xl">
                    {selectedScan.employeeName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedScan.employeeName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedScan.employeeCode}
                  </p>
                </div>
              </div>

              {/* Scan Details Grid */}
              <div className="grid grid-cols-2 gap-4 rounded border p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Work Date</span>
                  </div>
                  <p className="font-medium">
                    {new Date(selectedScan.workDateISO).toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Scanned At</span>
                  </div>
                  <p className="font-medium">
                    {new Date(selectedScan.scannedAtISO).toLocaleTimeString(
                      "en-GB",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>Site</span>
                  </div>
                  <p className="font-medium">{selectedScan.siteName}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Foreman</span>
                  </div>
                  <p className="font-medium">{selectedScan.foremanName}</p>
                </div>

                {selectedScan.supervisorName && (
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Supervisor</span>
                    </div>
                    <p className="font-medium">{selectedScan.supervisorName}</p>
                  </div>
                )}
              </div>

              {/* Scan Type & Overtime */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  {selectedScan.scanType === "REGULAR" ? (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <QrCode className="h-3 w-3" /> QR Scan
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" /> Manual Entry
                    </Badge>
                  )}
                </div>
                {selectedScan.overtimeType !== "NONE" && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Overtime:
                    </span>
                    <Badge variant="default">
                      {selectedScan.overtimeType === "HALF_DAY"
                        ? "Half Day"
                        : "Full Day"}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Location */}
              {selectedScan.address && (
                <div className="space-y-2 rounded border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Location</span>
                  </div>
                  <p className="text-sm">{selectedScan.address}</p>
                  {selectedScan.latitude && selectedScan.longitude && (
                    <p className="text-xs text-muted-foreground">
                      {selectedScan.latitude.toFixed(6)},{" "}
                      {selectedScan.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
