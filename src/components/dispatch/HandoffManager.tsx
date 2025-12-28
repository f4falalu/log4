import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Repeat, MapPin, Truck, Clock, CheckCircle2 } from 'lucide-react';
import { Vehicle, DeliveryBatch } from '@/types';
import { initiateHandoff, HandoffRequest } from '@/lib/handoffManagement';
import { toast } from 'sonner';

interface HandoffManagerProps {
  activeBatches: DeliveryBatch[];
  vehicles: Vehicle[];
  onHandoffCreated?: () => void;
}

export default function HandoffManager({ activeBatches, vehicles, onHandoffCreated }: HandoffManagerProps) {
  const [fromBatchId, setFromBatchId] = useState<string>('');
  const [toVehicleId, setToVehicleId] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBatch = activeBatches.find(b => b.id === fromBatchId);
  const fromVehicle = selectedBatch ? vehicles.find(v => v.id === selectedBatch.vehicleId) : null;
  const toVehicle = vehicles.find(v => v.id === toVehicleId);

  // Filter available vehicles (not the same as source)
  const availableVehicles = vehicles.filter(v => 
    v.status === 'available' && v.id !== selectedBatch?.vehicleId
  );

  const handleInitiateHandoff = async () => {
    if (!selectedBatch || !fromVehicle || !toVehicle) {
      toast.error('Please select both source and destination vehicles');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use midpoint of route as handoff location
      const midIndex = Math.floor(selectedBatch.optimizedRoute.length / 2);
      const [lat, lng] = selectedBatch.optimizedRoute[midIndex];

      const request: HandoffRequest = {
        fromVehicleId: fromVehicle.id,
        toVehicleId: toVehicle.id,
        fromBatchId: selectedBatch.id,
        locationLat: lat,
        locationLng: lng,
        locationName: locationName || 'Mid-route handoff point',
        itemsTransferred: selectedBatch.facilities.map(f => f.id),
        notes
      };

      await initiateHandoff(request);
      
      toast.success('Handoff initiated successfully');
      
      // Reset form
      setFromBatchId('');
      setToVehicleId('');
      setLocationName('');
      setNotes('');
      
      if (onHandoffCreated) {
        onHandoffCreated();
      }
    } catch (error: any) {
      toast.error(`Failed to initiate handoff: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Vehicle Handoff Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Transfer consignment between vehicles during active delivery. Both vehicles must be within the handoff zone.
          </AlertDescription>
        </Alert>

        {/* Select Source Batch */}
        <div className="space-y-2">
          <Label>Source Trip</Label>
          <Select value={fromBatchId} onValueChange={setFromBatchId}>
            <SelectTrigger>
              <SelectValue placeholder="Select active trip..." />
            </SelectTrigger>
            <SelectContent>
              {activeBatches.filter(b => b.status === 'in-progress').map(batch => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name} - {batch.facilities.length} stops
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source Vehicle Info */}
        {fromVehicle && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="font-medium">From: {fromVehicle.model}</span>
              <Badge variant="secondary">{fromVehicle.plateNumber}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Capacity: {fromVehicle.capacity}m³ • {fromVehicle.maxWeight}kg
            </div>
          </div>
        )}

        {/* Select Destination Vehicle */}
        <div className="space-y-2">
          <Label>Destination Vehicle</Label>
          <Select 
            value={toVehicleId} 
            onValueChange={setToVehicleId}
            disabled={!fromBatchId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select destination vehicle..." />
            </SelectTrigger>
            <SelectContent>
              {availableVehicles.map(vehicle => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.model} - {vehicle.plateNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Destination Vehicle Info */}
        {toVehicle && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="font-medium">To: {toVehicle.model}</span>
              <Badge variant="secondary">{toVehicle.plateNumber}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Capacity: {toVehicle.capacity}m³ • {toVehicle.maxWeight}kg
            </div>
          </div>
        )}

        {/* Handoff Location */}
        <div className="space-y-2">
          <Label>Handoff Location Name (Optional)</Label>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              className="flex-1 px-3 py-2 border rounded-md"
              placeholder="e.g., Kano Junction, Kaduna Checkpoint..."
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            placeholder="Add any special instructions for the handoff..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Action Button */}
        <Button 
          onClick={handleInitiateHandoff}
          disabled={!fromBatchId || !toVehicleId || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Initiating Handoff...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Initiate Handoff
            </>
          )}
        </Button>

        {selectedBatch && fromVehicle && toVehicle && (
          <Alert variant="info" className="border-primary/20 bg-primary/10">
            <AlertDescription className="text-sm">
              <strong>Handoff Summary:</strong><br />
              Transfer {selectedBatch.facilities.length} delivery stops from {fromVehicle.plateNumber} to {toVehicle.plateNumber}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
