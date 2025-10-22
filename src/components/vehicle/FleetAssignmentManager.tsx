import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Truck, Building2, Filter, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useVehicles } from '@/hooks/useVehicles';
import { useFleets } from '@/hooks/useFleets';
import { useVehicleManagement } from '@/hooks/useVehicleManagement';

interface FleetAssignmentManagerProps {
  onAssignmentComplete?: () => void;
}

export function FleetAssignmentManager({ onAssignmentComplete }: FleetAssignmentManagerProps) {
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const { data: fleets = [], isLoading: fleetsLoading } = useFleets();
  const { updateVehicle } = useVehicleManagement();

  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [targetFleetId, setTargetFleetId] = useState<string>('');
  const [filterFleetId, setFilterFleetId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Filter vehicles based on current filters
  const filteredVehicles = vehicles.filter(vehicle => {
    if (filterFleetId !== 'all' && (vehicle as any).fleet_id !== filterFleetId) return false;
    if (filterStatus !== 'all' && vehicle.status !== filterStatus) return false;
    return true;
  });

  const unassignedVehicles = vehicles.filter(v => !(v as any).fleet_id);
  const assignedVehicles = vehicles.filter(v => (v as any).fleet_id);

  const handleSelectVehicle = (vehicleId: string, checked: boolean) => {
    const newSelected = new Set(selectedVehicles);
    if (checked) {
      newSelected.add(vehicleId);
    } else {
      newSelected.delete(vehicleId);
    }
    setSelectedVehicles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVehicles(new Set(filteredVehicles.map(v => v.id)));
    } else {
      setSelectedVehicles(new Set());
    }
  };

  const handleBulkAssignment = async () => {
    if (selectedVehicles.size === 0) {
      toast.error('Please select vehicles to assign');
      return;
    }

    if (!targetFleetId) {
      toast.error('Please select a target fleet');
      return;
    }

    try {
      const updatePromises = Array.from(selectedVehicles).map(vehicleId =>
        new Promise((resolve, reject) => {
          updateVehicle(
            { id: vehicleId, data: { fleet_id: targetFleetId } },
            { onSuccess: resolve, onError: reject }
          );
        })
      );

      await Promise.all(updatePromises);

      setSelectedVehicles(new Set());
      setTargetFleetId('');
      setIsAssignDialogOpen(false);
      onAssignmentComplete?.();
      
      toast.success(`Successfully assigned ${selectedVehicles.size} vehicles to fleet`);
    } catch (error) {
      console.error('Bulk assignment error:', error);
      toast.error('Failed to assign vehicles to fleet');
    }
  };

  const handleRemoveFromFleet = (vehicleId: string) => {
    updateVehicle(
      { id: vehicleId, data: { fleet_id: null } },
      { 
        onSuccess: () => toast.success('Vehicle removed from fleet'),
        onError: () => toast.error('Failed to remove vehicle from fleet')
      }
    );
  };

  const getFleetName = (fleetId: string) => {
    const fleet = fleets.find(f => f.id === fleetId);
    return fleet?.name || 'Unknown Fleet';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-use': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (vehiclesLoading || fleetsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Loading fleet assignment data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{vehicles.length}</p>
                <p className="text-sm text-muted-foreground">Total Vehicles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{assignedVehicles.length}</p>
                <p className="text-sm text-muted-foreground">Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{unassignedVehicles.length}</p>
                <p className="text-sm text-muted-foreground">Unassigned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{selectedVehicles.size}</p>
                <p className="text-sm text-muted-foreground">Selected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Fleet:</Label>
              <Select value={filterFleetId} onValueChange={setFilterFleetId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fleets</SelectItem>
                  <SelectItem value="">Unassigned</SelectItem>
                  {fleets.map(fleet => (
                    <SelectItem key={fleet.id} value={fleet.id}>
                      {fleet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in-use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  disabled={selectedVehicles.size === 0}
                  className="ml-auto"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign to Fleet ({selectedVehicles.size})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Fleet Assignment</DialogTitle>
                  <DialogDescription>
                    Assign {selectedVehicles.size} selected vehicles to a fleet
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Target Fleet</Label>
                    <Select value={targetFleetId} onValueChange={setTargetFleetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fleet" />
                      </SelectTrigger>
                      <SelectContent>
                        {fleets.map(fleet => (
                          <SelectItem key={fleet.id} value={fleet.id}>
                            <div className="flex flex-col">
                              <span>{fleet.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {fleet.vehicle_count || 0} vehicles • {fleet.status}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Selected Vehicles:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {Array.from(selectedVehicles).map(vehicleId => {
                        const vehicle = vehicles.find(v => v.id === vehicleId);
                        return (
                          <div key={vehicleId} className="text-sm">
                            {vehicle?.model} ({vehicle?.plateNumber})
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkAssignment} disabled={!targetFleetId}>
                    Assign Vehicles
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Assignment Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Vehicles ({filteredVehicles.length})</TabsTrigger>
          <TabsTrigger value="assigned">Assigned ({assignedVehicles.length})</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned ({unassignedVehicles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Fleet Assignment</CardTitle>
              <CardDescription>
                Manage fleet assignments for all vehicles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedVehicles.size === filteredVehicles.length && filteredVehicles.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Current Fleet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedVehicles.has(vehicle.id)}
                          onCheckedChange={(checked) => handleSelectVehicle(vehicle.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{vehicle.model}</div>
                          <div className="text-sm text-muted-foreground">{vehicle.plateNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{vehicle.type}</TableCell>
                      <TableCell>
                        {(vehicle as any).fleet_id ? (
                          <Badge variant="outline">
                            {getFleetName((vehicle as any).fleet_id)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(vehicle.status)}>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{(vehicle as any).capacity_volume_m3 || vehicle.capacity || 0} m³</div>
                          <div className="text-muted-foreground">{(vehicle as any).capacity_weight_kg || vehicle.maxWeight || 0} kg</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(vehicle as any).fleet_id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFromFleet(vehicle.id)}
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVehicles(new Set([vehicle.id]));
                              setIsAssignDialogOpen(true);
                            }}
                          >
                            Assign
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned">
          <Card>
            <CardHeader>
              <CardTitle>Fleet-Assigned Vehicles</CardTitle>
              <CardDescription>
                Vehicles currently assigned to fleets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Fleet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{vehicle.model}</div>
                          <div className="text-sm text-muted-foreground">{vehicle.plateNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getFleetName((vehicle as any).fleet_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(vehicle.status)}>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFromFleet(vehicle.id)}
                        >
                          Remove from Fleet
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unassigned">
          <Card>
            <CardHeader>
              <CardTitle>Unassigned Vehicles</CardTitle>
              <CardDescription>
                Vehicles not currently assigned to any fleet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedVehicles.size === unassignedVehicles.length && unassignedVehicles.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedVehicles(new Set(unassignedVehicles.map(v => v.id)));
                          } else {
                            setSelectedVehicles(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassignedVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedVehicles.has(vehicle.id)}
                          onCheckedChange={(checked) => handleSelectVehicle(vehicle.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{vehicle.model}</div>
                          <div className="text-sm text-muted-foreground">{vehicle.plateNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{vehicle.type}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(vehicle.status)}>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVehicles(new Set([vehicle.id]));
                            setIsAssignDialogOpen(true);
                          }}
                        >
                          Assign to Fleet
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
