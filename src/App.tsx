import React, { useEffect, lazy, Suspense, ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MapStateProvider } from "./contexts/MapStateContext";
import { WorkspaceProvider, useWorkspace } from "./contexts/WorkspaceContext";
import { AbilityProvider } from "./rbac/AbilityProvider";
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
import AdminSessionsPage from "./pages/admin/sessions/page";
import AdminSessionDetailPage from "./pages/admin/sessions/[id]/page";
import LiveMapPage from "./pages/map/live/page";
import PlaybackMapPage from "./pages/map/playback/page";

// Settings Pages
import PermissionsPage from "./pages/settings/permissions/page";
const SettingsLayout = lazy(() => import("./pages/settings/layout"));
const SettingsGeneralPage = lazy(() => import("./pages/settings/general/page"));
const SettingsMembersPage = lazy(() => import("./pages/settings/members/page"));
const SettingsAccessControlPage = lazy(() => import("./pages/settings/access-control/page"));
const SettingsLocationsPage = lazy(() => import("./pages/admin/LocationManagement"));
const SettingsIntegrationPage = lazy(() => import("./pages/admin/integration/page"));
const SettingsProfilePage = lazy(() => import("./pages/settings/profile/page"));

// Onboarding Pages
import OnboardingWizardV2 from "./components/onboarding/OnboardingWizardV2";
import AcceptInvitationPage from "./pages/invite/AcceptInvitationPage";
import ProfileCompletionPage from "./pages/onboarding/ProfileCompletionPage";
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
// Lazy load pages that are also dynamically imported by SecondarySidebar
const DriverManagement = lazy(() => import("./pages/DriverManagement"));

const BatchManagement = lazy(() => import("./pages/BatchManagement"));
const VLMSDashboard = lazy(() => import("./pages/fleetops/vlms/page"));

import CommandCenterPage from "./pages/CommandCenterPage";
import FacilityManagerPage from "./pages/FacilityManagerPage";
import VehicleManagementPage from "./pages/VehicleManagementPage";

// Lazy load Reports page (includes Recharts - ~300 kB uncompressed / 77 kB gzipped)
const ReportsPageWrapper = lazy(() => import("./pages/ReportsPageWrapper"));
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

function AbilityWrapper({ children }: { children: ReactNode }) {
  const { workspaceId } = useWorkspace();
  return <AbilityProvider workspaceId={workspaceId}>{children}</AbilityProvider>;
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
            <AbilityWrapper>
            <TooltipProvider>
              <WorkspaceThemeApplier />
              <Toaster />
              <RadixToaster />
              <MapStateProvider>
                <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Onboarding Routes */}
                  <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizardV2 /></ProtectedRoute>} />
                  <Route path="/onboarding/profile" element={<ProtectedRoute><ProfileCompletionPage /></ProtectedRoute>} />
                  <Route path="/invite/:token" element={<AcceptInvitationPage />} />

                  {/* FleetOps Workspace */}
                  <Route path="/fleetops" element={
                    <ProtectedRoute>
                      <FleetOpsLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<FleetOpsHome />} />
                    <Route path="drivers" element={<DriverManagement />} />

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

                  {/* Admin — System Operations (system_admin only) */}
                  <Route path="/admin" element={
                    <ProtectedRoute permission="admin.users">
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/admin/analytics" replace />} />
                    <Route path="analytics" element={<AdminDashboard />} />
                    <Route path="sessions" element={<AdminSessionsPage />} />
                    <Route path="sessions/:id" element={<AdminSessionDetailPage />} />
                    {/* Legacy redirects → /settings */}
                    <Route path="integration" element={<Navigate to="/settings/integration" replace />} />
                    <Route path="general" element={<Navigate to="/settings/general" replace />} />
                    <Route path="locations" element={<Navigate to="/settings/locations" replace />} />
                    <Route path="members" element={<Navigate to="/settings/members" replace />} />
                    <Route path="members/:id" element={<Navigate to="/settings/members" replace />} />
                    <Route path="invitations" element={<Navigate to="/settings/members" replace />} />
                    <Route path="permissions" element={<Navigate to="/settings/access-control" replace />} />
                    <Route path="workspaces" element={<Navigate to="/settings/access-control" replace />} />
                    <Route path="users" element={<Navigate to="/settings/members" replace />} />
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

                  <Route path="/drivers" element={<Navigate to="/fleetops/drivers" replace />} />
                  <Route path="/vehicles" element={<Navigate to="/fleetops/vehicles" replace />} />
                  <Route path="/reports" element={<Navigate to="/fleetops/reports" replace />} />
                  
                  {/* Settings Routes — user-scoped (no workspace.manage required) */}
                  <Route path="/settings/permissions" element={
                    <ProtectedRoute>
                      <PermissionsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings/profile" element={
                    <ProtectedRoute>
                      <SettingsLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={
                      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <SettingsProfilePage />
                      </Suspense>
                    } />
                  </Route>
                  {/* Settings Routes — workspace-scoped (workspace.manage required) */}
                  <Route path="/settings" element={
                    <ProtectedRoute permission="workspace.manage">
                      <SettingsLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/settings/general" replace />} />
                    <Route path="general" element={<SettingsGeneralPage />} />
                    <Route path="members" element={<SettingsMembersPage />} />
                    <Route path="access-control" element={<SettingsAccessControlPage />} />
                    <Route path="locations" element={<SettingsLocationsPage />} />
                    <Route path="integration" element={<SettingsIntegrationPage />} />
                  </Route>
                  
                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </MapStateProvider>
            </TooltipProvider>
            </AbilityWrapper>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
