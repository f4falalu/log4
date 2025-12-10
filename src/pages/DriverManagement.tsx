import { useState, useEffect } from 'react';
import { useDrivers } from '@/hooks/useDrivers';
import { useAllDriverVehicles } from '@/hooks/useAllDriverVehicles';
import { useDriverFavorites } from '@/hooks/useDriverFavorites';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { DriverSidebar } from '@/components/driver/DriverSidebar';
import { DriverDetailView } from '@/components/driver/DriverDetailView';
import { DriverManagementTable } from '@/pages/fleetops/drivers/components/DriverManagementTable';
import { DriverOnboardingDialog } from '@/pages/fleetops/drivers/components/DriverOnboardingDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Driver } from '@/types';

type ViewMode = 'table' | 'grid';

export default function DriverManagement() {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const { data: drivers, isLoading: driversLoading, error: driversError } = useDrivers();
  const { data: allVehicles, isLoading: vehiclesLoading, error: vehiclesError } = useAllDriverVehicles();
  const { favorites, toggleFavorite } = useDriverFavorites();

  // Real-time updates
  useRealtimeDrivers();

  const isLoading = driversLoading || vehiclesLoading;
  const hasError = driversError || vehiclesError;

  // Auto-select first driver if none selected
  useEffect(() => {
    if (!selectedDriverId && drivers && drivers.length > 0) {
      setSelectedDriverId(drivers[0].id);
    }
  }, [drivers, selectedDriverId]);

  const selectedDriver = drivers?.find(d => d.id === selectedDriverId);

  // Error state
  if (hasError) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load driver data. Please refresh the page or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-80 border-r p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  const handleDriverSelect = (driver: Driver) => {
    setSelectedDriverId(driver.id);
    if (viewMode === 'table') {
      setViewMode('grid'); // Switch to grid view to show driver details
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden flex-col">
      {/* Page Header - Only show in table view */}
      {viewMode === 'table' && (
        <div className="border-b border-border bg-card px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Driver Management
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Manage and monitor your driver fleet
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setOnboardingOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Driver
            </Button>
          </div>
        </div>
      )}

      {/* Driver Onboarding Dialog */}
      <DriverOnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="flex-1 overflow-auto p-6">
          <DriverManagementTable
            onDriverSelect={handleDriverSelect}
            onViewChange={setViewMode}
          />
        </div>
      ) : (
        /* Grid View (Original Two-Panel Layout) */
        <div className="flex flex-1 w-full overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-80 flex-shrink-0">
            <DriverSidebar
              drivers={drivers}
              allVehicles={allVehicles}
              selectedDriverId={selectedDriverId}
              onSelectDriver={setSelectedDriverId}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          </div>

          {/* Right Detail Panel */}
          <div className="flex-1 overflow-hidden">
            {selectedDriver ? (
              <DriverDetailView driver={selectedDriver} />
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                <Card className="w-full max-w-md">
                  <CardContent className="p-12 text-center">
                    <h3 className="text-lg font-semibold mb-2">No Driver Selected</h3>
                    <p className="text-muted-foreground">
                      Select a driver from the sidebar to view their details
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
