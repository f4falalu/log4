import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Truck, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/types';

interface TierConfig {
  tier_name: string;
  tier_order: number;
  slot_count: number;
  capacity_kg?: number;
  capacity_m3?: number;
}

interface VehicleSlotGridProps {
  vehicle: Vehicle;
  requiredSlots: number;
  className?: string;
}

export function VehicleSlotGrid({
  vehicle,
  requiredSlots,
  className,
}: VehicleSlotGridProps) {
  // Parse tiered_config from vehicle
  const tieredConfig = useMemo(() => {
    const config = (vehicle as any).tiered_config;
    if (!config?.tiers || !Array.isArray(config.tiers)) {
      return null;
    }
    return config.tiers as TierConfig[];
  }, [vehicle]);

  // Calculate total slots and utilization
  const slotInfo = useMemo(() => {
    if (!tieredConfig) {
      return {
        totalSlots: 0,
        tiers: [],
        utilizationPct: 0,
        isOverflow: false,
      };
    }

    const totalSlots = tieredConfig.reduce((sum, tier) => sum + (tier.slot_count || 0), 0);
    const utilizationPct = totalSlots > 0 ? Math.round((requiredSlots / totalSlots) * 100) : 0;
    const isOverflow = requiredSlots > totalSlots;

    return {
      totalSlots,
      tiers: tieredConfig.sort((a, b) => a.tier_order - b.tier_order),
      utilizationPct: Math.min(utilizationPct, 100),
      isOverflow,
    };
  }, [tieredConfig, requiredSlots]);

  // If no tiered config, show a simple capacity display
  if (!tieredConfig || slotInfo.totalSlots === 0) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Truck className="h-5 w-5" />
          <span className="text-sm">
            {vehicle.model} - {vehicle.capacity}m³ / {vehicle.maxWeight}kg
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This vehicle does not have slot configuration. Slot capacity validation will be skipped.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">
            {vehicle.model}
          </span>
          <Badge variant="outline" className="text-xs">
            {vehicle.plateNumber}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {slotInfo.isOverflow ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Overflow
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              OK
            </Badge>
          )}
        </div>
      </div>

      {/* Overall utilization */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Slot Utilization</span>
          <span className={cn(
            'font-medium',
            slotInfo.isOverflow && 'text-destructive'
          )}>
            {requiredSlots} / {slotInfo.totalSlots} slots
            {slotInfo.isOverflow && ` (+${requiredSlots - slotInfo.totalSlots} overflow)`}
          </span>
        </div>
        <Progress
          value={slotInfo.utilizationPct}
          className={cn(
            'h-2',
            slotInfo.isOverflow && '[&>div]:bg-destructive'
          )}
        />
      </div>

      {/* Tier breakdown */}
      <div className="space-y-3">
        <span className="text-xs text-muted-foreground font-medium">Tier Configuration</span>
        <div className="grid gap-2">
          {slotInfo.tiers.map((tier, tierIndex) => {
            // Calculate how many of the required slots fall into this tier
            let slotsBeforeThisTier = 0;
            for (let i = 0; i < tierIndex; i++) {
              slotsBeforeThisTier += slotInfo.tiers[i].slot_count || 0;
            }

            const slotsInThisTier = tier.slot_count || 0;
            const allocatedToThisTier = Math.max(0, Math.min(
              slotsInThisTier,
              requiredSlots - slotsBeforeThisTier
            ));
            const tierUtilization = slotsInThisTier > 0
              ? Math.round((allocatedToThisTier / slotsInThisTier) * 100)
              : 0;

            return (
              <div key={tier.tier_name} className="rounded border p-2 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{tier.tier_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {allocatedToThisTier} / {slotsInThisTier} slots
                  </span>
                </div>
                {/* Visual slot grid */}
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: slotsInThisTier }).map((_, slotIdx) => {
                    const isAllocated = slotIdx < allocatedToThisTier;
                    return (
                      <div
                        key={slotIdx}
                        className={cn(
                          'w-6 h-6 rounded flex items-center justify-center text-xs border',
                          isAllocated
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted border-muted-foreground/20'
                        )}
                      >
                        {isAllocated && <Package className="h-3 w-3" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capacity info */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Volume: {vehicle.capacity}m³</span>
        <span>Weight: {vehicle.maxWeight}kg</span>
      </div>
    </div>
  );
}

export default VehicleSlotGrid;
