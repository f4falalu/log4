// MOD4 Delivery Calendar
// Calendar widget showing delivery history and scheduled deliveries

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { DayPicker, DayProps } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCalendarStore } from '@/stores/calendarStore';
import { CalendarLegend } from './CalendarLegend';
import { DayDeliveries } from './DayDeliveries';

export function DeliveryCalendar() {
  const {
    currentMonth,
    selectedDate,
    summaryMap,
    isLoading,
    setCurrentMonth,
    selectDate,
    loadMonthData
  } = useCalendarStore();

  useEffect(() => {
    loadMonthData(currentMonth);
  }, [loadMonthData, currentMonth]);

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const handleDayClick = (day: Date) => {
    if (selectedDate && isSameDay(day, selectedDate)) {
      selectDate(null);
    } else {
      selectDate(day);
    }
  };

  // Custom day renderer with delivery badges
  const renderDay = (props: DayProps) => {
    const { date, displayMonth } = props;
    const dateKey = format(date, 'yyyy-MM-dd');
    const summary = summaryMap.get(dateKey);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isPast = isBefore(date, startOfDay(new Date()));
    const today = isToday(date);
    const isCurrentMonth = date.getMonth() === displayMonth.getMonth();

    // Determine badge color based on delivery status
    let badgeColor = '';
    let badgeText = '';
    
    if (summary && summary.total > 0) {
      if (isPast || today) {
        // Past: color based on completion
        if (summary.failed > 0 || summary.skipped > 0) {
          badgeColor = summary.completed > 0 ? 'bg-warning' : 'bg-destructive';
        } else {
          badgeColor = 'bg-success';
        }
      } else {
        // Future: scheduled (blue/cyan)
        badgeColor = 'bg-accent';
      }
      badgeText = String(summary.total);
    }

    return (
      <button
        onClick={() => handleDayClick(date)}
        className={cn(
          "relative flex flex-col items-center justify-center w-10 h-12 rounded-lg transition-all",
          !isCurrentMonth && "opacity-30",
          isSelected && "bg-primary text-primary-foreground",
          !isSelected && today && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          !isSelected && !today && "hover:bg-secondary"
        )}
      >
        <span className={cn(
          "text-sm font-medium",
          isSelected && "font-bold"
        )}>
          {date.getDate()}
        </span>
        
        {summary && summary.total > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "absolute -bottom-0.5 flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold",
              badgeColor,
              isSelected ? "text-primary-foreground bg-background/30" : ""
            )}
          >
            {badgeText}
          </motion.div>
        )}
        
        {today && !isSelected && (
          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Calendar Card */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Delivery Calendar
          </h3>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const prev = new Date(currentMonth);
                prev.setMonth(prev.getMonth() - 1);
                handleMonthChange(prev);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <span className="text-sm font-medium min-w-[100px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const next = new Date(currentMonth);
                next.setMonth(next.getMonth() + 1);
                handleMonthChange(next);
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[280px]">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DayPicker
              mode="single"
              month={currentMonth}
              onMonthChange={handleMonthChange}
              selected={selectedDate ?? undefined}
              showOutsideDays
              className="pointer-events-auto"
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "hidden",
                nav: "hidden",
                table: "w-full border-collapse",
                head_row: "flex justify-between mb-2",
                head_cell: "text-muted-foreground text-xs font-medium w-10 text-center",
                row: "flex justify-between mt-1",
                cell: "text-center p-0",
                day: "hidden",
              }}
              components={{
                Day: renderDay,
              }}
            />
          )}
        </div>

        {/* Legend */}
        <CalendarLegend />
      </div>

      {/* Selected Day Deliveries */}
      {selectedDate && (
        <DayDeliveries date={selectedDate} />
      )}
    </motion.div>
  );
}
