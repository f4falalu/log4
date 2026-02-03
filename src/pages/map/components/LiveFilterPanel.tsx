/**
 * LiveFilterPanel - Multi-select filter sidebar for Live Map
 */

import { Users, Truck, Package, Route, AlertTriangle, Search } from 'lucide-react';
import { useLiveMapStore } from '@/stores/liveMapStore';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DriverStatus } from '@/types/live-map';

const statusOptions: { value: DriverStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'EN_ROUTE', label: 'En Route' },
  { value: 'AT_STOP', label: 'At Stop' },
  { value: 'DELAYED', label: 'Delayed' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function LiveFilterPanel() {
  const filters = useLiveMapStore((s) => s.filters);
  const toggleFilter = useLiveMapStore((s) => s.toggleFilter);
  const setStatusFilter = useLiveMapStore((s) => s.setStatusFilter);
  const setSearchQuery = useLiveMapStore((s) => s.setSearchQuery);
  const setFilter = useLiveMapStore((s) => s.setFilter);
  const resetFilters = useLiveMapStore((s) => s.resetFilters);

  const { counts } = useLiveTracking();

  return (
    <div className="w-64 border-r bg-background/95 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Live Tracking</h2>
        <p className="text-sm text-muted-foreground">Filter map entities</p>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Separator />

      {/* Entity Toggles */}
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Show Entities
        </h3>

        <div className="space-y-3">
          {/* Drivers toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-drivers"
                checked={filters.showDrivers}
                onCheckedChange={() => toggleFilter('showDrivers')}
              />
              <Label
                htmlFor="show-drivers"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-4 w-4 text-blue-500" />
                Drivers
              </Label>
            </div>
            <Badge variant="secondary" className="text-xs">
              {counts.drivers}
            </Badge>
          </div>

          {/* Vehicles toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-vehicles"
                checked={filters.showVehicles}
                onCheckedChange={() => toggleFilter('showVehicles')}
              />
              <Label
                htmlFor="show-vehicles"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Truck className="h-4 w-4 text-purple-500" />
                Vehicles
              </Label>
            </div>
            <Badge variant="secondary" className="text-xs">
              {counts.vehicles}
            </Badge>
          </div>

          {/* Deliveries toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-deliveries"
                checked={filters.showDeliveries}
                onCheckedChange={() => toggleFilter('showDeliveries')}
              />
              <Label
                htmlFor="show-deliveries"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Package className="h-4 w-4 text-green-500" />
                Deliveries
              </Label>
            </div>
            <Badge variant="secondary" className="text-xs">
              {counts.deliveries}
            </Badge>
          </div>

          {/* Routes toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-routes"
                checked={filters.showRoutes}
                onCheckedChange={() => toggleFilter('showRoutes')}
              />
              <Label
                htmlFor="show-routes"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Route className="h-4 w-4 text-orange-500" />
                Routes
              </Label>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Status Filter */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Status Filter
        </h3>

        <Select
          value={filters.statusFilter}
          onValueChange={(value) => setStatusFilter(value as DriverStatus | 'all')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Quick stats */}
        {counts.activeDrivers > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span>{counts.activeDrivers} actively driving</span>
          </div>
        )}
        {counts.delayedDrivers > 0 && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-3 w-3" />
            <span>{counts.delayedDrivers} delayed</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Vehicle Type Filter */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Vehicle Type
        </h3>
        <Select
          value={filters.vehicleTypeFilter}
          onValueChange={(value) => setFilter('vehicleTypeFilter', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Vehicles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vehicle Types</SelectItem>
            <SelectItem value="truck">Trucks</SelectItem>
            <SelectItem value="van">Vans</SelectItem>
            <SelectItem value="bike">Bikes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Priority Filter */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Priority
        </h3>
        <Select
          value={filters.priorityFilter}
          onValueChange={(value) => setFilter('priorityFilter', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer actions */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={resetFilters}
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
