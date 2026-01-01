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
import FleetOpsHome from "./pages/fleetops/page";
import StorefrontHome from "./pages/storefront/page";
import StorefrontFacilities from "./pages/storefront/facilities/page";
import StorefrontPayloads from "./pages/storefront/payloads/page";
import StorefrontRequisitions from "./pages/storefront/requisitions/page";
import SchedulePlanner from "./pages/storefront/schedule-planner/page";
import StorefrontZones from "./pages/storefront/zones/page";
import StorefrontLGAs from "./pages/storefront/lgas/page";
import StorefrontScheduler from "./pages/storefront/scheduler/page";
import StorefrontStockReports from "./pages/storefront/stock-reports/page";
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
import MapLayout from "./pages/fleetops/map/layout";
import PlanningMapPage from "./pages/fleetops/map/planning/page";
import OperationalMapPage from "./pages/fleetops/map/operational/page";
import ForensicsMapPage from "./pages/fleetops/map/forensics/page";
import VLMSDashboard from "./pages/fleetops/vlms/page";
import VLMSVehicles from "./pages/fleetops/vlms/vehicles/page";
import VLMSVehicleDetail from "./pages/fleetops/vlms/vehicles/[id]/page";
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
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
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
                    <Route path="tactical" element={<Navigate to="/fleetops/map/operational" replace />} />
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
                    <Route path="map" element={<MapLayout />}>
                      <Route path="planning" element={<PlanningMapPage />} />
                      <Route path="operational" element={<OperationalMapPage />} />
                      <Route path="forensics" element={<ForensicsMapPage />} />
                    </Route>
                    <Route path="vlms">
                      <Route index element={<VLMSDashboard />} />
                      <Route path="vehicles" element={<VLMSVehicles />} />
                      <Route path="vehicles/:id" element={<VLMSVehicleDetail />} />
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
                    <Route path="facilities" element={<StorefrontFacilities />} />
                    <Route path="requisitions" element={<StorefrontRequisitions />} />
                    <Route path="payloads" element={<StorefrontPayloads />} />
                    <Route path="schedule-planner" element={<SchedulePlanner />} />
                    <Route path="zones" element={<StorefrontZones />} />
                    <Route path="lgas" element={<StorefrontLGAs />} />
                    <Route path="scheduler" element={<StorefrontScheduler />} />
                    <Route path="stock-reports" element={<StorefrontStockReports />} />
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
