import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Truck, Package, Calculator, Route, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useVehicles } from '@/hooks/useVehicles';
import { useFacilities } from '@/hooks/useFacilities';
import { useEnhancedDeliveryBatches, useCreateEnhancedDispatch } from '@/hooks/useEnhancedDispatch';
import { useCreatePayloadItem } from '@/hooks/usePayloadItems';
import { PayloadTracker } from '@/components/realtime/PayloadTracker';

interface PayloadItem {
  id: string;
  facilityId: string;
  facilityName: string;
  boxType: string;
  quantity: number;
  weightKg: number;
  volumeM3: number;
}

interface DispatchFormData {
  vehicleId: string;
  driverId: string;
  estimatedStartTime: string;
  estimatedEndTime: string;
  priority: 'low' | 'medium' | 'high';
  notes: string;
}

export default function EnhancedDispatchScheduler() {
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const { data: facilities = [], isLoading: facilitiesLoading } = useFacilities();
  const { data: batches = [], isLoading: batchesLoading } = useEnhancedDeliveryBatches();
  
  const createBatchMutation = useCreateEnhancedDispatch();
  const createPayloadItemMutation = useCreatePayloadItem();

  const [activeTab, setActiveTab] = useState('create');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [payloadItems, setPayloadItems] = useState<PayloadItem[]>([]);
  const [payloadUtilization, setPayloadUtilization] = useState(0);
  const [routeOptimization, setRouteOptimization] = useState<any>(null);

  const [dispatchFormData, setDispatchFormData] = useState<DispatchFormData>({
    vehicleId: '',
    driverId: '',
    estimatedStartTime: '',
    estimatedEndTime: '',
    priority: 'medium',
    notes: ''
  });

  const [itemFormData, setItemFormData] = useState({
    facilityId: '',
    boxType: 'medium',
    quantity: 1,
    weightKg: 10
  });

  // Calculate payload utilization when vehicle or items change
  useEffect(() => {
    if (selectedVehicle && payloadItems.length > 0) {
      const totalVolume = payloadItems.reduce((sum, item) => sum + item.volumeM3, 0);
      const vehicleCapacity = (selectedVehicle as any).capacity_volume_m3 || selectedVehicle.capacity || 10;
      const utilization = (totalVolume / vehicleCapacity) * 100;
      setPayloadUtilization(Math.min(utilization, 100));
    } else {
      setPayloadUtilization(0);
    }
  }, [selectedVehicle, payloadItems]);

  const calculateVolume = (boxType: string, quantity: number) => {
    const volumes = {
      small: 0.091,
      medium: 0.142,
      large: 0.288
    };
    return (volumes[boxType as keyof typeof volumes] || 0.142) * quantity;
  };

  const handleAddPayloadItem = () => {
    if (!itemFormData.facilityId) {
      toast.error('Please select a facility');
      return;
    }

    const facility = facilities.find(f => f.id === itemFormData.facilityId);
    if (!facility) return;

    const volume = calculateVolume(itemFormData.boxType, itemFormData.quantity);

    const newItem: PayloadItem = {
      id: Date.now().toString(),
      facilityId: itemFormData.facilityId,
      facilityName: facility.name,
      boxType: itemFormData.boxType,
      quantity: itemFormData.quantity,
      weightKg: itemFormData.weightKg,
      volumeM3: volume
    };

    setPayloadItems([...payloadItems, newItem]);
    
    // Reset form
    setItemFormData({
      facilityId: '',
      boxType: 'medium',
      quantity: 1,
      weightKg: 10
    });

    toast.success('Payload item added');
  };

  const handleRemovePayloadItem = (itemId: string) => {
    setPayloadItems(payloadItems.filter(item => item.id !== itemId));
    toast.success('Payload item removed');
  };

  const handleOptimizeRoute = async () => {
    if (payloadItems.length === 0) {
      toast.error('Add payload items before optimizing route');
      return;
    }

    // Simulate route optimization
    setRouteOptimization({
      totalDistance: Math.round(Math.random() * 100 + 20),
      estimatedDuration: Math.round(Math.random() * 180 + 60),
      fuelCost: Math.round(Math.random() * 50 + 20),
      optimizedOrder: payloadItems.map((item, index) => ({
        ...item,
        order: index + 1,
        estimatedArrival: new Date(Date.now() + (index + 1) * 30 * 60000).toLocaleTimeString()
      }))
    });

    toast.success('Route optimized successfully');
  };

  const handleCreateDispatch = async () => {
    if (!selectedVehicle || payloadItems.length === 0) {
      toast.error('Please select a vehicle and add payload items');
      return;
    }

    if (payloadUtilization > 100) {
      toast.error('Payload exceeds vehicle capacity');
      return;
    }

    try {
      // Create delivery batch
      const batchData = {
        vehicle_id: selectedVehicle.id,
        driver_id: dispatchFormData.driverId || undefined,
        facility_ids: payloadItems.map(item => item.facilityId),
        estimated_start_time: dispatchFormData.estimatedStartTime,
        estimated_end_time: dispatchFormData.estimatedEndTime,
        estimated_distance_km: routeOptimization?.totalDistance || 0,
        estimated_duration_min: routeOptimization?.estimatedDuration || 0,
        payload_utilization_pct: payloadUtilization,
        priority: dispatchFormData.priority,
        notes: dispatchFormData.notes,
        status: 'planned'
      };

      const batch = await createBatchMutation.mutateAsync(batchData);

      // Create payload items
      for (const item of payloadItems) {
        await createPayloadItemMutation.mutateAsync({
          batch_id: batch.id,
          facility_id: item.facilityId,
          box_type: item.boxType as 'small' | 'medium' | 'large',
          quantity: item.quantity,
          weight_kg: item.weightKg
        });
      }

      // Reset form
      setIsCreateDialogOpen(false);
      setSelectedVehicle(null);
      setPayloadItems([]);
      setRouteOptimization(null);
      setDispatchFormData({
        vehicleId: '',
        driverId: '',
        estimatedStartTime: '',
        estimatedEndTime: '',
        priority: 'medium',
        notes: ''
      });

      toast.success('Dispatch created successfully');
    } catch (error) {
      console.error('Error creating dispatch:', error);
      toast.error('Failed to create dispatch');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 70) return 'text-green-600';
    if (utilization <= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Dispatch Scheduler</h1>
          <p className="text-muted-foreground">Create optimized dispatches with payload planning</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Dispatch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Dispatch</DialogTitle>
              <DialogDescription>
                Plan payload, optimize route, and schedule delivery
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="vehicle" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                <TabsTrigger value="payload">Payload</TabsTrigger>
                <TabsTrigger value="route">Route</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              {/* Vehicle Selection */}
              <TabsContent value="vehicle" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Select Vehicle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedVehicle?.id || ''}
                      onValueChange={(value) => {
                        const vehicle = vehicles.find(v => v.id === value);
                        setSelectedVehicle(vehicle);
                        setDispatchFormData({ ...dispatchFormData, vehicleId: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            <div className="flex flex-col">
                              <span>{vehicle.model} ({vehicle.plateNumber})</span>
                              <span className="text-sm text-muted-foreground">
                                {vehicle.type} • {vehicle.status}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedVehicle && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">Vehicle Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Type:</span>
                            <span className="ml-2 capitalize">{selectedVehicle.type}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className="ml-2">
                              {selectedVehicle.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Capacity:</span>
                            <span className="ml-2">
                              {(selectedVehicle as any).capacity_volume_m3 || selectedVehicle.capacity || 'N/A'} m³
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max Weight:</span>
                            <span className="ml-2">
                              {(selectedVehicle as any).capacity_weight_kg || selectedVehicle.maxWeight || 'N/A'} kg
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payload Planning */}
              <TabsContent value="payload" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Add Payload Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Facility</Label>
                        <Select
                          value={itemFormData.facilityId}
                          onValueChange={(value) => setItemFormData({ ...itemFormData, facilityId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {facilities.map((facility) => (
                              <SelectItem key={facility.id} value={facility.id}>
                                {facility.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Box Type</Label>
                          <Select
                            value={itemFormData.boxType}
                            onValueChange={(value) => setItemFormData({ ...itemFormData, boxType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={itemFormData.quantity}
                            onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Weight (kg)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={itemFormData.weightKg}
                          onChange={(e) => setItemFormData({ ...itemFormData, weightKg: parseFloat(e.target.value) })}
                        />
                      </div>

                      <Button onClick={handleAddPayloadItem} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Payload Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedVehicle && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Utilization:</span>
                            <span className={getUtilizationColor(payloadUtilization)}>
                              {payloadUtilization.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={payloadUtilization} className="h-2" />
                          {payloadUtilization > 90 && (
                            <div className="flex items-center gap-2 text-sm text-red-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Near or over capacity!</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Items:</span>
                          <span>{payloadItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Weight:</span>
                          <span>{payloadItems.reduce((sum, item) => sum + item.weightKg * item.quantity, 0)} kg</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Volume:</span>
                          <span>{payloadItems.reduce((sum, item) => sum + item.volumeM3, 0).toFixed(3)} m³</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Facilities:</span>
                          <span>{new Set(payloadItems.map(item => item.facilityId)).size}</span>
                        </div>
                      </div>

                      {payloadItems.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Items:</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {payloadItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                                <span>{item.facilityName}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemovePayloadItem(item.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Route Optimization */}
              <TabsContent value="route" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Route className="h-5 w-5" />
                      Route Optimization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button onClick={handleOptimizeRoute} disabled={payloadItems.length === 0}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Optimize Route
                    </Button>

                    {routeOptimization && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{routeOptimization.totalDistance} km</div>
                            <div className="text-sm text-muted-foreground">Total Distance</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{routeOptimization.estimatedDuration} min</div>
                            <div className="text-sm text-muted-foreground">Est. Duration</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">₦{routeOptimization.fuelCost}</div>
                            <div className="text-sm text-muted-foreground">Fuel Cost</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Optimized Route Order:</h4>
                          <div className="space-y-2">
                            {routeOptimization.optimizedOrder.map((item: any, index: number) => (
                              <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                                <Badge variant="outline">{index + 1}</Badge>
                                <span className="flex-1">{item.facilityName}</span>
                                <span className="text-sm text-muted-foreground">
                                  ETA: {item.estimatedArrival}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Schedule */}
              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Schedule Dispatch
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="datetime-local"
                          value={dispatchFormData.estimatedStartTime}
                          onChange={(e) => setDispatchFormData({ ...dispatchFormData, estimatedStartTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="datetime-local"
                          value={dispatchFormData.estimatedEndTime}
                          onChange={(e) => setDispatchFormData({ ...dispatchFormData, estimatedEndTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={dispatchFormData.priority}
                        onValueChange={(value: 'low' | 'medium' | 'high') => 
                          setDispatchFormData({ ...dispatchFormData, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        placeholder="Additional notes or instructions"
                        value={dispatchFormData.notes}
                        onChange={(e) => setDispatchFormData({ ...dispatchFormData, notes: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDispatch}
                disabled={!selectedVehicle || payloadItems.length === 0 || payloadUtilization > 100}
              >
                Create Dispatch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dispatch List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Active Dispatches</TabsTrigger>
          <TabsTrigger value="tracking">Real-Time Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Dispatches</CardTitle>
              <CardDescription>Manage and monitor dispatch operations</CardDescription>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="text-center py-8">Loading dispatches...</div>
              ) : batches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No dispatches found. Create your first dispatch to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Facilities</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.slice(0, 10).map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono text-sm">
                          {batch.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {batch.vehicle?.model || 'Unknown Vehicle'}
                        </TableCell>
                        <TableCell>
                          {batch.facility_ids?.length || 0} facilities
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={batch.payload_utilization_pct || 0} 
                              className="h-2 w-16" 
                            />
                            <span className="text-sm">
                              {(batch.payload_utilization_pct || 0).toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(batch.status)}>
                            {batch.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          {batches.filter(b => b.status === 'in-progress').length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active dispatches to track</p>
                  <p className="text-sm">Dispatches will appear here when they're in progress</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {batches
                .filter(b => b.status === 'in-progress')
                .map((batch) => (
                  <PayloadTracker
                    key={batch.id}
                    batchId={batch.id}
                    vehicleId={batch.vehicle_id}
                  />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
