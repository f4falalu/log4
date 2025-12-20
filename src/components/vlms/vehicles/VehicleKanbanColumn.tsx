/**
 * VehicleKanbanColumn Component
 * Reusable column for kanban board view
 * Groups vehicles by status with scrollable container
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VehicleCard } from './VehicleCard';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';
import type { ColorClasses } from '@/lib/designTokens';
import type { Database } from '@/integrations/supabase/types';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];

interface VehicleKanbanColumnProps {
  title: string;
  vehicles: Vehicle[];
  statusColor: ColorClasses;
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
}

export function VehicleKanbanColumn({
  title,
  vehicles,
  statusColor,
  onView,
  onEdit,
  onDelete,
}: VehicleKanbanColumnProps) {
  return (
    <div className="flex flex-col h-full bg-card border rounded-lg overflow-hidden">
      {/* FIXED/STICKY HEADER */}
      <div
        className={cn(
          'sticky top-0 z-10 p-4 border-b flex-shrink-0 bg-card/95 backdrop-blur-sm',
          statusColor.bg,
          statusColor.border
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className={cn('font-semibold text-foreground', statusColor.text)}>
            {title}
          </h3>
          <Badge
            variant="secondary"
            className={cn('font-medium', statusColor.text)}
          >
            {vehicles.length}
          </Badge>
        </div>
      </div>

      {/* SCROLLABLE CONTENT with smart detection highlight */}
      <ScrollArea
        className={cn(
          'flex-1',
          'transition-all duration-200',
          'hover:ring-2 hover:ring-primary/20 hover:ring-inset',
          'focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-inset'
        )}
      >
        <div className="p-4">
          {vehicles.length > 0 ? (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Package className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No {title.toLowerCase()} vehicles
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
