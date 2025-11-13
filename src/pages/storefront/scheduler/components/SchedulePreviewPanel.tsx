/**
 * =====================================================
 * Schedule Preview Panel Component
 * =====================================================
 * Right drawer showing detailed batch information
 */

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
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSchedulerBatch } from '@/hooks/useSchedulerBatches';
import {
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  formatDate,
  formatDistance,
  formatDuration,
  formatCapacity,
  canPublishBatch,
} from '@/lib/schedulerUtils';

interface SchedulePreviewPanelProps {
  batchId: string;
  onClose: () => void;
}

export function SchedulePreviewPanel({
  batchId,
  onClose,
}: SchedulePreviewPanelProps) {
  const { data: batch, isLoading } = useSchedulerBatch(batchId);

  if (isLoading) {
    return (
      <div className="flex h-full w-96 flex-col border-l bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div className="h-6 w-32 animate-pulse bg-gray-200 rounded" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
          ))}
        </div>
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
        {canPublishBatch(batch) && (
          <Button className="w-full gap-2" size="sm">
            <Send className="h-4 w-4" />
            Publish to FleetOps
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" size="sm">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 text-red-600 hover:text-red-700"
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
