/**
 * =====================================================
 * Vehicle Suggestion Card
 * =====================================================
 * Displays a suggested vehicle with capacity info.
 */

import * as React from 'react';
import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface VehicleSuggestionCardProps {
  vehicleId: string;
  vehicleModel: string;
  vehiclePlate?: string;
  totalSlots: number;
  utilizationPct: number;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function VehicleSuggestionCard({
  vehicleId,
  vehicleModel,
  vehiclePlate,
  totalSlots,
  utilizationPct,
  isSelected = false,
  onSelect,
  className,
}: VehicleSuggestionCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'hover:border-primary/50 hover:bg-accent/50',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-8 rounded bg-muted flex items-center justify-center">
          <Truck className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{vehicleModel}</p>
          <p className="text-xs text-muted-foreground">
            {totalSlots} slots • {utilizationPct}% fit
          </p>
        </div>
        {isSelected && (
          <Badge variant="secondary" className="text-xs">
            Selected
          </Badge>
        )}
      </div>
    </div>
  );
}

export default VehicleSuggestionCard;
