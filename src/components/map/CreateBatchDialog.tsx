import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDeliveryBatch } from '@/hooks/useDeliveryBatches';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useFacilities } from '@/hooks/useFacilities';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { Loader2, Package, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CreateBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBatchDialog({ open, onOpenChange }: CreateBatchDialogProps) {
  const { data: warehousesData } = useWarehouses();
  const warehouses = warehousesData?.warehouses || [];
  const { data: facilities = [] } = useFacilities();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const createBatch = useCreateDeliveryBatch();

  const [formData, setFormData] = useState({
    warehouseId: '',
    facilityIds: [] as string[],
    vehicleId: '',
    driverId: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '08:00',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      warehouseId: '',
      facilityIds: [],
      vehicleId: '',
      driverId: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '08:00',
      priority: 'medium',
      notes: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.warehouseId || !formData.vehicleId || formData.facilityIds.length === 0) {
      return;
    }

    const warehouse = warehouses.find(w => w.id === formData.warehouseId);
    const selectedFacilities = facilities.filter(f => formData.facilityIds.includes(f.id));

    // Create batch data
    const batchData = {
      name: `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      facilities: selectedFacilities,
      warehouseId: formData.warehouseId,
      warehouseName: warehouse?.name || 'Unknown',
      vehicleId: formData.vehicleId,
      driverId: formData.driverId || undefined,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      status: 'planned' as const,
      priority: formData.priority,
      totalDistance: 0, // Will be calculated by route optimization
      estimatedDuration: 0, // Will be calculated by route optimization
      medicationType: 'General',
      totalQuantity: selectedFacilities.length,
      optimizedRoute: [] as [number, number][],
      notes: formData.notes
    };

    createBatch.mutate(batchData, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      }
    });
  };

  const handleRemoveFacility = (facilityId: string) => {
    setFormData({
      ...formData,
      facilityIds: formData.facilityIds.filter(id => id !== facilityId)
    });
  };

  const handleAddFacility = (facilityId: string) => {
    if (!formData.facilityIds.includes(facilityId)) {
      setFormData({
        ...formData,
        facilityIds: [...formData.facilityIds, facilityId]
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create Delivery Batch
          </DialogTitle>
          <DialogDescription>
            Create a new delivery batch by selecting warehouse, facilities, and vehicle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warehouse Selection */}
          <div className="space-y-2">
            <Label htmlFor="warehouse">Origin Warehouse *</Label>
            <Select
              value={formData.warehouseId}
              onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
            >
              <SelectTrigger id="warehouse">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Facility Selection */}
          <div className="space-y-2">
            <Label htmlFor="facilities">Destination Facilities *</Label>
            <Select
              value=""
              onValueChange={handleAddFacility}
            >
              <SelectTrigger id="facilities">
                <SelectValue placeholder="Add facilities to route" />
              </SelectTrigger>
              <SelectContent>
                {facilities
                  .filter(f => !formData.facilityIds.includes(f.id))
                  .map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name} ({facility.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Selected Facilities */}
            {formData.facilityIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.facilityIds.map((facilityId) => {
                  const facility = facilities.find(f => f.id === facilityId);
                  return (
                    <Badge
                      key={facilityId}
                      variant="secondary"
                      className="flex items-center gap-2 px-3 py-1"
                    >
                      <span>{facility?.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFacility(facilityId)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.facilityIds.length} {formData.facilityIds.length === 1 ? 'facility' : 'facilities'} selected
            </p>
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Assign Vehicle *</Label>
            <Select
              value={formData.vehicleId}
              onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
            >
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles
                  .filter((v) => v.status === 'available')
                  .map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} - {vehicle.plateNumber}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Driver Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="driver">Assign Driver (Optional)</Label>
            <Select
              value={formData.driverId}
              onValueChange={(value) => setFormData({ ...formData, driverId: value })}
            >
              <SelectTrigger id="driver">
                <SelectValue placeholder="Select driver (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No driver assigned</SelectItem>
                {drivers
                  .filter((d) => d.status === 'available')
                  .map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name} - {driver.phone}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Scheduled Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Scheduled Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any special instructions or notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            disabled={createBatch.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.warehouseId ||
              !formData.vehicleId ||
              formData.facilityIds.length === 0 ||
              createBatch.isPending
            }
          >
            {createBatch.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Batch...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Create Batch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
