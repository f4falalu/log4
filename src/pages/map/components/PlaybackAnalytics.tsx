/**
 * PlaybackAnalytics - Stop duration analytics for Playback mode
 */

import { useCallback } from 'react';
import { Clock, MapPin, AlertTriangle, CheckCircle, Route, Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { TripAnalytics, StopAnalytics } from '@/types/live-map';

interface PlaybackAnalyticsProps {
  analytics: TripAnalytics | null;
  stopAnalytics: StopAnalytics[];
  batchName?: string;
}

export function PlaybackAnalytics({
  analytics,
  stopAnalytics,
  batchName,
}: PlaybackAnalyticsProps) {
  // Format duration to human readable
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Format time
  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  // Format datetime for CSV export
  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  };

  // Export analytics as CSV
  const handleExportCSV = useCallback(() => {
    if (!analytics || stopAnalytics.length === 0) return;

    // Build CSV content
    const headers = [
      'Stop #',
      'Facility Name',
      'Arrival Time',
      'Departure Time',
      'Duration (seconds)',
      'Duration (formatted)',
      'Proof Captured',
      'Delayed',
    ];

    const rows = stopAnalytics.map((stop, index) => [
      index + 1,
      `"${stop.facilityName.replace(/"/g, '""')}"`,
      formatDateTime(stop.arrivalTime),
      stop.departureTime ? formatDateTime(stop.departureTime) : 'N/A',
      stop.duration,
      formatDuration(stop.duration),
      stop.proofCaptured ? 'Yes' : 'No',
      stop.delayed ? 'Yes' : 'No',
    ]);

    // Add summary section
    const summary = [
      '',
      'TRIP SUMMARY',
      `Total Duration,${formatDuration(analytics.totalDuration)}`,
      `Moving Time,${formatDuration(analytics.movingTime)}`,
      `Idle Time,${formatDuration(analytics.idleTime)}`,
      `Total Stops,${analytics.stopsCount}`,
      `Completed Stops,${analytics.completedStops}`,
      `Total Distance,${(analytics.totalDistance / 1000).toFixed(2)} km`,
      `Average Stop Duration,${formatDuration(analytics.avgStopDuration)}`,
      `Max Stop Duration,${formatDuration(analytics.maxStopDuration)}`,
      `Delays,${analytics.delays}`,
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      ...summary,
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = batchName
      ? `trip-analytics-${batchName.replace(/\s+/g, '-')}.csv`
      : `trip-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [analytics, stopAnalytics, batchName]);

  if (!analytics) {
    return (
      <div className="w-72 border-l bg-background overflow-y-auto">
        <div className="p-4">
          <h3 className="font-semibold mb-2">Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Select a batch to view trip analytics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 border-l bg-background overflow-y-auto">
      {/* Trip Summary */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Trip Summary</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 px-2"
            title="Export analytics as CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              Total Time
            </div>
            <div className="text-lg font-semibold">
              {formatDuration(analytics.totalDuration)}
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <MapPin className="h-3 w-3" />
              Stops
            </div>
            <div className="text-lg font-semibold">
              {analytics.completedStops}/{analytics.stopsCount}
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Route className="h-3 w-3" />
              Distance
            </div>
            <div className="text-lg font-semibold">
              {(analytics.totalDistance / 1000).toFixed(1)} km
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="h-3 w-3" />
              Delays
            </div>
            <div className="text-lg font-semibold">{analytics.delays}</div>
          </div>
        </div>

        {/* Time breakdown */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Time Breakdown</div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Moving</span>
              <span>{formatDuration(analytics.movingTime)}</span>
            </div>
            <Progress
              value={(analytics.movingTime / analytics.totalDuration) * 100}
              className="h-1.5"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">At Stops</span>
              <span>{formatDuration(analytics.idleTime)}</span>
            </div>
            <Progress
              value={(analytics.idleTime / analytics.totalDuration) * 100}
              className="h-1.5 [&>div]:bg-amber-500"
            />
          </div>
        </div>

        {/* Average stats */}
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg stop time</span>
            <span>{formatDuration(analytics.avgStopDuration)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max stop time</span>
            <span>{formatDuration(analytics.maxStopDuration)}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Stop Details */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold">Stop Details</h3>

        <div className="space-y-2">
          {stopAnalytics.map((stop, index) => (
            <div
              key={stop.facilityId}
              className={`rounded-lg p-3 ${
                stop.delayed
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      stop.departureTime
                        ? 'bg-green-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium truncate max-w-[160px]">
                      {stop.facilityName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(stop.arrivalTime)}
                      {stop.departureTime && ` - ${formatTime(stop.departureTime)}`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatDuration(stop.duration)}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {stop.proofCaptured && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                    {stop.delayed && (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {stopAnalytics.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No stop data available
            </div>
          )}
        </div>
      </div>

      {/* Duration chart - simplified bar visualization */}
      {stopAnalytics.length > 0 && (
        <>
          <Separator />
          <div className="p-4 space-y-3">
            <h3 className="font-semibold">Duration Chart</h3>
            <div className="space-y-2">
              {stopAnalytics.map((stop, index) => {
                const maxDuration = Math.max(...stopAnalytics.map((s) => s.duration));
                const percentage = (stop.duration / maxDuration) * 100;

                return (
                  <div key={stop.facilityId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="truncate max-w-[120px]">
                        Stop {index + 1}
                      </span>
                      <span>{formatDuration(stop.duration)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stop.delayed ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
