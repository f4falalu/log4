import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { Progress } from '@/components/ui/progress';

interface BatchAssignmentSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityIds: string[];
  onConfirm: (assignment: { driverId?: string; vehicleId?: string; batchName: string }) => void;
}

export function BatchAssignmentSidebar({
  open,
  onOpenChange,
  facilityIds,
  onConfirm,
}: BatchAssignmentSidebarProps) {
  const [batchName, setBatchName] = useState(`Batch ${Date.now()}`);
  const [driverId, setDriverId] = useState<string>();
  const [vehicleId, setVehicleId] = useState<string>();

  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();

  const availableDrivers = drivers.filter(d => d.status === 'available');
  const availableVehicles = vehicles.filter(v => v.status === 'available');

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const capacityUsed = 65; // Mock value

  const handleConfirm = () => {
    onConfirm({
      batchName,
      driverId,
      vehicleId,
    });
    setBatchName(`Batch ${Date.now()}`);
    setDriverId(undefined);
    setVehicleId(undefined);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Assign Batch</SheetTitle>
          <SheetDescription>
            Assign a driver and vehicle to {facilityIds.length} facilities
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="batch-name">Batch Name</Label>
            <Input
              id="batch-name"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Enter batch name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver">Assign Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger id="driver">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name} - {driver.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {availableDrivers.length} drivers available
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle">Assign Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {availableVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.model} - {vehicle.plateNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {availableVehicles.length} vehicles available
            </p>
          </div>

          {selectedVehicle && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Capacity Utilization</span>
                <span className="font-semibold">{capacityUsed}%</span>
              </div>
              <Progress value={capacityUsed} />
              <p className="text-xs text-muted-foreground">
                Max capacity: {selectedVehicle.capacity} m³
              </p>
            </div>
          )}

          <Button
            onClick={handleConfirm}
            className="w-full"
            disabled={!batchName}
          >
            Confirm Assignment
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
