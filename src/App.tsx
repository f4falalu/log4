import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import FleetManagement from "./pages/fleetops/fleet-management/page";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import DriverManagement from "./pages/DriverManagement";
import TacticalMap from "./pages/TacticalMap";
import CommandCenterPage from "./pages/CommandCenterPage";
import DispatchPage from "./pages/DispatchPage";
import FacilityManagerPage from "./pages/FacilityManagerPage";
import VehicleManagementPage from "./pages/VehicleManagementPage";
import ReportsPageWrapper from "./pages/ReportsPageWrapper";
import BatchManagement from "./pages/BatchManagement";

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
                    <Route path="tactical" element={<TacticalMap />} />
                    <Route path="vehicles" element={<VehicleManagementPage />} />
                    <Route path="fleet-management" element={<FleetManagement />} />
                    <Route path="reports" element={<ReportsPageWrapper />} />
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
