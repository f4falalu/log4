import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVehicles, useCreateVehicle, useDeleteVehicle } from '@/hooks/vlms/useVehicles';
import { useVehiclesStore } from '@/stores/vlms/vehiclesStore';
import { VehicleForm } from '@/components/vlms/vehicles/VehicleForm';
import { VehicleConfiguratorDialog } from '@/components/vlms/vehicles/VehicleConfiguratorDialog';
import { VehicleFilters } from '@/components/vlms/vehicles/VehicleFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card } from '@/components/ui/card';
import { Plus, Search, MoreVertical, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import { VehicleFormData, VehicleFilters as VehicleFiltersType } from '@/types/vlms';
import { toast } from 'sonner';

export default function VehiclesPage() {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filters = useVehiclesStore((state) => state.filters);
  const setFilters = useVehiclesStore((state) => state.setFilters);
  const clearFilters = useVehiclesStore((state) => state.clearFilters);

  const { data: vehicles, isLoading } = useVehicles(filters);
  const createVehicle = useCreateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const handleCreateVehicle = async (data: VehicleFormData) => {
    await createVehicle.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleDeleteVehicle = async (id: string, vehicleId: string) => {
    if (confirm(`Are you sure you want to delete vehicle ${vehicleId}?`)) {
      await deleteVehicle.mutateAsync(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      available: { variant: 'default', label: 'Available' },
      in_use: { variant: 'secondary', label: 'In Use' },
      maintenance: { variant: 'outline', label: 'Maintenance' },
      out_of_service: { variant: 'destructive', label: 'Out of Service' },
      disposed: { variant: 'outline', label: 'Disposed' },
    };

    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vehicle Management</h1>
          <p className="text-muted-foreground">Manage your fleet vehicles</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsConfiguratorOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Vehicle Configurator Dialog */}
      <VehicleConfiguratorDialog
        open={isConfiguratorOpen}
        onOpenChange={setIsConfiguratorOpen}
      />

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Filters Sidebar */}
        <div className="col-span-3">
          <VehicleFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
          />
        </div>

        {/* Vehicles Table */}
        <div className="col-span-9">
          <Card>
            {/* Search Bar */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Quick search vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredVehicles && filteredVehicles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle ID</TableHead>
                    <TableHead>Make / Model</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Mileage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.vehicle_id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-sm text-muted-foreground">{vehicle.year}</div>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.license_plate}</TableCell>
                      <TableCell className="capitalize">
                        {vehicle.type?.replace('_', ' ') || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                      <TableCell>
                        {vehicle.current_location?.name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.current_mileage?.toLocaleString()} km
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/fleetops/vlms/vehicles/${vehicle.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/fleetops/vlms/vehicles/${vehicle.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteVehicle(vehicle.id, vehicle.vehicle_id)}
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
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No vehicles found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Vehicle
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Create Vehicle Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Enter the vehicle information. Required fields are marked with *
            </DialogDescription>
          </DialogHeader>
          <VehicleForm
            onSubmit={handleCreateVehicle}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createVehicle.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
