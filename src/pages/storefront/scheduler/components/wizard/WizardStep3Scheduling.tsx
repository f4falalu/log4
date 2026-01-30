/**
 * =====================================================
 * Wizard Step 3: Scheduling
 * =====================================================
 * Comprehensive schedule creation form
 *
 * RFC-012: Vehicle and driver assignment removed from Storefront.
 * These are now FleetOps responsibilities. Storefront only handles
 * demand readiness (requisitions → ready_for_dispatch).
 */

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useSchedulerWizardStore } from '@/stores/schedulerWizardStore';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
// RFC-012: Removed useDrivers and useVehicles - these are FleetOps concerns
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TimeWindow } from '@/types/scheduler';

export function WizardStep3Scheduling() {
  const schedulingMode = useSchedulerWizardStore(
    (state) => state.scheduling_mode
  );
  const scheduleTitle = useSchedulerWizardStore((state) => state.schedule_title);
  const warehouseId = useSchedulerWizardStore((state) => state.warehouse_id);
  const plannedDate = useSchedulerWizardStore((state) => state.planned_date);
  const timeWindow = useSchedulerWizardStore((state) => state.time_window);
  // RFC-012: Removed vehicleId and driverId - these are FleetOps concerns
  const notes = useSchedulerWizardStore((state) => state.notes);
  const selectedFacilities = useSchedulerWizardStore(
    (state) => state.selected_facilities
  );

  const {
    setScheduleTitle,
    setWarehouseId,
    setPlannedDate,
    setTimeWindow,
    // RFC-012: Removed setVehicleId and setDriverId - these are FleetOps concerns
    setNotes,
    addFacility,
    removeFacility,
  } = useSchedulerWizardStore();

  const { data: facilities } = useFacilities();
  const { data: warehouses } = useWarehouses();
  // RFC-012: Removed drivers and vehicles data - these are FleetOps concerns

  const [date, setDate] = useState<Date | undefined>(
    plannedDate ? new Date(plannedDate) : undefined
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      setPlannedDate(format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleFacilityAdd = (facilityId: string) => {
    if (!selectedFacilities.includes(facilityId)) {
      addFacility(facilityId);
    }
  };

  if (schedulingMode === 'manual') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Create Schedule</h3>
          <p className="text-sm text-gray-500">
            Enter schedule details and select facilities
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            {/* Schedule Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Schedule Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Zone B Morning Delivery"
                value={scheduleTitle || ''}
                onChange={(e) => setScheduleTitle(e.target.value)}
              />
            </div>

            {/* Warehouse */}
            <div className="space-y-2">
              <Label>
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select
                value={warehouseId || ''}
                onValueChange={(value) => setWarehouseId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(warehouses) && warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Planned Date */}
            <div className="space-y-2">
              <Label>
                Planned Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Window */}
            <div className="space-y-2">
              <Label>
                Time Window <span className="text-destructive">*</span>
              </Label>
              <Select
                value={timeWindow || ''}
                onValueChange={(value) => setTimeWindow(value as TimeWindow)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (06:00 - 12:00)</SelectItem>
                  <SelectItem value="afternoon">
                    Afternoon (12:00 - 18:00)
                  </SelectItem>
                  <SelectItem value="evening">Evening (18:00 - 24:00)</SelectItem>
                  <SelectItem value="all_day">All Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Facilities */}
            <div className="space-y-2">
              <Label>
                Facilities ({selectedFacilities.length} selected){' '}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value=""
                onValueChange={(value) => handleFacilityAdd(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add facilities to schedule" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(facilities?.facilities) && facilities.facilities.map((f) => (
                    <SelectItem
                      key={f.id}
                      value={f.id}
                      disabled={selectedFacilities.includes(f.id)}
                    >
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFacilities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedFacilities.map((id) => {
                    const facility = facilities?.find((f) => f.id === id);
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-sm"
                      >
                        {facility?.name}
                        <button
                          onClick={() => removeFacility(id)}
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

            {/* RFC-012: Vehicle and Driver assignment removed from Storefront
                These are now FleetOps responsibilities during batch planning.
                Storefront only declares demand readiness. */}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or instructions..."
                value={notes || ''}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (schedulingMode === 'ai_optimized') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">AI Optimization</h3>
          <p className="text-sm text-gray-500">
            Configure optimization parameters
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="capacity">Capacity Threshold (%)</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="80"
                defaultValue="80"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="time-window">Time Window Mode</Label>
              <select
                id="time-window"
                className="mt-1 w-full rounded-md border border-gray-300 p-2"
              >
                <option value="strict">Strict</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>

            <Button className="w-full">Run Optimization</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="text-center text-gray-500">
      Please select a scheduling mode
    </div>
  );
}
