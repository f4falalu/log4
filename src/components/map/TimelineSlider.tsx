/**
 * TimelineSlider.tsx
 *
 * Timeline scrubber for historical data navigation
 * Phase 6: Forensic Map component
 */

import { useState, useEffect, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Timeline event marker
 */
export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'delay' | 'exception' | 'trade_off' | 'sla_violation' | 'completion';
  label?: string;
  color?: string;
}

/**
 * Timeline Slider Props
 */
export interface TimelineSliderProps {
  /** Start timestamp of timeline */
  startTimestamp: string;

  /** End timestamp of timeline */
  endTimestamp: string;

  /** Current timestamp */
  currentTimestamp: string | null;

  /** Callback when timestamp changes (via scrubbing) */
  onTimestampChange: (timestamp: string) => void;

  /** Event markers to display on timeline */
  events?: TimelineEvent[];

  /** Show time labels (default: true) */
  showLabels?: boolean;

  /** Show event markers (default: true) */
  showEventMarkers?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** Custom className */
  className?: string;
}

/**
 * Timeline Slider Component
 *
 * Features:
 * - Draggable slider for timeline navigation
 * - Event markers at specific timestamps
 * - Time labels at intervals
 * - Current time indicator
 * - Smooth scrubbing
 */
export function TimelineSlider({
  startTimestamp,
  endTimestamp,
  currentTimestamp,
  onTimestampChange,
  events = [],
  showLabels = true,
  showEventMarkers = true,
  disabled = false,
  className = '',
}: TimelineSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Validate timestamp string
   */
  const isValidTimestamp = (timestamp: string | null): boolean => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  };

  /**
   * Convert timestamp to slider value (0-100)
   */
  const timestampToValue = (timestamp: string | null): number => {
    if (!timestamp || !isValidTimestamp(timestamp)) return 0;
    if (!isValidTimestamp(startTimestamp) || !isValidTimestamp(endTimestamp)) return 0;

    const start = new Date(startTimestamp).getTime();
    const end = new Date(endTimestamp).getTime();
    const current = new Date(timestamp).getTime();

    // Guard against invalid range
    if (end <= start) return 0;

    if (current <= start) return 0;
    if (current >= end) return 100;

    return ((current - start) / (end - start)) * 100;
  };

  /**
   * Convert slider value (0-100) to timestamp
   */
  const valueToTimestamp = (value: number): string => {
    if (!isValidTimestamp(startTimestamp) || !isValidTimestamp(endTimestamp)) {
      return new Date().toISOString(); // Fallback to current time
    }

    const start = new Date(startTimestamp).getTime();
    const end = new Date(endTimestamp).getTime();

    const timestamp = start + ((end - start) * value) / 100;
    return new Date(timestamp).toISOString();
  };

  /**
   * Format timestamp for label
   */
  const formatTimestamp = (timestamp: string, format: 'time' | 'datetime' = 'time'): string => {
    if (!isValidTimestamp(timestamp)) {
      return '--:--';
    }

    const date = new Date(timestamp);

    if (format === 'time') {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get time labels at regular intervals
   */
  const getTimeLabels = (): Array<{ value: number; label: string }> => {
    const labels: Array<{ value: number; label: string }> = [];
    const intervalCount = 5; // Show 5 time labels

    for (let i = 0; i <= intervalCount; i++) {
      const value = (i / intervalCount) * 100;
      const timestamp = valueToTimestamp(value);
      labels.push({
        value,
        label: formatTimestamp(timestamp),
      });
    }

    return labels;
  };

  /**
   * Get event marker color
   */
  const getEventColor = (type: TimelineEvent['type']): string => {
    const colors: Record<TimelineEvent['type'], string> = {
      delay: '#f59e0b', // amber
      exception: '#ef4444', // red
      trade_off: '#3b82f6', // blue
      sla_violation: '#dc2626', // dark red
      completion: '#10b981', // green
    };

    return colors[type] || '#6b7280';
  };

  /**
   * Handle slider value change
   */
  const handleValueChange = (values: number[]) => {
    const value = values[0];
    const timestamp = valueToTimestamp(value);
    onTimestampChange(timestamp);
  };

  /**
   * Handle drag start
   */
  const handleDragStart = () => {
    setIsDragging(true);
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const currentValue = timestampToValue(currentTimestamp);
  const timeLabels = showLabels ? getTimeLabels() : [];

  return (
    <div className={cn('flex flex-col gap-3', className)} ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Timeline</span>
        {currentTimestamp && (
          <Badge variant="outline" className="text-xs">
            {formatTimestamp(currentTimestamp, 'datetime')}
          </Badge>
        )}
      </div>

      {/* Timeline container */}
      <div className="relative">
        {/* Event markers */}
        {showEventMarkers && events.length > 0 && (
          <div className="absolute -top-8 left-0 right-0 h-6 pointer-events-none">
            {events.map((event) => {
              const eventValue = timestampToValue(event.timestamp);
              return (
                <div
                  key={event.id}
                  className="absolute -translate-x-1/2 group"
                  style={{ left: `${eventValue}%` }}
                  title={event.label || event.type}
                >
                  <div
                    className="w-2 h-6 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: event.color || getEventColor(event.type) }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {event.label || event.type}
                    <div className="text-[10px] text-muted-foreground">
                      {formatTimestamp(event.timestamp, 'datetime')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Slider */}
        <Slider
          value={[currentValue]}
          onValueChange={handleValueChange}
          onPointerDown={handleDragStart}
          onPointerUp={handleDragEnd}
          min={0}
          max={100}
          step={0.1}
          disabled={disabled}
          className={cn(
            'relative flex items-center select-none touch-none w-full',
            isDragging && 'cursor-grabbing'
          )}
        />

        {/* Time labels */}
        {showLabels && (
          <div className="relative mt-2 h-4">
            {timeLabels.map((label, index) => (
              <div
                key={index}
                className="absolute -translate-x-1/2 text-[10px] text-muted-foreground font-mono"
                style={{ left: `${label.value}%` }}
              >
                {label.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event count */}
      {showEventMarkers && events.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{events.length} event{events.length !== 1 ? 's' : ''}</span>
          {events.filter((e) => e.type === 'delay').length > 0 && (
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getEventColor('delay') }} />
              {events.filter((e) => e.type === 'delay').length} delay{events.filter((e) => e.type === 'delay').length !== 1 ? 's' : ''}
            </Badge>
          )}
          {events.filter((e) => e.type === 'exception').length > 0 && (
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getEventColor('exception') }} />
              {events.filter((e) => e.type === 'exception').length} exception{events.filter((e) => e.type === 'exception').length !== 1 ? 's' : ''}
            </Badge>
          )}
          {events.filter((e) => e.type === 'trade_off').length > 0 && (
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getEventColor('trade_off') }} />
              {events.filter((e) => e.type === 'trade_off').length} trade-off{events.filter((e) => e.type === 'trade_off').length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
