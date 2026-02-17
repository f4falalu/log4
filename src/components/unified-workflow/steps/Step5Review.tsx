/**
 * =====================================================
 * Step 5: Review & Confirm
 * =====================================================
 * Final review of all settings before creating the batch.
 */

import * as React from 'react';
import {
  CheckCircle,
  Calendar,
  Clock,
  Building2,
  Truck,
  User,
  Route,
  Package,
  MapPin,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { WorkingSetItem, SlotAssignment, SourceMethod, SourceSubOption } from '@/types/unified-workflow';
import type { TimeWindow, Priority } from '@/types/scheduler';

interface Step5ReviewProps {
  // Source
  sourceMethod: SourceMethod | null;
  sourceSubOption: SourceSubOption | null;

  // Schedule
  scheduleTitle: string | null;
  startLocationName: string | null;
  plannedDate: string | null;
  timeWindow: TimeWindow | null;

  // Batch
  batchName: string | null;
  priority: Priority;

  // Vehicle & Driver
  vehicleName: string | null;
  vehiclePlate: string | null;
  driverName: string | null;

  // Route
  totalDistanceKm: number | null;
  estimatedDurationMin: number | null;

  // Facilities & Slots
  facilities: WorkingSetItem[];
  slotAssignments: Record<string, SlotAssignment>;

  // Notes
  notes: string | null;
}

export function Step5Review({
  sourceMethod,
  sourceSubOption,
  scheduleTitle,
  startLocationName,
  plannedDate,
  timeWindow,
  batchName,
  priority,
  vehicleName,
  vehiclePlate,
  driverName,
  totalDistanceKm,
  estimatedDurationMin,
  facilities,
  slotAssignments,
  notes,
}: Step5ReviewProps) {
  // Format helpers
  const dateLabel = plannedDate
    ? new Date(plannedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not set';

  const timeWindowLabel = {
    morning: 'Morning (6am - 12pm)',
    afternoon: 'Afternoon (12pm - 6pm)',
    evening: 'Evening (6pm - 10pm)',
    all_day: 'All Day',
  }[timeWindow || ''] || 'Not set';

  const sourceLabel = {
    ready: 'Ready Consignments',
    upload: 'File Upload',
    manual: 'Manual Entry',
  }[sourceMethod || ''] || 'Unknown';

  const modeLabel = {
    manual_scheduling: 'Manual Scheduling',
    ai_optimization: 'AI Optimization',
  }[sourceSubOption || ''] || '';

  const durationLabel = estimatedDurationMin
    ? `${Math.floor(estimatedDurationMin / 60)}h ${estimatedDurationMin % 60}min`
    : '-';

  // Calculate totals
  const totals = {
    facilities: facilities.length,
    slots: facilities.reduce((sum, f) => sum + (f.slot_demand || 0), 0),
    weight: facilities.reduce((sum, f) => sum + (f.weight_kg || 0), 0),
    assigned: Object.keys(slotAssignments).length,
  };

  // Validation checks
  const checks = [
    { label: 'Batch name', ok: !!batchName, value: batchName },
    { label: 'Vehicle selected', ok: !!vehicleName, value: vehicleName || 'Not selected' },
    { label: 'Facilities added', ok: facilities.length > 0, value: `${facilities.length} facilities` },
    { label: 'Route optimized', ok: !!totalDistanceKm, value: totalDistanceKm ? `${totalDistanceKm.toFixed(1)} km` : 'Not optimized' },
  ];

  const allChecksPass = checks.every((c) => c.ok);

  return (
    <div className="flex flex-col p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Review & Confirm</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review all details before creating the batch
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Validation Checklist */}
            <Card className={cn(allChecksPass ? 'border-green-500/50' : 'border-amber-500/50')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {allChecksPass ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  Validation Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checks.map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {check.ok ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )}
                        <span>{check.label}</span>
                      </div>
                      <span className={cn('text-xs', check.ok ? 'text-muted-foreground' : 'text-amber-600')}>
                        {check.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Schedule Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ReviewRow label="Title" value={scheduleTitle || 'Untitled'} />
                <ReviewRow
                  label="Source"
                  value={
                    <div className="flex items-center gap-2">
                      <span>{sourceLabel}</span>
                      {modeLabel && (
                        <Badge variant="outline" className="text-xs">
                          {modeLabel}
                        </Badge>
                      )}
                    </div>
                  }
                />
                <ReviewRow label="Start Location" value={startLocationName || 'Not set'} icon={<Building2 className="h-3 w-3" />} />
                <ReviewRow label="Date" value={dateLabel} icon={<Calendar className="h-3 w-3" />} />
                <ReviewRow label="Time Window" value={timeWindowLabel} icon={<Clock className="h-3 w-3" />} />
              </CardContent>
            </Card>

            {/* Batch Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Batch Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ReviewRow label="Batch Name" value={batchName || 'Not set'} />
                <ReviewRow
                  label="Priority"
                  value={
                    <Badge
                      variant={priority === 'urgent' ? 'destructive' : priority === 'high' ? 'default' : 'secondary'}
                    >
                      {priority}
                    </Badge>
                  }
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Vehicle & Driver */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ReviewRow
                  label="Vehicle"
                  value={
                    vehicleName ? (
                      <div className="flex items-center gap-2">
                        <span>{vehicleName}</span>
                        {vehiclePlate && (
                          <Badge variant="outline" className="text-xs">
                            {vehiclePlate}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-amber-600">Not selected</span>
                    )
                  }
                />
                <ReviewRow
                  label="Driver"
                  value={driverName || <span className="text-muted-foreground">Not assigned</span>}
                  icon={<User className="h-3 w-3" />}
                />
              </CardContent>
            </Card>

            {/* Route Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Route Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-lg font-semibold">
                      {totalDistanceKm ? `${totalDistanceKm.toFixed(1)} km` : '-'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-lg font-semibold">{durationLabel}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Facilities</p>
                    <p className="text-lg font-semibold">{totals.facilities}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Slots</p>
                    <p className="text-lg font-semibold">
                      {totals.assigned}/{totals.slots}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Facilities List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Facilities ({totals.facilities})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {facilities.map((facility, idx) => (
                    <div
                      key={facility.facility_id}
                      className="flex items-center gap-2 text-sm p-2 rounded border"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate flex-1">{facility.facility_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {facility.slot_demand} slots
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// =====================================================
// Sub-component
// =====================================================

interface ReviewRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

function ReviewRow({ label, value, icon }: ReviewRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default Step5Review;
