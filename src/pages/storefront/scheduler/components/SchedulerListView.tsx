/**
 * =====================================================
 * Scheduler List View Component
 * =====================================================
 * Center workspace showing list of scheduler batches
 */

import { Package, MapPin, Truck, User, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SchedulerBatch } from '@/types/scheduler';
import {
  getStatusColor,
  getPriorityColor,
  formatDate,
  formatDistance,
  formatDuration,
  formatCapacity,
} from '@/lib/schedulerUtils';

interface SchedulerListViewProps {
  batches: SchedulerBatch[];
  isLoading?: boolean;
  selectedBatchId: string | null;
  onBatchSelect: (batchId: string) => void;
}

export function SchedulerListView({
  batches,
  isLoading,
  selectedBatchId,
  onBatchSelect,
}: SchedulerListViewProps) {
  if (isLoading) {
    return (
      <div className="flex-1 space-y-3 p-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No batches found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Create a new schedule to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-3 p-6">
        {batches.map((batch) => {
          const isSelected = selectedBatchId === batch.id;

          return (
            <Card
              key={batch.id}
              className={cn(
                'cursor-pointer p-4 transition-all hover:shadow-md',
                isSelected && 'ring-2 ring-blue-500'
              )}
              onClick={() => onBatchSelect(batch.id)}
            >
              {/* Header */}
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {batch.name || batch.batch_code}
                    </h3>
                    <Badge className={getPriorityColor(batch.priority)}>
                      {batch.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {batch.batch_code}
                  </p>
                </div>
                <Badge className={getStatusColor(batch.status)}>
                  {batch.status}
                </Badge>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Planned Date */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(batch.planned_date)}</span>
                </div>

                {/* Facilities Count */}
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{batch.facility_ids.length} facilities</span>
                </div>

                {/* Driver */}
                {batch.driver_id && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{batch.driver_id}</span>
                  </div>
                )}

                {/* Vehicle */}
                {batch.vehicle_id && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Truck className="h-4 w-4" />
                    <span>{batch.vehicle_id}</span>
                  </div>
                )}

                {/* Distance */}
                {batch.total_distance_km && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{formatDistance(batch.total_distance_km)}</span>
                  </div>
                )}

                {/* Duration */}
                {batch.estimated_duration_min && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(batch.estimated_duration_min)}</span>
                  </div>
                )}
              </div>

              {/* Capacity Bar */}
              {batch.capacity_utilization_pct && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Capacity</span>
                    <span className="font-medium">
                      {formatCapacity(batch.capacity_utilization_pct)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        batch.capacity_utilization_pct >= 90
                          ? 'bg-orange-500'
                          : batch.capacity_utilization_pct >= 50
                          ? 'bg-green-500'
                          : 'bg-yellow-500'
                      )}
                      style={{
                        width: `${Math.min(batch.capacity_utilization_pct, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
