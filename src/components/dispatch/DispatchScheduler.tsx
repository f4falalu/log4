import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FormSection } from '@/components/ui/form-section';
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
  AlertCircle
} from 'lucide-react';
import { Facility, DeliveryBatch, Driver, Vehicle } from '@/types';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { optimizeBatchDelivery } from '@/lib/routeOptimization';
import { Loader2 } from 'lucide-react';

interface DispatchSchedulerProps {
  facilities: Facility[];
  onBatchCreate: (batch: DeliveryBatch) => void;
}

const DispatchScheduler = ({ facilities, onBatchCreate }: DispatchSchedulerProps) => {
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
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

  const handleFacilityToggle = (facilityId: string, checked: boolean) => {
    if (checked) {
      setSelectedFacilities(prev => [...prev, facilityId]);
    } else {
      setSelectedFacilities(prev => prev.filter(id => id !== facilityId));
    }
    // Clear optimization when facilities change
    setOptimizedRoute(null);
  };

  const handleOptimizeRoute = () => {
    if (selectedFacilities.length === 0) {
      toast.error("Please select at least one facility");
      return;
    }

    setIsOptimizing(true);
    
    try {
      const selectedFacilityObjects = facilities.filter(f => 
        selectedFacilities.includes(f.id)
      );

      const optimization = optimizeBatchDelivery(
        selectedFacilityObjects,
        warehouses,
        formData.medicationType,
        formData.priority as 'low' | 'medium' | 'high' | 'urgent'
      );

      setOptimizedRoute(optimization);
      toast.success(`Route optimized! Total distance: ${optimization.totalDistance}km, Estimated time: ${Math.round(optimization.estimatedDuration)}min`);
    } catch (error: any) {
      console.error('Route optimization error:', error);
      toast.error(`Failed to optimize route: ${error.message}`);
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

      const warehouse = warehouses.find(w => w.id === optimizedRoute.warehouseId);
      
      const batch: DeliveryBatch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: formData.batchName || `Delivery Batch ${format(new Date(), 'MMM d, HH:mm')}`,
        facilities: selectedFacilityObjects,
        warehouseId: optimizedRoute.warehouseId,
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
    } catch (error: any) {
      console.error('Batch creation error:', error);
      toast.error(`Failed to create delivery batch: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'truck': return '🚛';
      case 'van': return '🚐';
      case 'pickup': return '🛻';
      case 'car': return '🚗';
      default: return '🚛';
    }
  };

  const availableDrivers = drivers.filter(d => d.status === 'available');
  const availableVehicles = vehicles.filter(v => v.status === 'available');
  
  const isLoading = warehousesLoading || driversLoading || vehiclesLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Route className="w-5 h-5 text-primary" />
            <span>VRP Dispatch Scheduler</span>
          </CardTitle>
          <CardDescription>
            Select multiple facilities and optimize delivery routes with vehicle and driver assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Facility Selection */}
            <FormSection
              title="Facility Selection"
              description="Select facilities for delivery and optimize the route"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                {facilities.map((facility) => (
                  <div key={facility.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg">
                    <Checkbox
                      id={facility.id}
                      checked={selectedFacilities.includes(facility.id)}
                      onCheckedChange={(checked) =>
                        handleFacilityToggle(facility.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <label htmlFor={facility.id} className="text-sm font-medium cursor-pointer">
                        {facility.name}
                      </label>
                      <p className="text-xs text-muted-foreground">{facility.type}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedFacilities.length} of {facilities.length} facilities selected
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOptimizeRoute}
                  disabled={selectedFacilities.length === 0 || isOptimizing || isLoading}
                  className="ml-auto"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Route className="w-4 h-4 mr-2" />
                      Optimize Route
                    </>
                  )}
                </Button>
              </div>
            </FormSection>

            {/* Route Optimization Results */}
            {optimizedRoute && (
              <Card className="bg-success/10 border-success/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-success">
                    <CheckCircle className="w-5 h-5" />
                    <span>Route Optimized</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Distance</p>
                      <p className="font-medium">{optimizedRoute.totalDistance}km</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estimated Time</p>
                      <p className="font-medium">{Math.round(optimizedRoute.estimatedDuration)}min</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Facilities</p>
                      <p className="font-medium">{selectedFacilities.length} stops</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Warehouse</p>
                      <p className="font-medium">{warehouses.find(w => w.id === optimizedRoute.warehouseId)?.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Schedule Details */}
            <FormSection
              title="Schedule Details"
              description="Basic scheduling information and priority"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="batchName">Batch Name (Optional)</Label>
                  <Input
                    id="batchName"
                    value={formData.batchName}
                    onChange={(e) => handleInputChange('batchName', e.target.value)}
                    placeholder={`Delivery Batch ${format(new Date(), 'MMM d, HH:mm')}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
                  >
                    <SelectTrigger>
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Delivery Specifications */}
            <FormSection
              title="Delivery Specifications"
              description="Medication details and quantities"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="medicationType">Medication Type *</Label>
                  <Input
                    id="medicationType"
                    value={formData.medicationType}
                    onChange={(e) => handleInputChange('medicationType', e.target.value)}
                    placeholder="e.g., Insulin, Antibiotics, Vaccines"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalQuantity">Total Quantity *</Label>
                  <Input
                    id="totalQuantity"
                    type="number"
                    value={formData.totalQuantity}
                    onChange={(e) => handleInputChange('totalQuantity', e.target.value)}
                    placeholder="Total units to deliver"
                    min="1"
                    required
                  />
                </div>
              </div>
            </FormSection>

            {/* Fleet Assignment */}
            <FormSection
              title="Fleet Assignment"
              description="Assign driver and vehicle (optional - auto-assignment available)"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Assign Driver (Optional)</Label>
                  <Select
                    value={formData.driverId}
                    onValueChange={(value) => handleInputChange('driverId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-assign driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDrivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{driver.name}</span>
                            <Badge size="xs" variant="outline">
                              {driver.licenseType}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assign Vehicle (Optional)</Label>
                  <Select
                    value={formData.vehicleId}
                    onValueChange={(value) => handleInputChange('vehicleId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-assign vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          <div className="flex items-center gap-2">
                            <span>{getVehicleIcon(vehicle.type)}</span>
                            <span>{vehicle.model}</span>
                            <Badge size="xs" variant="secondary">
                              {vehicle.capacity}m³
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Special instructions, delivery requirements, temperature controls, etc."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button 
                type="submit" 
                disabled={!optimizedRoute || isSubmitting || selectedFacilities.length === 0 || isLoading}
                className="bg-gradient-medical hover:opacity-90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Batch...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Create Delivery Batch
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {facilities.length === 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">No facilities available</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Please add facilities before creating delivery batches.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DispatchScheduler;