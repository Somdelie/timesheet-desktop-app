import { useEffect, useState } from "react";
import {
  Loader2,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  QrCode,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

type Site = { id: string; name: string; code: string };

type ScanResult = {
  qrCodeValue: string;
  status: "CREATED" | "ALREADY_SCANNED" | "UNKNOWN" | "INACTIVE";
  employeeName?: string;
  error?: string;
};

export default function BulkAttendancePage() {
  const { token } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");
  const [workDate, setWorkDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [qrCodes, setQrCodes] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult[] | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/app/admin/sites`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setSites(d.sites || []))
      .catch(() => {});
  }, [token]);

  const addCodeField = () => {
    setQrCodes((prev) => [...prev, ""]);
  };

  const removeCodeField = (index: number) => {
    setQrCodes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCode = (index: number, value: string) => {
    setQrCodes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const scans = qrCodes
      .map((c) => c.trim())
      .filter(Boolean)
      .map((qrCodeValue) => ({ qrCodeValue }));

    if (!siteId) {
      setError("Please select a site");
      return;
    }
    if (!workDate) {
      setError("Please select a work date");
      return;
    }
    if (scans.length === 0) {
      setError("Please enter at least one QR code");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/app/attendance/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          siteId,
          workDateISO: workDate,
          scans,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Bulk attendance upload failed");
      }

      setResults(json?.results || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bulk attendance upload failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "CREATED":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "ALREADY_SCANNED":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "UNKNOWN":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "INACTIVE":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "CREATED":
        return "Scanned";
      case "ALREADY_SCANNED":
        return "Already scanned";
      case "UNKNOWN":
        return "Unknown QR";
      case "INACTIVE":
        return "Inactive employee";
      default:
        return status;
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bulk Attendance
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload attendance for multiple employees at once by entering their QR
          code values.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-sm space-y-5"
      >
        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Site</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Work Date</Label>
            <Input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>QR Code Values</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={addCodeField}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
          {qrCodes.map((code, index) => (
            <div key={index} className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={code}
                  onChange={(e) => updateCode(index, e.target.value)}
                  placeholder={`QR code ${index + 1}`}
                  className="pl-9"
                />
              </div>
              {qrCodes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 px-2"
                  onClick={() => removeCodeField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Attendance
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Results */}
      {results && (
        <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm text-foreground">
            Results ({results.filter((r) => r.status === "CREATED").length}/
            {results.length} successful)
          </h3>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded border border-border/30 bg-muted/30 p-3"
              >
                {statusIcon(r.status)}
                <code className="text-xs font-mono text-muted-foreground">
                  {r.qrCodeValue}
                </code>
                <span
                  className={`text-xs font-medium ${
                    r.status === "CREATED"
                      ? "text-emerald-600"
                      : r.status === "ALREADY_SCANNED"
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {statusLabel(r.status)}
                </span>
                {r.employeeName && (
                  <span className="text-xs text-muted-foreground">
                    ({r.employeeName})
                  </span>
                )}
                {r.error && (
                  <span className="text-xs text-red-500">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
