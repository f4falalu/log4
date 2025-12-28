/**
 * VehicleKanbanView Component
 * Kanban board layout showing vehicles grouped by status
 * Three columns: Available, In-Use, Unavailable
 */

import React, { useMemo } from 'react';
import { VehicleKanbanColumn } from './VehicleKanbanColumn';
import { getStatusColors } from '@/lib/designTokens';
import type { Database } from '@/integrations/supabase/types';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];

interface VehicleKanbanViewProps {
  vehicles: Vehicle[];
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
}

export function VehicleKanbanView({
  vehicles,
  onView,
  onEdit,
  onDelete,
}: VehicleKanbanViewProps) {
  // Group vehicles by status
  const { availableVehicles, inUseVehicles, unavailableVehicles } = useMemo(() => {
    const available: Vehicle[] = [];
    const inUse: Vehicle[] = [];
    const unavailable: Vehicle[] = [];

    vehicles.forEach((vehicle) => {
      const status = vehicle.status;

      if (status === 'available') {
        available.push(vehicle);
      } else if (status === 'in_use') {
        inUse.push(vehicle);
      } else if (['maintenance', 'out_of_service', 'disposed'].includes(status)) {
        unavailable.push(vehicle);
      } else {
        // Fallback for any unexpected status
        unavailable.push(vehicle);
      }
    });

    return {
      availableVehicles: available,
      inUseVehicles: inUse,
      unavailableVehicles: unavailable,
    };
  }, [vehicles]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Available Column */}
      <div className="max-h-[calc(100vh-16rem)]">
        <VehicleKanbanColumn
          title="Available"
          vehicles={availableVehicles}
          statusColor={getStatusColors('available')}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {/* In-Use Column */}
      <div className="max-h-[calc(100vh-16rem)]">
        <VehicleKanbanColumn
          title="In-Use"
          vehicles={inUseVehicles}
          statusColor={getStatusColors('in_use')}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {/* Unavailable Column */}
      <div className="max-h-[calc(100vh-16rem)]">
        <VehicleKanbanColumn
          title="Unavailable"
          vehicles={unavailableVehicles}
          statusColor={getStatusColors('maintenance')}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
