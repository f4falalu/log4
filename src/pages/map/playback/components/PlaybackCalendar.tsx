/**
 * PlaybackCalendar Component
 *
 * Shows a compact calendar view with delivery indicators:
 * - Dots on days with completed deliveries
 * - Click to filter batches by date
 * - Highlight selected date
 */

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaybackBatches } from '@/hooks/usePlaybackData';
import { cn } from '@/lib/utils';

interface PlaybackCalendarProps {
  onDateSelect?: (date: Date | null) => void;
  selectedDate?: Date | null;
}

export function PlaybackCalendar({ onDateSelect, selectedDate }: PlaybackCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: batches } = usePlaybackBatches();

  // Get dates with deliveries
  const deliveryDates = useMemo(() => {
    if (!batches) return new Set<string>();

    const dates = new Set<string>();
    batches.forEach((batch) => {
      if (batch.startTime) {
        const dateKey = batch.startTime.toISOString().split('T')[0];
        dates.add(dateKey);
      }
    });

    return dates;
  }, [batches]);

  // Get count of deliveries per date
  const deliveryCounts = useMemo(() => {
    if (!batches) return new Map<string, number>();

    const counts = new Map<string, number>();
    batches.forEach((batch) => {
      if (batch.startTime) {
        const dateKey = batch.startTime.toISOString().split('T')[0];
        counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
      }
    });

    return counts;
  }, [batches]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Previous month days to fill the first week
    const prevMonthDays = firstDayOfWeek;
    const prevMonth = new Date(year, month, 0);
    const prevMonthLastDay = prevMonth.getDate();

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      hasDeliveries: boolean;
      deliveryCount: number;
      isSelected: boolean;
      isToday: boolean;
    }[] = [];

    // Add previous month days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      const dateKey = date.toISOString().split('T')[0];
      days.push({
        date,
        isCurrentMonth: false,
        hasDeliveries: deliveryDates.has(dateKey),
        deliveryCount: deliveryCounts.get(dateKey) || 0,
        isSelected: selectedDate ? dateKey === selectedDate.toISOString().split('T')[0] : false,
        isToday: dateKey === new Date().toISOString().split('T')[0],
      });
    }

    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateKey = date.toISOString().split('T')[0];
      days.push({
        date,
        isCurrentMonth: true,
        hasDeliveries: deliveryDates.has(dateKey),
        deliveryCount: deliveryCounts.get(dateKey) || 0,
        isSelected: selectedDate ? dateKey === selectedDate.toISOString().split('T')[0] : false,
        isToday: dateKey === new Date().toISOString().split('T')[0],
      });
    }

    // Add next month days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateKey = date.toISOString().split('T')[0];
      days.push({
        date,
        isCurrentMonth: false,
        hasDeliveries: deliveryDates.has(dateKey),
        deliveryCount: deliveryCounts.get(dateKey) || 0,
        isSelected: selectedDate ? dateKey === selectedDate.toISOString().split('T')[0] : false,
        isToday: dateKey === new Date().toISOString().split('T')[0],
      });
    }

    return days;
  }, [currentMonth, deliveryDates, deliveryCounts, selectedDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDateClick = (day: typeof calendarDays[0]) => {
    if (day.hasDeliveries && onDateSelect) {
      // If clicking the same date, deselect it
      if (day.isSelected) {
        onDateSelect(null);
      } else {
        onDateSelect(day.date);
      }
    }
  };

  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="border-b bg-background p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Delivery History</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToday}
          className="h-7 text-xs"
        >
          Today
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{monthName}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground h-8 flex items-center justify-center"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              disabled={!day.hasDeliveries}
              className={cn(
                'relative h-8 text-xs rounded-md transition-colors flex flex-col items-center justify-center',
                day.isCurrentMonth
                  ? 'text-foreground'
                  : 'text-muted-foreground/40',
                day.hasDeliveries && 'hover:bg-muted cursor-pointer',
                !day.hasDeliveries && 'cursor-default',
                day.isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                day.isToday && !day.isSelected && 'border border-primary'
              )}
            >
              <span className="leading-none">{day.date.getDate()}</span>
              {day.hasDeliveries && !day.isSelected && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {/* Show up to 3 dots for delivery count */}
                  {Array.from({ length: Math.min(day.deliveryCount, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 w-1 rounded-full bg-primary"
                    />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Has deliveries</span>
        </div>
      </div>
    </div>
  );
}
