/**
 * =====================================================
 * Summary Strip Component
 * =====================================================
 * Bottom summary bar with statistics
 */

import { Package, MapPin, Truck, Clock } from 'lucide-react';
import type { SchedulerBatch } from '@/types/scheduler';
import { calculateBatchTotals, formatDistance, formatDuration } from '@/lib/schedulerUtils';

interface SummaryStripProps {
  batches: SchedulerBatch[];
}

export function SummaryStrip({ batches }: SummaryStripProps) {
  const totals = calculateBatchTotals(batches);

  const stats = [
    {
      icon: Package,
      label: 'batches',
      value: batches.length,
    },
    {
      icon: MapPin,
      label: 'facilities',
      value: totals.totalFacilities,
    },
    {
      icon: Truck,
      label: 'km',
      value: formatDistance(totals.totalDistance),
    },
    {
      icon: Clock,
      label: 'duration',
      value: formatDuration(totals.totalDuration),
    },
  ];

  return (
    <div className="flex h-14 items-center gap-8 border-t bg-white px-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold text-foreground">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
