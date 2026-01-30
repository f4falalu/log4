/**
 * Calendar Header Component
 * Navigation and view mode controls for the calendar
 */

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CalendarViewMode } from '../../types';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
}: CalendarHeaderProps) {
  const handlePrevious = () => {
    if (viewMode === 'week') {
      onDateChange(subWeeks(currentDate, 1));
    } else if (viewMode === 'month') {
      onDateChange(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      onDateChange(addWeeks(currentDate, 1));
    } else if (viewMode === 'month') {
      onDateChange(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getTitle = () => {
    if (viewMode === 'week') {
      return format(currentDate, "'Week of' MMM d, yyyy");
    }
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select
          value={viewMode}
          onValueChange={(value) => onViewModeChange(value as CalendarViewMode)}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
