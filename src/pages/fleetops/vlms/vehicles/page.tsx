/**
 * Vehicles Page - Multi-View with Collapsible Sidebar
 * Redesigned with BIKO branding and improved spacing
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVehicles, useDeleteVehicle } from '@/hooks/vlms/useVehicles';
import { useVehiclesStore } from '@/stores/vlms/vehiclesStore';
import { VehicleConfiguratorDialog } from '@/components/vlms/vehicles/VehicleConfiguratorDialog';
import { VehicleFilters } from '@/components/vlms/vehicles/VehicleFilters';
import { VehicleViewToggle } from '@/components/vlms/vehicles/VehicleViewToggle';
import { VehicleGridView } from '@/components/vlms/vehicles/VehicleGridView';
import { VehicleListView } from '@/components/vlms/vehicles/VehicleListView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreVertical, Eye, Edit, Trash2, Loader2, ChevronRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusColors } from '@/lib/designTokens';
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';
import { EmptyState } from '@/components/ui/empty-state';
import type { Database } from '@/integrations/supabase/types';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];

export default function VehiclesPage() {
  const navigate = useNavigate();
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Store state
  const filters = useVehiclesStore((state) => state.filters);
  const setFilters = useVehiclesStore((state) => state.setFilters);
  const clearFilters = useVehiclesStore((state) => state.clearFilters);
  const viewMode = useVehiclesStore((state) => state.viewMode);
  const setViewMode = useVehiclesStore((state) => state.setViewMode);
  const sidebarCollapsed = useVehiclesStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useVehiclesStore((state) => state.toggleSidebar);

  const { data: vehicles, isLoading } = useVehicles(filters);
  const deleteVehicle = useDeleteVehicle();

  // Handlers
  const handleView = (vehicle: Vehicle) => {
    navigate(`/fleetops/vlms/vehicles/${vehicle.id}`);
  };

  const handleEdit = (vehicle: Vehicle) => {
    navigate(`/fleetops/vlms/vehicles/${vehicle.id}/edit`);
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (confirm(`Are you sure you want to delete vehicle ${vehicle.vehicle_id}?`)) {
      await deleteVehicle.mutateAsync(vehicle.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = getStatusColors(
      status as 'available' | 'in_use' | 'maintenance' | 'out_of_service'
    );

    const labels: Record<string, string> = {
      available: 'Available',
      in_use: 'In Use',
      maintenance: 'Maintenance',
      out_of_service: 'Out of Service',
      disposed: 'Disposed',
    };

    return (
      <Badge
        className={cn(
          'text-xs',
          statusColors.bg,
          statusColors.text,
          statusColors.border,
          'border'
        )}
      >
        {labels[status] || status}
      </Badge>
    );
  };

  // Filter vehicles by search query client-side
  const filteredVehicles = vehicles?.filter((vehicle) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      vehicle.make?.toLowerCase().includes(query) ||
      vehicle.model?.toLowerCase().includes(query) ||
      vehicle.license_plate?.toLowerCase().includes(query) ||
      vehicle.vehicle_id?.toLowerCase().includes(query)
    );
  });

  // Pagination
  const PAGE_SIZE = 50;
  const pagination = usePagination({
    pageSize: PAGE_SIZE,
    totalItems: filteredVehicles?.length || 0,
  });

  // Paginated vehicles
  const paginatedVehicles = filteredVehicles?.slice(
    pagination.startIndex,
    pagination.endIndex
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-card px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Vehicle Management
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Manage your fleet vehicles
            </p>
          </div>
          <div className="flex items-center gap-3">
            <VehicleViewToggle value={viewMode} onValueChange={setViewMode} />
            <Button onClick={() => setIsConfiguratorOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        </div>
      </div>

      {/* Vehicle Configurator Dialog */}
      <VehicleConfiguratorDialog
        open={isConfiguratorOpen}
        onOpenChange={setIsConfiguratorOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filter Sidebar - Collapsible */}
        <aside
          className={cn(
            'border-r border-border bg-card transition-all duration-300 flex-shrink-0 overflow-y-auto',
            sidebarCollapsed ? 'w-0 border-r-0' : 'w-80'
          )}
        >
          {!sidebarCollapsed && (
            <div className="h-full p-4">
              <VehicleFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
                onCollapse={toggleSidebar}
              />
            </div>
          )}
        </aside>

        {/* Expand Sidebar Button - Shows when collapsed */}
        {sidebarCollapsed && (
          <div className="flex-shrink-0 border-r border-border bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="m-2"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="border-b border-border bg-card px-6 py-3 flex-shrink-0">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Quick search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>

          {/* Content - List/Card/Table Views */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Loading vehicles...</p>
                </div>
              </div>
            ) : filteredVehicles && filteredVehicles.length > 0 ? (
              <div className="flex flex-col gap-6 h-full">
                <div className="flex-1">
                  {/* List View */}
                  {viewMode === 'list' && (
                    <VehicleListView
                      vehicles={paginatedVehicles || []}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )}

                  {/* Card/Grid View */}
                  {viewMode === 'card' && (
                    <VehicleGridView
                      vehicles={paginatedVehicles || []}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )}

                  {/* Table View */}
                  {viewMode === 'table' && (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Vehicle ID
                            </TableHead>
                            <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Make / Model
                            </TableHead>
                            <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              License Plate
                            </TableHead>
                            <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Type
                            </TableHead>
                            <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Status
                            </TableHead>
                            <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Location
                            </TableHead>
                            <TableHead className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Mileage
                            </TableHead>
                            <TableHead className="py-4 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedVehicles?.map((vehicle) => (
                          <TableRow
                            key={vehicle.id}
                            className="hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => handleView(vehicle)}
                          >
                            <TableCell className="py-5 px-4 font-medium font-mono text-sm">
                              {vehicle.vehicle_id}
                            </TableCell>
                            <TableCell className="py-5 px-4">
                              <div>
                                <div className="font-medium text-foreground">
                                  {vehicle.make} {vehicle.model}
                                </div>
                                <div className="text-sm text-muted-foreground">{vehicle.year}</div>
                              </div>
                            </TableCell>
                            <TableCell className="py-5 px-4">
                              <div className="font-mono text-sm">{vehicle.license_plate}</div>
                            </TableCell>
                            <TableCell className="py-5 px-4 capitalize">
                              {vehicle.type?.replace('_', ' ') || '-'}
                            </TableCell>
                            <TableCell className="py-5 px-4">{getStatusBadge(vehicle.status)}</TableCell>
                            <TableCell className="py-5 px-4">
                              {vehicle.current_location?.name || (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="py-5 px-4">
                              <span className="text-sm">
                                {vehicle.current_mileage?.toLocaleString() || '0'} km
                              </span>
                            </TableCell>
                            <TableCell className="py-5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Vehicle actions">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleView(vehicle)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDelete(vehicle)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <PaginationControls
                    {...pagination}
                    isLoading={isLoading}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  icon={Package}
                  title="No vehicles found"
                  description={
                    searchQuery
                      ? 'No vehicles match your current search or filters. Try adjusting your criteria.'
                      : 'Get started by adding your first vehicle to the fleet.'
                  }
                  action={
                    <Button onClick={() => setIsConfiguratorOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Vehicle
                    </Button>
                  }
                  variant="dashed"
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
