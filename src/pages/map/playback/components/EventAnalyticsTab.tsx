/**
 * EventAnalyticsTab Component
 *
 * Shows:
 * 1. Stops summary (completed/failed)
 * 2. Dwell time distribution (histogram)
 * 3. Total delay time breakdown
 * 4. Stop compliance table
 */

import { useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Car,
  Construction,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePlaybackStore } from '@/stores/playbackStore';
import { formatDuration } from '@/lib/playback-utils';
import type { DwellTimeBucket, DelayBreakdown } from '@/types/live-map';

export function EventAnalyticsTab() {
  const tripData = usePlaybackStore((state) => state.tripData);
  const jumpToStop = usePlaybackStore((state) => state.jumpToStop);

  // Compute stops summary
  const stopsSummary = useMemo(() => {
    if (!tripData) return null;

    const completed = tripData.stops.filter((s) => s.status === 'completed').length;
    const delayed = tripData.stops.filter((s) => s.status === 'delayed').length;
    const missed = tripData.stops.filter((s) => s.status === 'missed').length;
    const total = tripData.stops.length;

    return { completed, delayed, missed, total };
  }, [tripData]);

  // Compute dwell time distribution
  const dwellDistribution = useMemo((): DwellTimeBucket[] => {
    if (!tripData) return [];

    const buckets: DwellTimeBucket[] = [
      { label: '0-10min', min: 0, max: 600, count: 0, stops: [] },
      { label: '10-20min', min: 600, max: 1200, count: 0, stops: [] },
      { label: '20-30min', min: 1200, max: 1800, count: 0, stops: [] },
      { label: '30+ min (Excessive)', min: 1800, max: Infinity, count: 0, stops: [] },
    ];

    for (const stop of tripData.stops) {
      for (const bucket of buckets) {
        if (stop.dwellTime >= bucket.min && stop.dwellTime < bucket.max) {
          bucket.count++;
          bucket.stops.push(stop.facilityId);
          break;
        }
      }
    }

    return buckets;
  }, [tripData]);

  // Compute delay breakdown
  const delayBreakdown = useMemo((): DelayBreakdown => {
    if (!tripData) {
      return {
        traffic: 0,
        roadworks: 0,
        weather: 0,
        mechanical: 0,
        other: 0,
        total: 0,
      };
    }

    const delays = tripData.events.filter((e) => e.type === 'delay');
    let traffic = 0,
      roadworks = 0,
      weather = 0,
      mechanical = 0,
      other = 0;

    for (const delay of delays) {
      const duration = delay.metadata.duration || 0;
      const reason = delay.metadata.reason?.toLowerCase() || '';

      if (reason.includes('traffic') || reason.includes('congestion')) {
        traffic += duration;
      } else if (reason.includes('roadwork') || reason.includes('construction')) {
        roadworks += duration;
      } else if (reason.includes('weather')) {
        weather += duration;
      } else if (reason.includes('mechanical') || reason.includes('breakdown')) {
        mechanical += duration;
      } else {
        other += duration;
      }
    }

    const total = traffic + roadworks + weather + mechanical + other;

    return { traffic, roadworks, weather, mechanical, other, total };
  }, [tripData]);

  const maxBucketCount = tripData
    ? Math.max(...dwellDistribution.map((b) => b.count), 1)
    : 1;

  return (
    <div className="p-4 space-y-6">
      {/* Empty state */}
      {!tripData && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">No Trip Selected</h3>
              <p className="text-sm text-muted-foreground">
                Select a batch from the dropdown above to view detailed event
                analytics including stops, delays, and dwell time analysis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data content */}
      {tripData && (
        <>
      {/* Stops Summary */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Stops Summary</h3>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">
              {stopsSummary?.completed || 0}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <CheckCircle className="h-3 w-3" />
              Completed
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-700">
              {stopsSummary?.delayed || 0}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              Delayed
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-700">
              {stopsSummary?.missed || 0}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <XCircle className="h-3 w-3" />
              Failed
            </div>
          </div>
        </div>

        {/* Progress ring */}
        {stopsSummary && stopsSummary.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-medium">
                {((stopsSummary.completed / stopsSummary.total) * 100).toFixed(0)}%
              </span>
            </div>
            <Progress
              value={(stopsSummary.completed / stopsSummary.total) * 100}
              className="h-2"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Dwell Time Distribution */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Dwell Time Distribution</h3>

        <div className="space-y-2">
          {dwellDistribution.map((bucket) => (
            <div key={bucket.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{bucket.label}</span>
                <span className="text-muted-foreground">
                  {bucket.count} stop{bucket.count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-8 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full transition-all flex items-center justify-center text-xs font-medium text-white ${
                    bucket.label.includes('Excessive')
                      ? 'bg-red-500'
                      : bucket.label.includes('20-30')
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${(bucket.count / maxBucketCount) * 100}%`,
                  }}
                >
                  {bucket.count > 0 && bucket.count}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          Average dwell time: {formatDuration(tripData.analytics.avgStopDuration)}
        </div>
      </div>

      <Separator />

      {/* Delay Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Total Delay Time</h3>
          <span className="text-lg font-bold">
            {formatDuration(delayBreakdown.total)}
          </span>
        </div>

        {delayBreakdown.total > 0 ? (
          <div className="space-y-2">
            {delayBreakdown.traffic > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-red-500" />
                  <span>Traffic Congestion</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatDuration(delayBreakdown.traffic)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {((delayBreakdown.traffic / delayBreakdown.total) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            )}

            {delayBreakdown.roadworks > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Construction className="h-4 w-4 text-amber-500" />
                  <span>Roadworks</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatDuration(delayBreakdown.roadworks)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {((delayBreakdown.roadworks / delayBreakdown.total) * 100).toFixed(
                      0
                    )}
                    %
                  </Badge>
                </div>
              </div>
            )}

            {delayBreakdown.other > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-gray-500" />
                  <span>Other</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatDuration(delayBreakdown.other)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {((delayBreakdown.other / delayBreakdown.total) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            )}

            {/* Stacked bar */}
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              {delayBreakdown.traffic > 0 && (
                <div
                  className="bg-red-500"
                  style={{
                    width: `${(delayBreakdown.traffic / delayBreakdown.total) * 100}%`,
                  }}
                />
              )}
              {delayBreakdown.roadworks > 0 && (
                <div
                  className="bg-amber-500"
                  style={{
                    width: `${(delayBreakdown.roadworks / delayBreakdown.total) * 100}%`,
                  }}
                />
              )}
              {delayBreakdown.other > 0 && (
                <div
                  className="bg-gray-500"
                  style={{
                    width: `${(delayBreakdown.other / delayBreakdown.total) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No delays recorded
          </div>
        )}
      </div>

      <Separator />

      {/* Stop Compliance Table */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Stop Compliance</h3>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Dwell</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripData.stops.map((stop, index) => (
                <TableRow
                  key={stop.facilityId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => jumpToStop(stop.facilityId)}
                >
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="truncate max-w-[120px]">
                    {stop.facilityName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        stop.status === 'completed'
                          ? 'default'
                          : stop.status === 'delayed'
                            ? 'secondary'
                            : 'destructive'
                      }
                      className="text-xs"
                    >
                      {stop.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatDuration(stop.dwellTime)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {tripData.stops.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No stops recorded
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
