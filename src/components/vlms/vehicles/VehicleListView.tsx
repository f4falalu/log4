/**
 * VehicleListView Component
 * Container for list view with vertical stacking
 */

import React from 'react';
import { VehicleListItem } from './VehicleListItem';
import type { Database } from '@/integrations/supabase/types';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];

interface VehicleListViewProps {
  vehicles: Vehicle[];
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
}

export function VehicleListView({ vehicles, onView, onEdit, onDelete }: VehicleListViewProps) {
  return (
    <div className="space-y-3">
      {vehicles.map((vehicle) => (
        <VehicleListItem
          key={vehicle.id}
          vehicle={vehicle}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
