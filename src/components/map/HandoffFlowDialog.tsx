import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useHandoffFlow } from '@/hooks/useHandoffFlow';
import { useVehicles } from '@/hooks/useVehicles';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, MapPin } from 'lucide-react';

interface HandoffFlowDialogProps {
  open: boolean;
  onClose: () => void;
  initialVehicleId?: string;
  onMapClick?: () => void;
}

export function HandoffFlowDialog({
  open,
  onClose,
  initialVehicleId,
  onMapClick,
}: HandoffFlowDialogProps) {
  const [fromVehicleId, setFromVehicleId] = useState(initialVehicleId || '');
  const [toVehicleId, setToVehicleId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useDeliveryBatches();
  const { createHandoff, isCreating } = useHandoffFlow();

  const fromVehicle = vehicles.find(v => v.id === fromVehicleId);
  const availableVehicles = vehicles.filter(v => v.status === 'available' && v.id !== fromVehicleId);
  const vehicleBatches = batches.filter(b => b.vehicleId === fromVehicleId && b.status === 'in-progress');

  const handleSubmit = async () => {
    if (!fromVehicleId || !toVehicleId || !batchId) {
      return;
    }

    // Use default location if not set (can be updated to use map click)
    const handoffLocation = location || { lat: -1.2921, lng: 36.8219 };

    await createHandoff({
      from_vehicle_id: fromVehicleId,
      to_vehicle_id: toVehicleId,
      from_batch_id: batchId,
      location_lat: handoffLocation.lat,
      location_lng: handoffLocation.lng,
      notes,
    });

    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]" aria-describedby="handoff-drawer-description">
        <DrawerHeader>
          <DrawerTitle>Create Handoff</DrawerTitle>
          <DrawerDescription id="handoff-drawer-description">
            Transfer a batch from one vehicle to another at a designated location.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 py-4 overflow-y-auto max-h-[calc(85vh-200px)]">
          {/* From Vehicle */}
          <div className="space-y-2">
            <Label htmlFor="from-vehicle">From Vehicle</Label>
            <Select value={fromVehicleId} onValueChange={setFromVehicleId}>
              <SelectTrigger id="from-vehicle" aria-label="Select source vehicle">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNumber} - {vehicle.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Batch Selection */}
          {fromVehicleId && (
            <div className="space-y-2">
              <Label htmlFor="batch">Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger id="batch" aria-label="Select batch to transfer">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name} ({batch.totalQuantity} items)
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vehicleBatches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active batches for this vehicle
                </p>
              )}
            </div>
          )}

          {/* Arrow */}
          {fromVehicleId && (
            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
          )}

          {/* To Vehicle */}
          {fromVehicleId && (
            <div className="space-y-2">
              <Label htmlFor="to-vehicle">To Vehicle</Label>
              <Select value={toVehicleId} onValueChange={setToVehicleId}>
                <SelectTrigger id="to-vehicle" aria-label="Select destination vehicle">
                  <SelectValue placeholder="Select available vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNumber} - {vehicle.type}
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableVehicles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No available vehicles for handoff
                </p>
              )}
            </div>
          )}

          {/* Location Picker */}
          {toVehicleId && (
            <div className="space-y-2">
              <Label>Handoff Location</Label>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onMapClick}
                type="button"
                aria-label="Pick handoff location on map"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Click to set location'}
              </Button>
            </div>
          )}

          {/* Notes */}
          {toVehicleId && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                aria-label="Handoff notes"
              />
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!fromVehicleId || !toVehicleId || !batchId || isCreating}
            aria-label="Create handoff"
          >
            {isCreating ? 'Creating...' : 'Create Handoff'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
