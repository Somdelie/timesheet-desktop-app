import {
  Home,
  Users,
  MapPin,
  Settings,
  User2,
  Building2,
  NotebookIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

type Role = "ADMIN" | "SUPERVISOR" | "FOREMAN";

const menuItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: Home,
    roles: ["ADMIN", "SUPERVISOR", "FOREMAN"],
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User2,
    roles: ["ADMIN", "SUPERVISOR", "FOREMAN"],
  },
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
    href: "/sites",
    label: "Sites",
    icon: Building2,
    roles: ["ADMIN", "SUPERVISOR", "FOREMAN"],
  },
  {
    href: "/sites/map",
    label: "Sites Map",
    icon: MapPin,
    roles: ["ADMIN"],
  },
  {
    href: "/admin/site-photos",
    label: "Photo Verifications",
    icon: Building2,
    roles: ["ADMIN"],
  },
  {
    href: "/admin/attendance-scans",
    label: "Attendance Scans",
    icon: Users,
    roles: ["ADMIN"],
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
  {
    href: "/users",
    label: "User Management",
    icon: Users,
    roles: ["ADMIN"],
  },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useSidebar();

  const isCollapsed = state === "collapsed";

  const handleNavigation = (url: string) => {
    navigate(url);
  };

  const isActive = (url: string) => {
    if (url === "/") {
      return location.pathname === "/";
    }
    // Exact match
    if (location.pathname === url) {
      return true;
    }
    // Check if pathname starts with url/
    if (location.pathname.startsWith(url + "/")) {
      // Make sure there's no more specific menu item that matches
      const moreSpecific = menuItems.find(
        (item) =>
          item.href !== url &&
          item.href.startsWith(url) &&
          (location.pathname === item.href ||
            location.pathname.startsWith(item.href + "/"))
      );
      return !moreSpecific;
    }
    return false;
  };

  // Filter menu items based on user role
  const userRole = (user?.role?.toUpperCase() || "FOREMAN") as Role;
  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole),
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="h-14 flex items-center justify-center border-b border-border bg-white">
        {isCollapsed ? (
          <img
            src="./favicon.ico"
            alt="Logo"
            className="h-8 w-8 object-contain"
          />
        ) : (
          <img
            src="./logo2.png"
            alt="First Class Projects"
            className="h-10 object-contain"
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem
                  key={item.href}
                  className="border-b rounded-none hover:rounded-none"
                >
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.href)}
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    className={`${isActive(item.href) ? "bg-green-600! text-white! rounded-none" : ""} hover:bg-green-700 hover:text-white text-sm rounded-none hover:rounded-none`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-2">
        {!isCollapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex flex-col text-sm">
              <span className="font-medium truncate">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {user.role}
              </span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
