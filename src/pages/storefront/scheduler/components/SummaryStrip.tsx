/**
 * =====================================================
 * Summary Strip Component
 * =====================================================
 * Bottom summary bar with statistics
 */

import { Package, MapPin, Truck, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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
      label: 'Batches',
      value: batches.length,
    },
    {
      icon: MapPin,
      label: 'Facilities',
      value: totals.totalFacilities,
    },
    {
      icon: Truck,
      label: 'Distance',
      value: formatDistance(totals.totalDistance),
    },
    {
      icon: Clock,
      label: 'Duration',
      value: formatDuration(totals.totalDuration),
    },
  ];

  return (
    <div className="flex h-16 items-center gap-6 border-t bg-white px-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
            {index < stats.length - 1 && (
              <Separator orientation="vertical" className="ml-6 h-10" />
            )}
          </div>
        );
      })}
    </div>
  );
}
