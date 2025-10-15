import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useVehicles } from '@/hooks/useVehicles';
import { useVehicleManagement, VehicleFormData } from '@/hooks/useVehicleManagement';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Edit, Trash2, Truck, LayoutGrid, List, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { VehicleGridView } from '@/components/vehicle/VehicleGridView';
import { VehicleImageUpload } from '@/components/vehicle/VehicleImageUpload';
import { VehicleTypeManager } from '@/components/vehicle/VehicleTypeManager';

const VehicleManagement = () => {
  const { data: vehicles = [], isLoading } = useVehicles();
  const { createVehicle, updateVehicle, deleteVehicle, isCreating, isUpdating } = useVehicleManagement();
  const { vehicleTypes } = useVehicleTypes();
  const { hasPermission } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [formData, setFormData] = useState<VehicleFormData>({
    type: 'van',
    model: '',
    plate_number: '',
    capacity: 10,
    max_weight: 1000,
    fuel_type: 'diesel',
    fuel_efficiency: 12,
    avg_speed: 50
  });

  const canManage = hasPermission('manage_vehicles');

  const resetForm = () => {
    setFormData({
      type: 'van',
      model: '',
      plate_number: '',
      capacity: 10,
      max_weight: 1000,
      fuel_type: 'diesel',
      fuel_efficiency: 12,
      avg_speed: 50
    });
    setEditingVehicle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManage) {
      toast.error('You do not have permission to manage vehicles');
      return;
    }

    if (editingVehicle) {
      updateVehicle({ id: editingVehicle.id, data: formData });
    } else {
      createVehicle(formData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      type: vehicle.type,
      model: vehicle.model,
      plate_number: vehicle.plateNumber,
      capacity: vehicle.capacity,
      max_weight: vehicle.maxWeight,
      fuel_type: vehicle.fuelType,
      fuel_efficiency: vehicle.fuelEfficiency,
      avg_speed: vehicle.avgSpeed,
      photo_url: vehicle.photo_url,
      thumbnail_url: vehicle.thumbnail_url,
      ai_generated: vehicle.ai_generated
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canManage) {
      toast.error('You do not have permission to manage vehicles');
      return;
    }
    
    if (confirm('Are you sure you want to delete this vehicle?')) {
      deleteVehicle(id);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading vehicles...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vehicle Management</h1>
          <p className="text-muted-foreground">Manage your delivery fleet</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                <DialogDescription>
                  {editingVehicle ? 'Update vehicle information' : 'Enter vehicle details'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <VehicleImageUpload
                    vehicleType={formData.type}
                    model={formData.model}
                    plateNumber={formData.plate_number}
                    currentPhotoUrl={formData.photo_url}
                    onImageGenerated={(photoUrl, thumbnailUrl, aiGenerated) => {
                      setFormData({
                        ...formData,
                        photo_url: photoUrl,
                        thumbnail_url: thumbnailUrl,
                        ai_generated: aiGenerated,
                      });
                    }}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="type">Vehicle Type</Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setTypeManagerOpen(true)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                      <Select
                        value={formData.type}
                        onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes?.map((type) => (
                            <SelectItem key={type.name} value={type.name}>
                              {type.icon_name} {type.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plate_number">Plate Number</Label>
                    <Input
                      id="plate_number"
                      value={formData.plate_number}
                      onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel_type">Fuel Type</Label>
                    <Select
                      value={formData.fuel_type}
                      onValueChange={(value: any) => setFormData({ ...formData, fuel_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="petrol">Petrol</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (m³)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      step="0.1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_weight">Max Weight (kg)</Label>
                    <Input
                      id="max_weight"
                      type="number"
                      value={formData.max_weight}
                      onChange={(e) => setFormData({ ...formData, max_weight: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel_efficiency">Fuel Efficiency (km/L)</Label>
                    <Input
                      id="fuel_efficiency"
                      type="number"
                      step="0.1"
                      value={formData.fuel_efficiency}
                      onChange={(e) => setFormData({ ...formData, fuel_efficiency: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avg_speed">Average Speed (km/h)</Label>
                    <Input
                      id="avg_speed"
                      type="number"
                      value={formData.avg_speed}
                      onChange={(e) => setFormData({ ...formData, avg_speed: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {editingVehicle ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <VehicleGridView 
          vehicles={vehicles} 
          onVehicleClick={handleEdit}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Fleet Overview</CardTitle>
            <CardDescription>Total: {vehicles.length} vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Plate Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Fuel Type</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      {vehicle.model}
                    </div>
                  </TableCell>
                  <TableCell>{vehicle.plateNumber}</TableCell>
                  <TableCell className="capitalize">{vehicle.type}</TableCell>
                  <TableCell>
                    <Badge variant={
                      vehicle.status === 'available' ? 'default' :
                      vehicle.status === 'in-use' ? 'secondary' : 'outline'
                    }>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{vehicle.capacity} m³</div>
                      <div className="text-muted-foreground">{vehicle.maxWeight} kg</div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{vehicle.fuelType}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(vehicle)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(vehicle.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      <VehicleTypeManager 
        open={typeManagerOpen} 
        onOpenChange={setTypeManagerOpen}
      />
    </div>
  );
};

export default VehicleManagement;
