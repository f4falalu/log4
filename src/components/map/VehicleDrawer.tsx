import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useVehicles } from '@/hooks/useVehicles';
import { useVehiclePayload } from '@/hooks/useVehiclePayload';
import { Truck, Package, Navigation, Clock, Handshake, AlertTriangle } from 'lucide-react';

interface VehicleDrawerProps {
  vehicleId: string | null;
  open: boolean;
  onClose: () => void;
  onHandoff?: (vehicleId: string) => void;
  onReassign?: (vehicleId: string) => void;
}

export function VehicleDrawer({
  vehicleId,
  open,
  onClose,
  onHandoff,
  onReassign,
}: VehicleDrawerProps) {
  const { data: vehicles = [] } = useVehicles();
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const { data: payload } = useVehiclePayload(vehicleId);

  if (!vehicle) return null;

  const utilizationPct = payload?.utilizationPct || 0;
  const isOverloaded = utilizationPct > 100;

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[420px] overflow-y-auto biko-scrollbar">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-biko-primary" />
            {vehicle.plateNumber}
          </SheetTitle>
          <SheetDescription>
            {vehicle.type} • {vehicle.model}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge
              variant={
                vehicle.status === 'available'
                  ? 'default'
                  : vehicle.status === 'in-use'
                  ? 'secondary'
                  : 'outline'
              }
              className="capitalize"
            >
              {vehicle.status}
            </Badge>
          </div>

          <Separator />

          {/* Payload Visualization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Payload Capacity
              </span>
              <Badge
                variant={
                  utilizationPct > 90
                    ? 'destructive'
                    : utilizationPct > 60
                    ? 'default'
                    : 'secondary'
                }
              >
                {utilizationPct.toFixed(0)}%
              </Badge>
            </div>

            {isOverloaded && (
              <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span>Vehicle is overloaded</span>
              </div>
            )}

            <Progress
              value={Math.min(utilizationPct, 100)}
              className="h-3"
            />

            {payload && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Weight</div>
                  <div className="font-semibold">
                    {payload.totalWeight.toFixed(1)} / {payload.capacityWeight} kg
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Volume</div>
                  <div className="font-semibold">
                    {payload.totalVolume.toFixed(2)} / {payload.capacityVolume} m³
                  </div>
                </div>
              </div>
            )}

            {/* Payload Items List */}
            {payload && payload.items.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Payload Items</div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto biko-scrollbar">
                  {payload.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 bg-muted/50 rounded-md text-sm"
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Qty: {item.quantity} • {item.weight_kg}kg • {item.volume_m3}m³
                      </div>
                      {item.temperature_required && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Temperature Controlled
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Vehicle Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fuel Type</span>
              <span className="capitalize">{vehicle.fuelType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Speed</span>
              <span>{vehicle.avgSpeed} km/h</span>
            </div>
            {vehicle.fuelEfficiency && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efficiency</span>
                <span>{vehicle.fuelEfficiency} L/100km</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onHandoff?.(vehicle.id)}
            >
              <Handshake className="w-4 h-4 mr-2" />
              Initiate Handoff
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onReassign?.(vehicle.id)}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Reassign Batch
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
            >
              <Clock className="w-4 h-4 mr-2" />
              View History
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
