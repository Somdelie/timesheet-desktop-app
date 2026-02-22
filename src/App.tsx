import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import TitleBar from "./components/TitleBar";
import { AppSidebar } from "./components/AppSidebar";
import { OfflineBanner } from "./components/OfflineBanner";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import EmployeesPage from "./pages/EmployeesPage";
import EmployeeDetailPage from "./pages/EmployeeDetailPage";
import ForemenPage from "./pages/ForemenPage";
import SitesPage from "./pages/SitesPage";
import SiteDetailsPage from "./pages/SiteDetailsPage";
import SitesMapPage from "./pages/SitesMapPage";
import TimesheetsPage from "./pages/TimesheetsPage";
import SupervisorTimesheetsPage from "./pages/SupervisorTimesheetsPage";
import AdminSitePhotosPage from "./pages/AdminSitePhotosPage";
import AdminAttendanceScansPage from "./pages/AdminAttendanceScansPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import { useAuth } from "./contexts/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">Loading...</div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <TitleBar />
        <OfflineBanner />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <div className="h-screen overflow-hidden flex">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route
                      path="/employees/:id"
                      element={<EmployeeDetailPage />}
                    />
                    <Route path="/foreman" element={<ForemenPage />} />
                    <Route path="/sites" element={<SitesPage />} />
                    <Route path="/sites/map" element={<SitesMapPage />} />
                    <Route path="/sites/:id" element={<SiteDetailsPage />} />
                    <Route
                      path="/admin/site-photos"
                      element={<AdminSitePhotosPage />}
                    />
                    <Route
                      path="/admin/attendance-scans"
                      element={<AdminAttendanceScansPage />}
                    />
                    <Route path="/timesheets" element={<TimesheetsPage />} />
                    <Route
                      path="/supervisor/timesheets"
                      element={<SupervisorTimesheetsPage />}
                    />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </TooltipProvider>
  );
}

export default App;
