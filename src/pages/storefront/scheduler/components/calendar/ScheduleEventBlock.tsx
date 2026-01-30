/**
 * Schedule Event Block Component
 * Displays a single event/schedule in the calendar
 */

import { cn } from '@/lib/utils';
import type { CalendarEvent } from '../../types';

interface ScheduleEventBlockProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  ready: 'bg-blue-100 text-blue-800 border-blue-300',
  scheduled: 'bg-amber-100 text-amber-800 border-amber-300',
  published: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

export function ScheduleEventBlock({
  event,
  onClick,
  compact = false,
}: ScheduleEventBlockProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(event);
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'w-full rounded px-1.5 py-0.5 text-left text-xs font-medium truncate border-l-2',
          statusColors[event.status]
        )}
      >
        {event.batchCode}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full rounded-md border p-2 text-left transition-colors hover:shadow-sm',
        statusColors[event.status]
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate">{event.batchCode}</span>
        <span className="text-xs capitalize opacity-80">{event.timeWindow}</span>
      </div>
      <div className="mt-1 text-xs opacity-70">
        {event.facilityCount} {event.facilityCount === 1 ? 'facility' : 'facilities'}
      </div>
      {event.driverName && (
        <div className="mt-0.5 text-xs opacity-70 truncate">
          {event.driverName}
        </div>
      )}
    </button>
  );
}
