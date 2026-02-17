import React, { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MapStateProvider } from "./contexts/MapStateContext";
import { WorkspaceProvider, useWorkspace } from "./contexts/WorkspaceContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { FleetOpsLayout } from "./pages/fleetops/layout";
import { StorefrontLayout } from "./pages/storefront/layout";
import { Mod4Layout } from "./pages/mod4/layout";
import { AdminLayout } from "./pages/admin/layout";
import { MapLayout } from "./pages/map/layout";
import Mod4Dashboard from "./pages/mod4/page";
import Mod4DriverPage from "./pages/mod4/driver/page";
import Mod4ActiveDeliveryPage from "./pages/mod4/driver/delivery/page";
import Mod4DispatcherPage from "./pages/mod4/dispatcher/page";
import Mod4SessionsPage from "./pages/mod4/sessions/page";
import AdminDashboard from "./pages/admin/page";
import AdminGeneralSettings from "./pages/admin/general/page";
import AdminUsersPage from "./pages/admin/users/page";
import AdminUserDetailPage from "./pages/admin/users/[id]/page";
import AdminUserEditPage from "./pages/admin/users/[id]/edit/page";
import AdminUserCreatePage from "./pages/admin/users/create/page";
import AdminWorkspacesPage from "./pages/admin/workspaces/page";
import AdminWorkspaceDetailPage from "./pages/admin/workspaces/[id]/page";
import AdminSessionsPage from "./pages/admin/sessions/page";
import AdminSessionDetailPage from "./pages/admin/sessions/[id]/page";
import AdminAuditPage from "./pages/admin/audit/page";
import AdminLocationsPage from "./pages/admin/LocationManagement";
import AdminIntegrationPage from "./pages/admin/integration/page";
import LiveMapPage from "./pages/map/live/page";
import PlaybackMapPage from "./pages/map/playback/page";

// Onboarding Pages
import WorkspaceSetupWizard from "./components/onboarding/WorkspaceSetupWizard";
import AcceptInvitationPage from "./pages/invite/AcceptInvitationPage";
import FleetOpsHome from "./pages/fleetops/page";
import StorefrontHome from "./pages/storefront/page";
import StorefrontFacilities from "./pages/storefront/facilities/page";
import StorefrontRequisitions from "./pages/storefront/requisitions/page";
import StorefrontZones from "./pages/storefront/zones/page";
import StorefrontScheduler from "./pages/storefront/scheduler/page";
import StorefrontStockReports from "./pages/storefront/stock-reports/page";
import StorefrontPrograms from "./pages/storefront/programs/page";

// Lazy load new storefront pages
const StorefrontItems = lazy(() => import("./pages/storefront/items/page"));
const StorefrontInvoice = lazy(() => import("./pages/storefront/invoice/page"));
const StorefrontWarehouse = lazy(() => import("./pages/storefront/warehouse/page"));
import FleetManagement from "./pages/fleetops/fleet-management/page";
import VehicleRegistry from "./pages/fleetops/vehicles/registry/page";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import DriverManagement from "./pages/DriverManagement";
import CommandCenterPage from "./pages/CommandCenterPage";
import DispatchPage from "./pages/DispatchPage";
import FacilityManagerPage from "./pages/FacilityManagerPage";
import VehicleManagementPage from "./pages/VehicleManagementPage";
import BatchManagement from "./pages/BatchManagement";

// Lazy load Reports page (includes Recharts - ~300 kB uncompressed / 77 kB gzipped)
const ReportsPageWrapper = lazy(() => import("./pages/ReportsPageWrapper"));
import VLMSDashboard from "./pages/fleetops/vlms/page";
import VLMSVehicles from "./pages/fleetops/vlms/vehicles/page";
import VLMSVehicleOnboard from "./pages/fleetops/vlms/vehicles/onboard/page";
import VLMSVehicleDetail from "./pages/fleetops/vlms/vehicles/[id]/page";
import VLMSVehicleEdit from "./pages/fleetops/vlms/vehicles/[id]/edit/page";
import VLMSMaintenance from "./pages/fleetops/vlms/maintenance/page";
import VLMSFuel from "./pages/fleetops/vlms/fuel/page";
import VLMSAssignments from "./pages/fleetops/vlms/assignments/page";
import VLMSIncidents from "./pages/fleetops/vlms/incidents/page";
import VLMSInspections from "./pages/fleetops/vlms/inspections/page";

const queryClient = new QueryClient();

function WorkspaceThemeApplier() {
  const { workspace } = useWorkspace();
  
  useEffect(() => {
    document.body.className = `workspace-${workspace}`;
  }, [workspace]);
  
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <BrowserRouter 
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              <WorkspaceThemeApplier />
              <Toaster />
              <MapStateProvider>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Onboarding Routes */}
                  <Route path="/onboarding" element={<WorkspaceSetupWizard />} />
                  <Route path="/invite/:token" element={<AcceptInvitationPage />} />

                  {/* FleetOps Workspace */}
                  <Route path="/fleetops" element={
                    <ProtectedRoute>
                      <FleetOpsLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<FleetOpsHome />} />
                    <Route path="drivers" element={<DriverManagement />} />
                    <Route path="dispatch" element={<DispatchPage />} />
                    <Route path="batches" element={<BatchManagement />} />
                    <Route path="tactical" element={<Navigate to="/map/live" replace />} />
                    <Route path="vehicles" element={<VehicleRegistry />} />
                    <Route path="vehicles/:id" element={
                      React.createElement(
                        React.lazy(() => import('./pages/fleetops/vehicles/[id]/page'))
                      )
                    } />
                    <Route path="fleet-management" element={<FleetManagement />} />
                    <Route path="reports" element={
                      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <ReportsPageWrapper />
                      </Suspense>
                    } />
                    <Route path="vlms">
                      <Route index element={<VLMSDashboard />} />
                      <Route path="vehicles" element={<VLMSVehicles />} />
                      <Route path="vehicles/onboard" element={<VLMSVehicleOnboard />} />
                      <Route path="vehicles/:id" element={<VLMSVehicleDetail />} />
                      <Route path="vehicles/:id/edit" element={<VLMSVehicleEdit />} />
                      <Route path="maintenance" element={<VLMSMaintenance />} />
                      <Route path="fuel" element={<VLMSFuel />} />
                      <Route path="assignments" element={<VLMSAssignments />} />
                      <Route path="incidents" element={<VLMSIncidents />} />
                      <Route path="inspections" element={<VLMSInspections />} />
                    </Route>
                  </Route>

                  {/* Storefront Workspace */}
                  <Route path="/storefront" element={
                    <ProtectedRoute>
                      <StorefrontLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<StorefrontHome />} />
                    {/* Order Management */}
                    <Route path="items" element={
                      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <StorefrontItems />
                      </Suspense>
                    } />
                    <Route path="requisitions" element={<StorefrontRequisitions />} />
                    <Route path="invoice" element={
                      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <StorefrontInvoice />
                      </Suspense>
                    } />
                    {/* Planning */}
                    <Route path="scheduler" element={<StorefrontScheduler />} />
                    {/* Resources */}
                    <Route path="zones" element={<StorefrontZones />} />
                    <Route path="facilities" element={<StorefrontFacilities />} />
                    <Route path="warehouse" element={
                      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <StorefrontWarehouse />
                      </Suspense>
                    } />
                    <Route path="programs" element={<StorefrontPrograms />} />
                    {/* Analytics */}
                    <Route path="stock-reports" element={<StorefrontStockReports />} />
                    {/* Legacy redirects */}
                    <Route path="schedule-planner" element={<Navigate to="/storefront/scheduler" replace />} />
                    <Route path="lgas" element={<Navigate to="/storefront/zones" replace />} />
                  </Route>

                  {/* Mod4 Workspace - Mobile Driver Execution */}
                  <Route path="/mod4" element={
                    <ProtectedRoute>
                      <Mod4Layout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Mod4Dashboard />} />
                    <Route path="driver" element={<Mod4DriverPage />} />
                    <Route path="driver/delivery" element={<Mod4ActiveDeliveryPage />} />
                    <Route path="driver/delivery/:batchId" element={
                      React.createElement(
                        React.lazy(() => import('./pages/mod4/driver/delivery/[id]/page'))
                      )
                    } />
                    <Route path="dispatcher" element={<Mod4DispatcherPage />} />
                    <Route path="sessions" element={<Mod4SessionsPage />} />
                  </Route>

                  {/* Admin Workspace - System Admin Only */}
                  <Route path="/admin" element={
                    <ProtectedRoute requiredRole="system_admin">
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    {/* Redirect index to general settings */}
                    <Route index element={<Navigate to="/admin/general" replace />} />

                    {/* General Tab */}
                    <Route path="general" element={<AdminGeneralSettings />} />
                    <Route path="locations" element={<AdminLocationsPage />} />

                    {/* Members Tab */}
                    <Route path="members" element={<AdminUsersPage />} />
                    <Route path="members/create" element={<AdminUserCreatePage />} />
                    <Route path="members/:id" element={<AdminUserDetailPage />} />
                    <Route path="members/:id/edit" element={<AdminUserEditPage />} />

                    {/* Legacy user routes - redirect to members */}
                    <Route path="users" element={<Navigate to="/admin/members" replace />} />
                    <Route path="users/create" element={<Navigate to="/admin/members/create" replace />} />
                    <Route path="users/:id" element={<AdminUserDetailPage />} />
                    <Route path="users/:id/edit" element={<AdminUserEditPage />} />

                    {/* Permissions Tab */}
                    <Route path="permissions" element={<AdminWorkspacesPage />} />
                    <Route path="permissions/:id" element={<AdminWorkspaceDetailPage />} />

                    {/* Legacy workspace routes - redirect to permissions */}
                    <Route path="workspaces" element={<Navigate to="/admin/permissions" replace />} />
                    <Route path="workspaces/:id" element={<AdminWorkspaceDetailPage />} />

                    {/* Sessions Tab */}
                    <Route path="sessions" element={<AdminSessionsPage />} />
                    <Route path="sessions/:id" element={<AdminSessionDetailPage />} />
                    <Route path="audit" element={<AdminAuditPage />} />

                    {/* Analytics Tab */}
                    <Route path="analytics" element={<AdminDashboard />} />

                    {/* Integration Tab */}
                    <Route path="integration" element={<AdminIntegrationPage />} />
                  </Route>

                  {/* Map Workspace - Live Tracking & Playback */}
                  <Route path="/map" element={
                    <ProtectedRoute>
                      <MapLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/map/live" replace />} />
                    <Route path="live" element={<LiveMapPage />} />
                    <Route path="playback" element={<PlaybackMapPage />} />
                  </Route>

                  {/* Legacy routes - redirect to workspace structure */}
                  <Route path="/" element={<Navigate to="/fleetops" replace />} />
                  <Route path="/command-center" element={<Navigate to="/fleetops" replace />} />
                  <Route path="/facilities" element={<Navigate to="/storefront/facilities" replace />} />
                  <Route path="/tactical" element={<Navigate to="/fleetops/tactical" replace />} />
                  <Route path="/tactical-map" element={<Navigate to="/fleetops/tactical" replace />} />
                  <Route path="/dispatch" element={<Navigate to="/fleetops/dispatch" replace />} />
                  <Route path="/drivers" element={<Navigate to="/fleetops/drivers" replace />} />
                  <Route path="/vehicles" element={<Navigate to="/fleetops/vehicles" replace />} />
                  <Route path="/reports" element={<Navigate to="/fleetops/reports" replace />} />
                  
                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </MapStateProvider>
            </TooltipProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
