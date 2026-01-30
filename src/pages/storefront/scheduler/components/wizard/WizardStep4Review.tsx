/**
 * =====================================================
 * Wizard Step 4: Review
 * =====================================================
 * Final review before creating schedules
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, MapPin, Clock, User, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { useSchedulerWizardStore } from '@/stores/schedulerWizardStore';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { getTimeWindowLabel } from '@/lib/schedulerUtils';

export function WizardStep4Review() {
  const sourceMethod = useSchedulerWizardStore((state) => state.source_method);
  const schedulingMode = useSchedulerWizardStore((state) => state.scheduling_mode);
  const scheduleTitle = useSchedulerWizardStore((state) => state.schedule_title);
  const warehouseId = useSchedulerWizardStore((state) => state.warehouse_id);
  const plannedDate = useSchedulerWizardStore((state) => state.planned_date);
  const timeWindow = useSchedulerWizardStore((state) => state.time_window);
  const vehicleId = useSchedulerWizardStore((state) => state.vehicle_id);
  const driverId = useSchedulerWizardStore((state) => state.driver_id);
  const notes = useSchedulerWizardStore((state) => state.notes);
  const selectedFacilities = useSchedulerWizardStore((state) => state.selected_facilities);

  const { data: facilities } = useFacilities();
  const { data: warehouses } = useWarehouses();
  const { data: drivers } = useDrivers();
  const { data: vehicles } = useVehicles();

  // Lookup names from IDs
  const warehouse = Array.isArray(warehouses) ? warehouses.find((w) => w.id === warehouseId) : undefined;
  const driver = Array.isArray(drivers) ? drivers.find((d) => d.id === driverId) : undefined;
  const vehicle = Array.isArray(vehicles) ? vehicles.find((v) => v.id === vehicleId) : undefined;
  const selectedFacilityObjects = Array.isArray(facilities?.facilities) ? facilities.facilities.filter((f) => selectedFacilities.includes(f.id)) : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review & Confirm</h3>
        <p className="text-sm text-gray-500">
          Review your schedule before creating
        </p>
      </div>

      {/* Summary Card */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <h4 className="font-semibold">Schedule Summary</h4>
          </div>

          {/* Schedule Title */}
          <div>
            <p className="text-sm text-gray-500">Schedule Title</p>
            <p className="text-lg font-semibold text-gray-900">{scheduleTitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Data Source</p>
              <p className="font-medium capitalize">
                {sourceMethod?.replace('_', ' ')}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Scheduling Mode</p>
              <p className="font-medium capitalize">
                {schedulingMode === 'ai_optimized' ? 'AI Optimized' : 'Manual'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Warehouse</p>
              <p className="font-medium">{warehouse?.name || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Total Facilities</p>
              <p className="font-medium">{selectedFacilities.length}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Schedule Details Card */}
      <Card className="p-6">
        <h4 className="mb-4 font-semibold">Schedule Details</h4>
        <div className="space-y-3">
          {/* Date */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Planned Date</p>
              <p className="font-medium">
                {plannedDate
                  ? format(new Date(plannedDate), 'EEEE, MMMM d, yyyy')
                  : 'Not set'}
              </p>
            </div>
          </div>

          {/* Time Window */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Time Window</p>
              <p className="font-medium">
                {timeWindow ? getTimeWindowLabel(timeWindow) : 'Not set'}
              </p>
            </div>
          </div>

          {/* Vehicle */}
          <div className="flex items-center gap-3">
            <Truck className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Vehicle</p>
              <p className="font-medium">
                {vehicle ? `${vehicle.model} (${vehicle.plate_number})` : 'Assign later'}
              </p>
            </div>
          </div>

          {/* Driver */}
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Driver</p>
              <p className="font-medium">{driver?.name || 'Assign later'}</p>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-sm text-gray-600">{notes}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Facilities List */}
      {selectedFacilityObjects && selectedFacilityObjects.length > 0 && (
        <Card className="p-6">
          <h4 className="mb-4 font-semibold">
            Facilities ({selectedFacilityObjects.length})
          </h4>
          <div className="space-y-2">
            {selectedFacilityObjects.slice(0, 5).map((facility) => (
              <div
                key={facility.id}
                className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-sm">{facility.name}</p>
                  <p className="text-xs text-gray-500">{facility.address}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {facility.type}
                </Badge>
              </div>
            ))}
            {selectedFacilityObjects.length > 5 && (
              <p className="text-sm text-gray-500 text-center py-2">
                and {selectedFacilityObjects.length - 5} more...
              </p>
            )}
          </div>
        </Card>
      )}

      {selectedFacilities.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">
            No facilities selected. Go back to add facilities.
          </p>
        </Card>
      )}
    </div>
  );
}
