import { useState } from 'react';
import { useDrivers } from '@/hooks/useDrivers';
import { useDriverVehicles } from '@/hooks/useDriverVehicles';
import { useDriverFavorites } from '@/hooks/useDriverFavorites';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { DriverSidebar } from './DriverSidebar';
import { DriverDetailView } from './DriverDetailView';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DriverManagement() {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const { data: drivers, isLoading } = useDrivers();
  const { favorites, toggleFavorite } = useDriverFavorites();
  
  // Fetch all vehicles for all drivers
  const driverIds = drivers?.map(d => d.id) || [];
  const allVehiclesQueries = driverIds.map(id => useDriverVehicles(id));
  const allVehicles = allVehiclesQueries.flatMap(query => query.data || []);

  // Real-time updates
  useRealtimeDrivers();

  // Auto-select first driver if none selected
  if (!selectedDriverId && drivers && drivers.length > 0) {
    setSelectedDriverId(drivers[0].id);
  }

  const selectedDriver = drivers?.find(d => d.id === selectedDriverId);

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

  return (
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
  );
}
