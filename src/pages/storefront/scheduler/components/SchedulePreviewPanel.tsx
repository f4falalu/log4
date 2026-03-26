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
  Navigation,
  CircleDot,
  CheckCircle2,
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
  getCapacityColor,
  computeRouteMetrics,
} from '@/lib/schedulerUtils';
import { usePreBatch } from '@/hooks/usePreBatch';
import type { SchedulerBatch, SchedulerBatchStatus } from '@/types/scheduler';
import type { PreBatchWithRelations } from '@/types/unified-workflow';
import type { Facility, Warehouse, Vehicle } from '@/types';

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
  facilities?: Facility[];
  warehouses?: Warehouse[];
  vehicles?: Vehicle[];
}

export function SchedulePreviewPanel({
  batchId,
  batch: batchProp,
  onClose,
  facilities = [],
  warehouses = [],
  vehicles = [],
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

  // Build lookup maps
  const facilityMap = useMemo(() => {
    const map: Record<string, Facility> = {};
    for (const f of facilities) {
      map[f.id] = f;
    }
    return map;
  }, [facilities]);

  const warehouseMap = useMemo(() => {
    const map: Record<string, Warehouse> = {};
    for (const w of warehouses) {
      map[w.id] = w;
    }
    return map;
  }, [warehouses]);

  const vehicleMap = useMemo(() => {
    const map: Record<string, Vehicle> = {};
    for (const v of vehicles) {
      map[v.id] = v;
    }
    return map;
  }, [vehicles]);

  // Compute route metrics from facility coordinates
  const routeMetrics = useMemo(() => {
    if (!batch || !batch.facility_ids.length) return null;

    // Get start location (warehouse) coords
    const warehouse = batch.warehouse_id ? warehouseMap[batch.warehouse_id] : null;
    const startLocation = warehouse?.lat && warehouse?.lng
      ? { lat: Number(warehouse.lat), lng: Number(warehouse.lng) }
      : null;

    return computeRouteMetrics(batch.facility_ids, facilityMap, startLocation);
  }, [batch, facilityMap, warehouseMap]);

  // Compute capacity utilization if vehicle is known
  const capacityPct = useMemo(() => {
    if (!batch?.vehicle_id || !routeMetrics) return null;
    const vehicle = vehicleMap[batch.vehicle_id];
    if (!vehicle) return null;

    // Use facility count / vehicle capacity as a rough proxy
    const maxWeight = (vehicle as any).maxWeight || (vehicle as any).max_weight;
    if (maxWeight && batch.total_weight_kg) {
      return Math.round((batch.total_weight_kg / maxWeight) * 100);
    }

    // Fallback: slots-based utilization
    const capacity = (vehicle as any).capacity;
    if (capacity && batch.facility_ids.length) {
      return Math.round((batch.facility_ids.length / capacity) * 100);
    }

    return null;
  }, [batch, vehicleMap, routeMetrics]);

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

  const warehouse = batch.warehouse_id ? warehouseMap[batch.warehouse_id] : null;
  const vehicle = batch.vehicle_id ? vehicleMap[batch.vehicle_id] : null;

  const totalDistanceKm = batch.total_distance_km ?? routeMetrics?.totalDistanceKm ?? null;
  const estimatedDurationMin = batch.estimated_duration_min ?? routeMetrics?.estimatedDurationMin ?? null;
  const utilPct = batch.capacity_utilization_pct ?? capacityPct;

  // Build departure time for ETA calculations
  const departureTime = batch.planned_date ? new Date(batch.planned_date) : null;

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

            {warehouse && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Start Location</p>
                  <p className="font-medium">{warehouse.name}</p>
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
                  {vehicle
                    ? `${vehicle.model || ''} ${(vehicle as any).plateNumber || (vehicle as any).plate_number || ''}`.trim() || batch.vehicle_id
                    : batch.vehicle_id || 'Not assigned'}
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
              <Navigation className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Total Distance</p>
                <p className="font-medium">
                  {formatDistance(totalDistanceKm)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Estimated Duration</p>
                <p className="font-medium">
                  {formatDuration(estimatedDurationMin)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Package className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Capacity Utilization</p>
                <p className={`font-medium ${getCapacityColor(utilPct)}`}>
                  {formatCapacity(utilPct)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Scheduled Stops */}
          {routeMetrics && routeMetrics.stops.length > 0 && (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Scheduled Stops ({routeMetrics.stops.length})
                </h4>

                <div className="space-y-0">
                  {/* Start location */}
                  {warehouse && (
                    <div className="flex items-start gap-3 pb-2">
                      <div className="flex flex-col items-center">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                          <CircleDot className="h-3.5 w-3.5 text-green-600" />
                        </div>
                        <div className="h-4 w-px bg-gray-200" />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {warehouse.name}
                        </p>
                        <p className="text-xs text-gray-500">Departure</p>
                      </div>
                    </div>
                  )}

                  {/* Facility stops */}
                  {routeMetrics.stops.map((stop, idx) => {
                    const isLast = idx === routeMetrics.stops.length - 1;
                    const etaTime = departureTime
                      ? new Date(departureTime.getTime() + stop.eta_minutes * 60 * 1000)
                      : null;

                    return (
                      <div key={stop.facility_id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            isLast ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {isLast ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-red-600" />
                            ) : (
                              <span className="text-xs font-semibold text-blue-700">{stop.sequence}</span>
                            )}
                          </div>
                          {!isLast && <div className="h-8 w-px bg-gray-200" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {stop.facility_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {stop.lga && <span>{stop.lga}</span>}
                            {stop.distance_from_prev_km > 0 && (
                              <>
                                {stop.lga && <span>·</span>}
                                <span>{stop.distance_from_prev_km.toFixed(1)} km</span>
                              </>
                            )}
                            {etaTime && (
                              <>
                                <span>·</span>
                                <span>
                                  ETA {etaTime.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Notes */}
          {batch.notes && (
            <>
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
