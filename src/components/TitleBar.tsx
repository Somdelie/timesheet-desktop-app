import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useSidebar } from "@/components/ui/sidebar";
import { ModeToggle } from "./ModeToggle";
import { useAuth } from "@/contexts/AuthContext";
import "./TitleBar.css";

declare global {
  interface Window {
    electron: {
      windowControls: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
      };
    };
  }
}

// Map of path segments to display labels
const pathLabels: Record<string, string> = {
  admin: "Admin",
  employees: "Employees",
  foreman: "Foremen",
  sites: "Sites",
  timesheets: "Timesheets",
  users: "Users",
  settings: "Settings",
  profile: "Profile",
  supervisor: "Supervisor",
  new: "New",
  map: "Map",
  login: "Login",
};

function formatSegment(segment: string): string {
  if (pathLabels[segment.toLowerCase()]) {
    return pathLabels[segment.toLowerCase()];
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();

  const isElectron = typeof window !== "undefined" && window.electron;

  // Generate breadcrumbs from pathname
  const breadcrumbs = (() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href?: string }[] = [
      { label: "Dashboard", href: "/" },
    ];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      crumbs.push({
        label: formatSegment(segment),
        href: isLast ? undefined : currentPath,
      });
    });

    return crumbs;
  })();

  useEffect(() => {
    const checkMaximized = async () => {
      if (!isElectron) return;
      const maximized = await window.electron.windowControls.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
  }, [isElectron]);

  const handleMinimize = () => {
    if (isElectron) {
      window.electron.windowControls.minimize();
    }
  };

  const handleMaximize = async () => {
    if (isElectron) {
      window.electron.windowControls.maximize();
      const maximized = await window.electron.windowControls.isMaximized();
      setIsMaximized(maximized);
    }
  };

  const handleClose = () => {
    if (isElectron) {
      window.electron.windowControls.close();
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="titlebar bg-card/80 text-card-foreground border-b border-border">
      {/* Left section */}
      <div className="titlebar-left">
        <Button variant="icon" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Center section - Breadcrumbs */}
      <div className="titlebar-center">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center">
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink
                      href={crumb.href}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(crumb.href!);
                      }}
                      className="text-sm"
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-sm">
                      {crumb.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Drag region */}
      <div className="titlebar-drag" />

      {/* Right section */}
      <div className="titlebar-right">
        <ModeToggle />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt={user?.name || "User"}
                  />
                  <AvatarFallback>
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                  <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Window controls (Electron only) */}
      {isElectron && (
        <div className="titlebar-controls">
          <button className="titlebar-btn minimize" onClick={handleMinimize}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect y="5" width="12" height="2" fill="currentColor" />
            </svg>
          </button>
          <button className="titlebar-btn maximize" onClick={handleMaximize}>
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <rect
                  x="2"
                  y="0"
                  width="8"
                  height="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <rect
                  x="0"
                  y="4"
                  width="8"
                  height="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <rect
                  x="1"
                  y="1"
                  width="10"
                  height="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </button>
          <button className="titlebar-btn close" onClick={handleClose}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M1 1L11 11M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
}

export default TitleBar;
