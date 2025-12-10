import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, Map, X, Truck, Fuel } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useVehiclePayload } from '@/hooks/useVehiclePayload';

interface VehicleDrawerProps {
  isOpen: boolean;
  vehicleId: string | null;
  onClose: () => void;
}

export function VehicleDrawer({ isOpen, vehicleId, onClose }: VehicleDrawerProps) {
  const { data: vehicles = [] } = useVehicles();
  const vehicle = vehicleId ? vehicles.find((v: any) => v.id === vehicleId) : null;
  const { data: payload } = useVehiclePayload(vehicleId || '');

  if (!vehicle) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'busy':
        return 'secondary';
      case 'maintenance':
        return 'destructive';
      case 'offline':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[480px] overflow-y-auto">
        <SheetHeader className="border-b border-border pb-4 mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle>Vehicle Details</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{vehicle.plateNumber}</h3>
              <p className="text-sm text-muted-foreground">
                {vehicle.model} • {vehicle.type}
              </p>
              <Badge variant={getStatusVariant(vehicle.status)} className="mt-1">
                {vehicle.status}
              </Badge>
            </div>
          </div>

          {/* Payload Status */}
          {payload && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Payload Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilization:</span>
                    <span className="font-medium">{payload.utilizationPct.toFixed(0)}%</span>
                  </div>
                  <Progress value={payload.utilizationPct} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Weight</div>
                    <div className="font-medium">
                      {payload.totalWeight.toFixed(1)} / {payload.capacityWeight} kg
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Volume</div>
                    <div className="font-medium">
                      {payload.totalVolume.toFixed(2)} m³
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium capitalize">{vehicle.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">{vehicle.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium">{vehicle.capacity} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Weight:</span>
                <span className="font-medium">{vehicle.maxWeight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fuel Type:</span>
                <span className="font-medium capitalize">{vehicle.fuelType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Speed:</span>
                <span className="font-medium">{vehicle.avgSpeed} km/h</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full gap-2">
              <Package className="h-4 w-4" />
              Assign Batch
            </Button>
            <Button variant="outline" className="w-full gap-2">
              <Map className="h-4 w-4" />
              Show on Map
            </Button>
            {vehicle.status === 'available' && (
              <Button variant="outline" className="w-full gap-2">
                <Fuel className="h-4 w-4" />
                Schedule Maintenance
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
