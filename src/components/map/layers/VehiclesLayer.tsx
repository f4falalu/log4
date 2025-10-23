import { Marker, Popup, Tooltip } from 'react-leaflet';
import { MapIcons } from '@/lib/mapIcons';
import { useVehicles } from '@/hooks/useVehicles';
import { useVehiclePayload } from '@/hooks/useVehiclePayload';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Navigation, Clock } from 'lucide-react';

interface VehiclesLayerProps {
  selectedVehicleId?: string | null;
  onVehicleClick?: (vehicleId: string) => void;
}

export function VehiclesLayer({ 
  selectedVehicleId,
  onVehicleClick 
}: VehiclesLayerProps) {
  const { data: vehicles = [] } = useVehicles();

  return (
    <>
      {vehicles.map((vehicle: any) => {
        if (!vehicle.current_lat || !vehicle.current_lng) return null;

        return (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            selected={selectedVehicleId === vehicle.id}
            onClick={() => onVehicleClick?.(vehicle.id)}
          />
        );
      })}
    </>
  );
}

interface VehicleMarkerProps {
  vehicle: any;
  selected: boolean;
  onClick: () => void;
}

function VehicleMarker({ vehicle, selected, onClick }: VehicleMarkerProps) {
  const { data: payload } = useVehiclePayload(vehicle.id);
  
  const utilizationPct = payload?.utilizationPct || 0;
  const status = vehicle.status || 'available';

  // Create icon with payload ring
  const icon = MapIcons.vehicle(utilizationPct, selected, status);

  return (
    <Marker
      position={[vehicle.current_lat, vehicle.current_lng]}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        <div className="min-w-[200px] p-2">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-biko-primary" />
            <span className="font-semibold">{vehicle.plateNumber}</span>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payload</span>
              <Badge variant={
                utilizationPct > 90 ? 'destructive' : 
                utilizationPct > 60 ? 'default' : 
                'secondary'
              } className="text-xs">
                {utilizationPct.toFixed(0)}%
              </Badge>
            </div>
            
            {payload && (
              <div className="space-y-1">
                <Progress value={utilizationPct} className="h-2" />
                <div className="flex justify-between text-muted-foreground">
                  <span>{payload.totalWeight.toFixed(1)} kg</span>
                  <span>{payload.totalVolume.toFixed(2)} m³</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-muted-foreground">
              <Navigation className="w-3 h-3" />
              <span className="capitalize">{status}</span>
            </div>
          </div>
        </div>
      </Tooltip>
      
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            {vehicle.plateNumber}
          </h3>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>{' '}
              <span className="capitalize">{vehicle.type}</span>
            </div>
            
            <div>
              <span className="text-muted-foreground">Model:</span>{' '}
              <span>{vehicle.model}</span>
            </div>
            
            {payload && (
              <div>
                <span className="text-muted-foreground">Capacity:</span>
                <Progress value={utilizationPct} className="h-2 mt-1" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{payload.totalWeight.toFixed(1)} / {payload.capacityWeight} kg</span>
                  <span>{utilizationPct.toFixed(0)}%</span>
                </div>
              </div>
            )}
            
            <Button 
              size="sm" 
              className="w-full mt-2"
              onClick={onClick}
            >
              View Details
            </Button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
