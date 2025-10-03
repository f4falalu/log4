import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, CircleDot } from 'lucide-react';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { DeliveryBatch } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface FleetStatusProps {
  batches: DeliveryBatch[];
}

const FleetStatus = ({ batches }: FleetStatusProps) => {
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();

  const fleetStats = useMemo(() => {
    const inProgressBatches = batches.filter(b => b.status === 'in-progress');
    const activeVehicleIds = new Set(inProgressBatches.map(b => b.vehicleId).filter(Boolean));
    const activeDriverIds = new Set(inProgressBatches.map(b => b.driverId).filter(Boolean));

    const vehicleStats = {
      active: vehicles.filter(v => activeVehicleIds.has(v.id) || v.status === 'in-use').length,
      available: vehicles.filter(v => v.status === 'available').length,
      offline: vehicles.filter(v => v.status === 'maintenance').length
    };

    const driverStats = {
      active: drivers.filter(d => activeDriverIds.has(d.id) || d.status === 'busy').length,
      available: drivers.filter(d => d.status === 'available').length,
      offline: drivers.filter(d => d.status === 'offline').length
    };

    return { vehicleStats, driverStats };
  }, [batches, drivers, vehicles]);

  if (driversLoading || vehiclesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Vehicle Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-green-600" />
                <span className="text-sm">Active</span>
              </div>
              <Badge variant="default" className="bg-green-600">
                {fleetStats.vehicleStats.active}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Available</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {fleetStats.vehicleStats.available}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Maintenance</span>
              </div>
              <Badge variant="outline">
                {fleetStats.vehicleStats.offline}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CircleDot className="h-4 w-4" />
            Driver Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-green-600" />
                <span className="text-sm">On Duty</span>
              </div>
              <Badge variant="default" className="bg-green-600">
                {fleetStats.driverStats.active}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Available</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {fleetStats.driverStats.available}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Off Duty</span>
              </div>
              <Badge variant="outline">
                {fleetStats.driverStats.offline}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetStatus;
