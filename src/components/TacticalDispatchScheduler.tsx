import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Package, 
  Truck, 
  User, 
  Route,
  MapPin,
  CheckCircle,
  AlertCircle,
  Warehouse,
  Navigation,
  Timer,
  Target
} from 'lucide-react';
import { Facility, DeliveryBatch, Driver, Vehicle, Warehouse as WarehouseType } from '@/types';
import { WAREHOUSES } from '@/data/warehouses';
import { DRIVERS, VEHICLES } from '@/data/fleet';
import { optimizeBatchDelivery } from '@/lib/routeOptimization';
import TacticalMapView from './TacticalMapView';

interface TacticalDispatchSchedulerProps {
  facilities: Facility[];
  batches: DeliveryBatch[];
  onBatchCreate: (batch: DeliveryBatch) => void;
}

const TacticalDispatchScheduler = ({ facilities, batches, onBatchCreate }: TacticalDispatchSchedulerProps) => {
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(WAREHOUSES[0]?.id || '');
  const [formData, setFormData] = useState({
    batchName: '',
    scheduledDate: '',
    scheduledTime: '',
    driverId: '',
    vehicleId: '',
    medicationType: '',
    totalQuantity: '',
    priority: 'medium',
    notes: '',
  });
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const facilityGroups = [
    { id: 'all', name: 'All Facilities', facilities },
    { id: 'north', name: 'North Zone', facilities: facilities.filter(f => f.lat > 12) },
    { id: 'south', name: 'South Zone', facilities: facilities.filter(f => f.lat <= 12) },
    { id: 'hospitals', name: 'Hospitals', facilities: facilities.filter(f => f.type.toLowerCase().includes('hospital')) },
    { id: 'clinics', name: 'Clinics', facilities: facilities.filter(f => f.type.toLowerCase().includes('clinic')) },
  ];

  const [selectedFacilityGroup, setSelectedFacilityGroup] = useState('all');
  const displayedFacilities = facilityGroups.find(g => g.id === selectedFacilityGroup)?.facilities || facilities;

  // Auto-select optimal warehouse when facilities change
  useEffect(() => {
    if (selectedFacilities.length > 0 && !selectedWarehouseId) {
      const selectedFacilityObjects = facilities.filter(f => selectedFacilities.includes(f.id));
      if (selectedFacilityObjects.length > 0) {
        const centerLat = selectedFacilityObjects.reduce((sum, f) => sum + f.lat, 0) / selectedFacilityObjects.length;
        const centerLng = selectedFacilityObjects.reduce((sum, f) => sum + f.lng, 0) / selectedFacilityObjects.length;
        
        const optimalWarehouse = WAREHOUSES.reduce((best, current) => {
          const distToBest = Math.sqrt(Math.pow(centerLat - best.lat, 2) + Math.pow(centerLng - best.lng, 2));
          const distToCurrent = Math.sqrt(Math.pow(centerLat - current.lat, 2) + Math.pow(centerLng - current.lng, 2));
          return distToCurrent < distToBest ? current : best;
        });
        
        setSelectedWarehouseId(optimalWarehouse.id);
      }
    }
  }, [selectedFacilities, facilities, selectedWarehouseId]);

  const handleFacilityToggle = (facilityId: string, checked: boolean) => {
    if (checked) {
      setSelectedFacilities(prev => [...prev, facilityId]);
    } else {
      setSelectedFacilities(prev => prev.filter(id => id !== facilityId));
    }
    setOptimizedRoute(null);
  };

  const handleMapFacilityToggle = (facilityId: string) => {
    const isSelected = selectedFacilities.includes(facilityId);
    handleFacilityToggle(facilityId, !isSelected);
  };

  const handleSelectAllFacilities = () => {
    const allIds = displayedFacilities.map(f => f.id);
    setSelectedFacilities(allIds);
    setOptimizedRoute(null);
  };

  const handleClearAllFacilities = () => {
    setSelectedFacilities([]);
    setOptimizedRoute(null);
  };

  const removeFacilityFromSelected = (facilityId: string) => {
    setSelectedFacilities(prev => prev.filter(id => id !== facilityId));
    setOptimizedRoute(null);
  };

  const handleOptimizeRoute = () => {
    if (selectedFacilities.length === 0) {
      toast.error("Please select at least one facility");
      return;
    }

    if (!selectedWarehouseId) {
      toast.error("Please select a starting warehouse");
      return;
    }

    setIsOptimizing(true);
    
    try {
      const selectedFacilityObjects = facilities.filter(f => 
        selectedFacilities.includes(f.id)
      );

      const selectedWarehouse = WAREHOUSES.find(w => w.id === selectedWarehouseId);
      if (!selectedWarehouse) {
        throw new Error("Selected warehouse not found");
      }

      const optimization = optimizeBatchDelivery(
        selectedFacilityObjects,
        [selectedWarehouse],
        formData.medicationType,
        formData.priority as 'low' | 'medium' | 'high' | 'urgent'
      );

      setOptimizedRoute(optimization);
      toast.success(`Route optimized! ${selectedFacilities.length} stops, ${optimization.totalDistance}km, ${Math.round(optimization.estimatedDuration)}min`);
    } catch (error) {
      console.error('Route optimization error:', error);
      toast.error("Failed to optimize route");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!optimizedRoute) {
      toast.error("Please optimize the route first");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedFacilityObjects = facilities.filter(f => 
        selectedFacilities.includes(f.id)
      );

      const warehouse = WAREHOUSES.find(w => w.id === selectedWarehouseId);
      
      const batch: DeliveryBatch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: formData.batchName || `Delivery Batch ${format(new Date(), 'MMM d, HH:mm')}`,
        facilities: selectedFacilityObjects,
        warehouseId: selectedWarehouseId,
        warehouseName: warehouse?.name || '',
        driverId: formData.driverId || undefined,
        vehicleId: formData.vehicleId || undefined,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        status: 'planned',
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        totalDistance: optimizedRoute.totalDistance,
        estimatedDuration: optimizedRoute.estimatedDuration,
        medicationType: formData.medicationType,
        totalQuantity: parseInt(formData.totalQuantity) || 0,
        optimizedRoute: optimizedRoute.optimizedRoute,
        notes: formData.notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      onBatchCreate(batch);

      toast.success(`Delivery batch scheduled! ${selectedFacilityObjects.length} facilities, ${optimizedRoute.totalDistance}km route`);

      // Reset form
      setSelectedFacilities([]);
      setOptimizedRoute(null);
      setFormData({
        batchName: '',
        scheduledDate: '',
        scheduledTime: '',
        driverId: '',
        vehicleId: '',
        medicationType: '',
        totalQuantity: '',
        priority: 'medium',
        notes: '',
      });
    } catch (error) {
      console.error('Batch creation error:', error);
      toast.error("Failed to create delivery batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedFacilityObjects = facilities.filter(f => selectedFacilities.includes(f.id));
  const selectedWarehouse = WAREHOUSES.find(w => w.id === selectedWarehouseId);
  const availableDrivers = DRIVERS.filter(d => d.status === 'available');
  const availableVehicles = VEHICLES.filter(v => v.status === 'available');

  return (
    <div className="h-screen flex flex-col">
      {/* Top Row Controls */}
      <div className="border-b bg-gradient-medical p-4 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Navigation className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-semibold">Tactical Dispatch Center</h1>
              <p className="text-sm opacity-90">Route optimization and fleet management</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Facility Group Selector */}
            <Select value={selectedFacilityGroup} onValueChange={setSelectedFacilityGroup}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {facilityGroups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.facilities.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Route Optimizer Button */}
            <Button
              onClick={handleOptimizeRoute}
              disabled={selectedFacilities.length === 0 || isOptimizing || !selectedWarehouseId}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              size="lg"
            >
              <Route className="w-4 h-4 mr-2" />
              {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
            </Button>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Facilities List */}
        <div className="w-80 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Delivery Destinations</h2>
              <Badge variant="secondary">{selectedFacilities.length} selected</Badge>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAllFacilities}
                className="flex-1"
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearAllFacilities}
                className="flex-1"
              >
                Clear
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {displayedFacilities.map((facility) => (
                <div key={facility.id} className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg border">
                  <Checkbox
                    id={facility.id}
                    checked={selectedFacilities.includes(facility.id)}
                    onCheckedChange={(checked) => 
                      handleFacilityToggle(facility.id, checked as boolean)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <label htmlFor={facility.id} className="text-sm font-medium cursor-pointer block">
                      {facility.name}
                    </label>
                    <p className="text-xs text-muted-foreground">{facility.type}</p>
                    <p className="text-xs text-muted-foreground truncate">{facility.address}</p>
                  </div>
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Route Information */}
        <div className="w-96 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm mb-2">Route Information</h2>
            {optimizedRoute && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold">{selectedFacilities.length}</div>
                  <div className="text-xs text-muted-foreground">Stops</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold">{optimizedRoute.totalDistance}km</div>
                  <div className="text-xs text-muted-foreground">Distance</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold">{Math.round(optimizedRoute.estimatedDuration)}min</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold">{selectedWarehouse?.name.split(' ')[0]}</div>
                  <div className="text-xs text-muted-foreground">Origin</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Selected Facilities */}
              {selectedFacilities.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Selected Facilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedFacilityObjects.map((facility, index) => (
                        <div key={facility.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                            <div>
                              <div className="text-sm font-medium">{facility.name}</div>
                              <div className="text-xs text-muted-foreground">{facility.type}</div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFacilityFromSelected(facility.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warehouse Selection */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Starting Warehouse</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {WAREHOUSES.map(warehouse => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          <div className="flex items-center gap-2">
                            <Warehouse className="w-4 h-4" />
                            <span>{warehouse.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Scheduling Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Schedule & Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Date *</Label>
                        <Input
                          type="date"
                          value={formData.scheduledDate}
                          onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          required
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Time *</Label>
                        <Input
                          type="time"
                          value={formData.scheduledTime}
                          onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                          required
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Priority</Label>
                      <Select 
                        value={formData.priority} 
                        onValueChange={(value) => handleInputChange('priority', value)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Medication *</Label>
                        <Input
                          value={formData.medicationType}
                          onChange={(e) => handleInputChange('medicationType', e.target.value)}
                          placeholder="e.g., Insulin"
                          required
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Quantity *</Label>
                        <Input
                          type="number"
                          value={formData.totalQuantity}
                          onChange={(e) => handleInputChange('totalQuantity', e.target.value)}
                          placeholder="Units"
                          min="1"
                          required
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Driver</Label>
                        <Select 
                          value={formData.driverId} 
                          onValueChange={(value) => handleInputChange('driverId', value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Auto-assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDrivers.map(driver => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Vehicle</Label>
                        <Select 
                          value={formData.vehicleId} 
                          onValueChange={(value) => handleInputChange('vehicleId', value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Auto-assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVehicles.map(vehicle => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Special instructions..."
                        className="text-sm"
                        rows={2}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={!optimizedRoute || isSubmitting || !formData.scheduledDate || !formData.scheduledTime || !formData.medicationType || !formData.totalQuantity}
                      className="w-full"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      {isSubmitting ? 'Creating...' : 'Schedule Delivery Batch'}
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </div>
          </div>
        </div>

        {/* Column 3: Tactical Map */}
        <div className="flex-1">
          <TacticalMapView
            facilities={facilities}
            warehouses={WAREHOUSES}
            selectedFacilities={selectedFacilityObjects}
            selectedWarehouse={selectedWarehouse}
            optimizedRoute={optimizedRoute}
            batches={batches}
            onFacilityToggle={handleMapFacilityToggle}
          />
        </div>
      </div>
    </div>
  );
};

export default TacticalDispatchScheduler;