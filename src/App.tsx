import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MapStateProvider } from "./contexts/MapStateContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import DriverManagement from "./components/DriverManagement";
import TacticalMap from "./components/TacticalMap";
import CommandCenterPage from "./pages/CommandCenterPage";
import DispatchPage from "./pages/DispatchPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <Toaster />
      <BrowserRouter 
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <MapStateProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/command-center" element={
                <ProtectedRoute>
                  <CommandCenterPage />
                </ProtectedRoute>
              } />
              <Route path="/tactical" element={
                <ProtectedRoute>
                  <TacticalMap />
                </ProtectedRoute>
              } />
              <Route path="/dispatch" element={
                <ProtectedRoute>
                  <DispatchPage />
                </ProtectedRoute>
              } />
              <Route path="/drivers" element={
                <ProtectedRoute>
                  <DriverManagement />
                </ProtectedRoute>
              } />
              {/* Legacy route redirects */}
              <Route path="/tactical-map" element={<Navigate to="/tactical" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MapStateProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
