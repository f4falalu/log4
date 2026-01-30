/**
 * =====================================================
 * Slot Grid Column (Middle Column - Step 3)
 * =====================================================
 * Contains vehicle selector and interactive slot grid.
 */

import * as React from 'react';
import { Truck, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InteractiveSlotGrid } from './InteractiveSlotGrid';
import type { SlotAssignment, WorkingSetItem } from '@/types/unified-workflow';

interface Vehicle {
  id: string;
  model: string;
  plateNumber: string;
  capacity: number;
  maxWeight: number;
  status: 'available' | 'in-use' | 'maintenance';
  tiered_config?: {
    tiers: Array<{
      tier_name: string;
      tier_order: number;
      slot_count: number;
      capacity_kg?: number;
      capacity_m3?: number;
    }>;
  };
}

interface SlotGridColumnProps {
  selectedVehicleId: string | null;
  vehicles: Vehicle[];
  onVehicleChange: (vehicleId: string) => void;
  slotAssignments: Record<string, SlotAssignment>;
  availableFacilities: WorkingSetItem[];
  onAssignSlot: (slotKey: string, facilityId: string, requisitionIds: string[]) => void;
  onUnassignSlot: (slotKey: string) => void;
  onAutoAssign: () => void;
  isLoading?: boolean;
  className?: string;
}

export function SlotGridColumn({
  selectedVehicleId,
  vehicles,
  onVehicleChange,
  slotAssignments,
  availableFacilities,
  onAssignSlot,
  onUnassignSlot,
  onAutoAssign,
  isLoading = false,
  className,
}: SlotGridColumnProps) {
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  // Filter available vehicles
  const availableVehicles = vehicles.filter((v) => v.status === 'available');
  const unavailableVehicles = vehicles.filter((v) => v.status !== 'available');

  // Calculate total slots for selected vehicle
  const totalSlots = React.useMemo(() => {
    if (!selectedVehicle?.tiered_config?.tiers) return 0;
    return selectedVehicle.tiered_config.tiers.reduce(
      (sum, tier) => sum + (tier.slot_count || 0),
      0
    );
  }, [selectedVehicle]);

  // Calculate required slots from facilities
  const requiredSlots = React.useMemo(() => {
    return availableFacilities.reduce((sum, f) => sum + (f.slot_demand || 1), 0);
  }, [availableFacilities]);

  const hasCapacityIssue = totalSlots > 0 && requiredSlots > totalSlots;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Vehicle Selector */}
      <div className="p-4 border-b space-y-3">
        <div>
          <Label className="text-xs font-medium">Select Vehicle</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Required for slot assignment
          </p>
        </div>

        <Select value={selectedVehicleId || ''} onValueChange={onVehicleChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a vehicle...">
              {selectedVehicle && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>{selectedVehicle.model}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {selectedVehicle.plateNumber}
                  </Badge>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableVehicles.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Available
                </div>
                {availableVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex items-center gap-2 w-full">
                      <Truck className="h-4 w-4 text-green-600" />
                      <span>{vehicle.model}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {vehicle.plateNumber}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
            {unavailableVehicles.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                  Unavailable
                </div>
                {unavailableVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id} disabled>
                    <div className="flex items-center gap-2 w-full opacity-50">
                      <Truck className="h-4 w-4" />
                      <span>{vehicle.model}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {vehicle.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        {/* Capacity Warning */}
        {selectedVehicle && hasCapacityIssue && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Capacity Warning
              </p>
              <p className="text-muted-foreground mt-0.5">
                {requiredSlots} slots needed but vehicle has {totalSlots} slots
              </p>
            </div>
          </div>
        )}

        {/* Capacity OK */}
        {selectedVehicle && !hasCapacityIssue && totalSlots > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-700 dark:text-green-400">
              Vehicle capacity OK ({requiredSlots}/{totalSlots} slots)
            </span>
          </div>
        )}
      </div>

      {/* Slot Grid */}
      <div className="flex-1 min-h-0">
        <InteractiveSlotGrid
          vehicle={selectedVehicle}
          slotAssignments={slotAssignments}
          availableFacilities={availableFacilities}
          onAssignSlot={onAssignSlot}
          onUnassignSlot={onUnassignSlot}
          onAutoAssign={onAutoAssign}
          className="h-full"
        />
      </div>
    </div>
  );
}

export default SlotGridColumn;
