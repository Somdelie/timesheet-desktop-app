import { useEffect, useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import UsersTable, { type UserRow } from "@/components/users/UsersTable";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "production"
    ? "https://firstclassprojects.netlify.app"
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3000");

export default function UsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogUser, setDeleteDialogUser] = useState<UserRow | null>(
    null,
  );
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(
    null,
  );

  const loadUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const name = u.name ?? "";
    return (
      u.email.toLowerCase().includes(q) ||
      name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const handleDeleteUser = async (user: UserRow) => {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setDeleteDialogUser(null);
        setDeleteInput("");
        loadUsers();
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      {/* Search */}
      <div className="mb-3 rounded border border-border/50 bg-card/80 backdrop-blur-sm px-5 py-3 shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row items-end sm:justify-between">
          <div className="flex-1 w-full">
            <label
              htmlFor="search-users"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              Search Users, Manage application users and their roles.
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-users"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="h-10 pl-9"
              />
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" size="lg">
                <Plus className="h-4 w-4" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create a New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system.
                </DialogDescription>
              </DialogHeader>
              <CreateUserForm
                onSuccess={() => {
                  setIsDialogOpen(false);
                  loadUsers();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Users table */}
      {filtered.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No users found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or create a new user.
          </p>
        </div>
      ) : (
        <UsersTable
          data={filtered}
          currentUserId={currentUser?.id}
          currentUserRole={currentUser?.role}
          onDelete={(user) => setDeleteDialogUser(user)}
          onEdit={(user) => setEditUser(user)}
          onResetPassword={(user) => setResetPasswordUser(user)}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogUser(null);
            setDeleteInput("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This action cannot be undone. To confirm, type the user's email
              <span className="mx-1 font-mono text-xs font-semibold">
                {deleteDialogUser?.email}
              </span>
              below and click confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              autoFocus
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={deleteDialogUser?.email ?? ""}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogUser(null);
                setDeleteInput("");
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deleting || deleteInput.trim() !== deleteDialogUser?.email
              }
              onClick={() =>
                deleteDialogUser && handleDeleteUser(deleteDialogUser)
              }
            >
              {deleting ? "Deleting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <EditUserForm
              user={editUser}
              onSuccess={() => {
                setEditUser(null);
                loadUsers();
              }}
              onCancel={() => setEditUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordUser !== null}
        onOpenChange={(open) => {
          if (!open) setResetPasswordUser(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              {resetPasswordUser?.name || resetPasswordUser?.email}.
            </DialogDescription>
          </DialogHeader>
          {resetPasswordUser && (
            <ResetPasswordForm
              userId={resetPasswordUser.id}
              onSuccess={() => {
                setResetPasswordUser(null);
              }}
              onCancel={() => setResetPasswordUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create User Form (with dayRate + supervisorId for foremen)
function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const { token } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("FOREMAN");
  const [dayRate, setDayRate] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [supervisors, setSupervisors] = useState<
    { id: string; name: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role === "FOREMAN" && token) {
      fetch(`${API_BASE_URL}/api/app/admin/users?role=SUPERVISOR`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((r) => r.json())
        .then((d) => setSupervisors(d.users || []))
        .catch(() => {});
    }
  }, [role, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (role === "FOREMAN" && (!dayRate || Number(dayRate) <= 0)) {
      setError("Day rate is required for foremen");
      return;
    }
    if (role === "FOREMAN" && !supervisorId) {
      setError("Supervisor is required for foremen");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Use the appropriate endpoint based on role
      const endpoint =
        role === "FOREMAN"
          ? `${API_BASE_URL}/api/app/admin/users`
          : `${API_BASE_URL}/api/users`;
      const body: any = {
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        password,
        role,
      };
      if (role === "FOREMAN") {
        body.dayRate = parseFloat(dayRate);
        body.supervisorId = supervisorId;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create user");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Failed to create user");
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
        <label className="text-sm font-medium">Email *</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Password *</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Role *</label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
            <SelectItem value="FOREMAN">Foreman</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {role === "FOREMAN" && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Day Rate (R) *</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={dayRate}
              onChange={(e) => setDayRate(e.target.value)}
              placeholder="e.g. 500.00"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Supervisor *</label>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supervisor" />
              </SelectTrigger>
              <SelectContent>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create User"}
        </Button>
      </div>
    </form>
  );
}

// Edit User Form
function EditUserForm({
  user,
  onSuccess,
  onCancel,
}: {
  user: UserRow;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim().toLowerCase(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update user");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Failed to update user");
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
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Email *</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

// Reset Password Form
function ResetPasswordForm({
  userId,
  onSuccess,
  onCancel,
}: {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to reset password");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Failed to reset password");
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
        <label className="text-sm font-medium">New Password *</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Confirm Password *</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter password"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Resetting..." : "Reset Password"}
        </Button>
      </div>
    </form>
  );
}
