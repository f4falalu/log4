import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ScheduleHeaderProps {
  selectedWarehouse?: string;
  onWarehouseChange: (value: string) => void;
  selectedDate?: Date;
  onDateChange: (date: Date | undefined) => void;
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
  warehouses: Array<{ id: string; name: string }>;
  onSearch: () => void;
  onCreateNew: () => void;
}

export function ScheduleHeader({
  selectedWarehouse,
  onWarehouseChange,
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  warehouses,
  onSearch,
  onCreateNew
}: ScheduleHeaderProps) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4 p-4">
        {/* Warehouse Select */}
        <Select value={selectedWarehouse} onValueChange={onWarehouseChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[240px] justify-start text-left font-normal',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* View Mode Toggle */}
        <div className="flex items-center border rounded-lg">
          <Button
            size="sm"
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('day')}
            className="rounded-r-none"
          >
            Day
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('week')}
            className="rounded-none border-x"
          >
            Week
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('month')}
            className="rounded-l-none"
          >
            Month
          </Button>
        </div>

        {/* Search Button */}
        <Button onClick={onSearch}>
          <Search className="mr-2 h-4 w-4" />
          Search Schedules
        </Button>

        <div className="flex-1" />

        {/* Create New Button */}
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Schedule
        </Button>
      </div>
    </div>
  );
}
