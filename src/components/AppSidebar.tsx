import {
  Users,
  Settings,
  Building2,
  NotebookIcon,
  MapPin,
  Camera,
  ScanLine,
  Package,
  ShoppingCart,
  LayoutDashboard,
  UserPlus,
  ArrowRightLeft,
  ChevronRight,
  Truck,
  FolderTree,
  DollarSign,
  CalendarCheck,
  Shield,
  Clock,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import "./AppSidebar.css";
import logoImg from "/logo.png";
import faviconImg from "/favicon.ico";

type Role = "ADMIN" | "OFFICE" | "SUPERVISOR" | "FOREMAN";

const menuGroups: {
  group: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: Role[];
  }[];
}[] = [
  {
    group: "Overview",
    items: [
      {
        href: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "OFFICE", "SUPERVISOR", "FOREMAN"],
      },
      {
        href: "/timesheets",
        label: "Timesheets",
        icon: NotebookIcon,
        roles: ["ADMIN"],
      },
      {
        href: "/supervisor/timesheets",
        label: "Manage Timesheets",
        icon: NotebookIcon,
        roles: ["SUPERVISOR"],
      },
    ],
  },
  {
    group: "People",
    items: [
      {
        href: "/employees",
        label: "Employees",
        icon: Users,
        roles: ["ADMIN", "SUPERVISOR", "FOREMAN"],
      },
      {
        href: "/foreman",
        label: "Foremen",
        icon: Users,
        roles: ["ADMIN"],
      },
      {
        href: "/users",
        label: "User Management",
        icon: Users,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/supervisors",
        label: "Supervisors",
        icon: Shield,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/transfer-employee",
        label: "Transfer Employee",
        icon: ArrowRightLeft,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    group: "Overtime",
    items: [
      {
        href: "/admin/overtime",
        label: "Overtime Entries",
        icon: Clock,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/overtime-prices",
        label: "Overtime Prices",
        icon: DollarSign,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    group: "Sites & Operations",
    items: [
      {
        href: "/sites",
        label: "Sites",
        icon: Building2,
        roles: ["ADMIN", "OFFICE", "SUPERVISOR", "FOREMAN"],
      },
      {
        href: "/sites/map",
        label: "Sites Map",
        icon: MapPin,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/site-photos",
        label: "Scan Outs",
        icon: Camera,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/attendance-scans",
        label: "Attendance Scans",
        icon: ScanLine,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/manual-scan",
        label: "Manual Scan",
        icon: UserPlus,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    group: "Commerce",
    items: [
      {
        href: "/products",
        label: "Products",
        icon: Package,
        roles: ["ADMIN", "OFFICE"],
      },
      {
        href: "/orders",
        label: "Stock Orders",
        icon: ShoppingCart,
        roles: ["ADMIN", "OFFICE"],
      },
    ],
  },
  {
    group: "Procurement",
    items: [
      {
        href: "/admin/suppliers",
        label: "Suppliers",
        icon: Truck,
        roles: ["ADMIN", "OFFICE"],
      },
      {
        href: "/admin/product-categories",
        label: "Categories",
        icon: FolderTree,
        roles: ["ADMIN", "OFFICE"],
      },
      {
        href: "/admin/procurement-products",
        label: "Materials",
        icon: Package,
        roles: ["ADMIN", "OFFICE"],
      },
      {
        href: "/admin/supplier-prices",
        label: "Supplier Prices",
        icon: DollarSign,
        roles: ["ADMIN", "OFFICE"],
      },
      {
        href: "/admin/material-orders",
        label: "Material Orders",
        icon: ShoppingCart,
        roles: ["ADMIN", "OFFICE"],
      },
      {
        href: "/admin/fortnight-meetings",
        label: "Fortnight Meetings",
        icon: CalendarCheck,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    group: "System",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
];

const roleBadgeConfig: Record<Role, { label: string; color: string }> = {
  ADMIN: { label: "Admin", color: "#e8572a" },
  OFFICE: { label: "Office", color: "#9333ea" },
  SUPERVISOR: { label: "Supervisor", color: "#2a7ae8" },
  FOREMAN: { label: "Foreman", color: "#2ae87a" },
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useSidebar();

  const isOpen = state === "expanded";
  const userRole = (user?.role?.toUpperCase() || "FOREMAN") as Role;
  const badge = roleBadgeConfig[userRole];
  const userName = user?.name || "";

  return (
    <aside
      className={`sidebar-root ${!isOpen ? "sidebar-collapsed" : ""}`}
      style={{ width: isOpen ? 240 : 64 }}
    >
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-mark">
          {isOpen ? (
            <img
              src={logoImg}
              alt="Logo"
              style={{ height: 40, width: "auto" }}
            />
          ) : (
            <img
              src={faviconImg}
              alt="Logo"
              style={{ height: 32, width: 32 }}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuGroups.map((group, gi) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(userRole),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div className="sidebar-group" key={group.group}>
              {gi > 0 && !isOpen && <div className="sidebar-divider" />}
              {isOpen && (
                <div className="sidebar-group-label">{group.group}</div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={`sidebar-item ${isActive ? "active" : ""}`}
                    title={!isOpen ? item.label : undefined}
                  >
                    <Icon className="sidebar-item-icon" />
                    {isOpen && (
                      <>
                        <span className="sidebar-item-label">{item.label}</span>
                        <ChevronRight className="sidebar-item-arrow" />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Role Badge */}
      <div className="sidebar-role-badge" style={{ marginTop: "auto" }}>
        <div className="sidebar-role-dot" style={{ background: badge.color }} />
        {isOpen && (
          <div className="sidebar-role-info">
            <div className="sidebar-role-label">{badge.label}</div>
            <div className="sidebar-role-name">{userName}</div>
          </div>
        )}
      </div>
    </aside>
  );
}
