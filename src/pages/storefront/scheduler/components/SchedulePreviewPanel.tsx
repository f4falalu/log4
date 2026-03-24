/**
 * =====================================================
 * Schedule Preview Panel Component
 * =====================================================
 * Right drawer showing detailed batch information
 */

import { useMemo } from 'react';
import {
  X,
  MapPin,
  User,
  Truck,
  Calendar,
  Clock,
  Package,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SchedulerBatchStatusActions } from '@/components/storefront/scheduler/SchedulerBatchStatusActions';
import {
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  formatDate,
  formatDistance,
  formatDuration,
  formatCapacity,
} from '@/lib/schedulerUtils';
import { usePreBatch } from '@/hooks/usePreBatch';
import type { SchedulerBatch, SchedulerBatchStatus } from '@/types/scheduler';
import type { PreBatchWithRelations } from '@/types/unified-workflow';

function mapPreBatchToSchedulerBatch(pb: PreBatchWithRelations): SchedulerBatch {
  const statusMap: Record<string, SchedulerBatchStatus> = {
    draft: 'draft',
    ready: 'ready',
    converted: 'scheduled',
    cancelled: 'cancelled',
  };

  return {
    id: pb.id,
    name: pb.schedule_title,
    batch_code: pb.id.slice(0, 8).toUpperCase(),
    warehouse_id: pb.start_location_id,
    facility_ids: pb.facility_order || [],
    planned_date: pb.planned_date,
    time_window: pb.time_window ?? null,
    driver_id: null,
    vehicle_id: pb.suggested_vehicle_id,
    optimized_route: null,
    total_distance_km: null,
    estimated_duration_min: null,
    total_consignments: pb.facility_order?.length || 0,
    total_weight_kg: null,
    total_volume_m3: null,
    capacity_utilization_pct: null,
    status: statusMap[pb.status] || 'draft',
    scheduling_mode: pb.source_sub_option === 'ai_optimization' ? 'ai_optimized' : 'manual',
    priority: 'medium',
    created_by: pb.created_by,
    created_at: pb.created_at,
    updated_at: pb.updated_at,
    scheduled_at: pb.status === 'converted' ? pb.updated_at : null,
    published_at: null,
    published_batch_id: pb.converted_batch_id,
    notes: pb.notes ?? null,
    tags: null,
    zone: null,
  };
}

interface SchedulePreviewPanelProps {
  batchId: string;
  batch?: SchedulerBatch;
  onClose: () => void;
}

export function SchedulePreviewPanel({
  batchId,
  batch: batchProp,
  onClose,
}: SchedulePreviewPanelProps) {
  // Fetch batch data independently as fallback
  const { data: preBatchData, isLoading } = usePreBatch(batchId, {
    enabled: !batchProp,
  });

  const batch = useMemo(() => {
    if (batchProp) return batchProp;
    if (preBatchData) return mapPreBatchToSchedulerBatch(preBatchData);
    return null;
  }, [batchProp, preBatchData]);

  if (isLoading && !batch) {
    return (
      <div className="flex h-full w-96 flex-col items-center justify-center border-l bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">Loading batch...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex h-full w-96 flex-col items-center justify-center border-l bg-white">
        <p className="text-gray-500">Batch not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-96 flex-col border-l bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold text-gray-900">Batch Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {/* Title & Status */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                {batch.name || batch.batch_code}
              </h3>
              <Badge className={getPriorityColor(batch.priority)}>
                {getPriorityLabel(batch.priority)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">{batch.batch_code}</p>
            <Badge className={`${getStatusColor(batch.status)} mt-2`}>
              {getStatusLabel(batch.status)}
            </Badge>
          </div>

          <Separator />

          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">
              Basic Information
            </h4>

            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Planned Date</p>
                <p className="font-medium">{formatDate(batch.planned_date)}</p>
              </div>
            </div>

            {batch.time_window && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Time Window</p>
                  <p className="font-medium">{batch.time_window}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Facilities</p>
                <p className="font-medium">
                  {batch.facility_ids.length} locations
                </p>
              </div>
            </div>

            {batch.zone && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Zone</p>
                  <p className="font-medium">{batch.zone}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Assignment */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Assignment</h4>

            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Driver</p>
                <p className="font-medium">
                  {batch.driver_id || 'Not assigned'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Truck className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Vehicle</p>
                <p className="font-medium">
                  {batch.vehicle_id || 'Not assigned'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Route & Performance */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">
              Route & Performance
            </h4>

            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Total Distance</p>
                <p className="font-medium">
                  {formatDistance(batch.total_distance_km)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Estimated Duration</p>
                <p className="font-medium">
                  {formatDuration(batch.estimated_duration_min)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Package className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Capacity Utilization</p>
                <p className="font-medium">
                  {formatCapacity(batch.capacity_utilization_pct)}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {batch.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Notes</h4>
                <p className="text-sm text-gray-600">{batch.notes}</p>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="border-t p-4 space-y-2">
        <SchedulerBatchStatusActions
          batchId={batch.id}
          currentStatus={batch.status}
          batchName={batch.name || batch.batch_code}
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" size="sm">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 text-destructive hover:text-destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
