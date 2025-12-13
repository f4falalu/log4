import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RouteStop {
  id: string;
  facilityCode: string;
  facilityName: string;
  scheduledTime?: string;
  actualTime?: string;
  status: 'pending' | 'completed' | 'in_progress' | 'skipped';
  estimatedDuration?: number;
}

interface RouteTimelineProps {
  stops: RouteStop[];
  currentStopIndex?: number;
  showTimes?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * RouteTimeline - Horizontal multi-stop route visualization
 *
 * Displays route progression with stops, times, status badges, and visual connectors.
 * Inspired by air freight timeline patterns.
 *
 * @example
 * ```tsx
 * <RouteTimeline
 *   stops={route.stops}
 *   currentStopIndex={2}
 *   showTimes
 * />
 * ```
 */
export function RouteTimeline({
  stops,
  currentStopIndex,
  showTimes = true,
  compact = false,
  className,
}: RouteTimelineProps) {
  const getStatusIcon = (status: RouteStop['status'], isCurrent: boolean) => {
    if (status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    if (isCurrent) {
      return <Circle className="h-4 w-4 text-primary fill-primary" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusVariant = (status: RouteStop['status']): 'success' | 'info' | 'secondary' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'skipped':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getConnectorColor = (currentStatus: RouteStop['status'], nextStatus?: RouteStop['status']) => {
    if (currentStatus === 'completed') {
      return 'border-success';
    }
    if (currentStatus === 'in_progress') {
      return 'border-primary';
    }
    return 'border-muted';
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="flex items-center gap-2 min-w-max pb-2">
        {stops.map((stop, index) => {
          const isCurrent = currentStopIndex === index;
          const isLast = index === stops.length - 1;

          return (
            <React.Fragment key={stop.id}>
              {/* Stop */}
              <div
                className={cn(
                  'flex flex-col items-center gap-2',
                  compact ? 'min-w-[100px]' : 'min-w-[140px]'
                )}
              >
                {/* Time */}
                {showTimes && (
                  <div className="text-xs text-muted-foreground text-center">
                    {stop.actualTime || stop.scheduledTime || '--:--'}
                  </div>
                )}

                {/* Stop Container */}
                <div
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                    isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-background',
                    stop.status === 'completed' && 'border-success/50 bg-success/5'
                  )}
                >
                  {/* Status Icon */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-1">
                    {getStatusIcon(stop.status, isCurrent)}
                  </div>

                  {/* Facility Code */}
                  <div
                    className={cn(
                      'font-mono font-bold uppercase text-sm',
                      isCurrent ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {stop.facilityCode}
                  </div>

                  {/* Facility Name */}
                  {!compact && (
                    <div className="text-xs text-muted-foreground text-center max-w-[120px] truncate">
                      {stop.facilityName}
                    </div>
                  )}

                  {/* Status Badge */}
                  <Badge size="xs" variant={getStatusVariant(stop.status)}>
                    {stop.status === 'in_progress' ? 'current' : stop.status}
                  </Badge>

                  {/* Duration */}
                  {stop.estimatedDuration && (
                    <div className="text-[10px] text-muted-foreground">
                      {stop.estimatedDuration}min
                    </div>
                  )}
                </div>
              </div>

              {/* Connector */}
              {!isLast && (
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="h-4" />
                  <ArrowRight
                    className={cn(
                      'h-5 w-5',
                      stop.status === 'completed' ? 'text-success' : 'text-muted-foreground'
                    )}
                  />
                  <div
                    className={cn(
                      'h-0.5 w-8 border-t-2 border-dashed',
                      getConnectorColor(stop.status, stops[index + 1]?.status)
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/**
 * CompactRouteTimeline - Space-saving variant without facility names
 */
export function CompactRouteTimeline(props: Omit<RouteTimelineProps, 'compact'>) {
  return <RouteTimeline {...props} compact />;
}
