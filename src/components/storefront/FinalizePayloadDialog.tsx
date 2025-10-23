import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFinalizeBatch } from '@/hooks/useFinalizeBatch';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useFacilities } from '@/hooks/useFacilities';
import { Loader2, Package, Send } from 'lucide-react';

interface FinalizePayloadDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleName: string;
}

export function FinalizePayloadDialog({ open, onClose, vehicleId, vehicleName }: FinalizePayloadDialogProps) {
  const { data: warehouses = [] } = useWarehouses();
  const { data: facilities = [] } = useFacilities();
  const finalizeBatch = useFinalizeBatch();

  const [formData, setFormData] = useState({
    warehouseId: '',
    facilityIds: [] as string[],
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '08:00',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    notes: ''
  });

  const handleSubmit = () => {
    if (!formData.warehouseId || formData.facilityIds.length === 0) {
      return;
    }

    finalizeBatch.mutate(
      {
        vehicleId,
        ...formData
      },
      {
        onSuccess: () => {
          onClose();
          setFormData({
            warehouseId: '',
            facilityIds: [],
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: '08:00',
            priority: 'medium',
            notes: ''
          });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-biko-primary" />
            Finalize & Send to FleetOps
          </DialogTitle>
          <DialogDescription>
            Create a delivery batch from this payload for vehicle {vehicleName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          <div className="space-y-2">
            <Label htmlFor="facilities">Destination Facilities *</Label>
            <Select
              value={formData.facilityIds[0] || ''}
              onValueChange={(value) => {
                if (!formData.facilityIds.includes(value)) {
                  setFormData({ ...formData, facilityIds: [...formData.facilityIds, value] });
                }
              }}
            >
              <SelectTrigger id="facilities">
                <SelectValue placeholder="Add facilities" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name} ({facility.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.facilityIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.facilityIds.map((facilityId) => {
                  const facility = facilities.find(f => f.id === facilityId);
                  return (
                    <div
                      key={facilityId}
                      className="flex items-center gap-2 px-3 py-1 bg-biko-surface border border-biko-border/20 rounded-full text-sm"
                    >
                      <span>{facility?.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            facilityIds: formData.facilityIds.filter(id => id !== facilityId)
                          });
                        }}
                        className="text-biko-muted hover:text-biko-foreground"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
          <Button variant="outline" onClick={onClose} disabled={finalizeBatch.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.warehouseId || formData.facilityIds.length === 0 || finalizeBatch.isPending}
          >
            {finalizeBatch.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finalizing...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Finalize & Send to FleetOps
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
