/**
 * EntityDetailPanel - Right slide-in panel for entity details
 * Shows driver, vehicle, or delivery information
 */

import {
  X,
  User,
  Truck,
  Package,
  MapPin,
  Clock,
  Gauge,
  Battery,
  Signal,
  Navigation,
  Phone,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import type {
  EntityType,
  LiveDriver,
  LiveVehicle,
  LiveDelivery,
  DriverStatus,
} from '@/types/live-map';

interface EntityDetailPanelProps {
  entityId: string;
  entityType: EntityType;
  entityData: LiveDriver | LiveVehicle | LiveDelivery | null | undefined;
  onClose: () => void;
}

const statusColors: Record<DriverStatus, string> = {
  INACTIVE: 'bg-gray-500',
  ACTIVE: 'bg-blue-500',
  EN_ROUTE: 'bg-blue-500',
  AT_STOP: 'bg-green-500',
  DELAYED: 'bg-red-500',
  COMPLETED: 'bg-emerald-500',
  SUSPENDED: 'bg-amber-500',
};

const statusLabels: Record<DriverStatus, string> = {
  INACTIVE: 'Inactive',
  ACTIVE: 'Active',
  EN_ROUTE: 'En Route',
  AT_STOP: 'At Stop',
  DELAYED: 'Delayed',
  COMPLETED: 'Completed',
  SUSPENDED: 'Suspended',
};

export function EntityDetailPanel({
  entityId,
  entityType,
  entityData,
  onClose,
}: EntityDetailPanelProps) {
  if (!entityData) {
    return (
      <div className="w-80 border-l bg-background flex flex-col h-full">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Details</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 text-muted-foreground text-sm">
          Entity not found
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {entityType === 'driver' && <User className="h-5 w-5 text-blue-500" />}
          {entityType === 'vehicle' && <Truck className="h-5 w-5 text-purple-500" />}
          {entityType === 'delivery' && <Package className="h-5 w-5 text-green-500" />}
          <h3 className="font-semibold capitalize">{entityType} Details</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {entityType === 'driver' && (
          <DriverDetails driver={entityData as LiveDriver} />
        )}
        {entityType === 'vehicle' && (
          <VehicleDetails vehicle={entityData as LiveVehicle} />
        )}
        {entityType === 'delivery' && (
          <DeliveryDetails delivery={entityData as LiveDelivery} />
        )}
      </div>
    </div>
  );
}

function DriverDetails({ driver }: { driver: LiveDriver }) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Identity */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold">{driver.name}</h4>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[driver.status]}>
                {statusLabels[driver.status]}
              </Badge>
              {driver.isOnline && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Online
                </span>
              )}
            </div>
          </div>
        </div>

        {driver.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            {driver.email}
          </div>
        )}
        {driver.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            {driver.phone}
          </div>
        )}
      </div>

      <Separator />

      {/* Location & Speed */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-muted-foreground">Current Status</h5>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Gauge className="h-3 w-3" />
              Speed
            </div>
            <div className="text-lg font-semibold">
              {Math.round((driver.speed || 0) * 3.6)} km/h
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Navigation className="h-3 w-3" />
              Heading
            </div>
            <div className="text-lg font-semibold">
              {Math.round(driver.heading || 0)}°
            </div>
          </div>

          {driver.batteryLevel !== undefined && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Battery className="h-3 w-3" />
                Battery
              </div>
              <div className="text-lg font-semibold">
                {driver.batteryLevel}%
              </div>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Signal className="h-3 w-3" />
              Accuracy
            </div>
            <div className="text-lg font-semibold">
              {Math.round(driver.accuracy)}m
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last update: {formatTime(driver.lastUpdate)}
        </div>
      </div>

      <Separator />

      {/* Assignment */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-muted-foreground">Assignment</h5>

        {driver.batchId ? (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-blue-600 mb-1">Active Batch</div>
            <div className="font-mono text-xs">{driver.batchId.slice(0, 8)}...</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No active assignment</div>
        )}

        {driver.vehicleId && (
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Vehicle: {driver.vehicleId.slice(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
}

function VehicleDetails({ vehicle }: { vehicle: LiveVehicle }) {
  return (
    <div className="p-4 space-y-6">
      {/* Identity */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
            <Truck className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h4 className="font-semibold">{vehicle.plate}</h4>
            <div className="text-sm text-muted-foreground capitalize">
              {vehicle.make} {vehicle.model} • {vehicle.type}
            </div>
          </div>
        </div>

        <Badge variant={vehicle.isActive ? 'default' : 'secondary'}>
          {vehicle.isActive ? 'Active' : 'Idle'}
        </Badge>
      </div>

      <Separator />

      {/* Capacity */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-muted-foreground">Capacity</h5>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Utilization</span>
            <span className="font-medium">{Math.round(vehicle.utilization)}%</span>
          </div>
          <Progress value={vehicle.utilization} className="h-2" />
        </div>

        <div className="text-sm text-muted-foreground">
          Max capacity: {vehicle.capacity} units
        </div>
      </div>

      <Separator />

      {/* Driver */}
      {vehicle.driverName && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-muted-foreground">Assigned Driver</h5>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {vehicle.driverName}
          </div>
        </div>
      )}

      {/* Speed */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Speed</div>
          <div className="text-lg font-semibold">
            {Math.round((vehicle.speed || 0) * 3.6)} km/h
          </div>
        </div>

        {vehicle.fuelLevel !== undefined && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Fuel</div>
            <div className="text-lg font-semibold">{vehicle.fuelLevel}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryDetails({ delivery }: { delivery: LiveDelivery }) {
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Package className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold">{delivery.name}</h4>
            <Badge className={statusColors[delivery.driverStatus]}>
              {statusLabels[delivery.driverStatus]}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Progress */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-muted-foreground">Progress</h5>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Stops completed</span>
            <span className="font-medium">
              {delivery.completedStops} / {delivery.totalStops}
            </span>
          </div>
          <Progress value={delivery.progress} className="h-2" />
        </div>

        <div className="text-sm text-muted-foreground">
          Currently at stop {delivery.currentStopIndex + 1}
        </div>
      </div>

      <Separator />

      {/* Stops list */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-muted-foreground">Stops</h5>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {delivery.facilities.map((facility, index) => (
            <div
              key={facility.id}
              className={`flex items-start gap-2 p-2 rounded ${index === delivery.currentStopIndex
                  ? 'bg-blue-50 border border-blue-200'
                  : facility.status === 'completed'
                    ? 'bg-green-50'
                    : 'bg-muted/30'
                }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium ${facility.status === 'completed'
                    ? 'bg-green-500 text-white'
                    : index === delivery.currentStopIndex
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{facility.name}</div>
                {facility.address && (
                  <div className="text-xs text-muted-foreground truncate">
                    {facility.address}
                  </div>
                )}
              </div>
              {facility.proofCaptured && (
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium whitespace-nowrap">
                  <CheckCircle className="h-3 w-3" />
                  POD
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Driver */}
      {delivery.driverName && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">Driver</h5>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {delivery.driverName}
          </div>
        </div>
      )}

      {/* Times */}
      {delivery.startTime && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">Timeline</h5>
          <div className="text-sm">
            Started:{' '}
            {new Intl.DateTimeFormat('en-US', {
              hour: 'numeric',
              minute: 'numeric',
              hour12: true,
            }).format(delivery.startTime)}
          </div>
        </div>
      )}
    </div>
  );
}
