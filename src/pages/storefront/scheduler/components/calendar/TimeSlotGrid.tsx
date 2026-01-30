/**
 * Time Slot Grid Component
 * Displays a week view with time slots (morning, afternoon, evening)
 */

import { format, isSameDay, isToday } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ScheduleEventBlock } from './ScheduleEventBlock';
import type { CalendarEvent } from '../../types';

interface TimeSlotGridProps {
  dates: Date[];
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  selectedDate?: Date;
}

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', timeRange: '6:00 - 12:00' },
  { id: 'afternoon', label: 'Afternoon', timeRange: '12:00 - 18:00' },
  { id: 'evening', label: 'Evening', timeRange: '18:00 - 22:00' },
];

export function TimeSlotGrid({
  dates,
  events,
  onEventClick,
  selectedDate,
}: TimeSlotGridProps) {
  const getEventsForSlot = (date: Date, timeWindow: string) => {
    return events.filter(
      (event) =>
        isSameDay(event.start, date) &&
        event.timeWindow?.toLowerCase() === timeWindow
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="min-w-[800px]">
        {/* Header row with dates */}
        <div className="sticky top-0 z-10 grid grid-cols-[80px_repeat(7,1fr)] border-b bg-background">
          <div className="border-r p-2" />
          {dates.map((date) => (
            <div
              key={date.toISOString()}
              className={cn(
                'border-r p-2 text-center',
                isToday(date) && 'bg-primary/5',
                selectedDate && isSameDay(date, selectedDate) && 'bg-accent'
              )}
            >
              <div className="text-xs text-muted-foreground">
                {format(date, 'EEE')}
              </div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  isToday(date) && 'text-primary'
                )}
              >
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time slot rows */}
        {TIME_SLOTS.map((slot) => (
          <div
            key={slot.id}
            className="grid grid-cols-[80px_repeat(7,1fr)] border-b"
          >
            {/* Time label */}
            <div className="border-r p-2 text-xs text-muted-foreground">
              <div className="font-medium">{slot.label}</div>
              <div className="opacity-70">{slot.timeRange}</div>
            </div>

            {/* Cells for each day */}
            {dates.map((date) => {
              const slotEvents = getEventsForSlot(date, slot.id);
              return (
                <div
                  key={`${date.toISOString()}-${slot.id}`}
                  className={cn(
                    'min-h-[100px] border-r p-1',
                    isToday(date) && 'bg-primary/5',
                    selectedDate && isSameDay(date, selectedDate) && 'bg-accent/50'
                  )}
                >
                  <div className="space-y-1">
                    {slotEvents.map((event) => (
                      <ScheduleEventBlock
                        key={event.id}
                        event={event}
                        onClick={onEventClick}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
