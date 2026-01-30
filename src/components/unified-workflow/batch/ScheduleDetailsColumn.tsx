/**
 * =====================================================
 * Schedule Details Column (Right Column - Step 3)
 * =====================================================
 * Displays schedule info, route details, driver assignment,
 * and facility list summary.
 */

import * as React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Route,
  User,
  Building2,
  Package,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { WorkingSetItem } from '@/types/unified-workflow';
import type { TimeWindow, Priority } from '@/types/scheduler';

interface Driver {
  id: string;
  name: string;
  phone?: string;
  status: 'available' | 'busy' | 'offline';
  licenseType?: string;
}

interface ScheduleDetailsColumnProps {
  // Schedule Info
  scheduleTitle: string | null;
  startLocationName: string | null;
  plannedDate: string | null;
  timeWindow: TimeWindow | null;
  priority: Priority;

  // Route Info
  totalDistanceKm: number | null;
  estimatedDurationMin: number | null;

  // Driver Assignment
  selectedDriverId: string | null;
  drivers: Driver[];
  onDriverChange: (driverId: string | null) => void;

  // Facilities
  facilities: WorkingSetItem[];

  className?: string;
}

export function ScheduleDetailsColumn({
  scheduleTitle,
  startLocationName,
  plannedDate,
  timeWindow,
  priority,
  totalDistanceKm,
  estimatedDurationMin,
  selectedDriverId,
  drivers,
  onDriverChange,
  facilities,
  className,
}: ScheduleDetailsColumnProps) {
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  // Format time window
  const timeWindowLabel = React.useMemo(() => {
    switch (timeWindow) {
      case 'morning':
        return 'Morning (6am - 12pm)';
      case 'afternoon':
        return 'Afternoon (12pm - 6pm)';
      case 'evening':
        return 'Evening (6pm - 10pm)';
      case 'all_day':
        return 'All Day';
      default:
        return 'Not set';
    }
  }, [timeWindow]);

  // Format duration
  const durationLabel = React.useMemo(() => {
    if (!estimatedDurationMin) return '-';
    const hours = Math.floor(estimatedDurationMin / 60);
    const mins = estimatedDurationMin % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  }, [estimatedDurationMin]);

  // Format date
  const dateLabel = React.useMemo(() => {
    if (!plannedDate) return 'Not set';
    return new Date(plannedDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [plannedDate]);

  // Filter available drivers
  const availableDrivers = drivers.filter((d) => d.status === 'available');
  const unavailableDrivers = drivers.filter((d) => d.status !== 'available');

  // Calculate totals
  const totals = React.useMemo(() => {
    return {
      facilities: facilities.length,
      slots: facilities.reduce((sum, f) => sum + (f.slot_demand || 0), 0),
      weight: facilities.reduce((sum, f) => sum + (f.weight_kg || 0), 0),
    };
  }, [facilities]);

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-4 p-4">
        {/* Schedule Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label="Title"
              value={scheduleTitle || 'Untitled'}
            />
            <DetailRow
              label="Start Location"
              value={startLocationName || 'Not set'}
              icon={<Building2 className="h-3 w-3" />}
            />
            <DetailRow
              label="Date"
              value={dateLabel}
              icon={<Calendar className="h-3 w-3" />}
            />
            <DetailRow
              label="Time Window"
              value={timeWindowLabel}
              icon={<Clock className="h-3 w-3" />}
            />
            <DetailRow
              label="Priority"
              value={
                <Badge
                  variant={
                    priority === 'urgent'
                      ? 'destructive'
                      : priority === 'high'
                      ? 'default'
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {priority}
                </Badge>
              }
            />
          </CardContent>
        </Card>

        {/* Route Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Route className="h-4 w-4" />
              Route Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-sm font-semibold">
                  {totalDistanceKm ? `${totalDistanceKm.toFixed(1)} km` : '-'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-semibold">{durationLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Assignment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Driver Assignment
            </CardTitle>
            <CardDescription className="text-xs">
              Optional - can be assigned later
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedDriverId || 'none'}
              onValueChange={(value) => onDriverChange(value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select driver...">
                  {selectedDriver ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{selectedDriver.name}</span>
                    </div>
                  ) : (
                    'No driver assigned'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No driver</span>
                </SelectItem>
                {availableDrivers.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Available
                    </div>
                    {availableDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>{driver.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {unavailableDrivers.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                      Unavailable
                    </div>
                    {unavailableDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id} disabled>
                        <div className="flex items-center gap-2 opacity-50">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                          <span>{driver.name}</span>
                          <Badge variant="outline" className="text-xs ml-2">
                            {driver.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Facility Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Facilities
            </CardTitle>
            <CardDescription className="text-xs">
              {totals.facilities} stops • {totals.slots} slots
            </CardDescription>
          </CardHeader>
          <CardContent>
            {facilities.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No facilities in schedule</p>
              </div>
            ) : (
              <div className="space-y-2">
                {facilities.slice(0, 5).map((facility, idx) => (
                  <div
                    key={facility.facility_id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="truncate flex-1">{facility.facility_name}</span>
                    <Badge variant="outline" className="text-xs px-1">
                      {facility.slot_demand}
                    </Badge>
                  </div>
                ))}
                {facilities.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{facilities.length - 5} more facilities
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// =====================================================
// Sub-components
// =====================================================

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

function DetailRow({ label, value, icon }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default ScheduleDetailsColumn;
