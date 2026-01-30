import { useState } from 'react';
import { Plus, Search, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import type { RequisitionStatus } from '@/types/requisitions';

interface RequisitionsHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  warehouseFilter: string;
  onWarehouseChange: (value: string) => void;
  warehouses: { id: string; name: string }[];
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onNewRequisition: () => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

export function RequisitionsHeader({
  searchTerm,
  onSearchChange,
  warehouseFilter,
  onWarehouseChange,
  warehouses,
  dateRange,
  onDateRangeChange,
  onNewRequisition,
  activeFiltersCount,
  onClearFilters,
}: RequisitionsHeaderProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  return (
    <div className="border-b bg-background">
      {/* Row 1: Title and CTA */}
      <div className="h-14 px-4 flex items-center justify-between border-b">
        <div>
          <h1 className="text-xl font-semibold">Requisitions</h1>
        </div>
        <Button onClick={onNewRequisition}>
          <Plus className="h-4 w-4 mr-2" />
          New Requisition
        </Button>
      </div>

      {/* Row 2: Filters */}
      <div className="h-14 px-4 flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requisitions..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Warehouse filter */}
        <Select value={warehouseFilter} onValueChange={onWarehouseChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range picker */}
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                onDateRangeChange(range);
                if (range?.to) setDatePickerOpen(false);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Active filters badge */}
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="cursor-pointer" onClick={onClearFilters}>
            {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
            <span className="ml-1">&times;</span>
          </Badge>
        )}
      </div>
    </div>
  );
}
