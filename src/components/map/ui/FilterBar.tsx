import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, MapPin, Layers, Filter } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HEIGHT } from '@/lib/mapDesignSystem';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  selectedDate?: Date;
  selectedZone?: string | null;
  selectedFleet?: string | null;
  onDateChange?: (date: Date) => void;
  onZoneChange?: (zone: string | null) => void;
  onFleetChange?: (fleet: string | null) => void;
}

export function FilterBar({
  selectedDate = new Date(),
  selectedZone = null,
  selectedFleet = null,
  onDateChange,
  onZoneChange,
  onFleetChange,
}: FilterBarProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (compareDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (compareDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={cn(
      HEIGHT.filterBar,
      'bg-muted/30 border-b border-border px-6 flex items-center gap-4 flex-shrink-0'
    )}>
      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 font-normal justify-start"
            >
              {formatDate(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange?.(date);
                  setDatePickerOpen(false);
                }
              }}
              initialFocus
            />
            <div className="border-t p-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onDateChange?.(new Date());
                  setDatePickerOpen(false);
                }}
                className="flex-1"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  onDateChange?.(yesterday);
                  setDatePickerOpen(false);
                }}
                className="flex-1"
              >
                Yesterday
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Zone Filter */}
      <Select value={selectedZone || 'all'} onValueChange={(value) => onZoneChange?.(value === 'all' ? null : value)}>
        <SelectTrigger className="h-8 w-[160px] bg-background/50">
          <MapPin className="h-4 w-4 mr-2" />
          <SelectValue placeholder="All Zones" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Zones</SelectItem>
          <SelectItem value="north">North Zone</SelectItem>
          <SelectItem value="south">South Zone</SelectItem>
          <SelectItem value="east">East Zone</SelectItem>
          <SelectItem value="west">West Zone</SelectItem>
        </SelectContent>
      </Select>

      {/* Fleet Filter */}
      <Select value={selectedFleet || 'all'} onValueChange={(value) => onFleetChange?.(value === 'all' ? null : value)}>
        <SelectTrigger className="h-8 w-[160px] bg-background/50">
          <Layers className="h-4 w-4 mr-2" />
          <SelectValue placeholder="All Fleets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Fleets</SelectItem>
          <SelectItem value="primary">Primary Fleet</SelectItem>
          <SelectItem value="backup">Backup Fleet</SelectItem>
          <SelectItem value="contracted">Contracted</SelectItem>
        </SelectContent>
      </Select>

      {/* More Filters Button */}
      <Button variant="ghost" size="sm" className="h-8 px-3 ml-auto">
        <Filter className="h-4 w-4 mr-2" />
        More Filters
      </Button>
    </div>
  );
}
