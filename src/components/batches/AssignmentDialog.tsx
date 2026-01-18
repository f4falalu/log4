import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useBatchUpdate } from '@/hooks/useBatchUpdate';
import { User, Truck, Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { DeliveryBatch, Driver, Vehicle } from '@/types';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: DeliveryBatch | null;
}

export function AssignmentDialog({ open, onOpenChange, batch }: AssignmentDialogProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const batchUpdate = useBatchUpdate();

  // Initialize with current assignments when batch changes
  useEffect(() => {
    if (batch) {
      setSelectedDriverId(batch.driverId || '');
      setSelectedVehicleId(batch.vehicleId || '');
    }
  }, [batch]);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Categorize drivers and vehicles by availability
  const availableDrivers = drivers.filter(d => d.status === 'available');
  const busyDrivers = drivers.filter(d => d.status === 'busy');
  const offlineDrivers = drivers.filter(d => d.status === 'offline');

  const availableVehicles = vehicles.filter(v => v.status === 'available');
  const inUseVehicles = vehicles.filter(v => v.status === 'in-use');
  const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance');

  const handleSubmit = async () => {
    if (!batch) return;

    const updates: Partial<DeliveryBatch> = {
      driverId: selectedDriverId || undefined,
      vehicleId: selectedVehicleId || undefined,
    };

    // Update status to assigned if both driver and vehicle are selected
    if (selectedDriverId && selectedVehicleId && batch.status === 'planned') {
      updates.status = 'assigned';
    }

    batchUpdate.mutate(
      { batchId: batch.id, updates },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const getDriverStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'busy':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'offline':
        return <AlertCircle className="h-3 w-3 text-gray-400" />;
      default:
        return null;
    }
  };

  const getVehicleStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'in-use':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'maintenance':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const renderDriverOption = (driver: Driver) => (
    <SelectItem key={driver.id} value={driver.id}>
      <div className="flex items-center gap-2">
        {getDriverStatusIcon(driver.status)}
        <span>{driver.name}</span>
        <Badge variant="outline" className="text-xs ml-auto">
          {driver.licenseType}
        </Badge>
      </div>
    </SelectItem>
  );

  const renderVehicleOption = (vehicle: Vehicle) => (
    <SelectItem key={vehicle.id} value={vehicle.id}>
      <div className="flex items-center gap-2">
        {getVehicleStatusIcon(vehicle.status)}
        <span>
          {vehicle.model} ({vehicle.plateNumber})
        </span>
        <Badge variant="outline" className="text-xs ml-auto">
          {vehicle.capacity}m³
        </Badge>
      </div>
    </SelectItem>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Resources</DialogTitle>
          <DialogDescription>
            Assign a driver and vehicle to batch: {batch?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Driver Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Driver
            </Label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>

                {availableDrivers.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Available ({availableDrivers.length})
                    </div>
                    {availableDrivers.map(renderDriverOption)}
                  </>
                )}

                {busyDrivers.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Busy ({busyDrivers.length})
                    </div>
                    {busyDrivers.map(renderDriverOption)}
                  </>
                )}

                {offlineDrivers.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Offline ({offlineDrivers.length})
                    </div>
                    {offlineDrivers.map(renderDriverOption)}
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Driver Details */}
            {selectedDriver && (
              <div className="rounded-lg border p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedDriver.name}</span>
                  <Badge
                    variant={
                      selectedDriver.status === 'available'
                        ? 'default'
                        : selectedDriver.status === 'busy'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {selectedDriver.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">License:</span> {selectedDriver.licenseType}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {selectedDriver.phone}
                  </div>
                  {selectedDriver.shiftStart && selectedDriver.shiftEnd && (
                    <div className="col-span-2">
                      <span className="font-medium">Shift:</span> {selectedDriver.shiftStart} - {selectedDriver.shiftEnd}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Vehicle Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vehicle
            </Label>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>

                {availableVehicles.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Available ({availableVehicles.length})
                    </div>
                    {availableVehicles.map(renderVehicleOption)}
                  </>
                )}

                {inUseVehicles.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      In Use ({inUseVehicles.length})
                    </div>
                    {inUseVehicles.map(renderVehicleOption)}
                  </>
                )}

                {maintenanceVehicles.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Maintenance ({maintenanceVehicles.length})
                    </div>
                    {maintenanceVehicles.map(renderVehicleOption)}
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Vehicle Details */}
            {selectedVehicle && (
              <div className="rounded-lg border p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {selectedVehicle.model} ({selectedVehicle.plateNumber})
                  </span>
                  <Badge
                    variant={
                      selectedVehicle.status === 'available'
                        ? 'default'
                        : selectedVehicle.status === 'in-use'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {selectedVehicle.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Type:</span> {selectedVehicle.type}
                  </div>
                  <div>
                    <span className="font-medium">Capacity:</span> {selectedVehicle.capacity}m³
                  </div>
                  <div>
                    <span className="font-medium">Fuel:</span> {selectedVehicle.fuelType}
                  </div>
                  <div>
                    <span className="font-medium">Max Weight:</span> {selectedVehicle.maxWeight}kg
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={batchUpdate.isPending}>
            {batchUpdate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Assignment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignmentDialog;
