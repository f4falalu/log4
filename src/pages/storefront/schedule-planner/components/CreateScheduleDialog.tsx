import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useCreateSchedule } from '@/hooks/useDeliverySchedules';
import { useFacilities } from '@/hooks/useFacilities';

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; model: string; plate_number: string }>;
  drivers: Array<{ id: string; name: string }>;
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
  warehouses,
  vehicles,
  drivers
}: CreateScheduleDialogProps) {
  const [title, setTitle] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [plannedDate, setPlannedDate] = useState<Date>();
  const [timeWindow, setTimeWindow] = useState<string>('morning');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  const { data: facilities } = useFacilities();
  const createSchedule = useCreateSchedule();

  const handleSubmit = async () => {
    if (!title || !warehouseId || !plannedDate || selectedFacilities.length === 0) {
      return;
    }

    await createSchedule.mutateAsync({
      title,
      warehouse_id: warehouseId,
      planned_date: format(plannedDate, 'yyyy-MM-dd'),
      time_window: timeWindow as any,
      vehicle_id: vehicleId || undefined,
      driver_id: driverId || undefined,
      status: 'draft',
      total_payload_kg: 0,
      total_volume_m3: 0,
      facility_ids: selectedFacilities,
      notes: notes || undefined
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setWarehouseId('');
    setPlannedDate(undefined);
    setTimeWindow('morning');
    setVehicleId('');
    setDriverId('');
    setNotes('');
    setSelectedFacilities([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Delivery Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Schedule Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Zone B Morning Delivery"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Warehouse */}
          <div className="space-y-2">
            <Label>Warehouse *</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Planned Date */}
          <div className="space-y-2">
            <Label>Planned Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !plannedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {plannedDate ? format(plannedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={plannedDate}
                  onSelect={setPlannedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Window */}
          <div className="space-y-2">
            <Label>Time Window *</Label>
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning (06:00 - 12:00)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12:00 - 18:00)</SelectItem>
                <SelectItem value="evening">Evening (18:00 - 24:00)</SelectItem>
                <SelectItem value="all_day">All Day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Facilities */}
          <div className="space-y-2">
            <Label>Facilities * ({selectedFacilities.length} selected)</Label>
            <Select 
              value={selectedFacilities[selectedFacilities.length - 1] || ''} 
              onValueChange={(value) => {
                if (!selectedFacilities.includes(value)) {
                  setSelectedFacilities([...selectedFacilities, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add facilities to schedule" />
              </SelectTrigger>
              <SelectContent>
                {facilities?.map((f) => (
                  <SelectItem key={f.id} value={f.id} disabled={selectedFacilities.includes(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFacilities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedFacilities.map((id) => {
                  const facility = facilities?.find(f => f.id === id);
                  return (
                    <div key={id} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-sm">
                      {facility?.name}
                      <button
                        onClick={() => setSelectedFacilities(selectedFacilities.filter(f => f !== id))}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vehicle (Optional) */}
          <div className="space-y-2">
            <Label>Vehicle (Optional)</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Assign vehicle later" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.model} ({v.plate_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Driver (Optional) */}
          <div className="space-y-2">
            <Label>Driver (Optional)</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Assign driver later" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title || !warehouseId || !plannedDate || selectedFacilities.length === 0 || createSchedule.isPending}
          >
            {createSchedule.isPending ? 'Creating...' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
