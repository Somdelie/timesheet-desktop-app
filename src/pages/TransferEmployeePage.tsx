import { useCallback, useEffect, useState } from "react";
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
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowRightLeft,
  Search,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

interface SiteScan {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeePhotoUrl: string | null;
  scannedAt: string;
  scannedOutAt: string | null;
  isScannedOut: boolean;
  direction: "IN" | "OUT";
  dayRate: string;
  scanType: string;
  isTransferred: boolean;
  transferredFromSiteId: string | null;
  transferredAt: string | null;
}

interface SiteOption {
  id: string;
  name: string;
}

export default function TransferEmployeePage() {
  const { token } = useAuth();

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [, setLoadingSites] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [scans, setScans] = useState<SiteScan[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [scannedInCount, setScannedInCount] = useState(0);
  const [scannedOutCount, setScannedOutCount] = useState(0);

  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<SiteScan | null>(null);
  const [destinationSiteId, setDestinationSiteId] = useState<string>("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Load sites
  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoadingSites(true);
      try {
        const res = await fetch(`${API_BASE}/api/app/admin/attendance-scans`, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to load sites");
        const data = await res.json();
        setSites(data.sites || []);
      } catch (err: any) {
        toast.error(err.message || "Failed to load sites");
      } finally {
        setLoadingSites(false);
      }
    })();
  }, [token]);

  // Load scans for selected site
  const loadScans = useCallback(
    async (siteId: string) => {
      if (!token || !siteId) return;
      setLoadingScans(true);
      try {
        // Use the supervisor API for scans today (works for admin too)
        const res = await fetch(
          `${API_BASE}/api/app/supervisor/sites/${encodeURIComponent(siteId)}/scans-today`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!res.ok) throw new Error("Failed to load today's scans");
        const data = await res.json();
        setScans(data.scans || []);
        setScannedInCount(data.scannedInCount ?? 0);
        setScannedOutCount(data.scannedOutCount ?? 0);
      } catch (err: any) {
        toast.error(err.message || "Failed to load scans");
        setScans([]);
      } finally {
        setLoadingScans(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (selectedSiteId) {
      loadScans(selectedSiteId);
    } else {
      setScans([]);
      setScannedInCount(0);
      setScannedOutCount(0);
    }
  }, [selectedSiteId, loadScans]);

  const handleSiteChange = (value: string) => {
    setSelectedSiteId(value === "none" ? "" : value);
  };

  // Filter scans by search
  const filteredScans = scans.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.employeeName.toLowerCase().includes(q) ||
      s.employeeCode.toLowerCase().includes(q)
    );
  });

  const scannedIn = filteredScans.filter((s) => !s.isScannedOut);
  const scannedOut = filteredScans.filter((s) => s.isScannedOut);

  // Open transfer dialog
  const openTransfer = (scan: SiteScan) => {
    setSelectedScan(scan);
    setDestinationSiteId("");
    setTransferReason("");
    setTransferDialogOpen(true);
  };

  // Perform transfer
  const doTransfer = async () => {
    if (!selectedScan || !destinationSiteId || !selectedSiteId) return;
    setTransferring(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/app/supervisor/transfer-employee`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeeId: selectedScan.employeeId,
            fromSiteId: selectedSiteId,
            toSiteId: destinationSiteId,
            reason: transferReason.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Transfer failed");
      }
      const data = await res.json();
      toast.success(data.message || "Transfer successful!");
      setTransferDialogOpen(false);
      setSelectedScan(null);
      // Refresh scans
      await loadScans(selectedSiteId);
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setTransferring(false);
    }
  };

  const selectedSiteName =
    sites.find((s) => s.id === selectedSiteId)?.name ?? "";
  const destinationSiteName =
    sites.find((s) => s.id === destinationSiteId)?.name ?? "";

  // Available destination sites (exclude source)
  const destinationSites = sites.filter((s) => s.id !== selectedSiteId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Employee
          </CardTitle>
          <CardDescription>
            Transfer employees between sites. Select a source site, then
            transfer scanned-in employees to a different site. Transferred
            employees can be scanned out at their new site.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Site selector + Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Source Site
              </label>
              <Select
                value={selectedSiteId || "none"}
                onValueChange={handleSiteChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a site..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a site...</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Search Employees
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or code..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {selectedSiteId && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded border p-3 text-center">
                <div className="text-2xl font-black text-emerald-600">
                  {scannedInCount}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  Scanned In
                </div>
              </div>
              <div className="rounded border p-3 text-center">
                <div className="text-2xl font-black text-muted-foreground">
                  {scannedOutCount}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  Scanned Out
                </div>
              </div>
              <div className="rounded border p-3 text-center">
                <div className="text-2xl font-black text-blue-600">
                  {scans.length}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  Total
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanned-in employees (transferable) */}
      {selectedSiteId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employees on Site ({scannedIn.length})
            </CardTitle>
            <CardDescription>
              These employees are currently scanned in and can be transferred.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingScans ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : scannedIn.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No employees currently scanned in at this site.
              </div>
            ) : (
              <div className="rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="border">Employee</TableHead>
                      <TableHead className="border">Code</TableHead>
                      <TableHead className="border">Scanned In</TableHead>
                      <TableHead className="border">Day Rate</TableHead>
                      <TableHead className="border">Status</TableHead>
                      <TableHead className="border text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scannedIn.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="border font-medium">
                          {scan.employeeName}
                        </TableCell>
                        <TableCell className="border text-sm text-muted-foreground">
                          {scan.employeeCode}
                        </TableCell>
                        <TableCell className="border">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {new Date(scan.scannedAt).toLocaleTimeString(
                              "en-GB",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="border text-sm">
                          R{scan.dayRate}
                        </TableCell>
                        <TableCell className="border">
                          {scan.isTransferred ? (
                            <Badge variant="secondary" className="text-xs">
                              ↗ Transferred here
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-emerald-600 border-emerald-300"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              On Site
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="border text-right">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openTransfer(scan)}
                            className="gap-1"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            Transfer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scanned-out employees */}
      {selectedSiteId && scannedOut.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Scanned Out ({scannedOut.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="border">Employee</TableHead>
                    <TableHead className="border">Code</TableHead>
                    <TableHead className="border">Scanned In</TableHead>
                    <TableHead className="border">Scanned Out</TableHead>
                    <TableHead className="border">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scannedOut.map((scan) => (
                    <TableRow key={scan.id} className="opacity-60">
                      <TableCell className="border font-medium">
                        {scan.employeeName}
                      </TableCell>
                      <TableCell className="border text-sm text-muted-foreground">
                        {scan.employeeCode}
                      </TableCell>
                      <TableCell className="border text-sm">
                        {new Date(scan.scannedAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="border text-sm">
                        {scan.scannedOutAt
                          ? new Date(scan.scannedOutAt).toLocaleTimeString(
                              "en-GB",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="border">
                        <Badge variant="secondary" className="text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Scanned Out
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer Dialog */}
      <Dialog
        open={transferDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTransferDialogOpen(false);
            setSelectedScan(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transfer Employee
            </DialogTitle>
            <DialogDescription>
              Move this employee from <strong>{selectedSiteName}</strong> to
              another site.
            </DialogDescription>
          </DialogHeader>

          {selectedScan && (
            <div className="space-y-4">
              {/* Employee info */}
              <div className="rounded border bg-muted/50 p-3">
                <div className="font-semibold">{selectedScan.employeeName}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedScan.employeeCode} • Scanned in:{" "}
                  {new Date(selectedScan.scannedAt).toLocaleTimeString(
                    "en-GB",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </div>
              </div>

              {/* Destination site */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Transfer to:
                </label>
                <Select
                  value={destinationSiteId || "none"}
                  onValueChange={(v) =>
                    setDestinationSiteId(v === "none" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination site..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Select destination site...
                    </SelectItem>
                    {destinationSites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Reason (optional):
                </label>
                <Textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Site needs more workers"
                  rows={2}
                />
              </div>

              {/* Summary */}
              {destinationSiteId && (
                <div className="rounded border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 text-sm">
                  <strong>{selectedScan.employeeName}</strong> will be
                  transferred from <strong>{selectedSiteName}</strong> to{" "}
                  <strong>{destinationSiteName}</strong>. They will be able to
                  clock out at the new site.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialogOpen(false)}
              disabled={transferring}
            >
              Cancel
            </Button>
            <Button
              onClick={doTransfer}
              disabled={!destinationSiteId || transferring}
            >
              {transferring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Confirm Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
