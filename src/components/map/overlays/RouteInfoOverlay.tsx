import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Route } from 'lucide-react';
import type { RouteOptimization, Driver, Vehicle } from '@/types';

interface RouteInfoOverlayProps {
  route: RouteOptimization;
  drivers: Driver[];
  vehicles: Vehicle[];
  formData: {
    batchName: string;
    scheduledDate: string;
    scheduledTime: string;
    driverId: string;
    vehicleId: string;
  };
  onFormChange: (updates: Partial<RouteInfoOverlayProps['formData']>) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function RouteInfoOverlay({
  route,
  drivers,
  vehicles,
  formData,
  onFormChange,
  onSubmit,
  isSubmitting = false,
}: RouteInfoOverlayProps) {
  return (
    <Card className="bg-background/95 backdrop-blur border shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Optimized Route
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{route.facilities.length}</div>
              <div className="text-xs text-muted-foreground">Stops</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{route.totalDistance.toFixed(1)} km</div>
              <div className="text-xs text-muted-foreground">Distance</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{Math.ceil(route.estimatedDuration / 60)} hrs</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
          </div>
          
          <Separator />
          
          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <Label>Batch Name</Label>
              <Input
                value={formData.batchName}
                onChange={(e) => onFormChange({ batchName: e.target.value })}
                placeholder="e.g., North Zone AM Delivery"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => onFormChange({ scheduledDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => onFormChange({ scheduledTime: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Driver</Label>
                <Select 
                  value={formData.driverId} 
                  onValueChange={(v) => onFormChange({ driverId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.status === 'available').map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vehicle</Label>
                <Select 
                  value={formData.vehicleId} 
                  onValueChange={(v) => onFormChange({ vehicleId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.status === 'available').map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.model} - {vehicle.plateNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !formData.batchName || !formData.scheduledDate}
              className="w-full"
            >
              {isSubmitting ? 'Creating...' : 'Create Dispatch Batch'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
