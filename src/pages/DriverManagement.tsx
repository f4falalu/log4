import { useState, useEffect } from 'react';
import { useDrivers } from '@/hooks/useDrivers';
import { useAllDriverVehicles } from '@/hooks/useAllDriverVehicles';
import { useDriverFavorites } from '@/hooks/useDriverFavorites';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { DriverSidebar } from '@/components/driver/DriverSidebar';
import { DriverDetailView } from '@/components/driver/DriverDetailView';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import Layout from '@/components/layout/Layout';

export default function DriverManagement() {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
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
      <Layout>
        <div className="flex h-screen items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load driver data. Please refresh the page or contact support if the issue persists.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-screen w-full overflow-hidden">
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
    </Layout>
  );
}
