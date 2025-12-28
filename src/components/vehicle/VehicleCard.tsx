import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vehicle } from '@/types';
import { Clock, Package, Fuel, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVehicleStateColors, getBadgeVariant } from '@/lib/designTokens';
import { getVehicleSilhouette } from '@/lib/vehicleUtils';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: (vehicle: Vehicle) => void;
  compact?: boolean;
}

export const VehicleCard = ({ vehicle, onClick, compact = false }: VehicleCardProps) => {
  const getStatusColorClasses = (status: string) => {
    // Map vehicle status to our semantic states
    let state: 'available' | 'in_use' | 'maintenance' | 'out_of_service' = 'available';

    if (status === 'in-use') state = 'in_use';
    else if (status === 'available') state = 'available';
    else if (status === 'maintenance') state = 'maintenance';
    else state = 'out_of_service';

    const colors = getVehicleStateColors(state);
    return cn(colors.bg, colors.text, colors.border, 'border');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in-use':
        return 'On Route';
      case 'available':
        return 'Available';
      case 'maintenance':
        return 'Maintenance';
      default:
        return status;
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-lg cursor-pointer",
        compact ? "h-auto" : "h-full"
      )}
      onClick={() => onClick?.(vehicle)}
    >
      <CardContent className={cn("p-4", compact ? "space-y-2" : "space-y-4")}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-mono text-sm font-semibold tracking-tight">
              {vehicle.plateNumber}
            </p>
            <p className="text-xs text-muted-foreground">{vehicle.model}</p>
          </div>
          <Badge
            variant="outline"
            className={cn("text-xs", getStatusColorClasses(vehicle.status))}
          >
            {getStatusLabel(vehicle.status)}
          </Badge>
        </div>

        {/* Vehicle Image or Silhouette */}
        {vehicle.photo_url ? (
            <div className="relative w-full aspect-[16/9] bg-muted/30 rounded-lg overflow-hidden">
              <img
                src={vehicle.photo_url}
                alt={`${vehicle.plateNumber} - ${vehicle.model}`}
                className="w-full h-full object-contain p-2"
              />
            {vehicle.ai_generated && (
              <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs border">
                ✨ AI
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full aspect-[16/9] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src={getVehicleSilhouette(vehicle.type)}
              alt={`${vehicle.type} silhouette`}
              className={cn(
                "object-contain",
                compact ? "h-20" : "h-28"
              )}
            />
          </div>
        )}

        {/* Vehicle Details */}
        {!compact && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-xs">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Capacity:</span>
              <span className="font-medium">{vehicle.capacity} m³</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Fuel:</span>
              <span className="font-medium capitalize">{vehicle.fuelType}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Avg Speed:</span>
              <span className="font-medium">{vehicle.avgSpeed} km/h</span>
            </div>
            {vehicle.currentDriverId && (
              <div className="flex items-center gap-2 text-xs">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Assigned</span>
              </div>
            )}
          </div>
        )}

        {compact && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span className="capitalize">{vehicle.type}</span>
            <span>{vehicle.capacity} m³</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
