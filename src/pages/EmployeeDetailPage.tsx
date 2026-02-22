import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  QrCode,
  DollarSign,
  CalendarDays,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.DEV ? "" : "http://localhost:3000");

interface ForemanLink {
  foremanId: string;
  reason?: string | null;
  foreman: {
    id: string;
    user: {
      name?: string | null;
    };
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  dayRate: number;
  faceImageUrl: string | null;
  active: boolean;
  fullName: string;
  createdAt: string;
  updatedAt: string;
  isForeman: boolean;
  foremanLinks?: ForemanLink[];
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!token || !id) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            setError("Employee not found");
          } else {
            setError("Failed to load employee");
          }
          return;
        }

        const data = await res.json();
        if (data.ok && data.employee) {
          setEmployee(data.employee);
        } else {
          setError("Failed to load employee data");
        }
      } catch (err) {
        console.error("Error loading employee:", err);
        setError("Failed to load employee");
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [token, id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatMoney = (value: number | null) => {
    if (value === null || value === undefined) return "Not set";
    return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-6">
        <Button variant="outline" asChild className="mb-4">
          <Link to="/employees">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Link>
        </Button>
        <div className="rounded border border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-700/50 dark:bg-card/30">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {error || "Employee not found"}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            The employee you're looking for doesn't exist or you don't have
            access to view it.
          </p>
        </div>
      </div>
    );
  }

  const initials = employee.firstName[0] + employee.lastName[0];

  return (
    <div className="overflow-auto px-6 py-4">
      {/* Back Button */}
      <Button variant="outline" asChild className="mb-4">
        <Link to="/employees">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Link>
      </Button>

      {/* Main Content */}
      <div className="border bg-card rounded overflow-hidden p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded border bg-muted text-lg font-medium cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => employee.faceImageUrl && setShowImageModal(true)}
              title={
                employee.faceImageUrl ? "Click to view full image" : undefined
              }
            >
              {employee.faceImageUrl ? (
                <img
                  src={employee.faceImageUrl}
                  alt={employee.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex items-center justify-center h-full w-full uppercase text-2xl text-white bg-primary">
                  {initials}
                </span>
              )}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                {employee.isForeman && <Badge variant="default">Foreman</Badge>}
                {!employee.isForeman && (
                  <Badge variant="secondary">Individual</Badge>
                )}
                {!employee.active && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* QR Code */}
            <div className="rounded border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="h-4 w-4 text-indigo-600" />
                <p className="text-xs font-medium text-muted-foreground">
                  QR CODE
                </p>
              </div>
              <p className="font-mono text-lg font-medium">{employee.code}</p>
            </div>

            {/* Day Rate */}
            <div className="rounded border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-medium text-muted-foreground">
                  DAY RATE
                </p>
              </div>
              <p className="text-lg font-medium">
                {formatMoney(employee.dayRate)}
              </p>
            </div>
          </div>

          {/* Foreman Links Section */}
          {employee.foremanLinks && employee.foremanLinks.length > 0 && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-sky-600" />
                <h2 className="text-sm font-semibold">Foreman Assignment</h2>
              </div>
              <div className="space-y-2">
                {employee.foremanLinks.map((link) => (
                  <div
                    key={link.foremanId}
                    className="rounded border bg-muted/30 p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {link.foreman.user.name || "Foreman"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Assigned: {link.reason || "unknown"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-4 w-4 text-orange-600" />
              <h2 className="text-sm font-semibold">Additional Information</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">CREATED</p>
                <p className="mt-1 font-medium">
                  {formatDate(employee.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">LAST UPDATED</p>
                <p className="mt-1 font-medium">
                  {formatDate(employee.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {showImageModal && employee.faceImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-lg font-medium flex items-center gap-1"
            >
              <X className="h-5 w-5" />
              Close
            </button>
            <img
              src={employee.faceImageUrl}
              alt={employee.fullName}
              className="max-h-[85vh] max-w-full rounded object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="mt-2 text-center text-white text-sm">
              {employee.fullName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
