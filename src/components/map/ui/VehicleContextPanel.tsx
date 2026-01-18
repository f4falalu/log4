/**
 * VehicleContextPanel Component
 *
 * Right-side expandable panel showing detailed vehicle information
 * Slides in from right (360px width) on vehicle click
 *
 * Design: Solid backgrounds, high contrast, production-ready
 * Vehicle-centric: Shows live location, execution status, route, delivery schedule
 */

import { X, MapPin, Gauge, Clock, Warehouse, Building, AlertTriangle, TrendingUp, Navigation, User, Package, Fuel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Vehicle } from '@/types';

interface VehicleContextPanelProps {
  vehicle: Vehicle;
  onClose: () => void;
}

/**
 * Info row component
 */
function InfoRow({
  icon: Icon,
  label,
  value,
  color,
  className,
}: {
  icon?: any;
  label: string;
  value: string;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className || ''}`}>
      {Icon && <Icon className={`h-4 w-4 mt-0.5 ${color || 'text-muted-foreground'}`} />}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-sm font-medium ${color || 'text-foreground'}`}>{value}</div>
      </div>
    </div>
  );
}

/**
 * Section component
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    available: { variant: 'secondary', label: 'Available' },
    en_route: { variant: 'default', label: 'En Route' },
    delivering: { variant: 'default', label: 'Delivering' },
    delayed: { variant: 'destructive', label: 'Delayed' },
    broken_down: { variant: 'destructive', label: 'Broken Down' },
    offline: { variant: 'outline', label: 'Offline' },
  };

  const config = variants[status] || { variant: 'outline' as const, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * Format bearing to compass direction
 */
function formatBearing(bearing: number | undefined): string {
  if (bearing === undefined || bearing === null) return 'N/A';

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((bearing % 360) + 360) % 360 / 45) % 8;
  return `${directions[index]} (${Math.round(bearing)}°)`;
}

/**
 * Vehicle Context Panel
 *
 * PRD REQUIREMENTS:
 * - Vehicle ID & type
 * - Current location (lat/lng + address)
 * - Speed & status
 * - Destination facility
 * - ETA
 * - Delivery schedule (stops + dwell)
 * - Bearing/direction of travel
 * - Driver info (if assigned)
 */
export function VehicleContextPanel({ vehicle, onClose }: VehicleContextPanelProps) {
  // Support both demo (lat/lng) and production (current_lat/current_lng) schemas
  const lat = (vehicle as any).lat ?? (vehicle as any).current_lat ?? vehicle.current_location?.lat;
  const lng = (vehicle as any).lng ?? (vehicle as any).current_lng ?? vehicle.current_location?.lng;

  // Format coordinates
  const coords = lat && lng
    ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
    : 'N/A';

  // Calculate speed (normalize from different schemas)
  const speed = (vehicle as any).speed ?? vehicle.speed ?? 0;

  // Get bearing
  const bearing = (vehicle as any).bearing;

  // Get delay info
  const hasDelay = vehicle.status === 'delayed';
  const delayMinutes = hasDelay ? '15 min' : 'On Time'; // TODO: Calculate from actual data

  // Get utilization (normalize from different schemas)
  const utilization = vehicle.utilization_percentage
    ?? (vehicle as any).capacity?.utilization * 100
    ?? 0;
  const utilizationColor = utilization > 80 ? 'text-green-500' : utilization > 50 ? 'text-yellow-500' : 'text-red-500';

  // Get capacity info
  const capacity = (vehicle as any).capacity;
  const capacityText = capacity
    ? `${capacity.used ?? 0}/${capacity.total ?? 100} units (${Math.round(capacity.utilization * 100 || 0)}%)`
    : vehicle.capacity
      ? `${vehicle.capacity} units`
      : 'N/A';

  // Get driver info
  const driverName = (vehicle as any).driver_name ?? (vehicle as any).assignedDriver?.name;

  return (
    <div className="fixed right-0 top-0 h-full w-[360px] bg-background border-l border-border z-[1100] flex flex-col overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {vehicle.plate || vehicle.registration_number || vehicle.id}
          </h3>
          <div className="mt-1">
            <StatusBadge status={vehicle.status} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-muted transition-colors flex-shrink-0 ml-2"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Live Location */}
        <Section title="Live Location">
          <InfoRow
            icon={MapPin}
            label="Current Location"
            value={vehicle.current_location_name || (vehicle as any).locationName || 'Unknown Location'}
          />
          <InfoRow label="Coordinates" value={coords} className="text-xs text-muted-foreground" />
          {bearing !== undefined && (
            <InfoRow
              icon={Navigation}
              label="Heading"
              value={formatBearing(bearing)}
            />
          )}
        </Section>

        {/* Driver Info */}
        {driverName && (
          <>
            <Separator />
            <Section title="Assigned Driver">
              <InfoRow
                icon={User}
                label="Driver"
                value={driverName}
              />
            </Section>
          </>
        )}

        <Separator />

        {/* Execution Status */}
        <Section title="Execution Status">
          <InfoRow
            icon={Gauge}
            label="Speed"
            value={`${speed} km/h`}
            color={speed > 0 ? 'text-primary' : 'text-muted-foreground'}
          />
          <InfoRow
            icon={Clock}
            label="Delay"
            value={delayMinutes}
            color={hasDelay ? 'text-destructive' : 'text-green-500'}
          />
          <InfoRow
            icon={TrendingUp}
            label="Utilization"
            value={`${utilization}%`}
            color={utilizationColor}
          />
          {vehicle.active_event && (
            <InfoRow
              icon={AlertTriangle}
              label="Active Event"
              value={vehicle.active_event.type || 'Unknown Event'}
              color="text-destructive"
            />
          )}
        </Section>

        <Separator />

        {/* Route & ETA */}
        <Section title="Route & ETA">
          <InfoRow
            icon={Warehouse}
            label="Origin"
            value={vehicle.origin_warehouse_name || 'N/A'}
          />
          <InfoRow
            icon={Building}
            label="Destination"
            value={vehicle.destination_facility_name || 'N/A'}
          />
          <InfoRow
            icon={Clock}
            label="ETA"
            value={vehicle.eta || 'Calculating...'}
            color="text-primary"
          />
          {vehicle.distance_remaining && (
            <InfoRow
              label="Distance Remaining"
              value={`${vehicle.distance_remaining} km`}
            />
          )}
        </Section>

        <Separator />

        {/* Vehicle Details */}
        <Section title="Vehicle Details">
          <InfoRow label="Type" value={vehicle.vehicle_type || (vehicle as any).type || 'N/A'} />
          <InfoRow label="Model" value={vehicle.model || 'N/A'} />
          <InfoRow
            icon={Package}
            label="Capacity"
            value={capacityText}
          />
          {(vehicle.fuel_level !== undefined || (vehicle as any).fuelLevel !== undefined) && (
            <InfoRow
              icon={Fuel}
              label="Fuel Level"
              value={`${vehicle.fuel_level ?? (vehicle as any).fuelLevel}%`}
              color={(vehicle.fuel_level ?? (vehicle as any).fuelLevel) < 20 ? 'text-destructive' : 'text-foreground'}
            />
          )}
        </Section>

        {/* Delivery Schedule */}
        {vehicle.delivery_stops && vehicle.delivery_stops.length > 0 && (
          <>
            <Separator />
            <Section title="Delivery Schedule">
              <div className="space-y-2">
                {vehicle.delivery_stops.map((stop, index) => (
                  <div
                    key={stop.id || index}
                    className="p-2 rounded bg-muted/30 border border-border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Stop {index + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {stop.status || 'Pending'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stop.facility_name || 'Unknown Facility'}
                    </div>
                    {stop.eta && (
                      <div className="text-xs text-muted-foreground mt-1">
                        ETA: {stop.eta}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-2 bg-muted/30">
        <Button variant="outline" className="flex-1" size="sm">
          View in Forensics
        </Button>
        <Button variant="default" className="flex-1" size="sm">
          Track Live
        </Button>
      </div>
    </div>
  );
}
