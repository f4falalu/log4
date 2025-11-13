/**
 * =====================================================
 * Scheduler Control Bar Component
 * =====================================================
 * Top control bar with filters and action buttons
 */

import { Search, Plus, Calendar, MapPin, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SchedulerFilters } from '@/types/scheduler';

interface SchedulerControlBarProps {
  filters: SchedulerFilters;
  onFiltersChange: (filters: SchedulerFilters) => void;
  onNewSchedule: () => void;
}

export function SchedulerControlBar({
  filters,
  onFiltersChange,
  onNewSchedule,
}: SchedulerControlBarProps) {
  return (
    <div className="flex h-16 items-center gap-3 border-b bg-white px-6">
      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search batches..."
          className="pl-9"
          value={filters.search || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
        />
      </div>

      {/* Warehouse Filter */}
      <Select
        value={filters.warehouse_id || 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            warehouse_id: value === 'all' ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-48">
          <Warehouse className="mr-2 h-4 w-4" />
          <SelectValue placeholder="All Warehouses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Warehouses</SelectItem>
          <SelectItem value="wh-1">Main Warehouse</SelectItem>
          <SelectItem value="wh-2">North Hub</SelectItem>
          <SelectItem value="wh-3">South Hub</SelectItem>
        </SelectContent>
      </Select>

      {/* Zone Filter */}
      <Select
        value={filters.zone?.[0] || 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            zone: value === 'all' ? undefined : [value as any],
          })
        }
      >
        <SelectTrigger className="w-40">
          <MapPin className="mr-2 h-4 w-4" />
          <SelectValue placeholder="All Zones" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Zones</SelectItem>
          <SelectItem value="North">North</SelectItem>
          <SelectItem value="South">South</SelectItem>
          <SelectItem value="East">East</SelectItem>
          <SelectItem value="West">West</SelectItem>
          <SelectItem value="Central">Central</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Button variant="outline" size="sm">
        <Calendar className="mr-2 h-4 w-4" />
        Select Date
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* New Schedule Button */}
      <Button onClick={onNewSchedule} className="gap-2">
        <Plus className="h-4 w-4" />
        New Schedule
      </Button>
    </div>
  );
}
