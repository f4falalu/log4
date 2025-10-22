import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateRequisition } from '@/hooks/useRequisitions';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { RequisitionPriority } from '@/types/requisitions';

interface RequisitionItemForm {
  item_name: string;
  quantity: number;
  unit: string;
  weight_kg?: number;
  volume_m3?: number;
  temperature_required: boolean;
  handling_instructions?: string;
}

interface CreateRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRequisitionDialog({ open, onOpenChange }: CreateRequisitionDialogProps) {
  const { data: facilities = [] } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  const createRequisition = useCreateRequisition();

  const [facilityId, setFacilityId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [priority, setPriority] = useState<RequisitionPriority>('medium');
  const [requestedDate, setRequestedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<RequisitionItemForm[]>([
    { item_name: '', quantity: 1, unit: 'units', temperature_required: false }
  ]);

  const handleAddItem = () => {
    setItems([...items, { item_name: '', quantity: 1, unit: 'units', temperature_required: false }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof RequisitionItemForm, value: string | number | boolean) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = () => {
    const validItems = items.filter(item => item.item_name.trim() && item.quantity > 0);
    
    if (!facilityId || !warehouseId || !requestedDate || validItems.length === 0) {
      return;
    }

    createRequisition.mutate({
      facility_id: facilityId,
      warehouse_id: warehouseId,
      priority,
      requested_delivery_date: requestedDate,
      notes,
      items: validItems
    }, {
      onSuccess: () => {
        onOpenChange(false);
        // Reset form
        setFacilityId('');
        setWarehouseId('');
        setPriority('medium');
        setRequestedDate('');
        setNotes('');
        setItems([{ item_name: '', quantity: 1, unit: 'units', temperature_required: false }]);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Requisition</DialogTitle>
          <DialogDescription>
            Create a new delivery requisition request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facility">Facility *</Label>
              <Select value={facilityId} onValueChange={setFacilityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as RequisitionPriority)}>
                <SelectTrigger>
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
              <Label htmlFor="date">Requested Delivery Date *</Label>
              <Input
                id="date"
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or special instructions..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Requisition Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor={`item-name-${index}`}>Item Name *</Label>
                      <Input
                        id={`item-name-${index}`}
                        value={item.item_name}
                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                        placeholder="e.g., Medical Supplies"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`quantity-${index}`}>Quantity *</Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`unit-${index}`}>Unit</Label>
                      <Input
                        id={`unit-${index}`}
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="units, boxes, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor={`weight-${index}`}>Weight (kg)</Label>
                      <Input
                        id={`weight-${index}`}
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.weight_kg || ''}
                        onChange={(e) => handleItemChange(index, 'weight_kg', parseFloat(e.target.value) || undefined)}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`volume-${index}`}>Volume (m³)</Label>
                      <Input
                        id={`volume-${index}`}
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.volume_m3 || ''}
                        onChange={(e) => handleItemChange(index, 'volume_m3', parseFloat(e.target.value) || undefined)}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor={`instructions-${index}`}>Handling Instructions</Label>
                      <Textarea
                        id={`instructions-${index}`}
                        value={item.handling_instructions || ''}
                        onChange={(e) => handleItemChange(index, 'handling_instructions', e.target.value)}
                        placeholder="Special handling instructions..."
                        rows={2}
                      />
                    </div>

                    <div className="col-span-2 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`temp-${index}`}
                        checked={item.temperature_required}
                        onChange={(e) => handleItemChange(index, 'temperature_required', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={`temp-${index}`} className="cursor-pointer">
                        Temperature controlled required
                      </Label>
                    </div>
                  </div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!facilityId || !warehouseId || !requestedDate || items.every(i => !i.item_name.trim())}
            >
              Create Requisition
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
