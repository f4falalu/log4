/**
 * RouteIntelligenceTab Component
 *
 * Shows:
 * 1. Planned vs Actual distance variance
 * 2. Dwell time per stop (clickable to jump to stop)
 * 3. Average speed per zone (simplified version)
 */

import { useMemo } from 'react';
import { MapPin, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePlaybackStore } from '@/stores/playbackStore';
import { computeRouteVariance, formatDistance, formatDuration } from '@/lib/playback-utils';

export function RouteIntelligenceTab() {
  const tripData = usePlaybackStore((state) => state.tripData);
  const jumpToStop = usePlaybackStore((state) => state.jumpToStop);
  const setHighlightedStop = usePlaybackStore((state) => state.setHighlightedStop);

  // Compute route variance
  const variance = useMemo(() => {
    if (!tripData) return null;

    return computeRouteVariance(
      tripData.gps.map((p) => [p.lng, p.lat]),
      tripData.plannedRoute
    );
  }, [tripData]);

  // Handle stop click
  const handleStopClick = (stopId: string) => {
    if (!tripData) return;
    jumpToStop(stopId);
    setHighlightedStop(stopId);
  };

  // Determine variance status
  const getVarianceStatus = () => {
    if (!variance || variance.variancePercent === 0) return 'neutral';
    if (Math.abs(variance.variancePercent) < 5) return 'good';
    if (Math.abs(variance.variancePercent) < 15) return 'warning';
    return 'bad';
  };

  const varianceStatus = tripData ? getVarianceStatus() : 'neutral';

  return (
    <div className="p-4 space-y-6">
      {/* Empty state */}
      {!tripData && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">No Trip Selected</h3>
              <p className="text-sm text-muted-foreground">
                Select a batch from the dropdown above to view route intelligence
                including planned vs actual comparison, dwell times, and speed analytics.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data content */}
      {tripData && (
        <>
      {/* Planned vs Actual Section */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Planned vs Actual
        </h3>

        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          {/* Distance comparison */}
          {variance ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Planned Distance</span>
                <span className="font-medium">
                  {formatDistance(variance.plannedDistance)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Actual Distance</span>
                <span className="font-medium">
                  {formatDistance(variance.actualDistance)}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Variance</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {variance.variance > 0 ? '+' : ''}
                    {formatDistance(Math.abs(variance.variance))}
                  </span>
                  <Badge
                    variant={
                      varianceStatus === 'good'
                        ? 'default'
                        : varianceStatus === 'warning'
                          ? 'secondary'
                          : varianceStatus === 'bad'
                            ? 'destructive'
                            : 'outline'
                    }
                  >
                    {variance.variancePercent > 0 ? '+' : ''}
                    {variance.variancePercent.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              No planned route available
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Dwell Time per Stop Section */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Dwell Time per Stop
        </h3>

        <div className="space-y-2">
          {tripData.stops.map((stop, index) => {
            // Determine status badge
            let statusIcon = <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
            let statusColor = 'bg-green-50 border-green-200';

            if (stop.status === 'missed') {
              statusIcon = <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
              statusColor = 'bg-red-50 border-red-200';
            } else if (stop.status === 'delayed' || stop.dwellTime > 1800) {
              // > 30min
              statusIcon = <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
              statusColor = 'bg-amber-50 border-amber-200';
            }

            return (
              <button
                key={stop.facilityId}
                onClick={() => handleStopClick(stop.facilityId)}
                className={`w-full text-left rounded-lg p-3 border hover:shadow-sm transition-all ${statusColor}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="h-6 w-6 rounded-full bg-background flex items-center justify-center text-xs font-medium shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {stop.facilityName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(stop.arrivalTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="text-sm font-semibold">
                      {formatDuration(stop.dwellTime)}
                    </div>
                    {statusIcon}
                  </div>
                </div>

                {/* Dwell time indicator */}
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      stop.dwellTime > 1800
                        ? 'bg-red-500'
                        : stop.dwellTime > 900
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (stop.dwellTime / 1800) * 100)}%`,
                    }}
                  />
                </div>
              </button>
            );
          })}

          {tripData.stops.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No stops recorded
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Average Speed per Zone (Simplified) */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Average Speed
        </h3>

        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Overall Average</span>
            <span className="text-lg font-semibold">
              {(
                (tripData.analytics.totalDistance / tripData.analytics.movingTime) *
                3.6
              ).toFixed(0)}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                km/h
              </span>
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Based on {formatDistance(tripData.analytics.totalDistance)} traveled in{' '}
          {formatDuration(tripData.analytics.movingTime)}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
