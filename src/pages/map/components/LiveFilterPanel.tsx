/**
 * LiveFilterPanel - Collapsible filter sidebar for Live Map
 * Uses shadcn Collapsible + Card patterns for solid, polished UI
 */

import { useState } from 'react';
import {
  Users, Truck, Package, Route, AlertTriangle, Search,
  Building2, Warehouse, MapPin, ChevronDown, ChevronRight, Filter,
} from 'lucide-react';
import { useLiveMapStore } from '@/stores/liveMapStore';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

function SectionHeader({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <CollapsibleTrigger asChild>
      <button className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:bg-accent hover:text-accent-foreground transition-colors">
        <span className="flex items-center gap-2">{children}</span>
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
    </CollapsibleTrigger>
  );
}

export function LiveFilterPanel() {
  const filters = useLiveMapStore((s) => s.filters);
  const toggleFilter = useLiveMapStore((s) => s.toggleFilter);
  const setStatusFilter = useLiveMapStore((s) => s.setStatusFilter);
  const setSearchQuery = useLiveMapStore((s) => s.setSearchQuery);
  const setFilter = useLiveMapStore((s) => s.setFilter);
  const resetFilters = useLiveMapStore((s) => s.resetFilters);

  const { counts } = useLiveTracking();

  const [entitiesOpen, setEntitiesOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  return (
    <div className="w-64 border-r bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-base">Live Tracking</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Filter map entities</p>
      </div>

      {/* Search */}
      <div className="p-3 border-b bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Entity Toggles */}
        <Collapsible open={entitiesOpen} onOpenChange={setEntitiesOpen}>
          <div className="border-b bg-card px-1 pt-2 pb-1">
            <SectionHeader open={entitiesOpen}>Show Entities</SectionHeader>
          </div>
          <CollapsibleContent>
            <div className="bg-card border-b px-3 pb-3 space-y-1">
              {/* Drivers */}
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-drivers"
                    checked={filters.showDrivers}
                    onCheckedChange={() => toggleFilter('showDrivers')}
                  />
                  <Label htmlFor="show-drivers" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Users className="h-4 w-4 text-blue-500" />
                    Drivers
                  </Label>
                </div>
                <Badge variant="secondary" className="text-xs h-5 min-w-[28px] justify-center">
                  {counts.drivers}
                </Badge>
              </div>

              {/* Vehicles */}
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-vehicles"
                    checked={filters.showVehicles}
                    onCheckedChange={() => toggleFilter('showVehicles')}
                  />
                  <Label htmlFor="show-vehicles" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Truck className="h-4 w-4 text-purple-500" />
                    Vehicles
                  </Label>
                </div>
                <Badge variant="secondary" className="text-xs h-5 min-w-[28px] justify-center">
                  {counts.vehicles}
                </Badge>
              </div>

              {/* Deliveries */}
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-deliveries"
                    checked={filters.showDeliveries}
                    onCheckedChange={() => toggleFilter('showDeliveries')}
                  />
                  <Label htmlFor="show-deliveries" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Package className="h-4 w-4 text-green-500" />
                    Deliveries
                  </Label>
                </div>
                <Badge variant="secondary" className="text-xs h-5 min-w-[28px] justify-center">
                  {counts.deliveries}
                </Badge>
              </div>

              {/* Routes */}
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-routes"
                    checked={filters.showRoutes}
                    onCheckedChange={() => toggleFilter('showRoutes')}
                  />
                  <Label htmlFor="show-routes" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Route className="h-4 w-4 text-orange-500" />
                    Routes
                  </Label>
                </div>
              </div>

              {/* Facilities */}
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-facilities"
                    checked={filters.showFacilities}
                    onCheckedChange={() => toggleFilter('showFacilities')}
                  />
                  <Label htmlFor="show-facilities" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Building2 className="h-4 w-4 text-emerald-500" />
                    Facilities
                  </Label>
                </div>
                <Badge variant="secondary" className="text-xs h-5 min-w-[28px] justify-center">
                  {counts.facilities}
                </Badge>
              </div>

              {/* Warehouses */}
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-warehouses"
                    checked={filters.showWarehouses}
                    onCheckedChange={() => toggleFilter('showWarehouses')}
                  />
                  <Label htmlFor="show-warehouses" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Warehouse className="h-4 w-4 text-violet-500" />
                    Warehouses
                  </Label>
                </div>
                <Badge variant="secondary" className="text-xs h-5 min-w-[28px] justify-center">
                  {counts.warehouses}
                </Badge>
              </div>

              {/* Zones */}
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-zones"
                    checked={filters.showZones}
                    onCheckedChange={() => toggleFilter('showZones')}
                  />
                  <Label htmlFor="show-zones" className="flex items-center gap-2 cursor-pointer text-sm">
                    <MapPin className="h-4 w-4 text-amber-500" />
                    Zones
                  </Label>
                </div>
                <Badge variant="secondary" className="text-xs h-5 min-w-[28px] justify-center">
                  {counts.zones}
                </Badge>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Status Filter */}
        <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
          <div className="border-b bg-card px-1 pt-2 pb-1">
            <SectionHeader open={statusOpen}>Status Filter</SectionHeader>
          </div>
          <CollapsibleContent>
            <div className="bg-card border-b px-3 pb-3 space-y-2">
              <Select
                value={filters.statusFilter}
                onValueChange={(value) => setStatusFilter(value as DriverStatus | 'all')}
              >
                <SelectTrigger className="h-8 text-sm">
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

              {counts.activeDrivers > 0 && (
                <div className="flex items-center gap-2 text-sm px-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{counts.activeDrivers} actively driving</span>
                </div>
              )}
              {counts.delayedDrivers > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive px-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{counts.delayedDrivers} delayed</span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Vehicle Type Filter */}
        <Collapsible open={vehicleOpen} onOpenChange={setVehicleOpen}>
          <div className="border-b bg-card px-1 pt-2 pb-1">
            <SectionHeader open={vehicleOpen}>Vehicle Type</SectionHeader>
          </div>
          <CollapsibleContent>
            <div className="bg-card border-b px-3 pb-3">
              <Select
                value={filters.vehicleTypeFilter}
                onValueChange={(value) => setFilter('vehicleTypeFilter', value)}
              >
                <SelectTrigger className="h-8 text-sm">
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
          </CollapsibleContent>
        </Collapsible>

        {/* Priority Filter */}
        <Collapsible open={priorityOpen} onOpenChange={setPriorityOpen}>
          <div className="border-b bg-card px-1 pt-2 pb-1">
            <SectionHeader open={priorityOpen}>Priority</SectionHeader>
          </div>
          <CollapsibleContent>
            <div className="bg-card border-b px-3 pb-3">
              <Select
                value={filters.priorityFilter}
                onValueChange={(value) => setFilter('priorityFilter', value)}
              >
                <SelectTrigger className="h-8 text-sm">
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
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Footer actions */}
      <div className="p-3 border-t bg-card">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-sm"
          onClick={resetFilters}
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
