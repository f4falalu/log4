import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, MapPin, Clock, Truck, Package, AlertTriangle, CheckCircle, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { useVehicles } from '@/hooks/useVehicles';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { useActiveHandoffs, useCompleteHandoff } from '@/hooks/useHandoffs';
import { supabase } from '@/integrations/supabase/client';

interface HandoffFormData {
  fromVehicleId: string;
  toVehicleId: string;
  fromBatchId: string;
  locationLat: number;
  locationLng: number;
  scheduledTime: string;
  notes: string;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export default function EnhancedHandoffManager() {
  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useDeliveryBatches();
  const { data: handoffs = [], isLoading: handoffsLoading } = useActiveHandoffs();
  
  const completeHandoffMutation = useCompleteHandoff();

  const [activeTab, setActiveTab] = useState('active');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const [handoffFormData, setHandoffFormData] = useState<HandoffFormData>({
    fromVehicleId: '',
    toVehicleId: '',
    fromBatchId: '',
    locationLat: 0,
    locationLng: 0,
    scheduledTime: '',
    notes: ''
  });

  // Get current location for handoff positioning
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
        
        if (result.state === 'granted') {
          getCurrentLocation();
        }
      });
    }
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: GPSLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        setCurrentLocation(location);
        
        // Auto-fill location in form
        setHandoffFormData(prev => ({
          ...prev,
          locationLat: location.latitude,
          locationLng: location.longitude
        }));
        
        toast.success('Current location detected');
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Failed to get current location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleCreateHandoff = async () => {
    if (!handoffFormData.fromVehicleId || !handoffFormData.toVehicleId || !handoffFormData.fromBatchId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (handoffFormData.fromVehicleId === handoffFormData.toVehicleId) {
      toast.error('Source and destination vehicles must be different');
      return;
    }

    try {
      // Note: Handoff creation needs to be implemented with proper mutation
      toast.info('Creating handoff - feature in development');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating handoff:', error);
      toast.error('Failed to create handoff');
    }
  };

  const handleUpdateHandoffStatus = async (handoffId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'in_progress') {
        updateData.actual_time = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.actual_time = new Date().toISOString();
      }

      await completeHandoffMutation.mutateAsync(handoffId);

      toast.success(`Handoff ${status.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating handoff:', error);
      toast.error('Failed to update handoff status');
    }
  };

  const resetForm = () => {
    setHandoffFormData({
      fromVehicleId: '',
      toVehicleId: '',
      fromBatchId: '',
      locationLat: currentLocation?.latitude || 0,
      locationLng: currentLocation?.longitude || 0,
      scheduledTime: '',
      notes: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const activeHandoffs = handoffs.filter(h => ['planned', 'in_progress'].includes(h.status));
  const completedHandoffs = handoffs.filter(h => ['completed', 'cancelled'].includes(h.status));
  const inTransitBatches = batches.filter(b => b.status === 'in-progress');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Handoff Manager</h1>
          <p className="text-muted-foreground">Manage in-transit consignment transfers between vehicles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={getCurrentLocation}
            disabled={locationPermission === 'denied'}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Get Location
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Handoff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Handoff</DialogTitle>
                <DialogDescription>
                  Transfer consignment between vehicles during transit
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Vehicle</Label>
                    <Select
                      value={handoffFormData.fromVehicleId}
                      onValueChange={(value) => setHandoffFormData({ ...handoffFormData, fromVehicleId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.filter(v => v.status === 'in-use').map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.model} ({vehicle.plateNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>To Vehicle</Label>
                    <Select
                      value={handoffFormData.toVehicleId}
                      onValueChange={(value) => setHandoffFormData({ ...handoffFormData, toVehicleId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.filter(v => v.id !== handoffFormData.fromVehicleId).map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.model} ({vehicle.plateNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Delivery Batch</Label>
                  <Select
                    value={handoffFormData.fromBatchId}
                    onValueChange={(value) => setHandoffFormData({ ...handoffFormData, fromBatchId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch to transfer" />
                    </SelectTrigger>
                    <SelectContent>
                      {inTransitBatches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          Batch {batch.id.slice(0, 8)}... ({batch.facilities?.length || 0} facilities)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={handoffFormData.locationLat}
                      onChange={(e) => setHandoffFormData({ ...handoffFormData, locationLat: parseFloat(e.target.value) })}
                      placeholder="0.000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={handoffFormData.locationLng}
                      onChange={(e) => setHandoffFormData({ ...handoffFormData, locationLng: parseFloat(e.target.value) })}
                      placeholder="0.000000"
                    />
                  </div>
                </div>

                {currentLocation && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Current Location Detected</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Accuracy: ±{Math.round(currentLocation.accuracy)}m • 
                      Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Scheduled Time</Label>
                  <Input
                    type="datetime-local"
                    value={handoffFormData.scheduledTime}
                    onChange={(e) => setHandoffFormData({ ...handoffFormData, scheduledTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Additional handoff instructions"
                    value={handoffFormData.notes}
                    onChange={(e) => setHandoffFormData({ ...handoffFormData, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateHandoff}>
                  Schedule Handoff
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Handoff Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Active Handoffs ({activeHandoffs.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            History ({completedHandoffs.length})
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Live Map
          </TabsTrigger>
        </TabsList>

        {/* Active Handoffs */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Handoff Operations</CardTitle>
              <CardDescription>
                Monitor and manage ongoing handoff operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {handoffsLoading ? (
                <div className="text-center py-8">Loading handoffs...</div>
              ) : activeHandoffs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No active handoffs</p>
                  <p className="text-sm">Schedule a handoff to transfer consignments between vehicles</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Handoff ID</TableHead>
                      <TableHead>From Vehicle</TableHead>
                      <TableHead>To Vehicle</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeHandoffs.map((handoff) => (
                      <TableRow key={handoff.id}>
                        <TableCell className="font-mono text-sm">
                          {handoff.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {handoff.from_vehicle?.model || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {handoff.to_vehicle?.model || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {handoff.from_batch_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs">
                              {handoff.location_lat.toFixed(4)}, {handoff.location_lng.toFixed(4)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {handoff.scheduled_time ? 
                            new Date(handoff.scheduled_time).toLocaleString() : 
                            'Not scheduled'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(handoff.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(handoff.status)}
                              {handoff.status.replace('_', ' ').toUpperCase()}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {handoff.status === 'planned' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateHandoffStatus(handoff.id, 'in_progress')}
                              >
                                Start
                              </Button>
                            )}
                            {handoff.status === 'in_progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateHandoffStatus(handoff.id, 'completed')}
                              >
                                Complete
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateHandoffStatus(handoff.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Handoff History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Handoff History</CardTitle>
              <CardDescription>
                View completed and cancelled handoff operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedHandoffs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No handoff history available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Handoff ID</TableHead>
                      <TableHead>Vehicles</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedHandoffs.map((handoff) => (
                      <TableRow key={handoff.id}>
                        <TableCell className="font-mono text-sm">
                          {handoff.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{handoff.from_vehicle?.model || 'Unknown'}</div>
                            <div className="text-muted-foreground">→ {handoff.to_vehicle?.model || 'Unknown'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{handoff.from_batch_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          {handoff.actual_time ? 
                            new Date(handoff.actual_time).toLocaleString() : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {handoff.scheduled_time && handoff.actual_time ? 
                            `${Math.round((new Date(handoff.actual_time).getTime() - new Date(handoff.scheduled_time).getTime()) / 60000)} min` :
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(handoff.status)}>
                            {handoff.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Map */}
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Handoff Map</CardTitle>
              <CardDescription>
                Real-time visualization of handoff locations and vehicle positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Live Map Integration</p>
                <p className="text-sm">Interactive map showing handoff locations and vehicle tracking</p>
                <p className="text-xs mt-2">This would integrate with MapCore.tsx for real-time visualization</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
