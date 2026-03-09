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
import AdminManualScanPage from "./pages/AdminManualScanPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import TransferEmployeePage from "./pages/TransferEmployeePage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import AdminSuppliersPage from "./pages/AdminSuppliersPage";
import AdminProductCategoriesPage from "./pages/AdminProductCategoriesPage";
import AdminProcurementProductsPage from "./pages/AdminProcurementProductsPage";
import AdminSupplierPricesPage from "./pages/AdminSupplierPricesPage";
import AdminMaterialOrdersPage from "./pages/AdminMaterialOrdersPage";
import AdminFortnightMeetingsPage from "./pages/AdminFortnightMeetingsPage";
import AdminOvertimePage from "./pages/AdminOvertimePage";
import AdminOvertimePricesPage from "./pages/AdminOvertimePricesPage";
import SupervisorsPage from "./pages/SupervisorsPage";
import { useAuth } from "./contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
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
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <TitleBar />
          <OfflineBanner />
          <main className="flex-1 overflow-auto w-full py-3 px-4 min-h-0">
            {children}
          </main>
        </div>
      </div>
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
                    <Route
                      path="/admin/transfer-employee"
                      element={<TransferEmployeePage />}
                    />
                    <Route
                      path="/admin/manual-scan"
                      element={<AdminManualScanPage />}
                    />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route
                      path="/admin/suppliers"
                      element={<AdminSuppliersPage />}
                    />
                    <Route
                      path="/admin/product-categories"
                      element={<AdminProductCategoriesPage />}
                    />
                    <Route
                      path="/admin/procurement-products"
                      element={<AdminProcurementProductsPage />}
                    />
                    <Route
                      path="/admin/supplier-prices"
                      element={<AdminSupplierPricesPage />}
                    />
                    <Route
                      path="/admin/material-orders"
                      element={<AdminMaterialOrdersPage />}
                    />
                    <Route
                      path="/admin/fortnight-meetings"
                      element={<AdminFortnightMeetingsPage />}
                    />
                    <Route
                      path="/admin/overtime"
                      element={<AdminOvertimePage />}
                    />
                    <Route
                      path="/admin/overtime-prices"
                      element={<AdminOvertimePricesPage />}
                    />
                    <Route
                      path="/admin/supervisors"
                      element={<SupervisorsPage />}
                    />
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
