/**
 * TopContextBar Component
 *
 * Header bar with:
 * - Batch selector dropdown
 * - Driver/vehicle info
 * - Trip summary pills (distance, time, delays, idle %)
 *
 * Dynamic pills update as currentTime progresses during playback
 */

import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, AlertTriangle, Clock, Route, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { usePlaybackStore } from '@/stores/playbackStore';
import { usePlaybackBatches } from '@/hooks/usePlaybackData';
import { usePlaybackAnimation } from '@/hooks/usePlaybackAnimation';
import { formatDistance, formatDuration } from '@/lib/playback-utils';
import { computeRouteVariance } from '@/lib/playback-utils';

interface TopContextBarProps {
  selectedBatchId: string | null;
  onSelectBatch: (id: string) => void;
  filterDate?: Date | null;
  onDateFilter?: (date: Date | null) => void;
  className?: string;
}

export function TopContextBar({
  selectedBatchId,
  onSelectBatch,
  filterDate,
  onDateFilter,
  className,
}: TopContextBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const tripData = usePlaybackStore((state) => state.tripData);
  const currentTime = usePlaybackStore((state) => state.currentTime);

  const { completedDistance, progress } = usePlaybackAnimation();

  // Fetch available batches
  const { data: batches, isLoading: batchesLoading } = usePlaybackBatches();

  // Filter batches by date if filterDate is set
  const filteredBatches = useMemo(() => {
    if (!batches) return [];
    if (!filterDate) return batches;

    const filterDateKey = filterDate.toISOString().split('T')[0];
    return batches.filter((batch) => {
      if (!batch.startTime) return false;
      const batchDateKey = batch.startTime.toISOString().split('T')[0];
      return batchDateKey === filterDateKey;
    });
  }, [batches, filterDate]);

  // Get selected batch info
  const selectedBatch = filteredBatches?.find((b) => b.id === selectedBatchId);

  // Get dates with deliveries for calendar modifiers
  const deliveryDates = useMemo(() => {
    if (!batches) return [];

    const dates: Date[] = [];
    batches.forEach((batch) => {
      if (batch.startTime) {
        dates.push(new Date(batch.startTime));
      }
    });

    return dates;
  }, [batches]);

  // Handle calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) {
      onDateFilter?.(null);
      setCalendarOpen(false);
      return;
    }

    // If clicking the same date, deselect it
    if (filterDate && date.toDateString() === filterDate.toDateString()) {
      onDateFilter?.(null);
    } else {
      onDateFilter?.(date);
    }

    setCalendarOpen(false);
  };

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  // Compute dynamic trip metrics based on currentTime
  const tripMetrics = useMemo(() => {
    if (!tripData) return null;

    const { analytics } = tripData;

    // Compute route variance
    const variance = computeRouteVariance(
      tripData.gps.map((p) => [p.lng, p.lat]),
      tripData.plannedRoute
    );

    // Count delays up to current time
    const delaysUpToNow = tripData.events.filter(
      (e) => e.type === 'delay' && e.startTime <= currentTime
    ).length;

    // Calculate elapsed time
    const elapsedTime = currentTime - tripData.startTime;

    // Calculate idle time up to now (simplified - would need proper calculation)
    const idlePercentage =
      elapsedTime > 0
        ? (analytics.idleTime / analytics.totalDuration) * 100
        : 0;

    return {
      totalDistance: analytics.totalDistance,
      completedDistance,
      variance,
      totalDuration: analytics.totalDuration,
      elapsedTime,
      delays: delaysUpToNow,
      totalDelays: analytics.delays,
      idlePercentage,
      stopsCompleted: tripData.stops.filter(
        (s) => s.arrivalTime.getTime() <= currentTime
      ).length,
      totalStops: tripData.stops.length,
    };
  }, [tripData, currentTime, completedDistance]);

  return (
    <div
      className={`border-b bg-background px-4 py-3 flex items-center justify-between shrink-0 ${className || ''}`}
    >
      {/* Left: Batch selector */}
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[280px] justify-between">
              {selectedBatch ? (
                <div className="flex flex-col items-start">
                  <span className="font-medium truncate max-w-[220px]">
                    {selectedBatch.name}
                  </span>
                  {selectedBatch.driverName && (
                    <span className="text-xs text-muted-foreground">
                      {selectedBatch.driverName}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Select a batch...</span>
              )}
              <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[320px]">
            {batchesLoading ? (
              <div className="p-3 text-sm text-muted-foreground">
                Loading batches...
              </div>
            ) : filteredBatches?.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                {filterDate
                  ? 'No batches found for selected date'
                  : 'No completed batches found'}
              </div>
            ) : (
              filteredBatches?.map((batch) => (
                <DropdownMenuItem
                  key={batch.id}
                  onClick={() => onSelectBatch(batch.id)}
                >
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{batch.name}</span>
                      {batch.id === selectedBatchId && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{batch.driverName || 'Unknown driver'}</span>
                      <span>•</span>
                      <span>{formatDate(batch.startTime)}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Calendar popover */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={filterDate ? 'default' : 'outline'}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filterDate || undefined}
              onSelect={handleCalendarSelect}
              modifiers={{
                hasDeliveries: deliveryDates,
              }}
              modifiersClassNames={{
                hasDeliveries: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary',
              }}
              disabled={(date) => {
                // Disable dates that don't have deliveries
                return !deliveryDates.some(
                  (d) => d.toDateString() === date.toDateString()
                );
              }}
              initialFocus
            />
            {filterDate && (
              <div className="p-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onDateFilter?.(null);
                    setCalendarOpen(false);
                  }}
                >
                  Clear filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Right: Trip summary pills (always visible, show placeholders when no trip) */}
      <div className={`flex items-center gap-3 ${!tripMetrics ? 'opacity-50' : ''}`}>
        {/* Distance pill */}
        <div className="bg-muted/50 rounded-lg px-3 py-2 min-w-[120px]">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
            <Route className="h-3 w-3" />
            Distance
          </div>
          <div className="text-base font-semibold">
            {tripMetrics ? formatDistance(tripMetrics.completedDistance) : '— km'}
          </div>
          {tripMetrics && tripMetrics.variance.variancePercent !== 0 && (
            <Badge
              variant={tripMetrics.variance.variance > 0 ? 'destructive' : 'default'}
              className="text-xs mt-1"
            >
              {tripMetrics.variance.variance > 0 ? '+' : ''}
              {tripMetrics.variance.variancePercent.toFixed(0)}%
            </Badge>
          )}
        </div>

        {/* Time pill */}
        <div className="bg-muted/50 rounded-lg px-3 py-2 min-w-[120px]">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
            <Clock className="h-3 w-3" />
            Time
          </div>
          <div className="text-base font-semibold">
            {tripMetrics ? formatDuration(tripMetrics.elapsedTime / 1000) : '—h —m'}
          </div>
          {tripMetrics && (
            <div className="text-xs text-muted-foreground mt-1">
              of {formatDuration(tripMetrics.totalDuration)}
            </div>
          )}
        </div>

        {/* Delays pill */}
        <div className="bg-muted/50 rounded-lg px-3 py-2 min-w-[100px]">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
            <AlertTriangle className="h-3 w-3" />
            Delays
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold">
              {tripMetrics ? tripMetrics.delays : '—'}
            </span>
            {tripMetrics && (
              <span className="text-xs text-muted-foreground">
                / {tripMetrics.totalDelays}
              </span>
            )}
          </div>
        </div>

        {/* Stops progress */}
        <div className="bg-muted/50 rounded-lg px-3 py-2 min-w-[100px]">
          <div className="text-xs text-muted-foreground mb-0.5">Stops</div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold">
              {tripMetrics ? tripMetrics.stopsCompleted : '—'}
            </span>
            {tripMetrics && (
              <span className="text-xs text-muted-foreground">
                / {tripMetrics.totalStops}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
