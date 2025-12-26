import React, { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MapStateProvider } from "./contexts/MapStateContext";
import { WorkspaceProvider, useWorkspace } from "./contexts/WorkspaceContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PermissionRoute } from "./components/auth/PermissionRoute";
import { CommandPalette } from "./components/layout/CommandPalette";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Eagerly load essential/common components
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Lazy load layouts
const FleetOpsLayout = lazy(() => import("./pages/fleetops/layout").then(m => ({ default: m.FleetOpsLayout })));
const StorefrontLayout = lazy(() => import("./pages/storefront/layout").then(m => ({ default: m.StorefrontLayout })));

// Lazy load FleetOps pages
const FleetOpsHome = lazy(() => import("./pages/fleetops/page"));
const DriverManagementPage = lazy(() => import("./pages/fleetops/drivers/page"));
const DispatchPage = lazy(() => import("./pages/DispatchPage"));
const BatchManagement = lazy(() => import("./pages/BatchManagement"));
const TacticalMap = lazy(() => import("./pages/TacticalMap"));
const VehicleManagementPage = lazy(() => import("./pages/VehicleManagementPage"));
const FleetManagement = lazy(() => import("./pages/fleetops/fleet-management/page"));
const ReportsPageWrapper = lazy(() => import("./pages/ReportsPageWrapper"));

// Lazy load VLMS pages
const VLMSDashboard = lazy(() => import("./pages/fleetops/vlms/page"));
const VLMSVehicles = lazy(() => import("./pages/fleetops/vlms/vehicles/page"));
const VLMSVehicleDetail = lazy(() => import("./pages/fleetops/vlms/vehicles/[id]/page"));
const VehicleOnboardPage = lazy(() => import("./pages/fleetops/vlms/vehicles/onboard/page"));
const VLMSMaintenance = lazy(() => import("./pages/fleetops/vlms/maintenance/page"));
const VLMSFuel = lazy(() => import("./pages/fleetops/vlms/fuel/page"));
const VLMSAssignments = lazy(() => import("./pages/fleetops/vlms/assignments/page"));
const VLMSIncidents = lazy(() => import("./pages/fleetops/vlms/incidents/page"));
const VLMSInspections = lazy(() => import("./pages/fleetops/vlms/inspections/page"));

// Lazy load Map System pages
const MapLayout = lazy(() => import("./pages/fleetops/map/layout"));
const OperationalMapPage = lazy(() => import("./pages/fleetops/map/operational/page"));
const PlanningMapPage = lazy(() => import("./pages/fleetops/map/planning/page"));
const ForensicsMapPage = lazy(() => import("./pages/fleetops/map/forensics/page"));

// Lazy load Storefront pages
const StorefrontHome = lazy(() => import("./pages/storefront/page"));
const StorefrontFacilities = lazy(() => import("./pages/storefront/facilities/page"));
const StorefrontPayloads = lazy(() => import("./pages/storefront/payloads/page"));
const StorefrontRequisitions = lazy(() => import("./pages/storefront/requisitions/page"));
const StorefrontZones = lazy(() => import("./pages/storefront/zones/page"));
const StorefrontLGAs = lazy(() => import("./pages/storefront/lgas/page"));
const SchedulePlanner = lazy(() => import("./pages/storefront/schedule-planner/page"));
const SchedulerPage = lazy(() => import("./pages/storefront/scheduler/page"));

// Lazy load Admin pages
const UserManagementPage = lazy(() => import("./pages/admin/users/page"));
const LocationManagementPage = lazy(() => import("./pages/admin/LocationManagement"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3, // Retry failed queries 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      staleTime: 30000, // Data is fresh for 30 seconds
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
});

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
              <CommandPalette />
              <Toaster />
              <MapStateProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />

                    {/* FleetOps Workspace */}
                    <Route path="/fleetops" element={
                      <ProtectedRoute>
                        <FleetOpsLayout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<FleetOpsHome />} />
                      <Route path="drivers" element={
                        <PermissionRoute permission="manage_drivers">
                          <DriverManagementPage />
                        </PermissionRoute>
                      } />
                      <Route path="dispatch" element={
                        <PermissionRoute permission={['assign_drivers', 'update_batches']} requireAll>
                          <DispatchPage />
                        </PermissionRoute>
                      } />
                      <Route path="batches" element={
                        <PermissionRoute permission={['create_batches', 'update_batches']}>
                          <BatchManagement />
                        </PermissionRoute>
                      } />
                      <Route path="tactical" element={
                        <PermissionRoute permission="view_tactical_map">
                          <TacticalMap />
                        </PermissionRoute>
                      } />
                      <Route path="vehicles" element={
                        <PermissionRoute permission="manage_vehicles">
                          <VehicleManagementPage />
                        </PermissionRoute>
                      } />
                      <Route path="fleet-management" element={
                        <PermissionRoute permission={['manage_drivers', 'manage_vehicles']}>
                          <ErrorBoundary>
                            <FleetManagement />
                          </ErrorBoundary>
                        </PermissionRoute>
                      } />
                      <Route path="reports" element={
                        <PermissionRoute permission="view_reports">
                          <ReportsPageWrapper />
                        </PermissionRoute>
                      } />

                      {/* VLMS Routes */}
                      <Route path="vlms" element={
                        <PermissionRoute permission="manage_vehicles">
                          <VLMSDashboard />
                        </PermissionRoute>
                      } />
                      <Route path="vlms/vehicles" element={
                        <PermissionRoute permission="manage_vehicles">
                          <VLMSVehicles />
                        </PermissionRoute>
                      } />
                      <Route path="vlms/vehicles/onboard" element={
                        <PermissionRoute permission="manage_vehicles">
                          <VehicleOnboardPage />
                        </PermissionRoute>
                      } />
                      <Route path="vlms/vehicles/:id" element={
                        <PermissionRoute permission="manage_vehicles">
                          <VLMSVehicleDetail />
                        </PermissionRoute>
                      } />
                      <Route path="vlms/maintenance" element={
                        <PermissionRoute permission="manage_vehicles">
                          <VLMSMaintenance />
                        </PermissionRoute>
                      } />
                      <Route path="vlms/fuel" element={
                        <PermissionRoute permission="manage_vehicles">
                          <VLMSFuel />
                        </PermissionRoute>
                      } />
                      <Route path="vlms/assignments" element={
                        <PermissionRoute permission={['manage_vehicles', 'assign_drivers']}>
                          <VLMSAssignments />
                        </PermissionRoute>
                      } />
                      <Route path="vlms/incidents" element={
                        <PermissionRoute permission="manage_vehicles">
                          <VLMSIncidents />
                        </PermissionRoute>
                      } />
                      <Route path="vlms/inspections" element={
                        <PermissionRoute permission="manage_vehicles">
                          <VLMSInspections />
                        </PermissionRoute>
                      } />

                      {/* Map System Routes */}
                      <Route path="map" element={<MapLayout />}>
                        <Route index element={<Navigate to="/fleetops/map/operational" replace />} />
                        <Route path="operational" element={<OperationalMapPage />} />
                        <Route path="planning" element={<PlanningMapPage />} />
                        <Route path="forensics" element={<ForensicsMapPage />} />
                      </Route>
                    </Route>

                    {/* Storefront Workspace */}
                    <Route path="/storefront" element={
                      <ProtectedRoute>
                        <StorefrontLayout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<StorefrontHome />} />
                      <Route path="zones" element={
                        <PermissionRoute permission="manage_facilities">
                          <StorefrontZones />
                        </PermissionRoute>
                      } />
                      <Route path="lgas" element={
                        <PermissionRoute permission="manage_facilities">
                          <StorefrontLGAs />
                        </PermissionRoute>
                      } />
                      <Route path="facilities" element={
                        <PermissionRoute permission="manage_facilities">
                          <StorefrontFacilities />
                        </PermissionRoute>
                      } />
                      <Route path="requisitions" element={
                        <PermissionRoute permission={['create_batches', 'manage_facilities']}>
                          <StorefrontRequisitions />
                        </PermissionRoute>
                      } />
                      <Route path="payloads" element={
                        <PermissionRoute permission="create_batches">
                          <StorefrontPayloads />
                        </PermissionRoute>
                      } />
                      <Route path="schedule-planner" element={
                        <PermissionRoute permission="create_batches">
                          <SchedulePlanner />
                        </PermissionRoute>
                      } />
                      <Route path="scheduler" element={
                        <PermissionRoute permission="create_batches">
                          <SchedulerPage />
                        </PermissionRoute>
                      } />
                    </Route>

                    {/* Admin Routes */}
                    <Route path="/admin" element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_users">
                          <div className="min-h-screen bg-background">
                            <div className="container mx-auto py-6">
                              <Suspense fallback={<PageLoader />}>
                                <ErrorBoundary>
                                  <Outlet />
                                </ErrorBoundary>
                              </Suspense>
                            </div>
                          </div>
                        </PermissionRoute>
                      </ProtectedRoute>
                    }>
                      <Route path="users" element={<UserManagementPage />} />
                      <Route path="locations" element={<LocationManagementPage />} />
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
                </Suspense>
              </MapStateProvider>
            </TooltipProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
