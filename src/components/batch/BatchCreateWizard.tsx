import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Truck, Users, Package, Route, MapPin, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BatchCreateWizardProps {
  approvedRequisitions: any[];
  vehicles: any[];
  drivers: any[];
  facilities: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const steps: WizardStep[] = [
  {
    id: 'requisitions',
    title: 'Select Requisitions',
    description: 'Choose approved requisitions to include in this batch'
  },
  {
    id: 'vehicle',
    title: 'Vehicle & Driver',
    description: 'Assign vehicle and driver for this batch'
  },
  {
    id: 'route',
    title: 'Route Planning',
    description: 'Configure route optimization and stops'
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Review batch details and create the batch'
  }
];

export function BatchCreateWizard({ 
  approvedRequisitions, 
  vehicles, 
  drivers, 
  facilities, 
  onSubmit, 
  onCancel, 
  isLoading 
}: BatchCreateWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRequisitions, setSelectedRequisitions] = useState<Set<string>>(new Set());
  const [batchData, setBatchData] = useState({
    name: '',
    batch_type: 'delivery' as 'delivery' | 'pickup' | 'mixed',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    vehicle_id: '',
    driver_id: '',
    warehouse_id: '',
    origin_facility_id: '',
    route_optimization_method: 'client' as 'client' | 'api' | 'manual',
    expected_start_time: '',
    expected_end_time: '',
    delivery_instructions: '',
    special_requirements: [] as string[]
  });

  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Calculate totals when requisitions change
  useEffect(() => {
    const selectedReqs = approvedRequisitions.filter(req => selectedRequisitions.has(req.id));
    const weight = selectedReqs.reduce((sum, req) => sum + req.total_weight, 0);
    const volume = selectedReqs.reduce((sum, req) => sum + req.total_volume, 0);
    
    setTotalWeight(weight);
    setTotalVolume(volume);

    // Generate route stops from selected requisitions
    const stops = selectedReqs.map((req, index) => ({
      facility_id: req.facility_id,
      facility_name: req.facility?.name,
      facility_address: req.facility?.address,
      stop_sequence: index + 1,
      stop_type: 'delivery',
      requisition_id: req.id,
      estimated_arrival: null,
      estimated_departure: null
    }));
    
    setRouteStops(stops);
  }, [selectedRequisitions, approvedRequisitions]);

  // Update selected vehicle when vehicle_id changes
  useEffect(() => {
    if (batchData.vehicle_id) {
      const vehicle = vehicles.find(v => v.id === batchData.vehicle_id);
      setSelectedVehicle(vehicle);
    } else {
      setSelectedVehicle(null);
    }
  }, [batchData.vehicle_id, vehicles]);

  const handleRequisitionToggle = (requisitionId: string, checked: boolean) => {
    const newSelected = new Set(selectedRequisitions);
    if (checked) {
      newSelected.add(requisitionId);
    } else {
      newSelected.delete(requisitionId);
    }
    setSelectedRequisitions(newSelected);
  };

  const handleSelectAllRequisitions = (checked: boolean) => {
    if (checked) {
      setSelectedRequisitions(new Set(approvedRequisitions.map(req => req.id)));
    } else {
      setSelectedRequisitions(new Set());
    }
  };

  const calculateUtilization = () => {
    if (!selectedVehicle?.capacity_volume_m3 || !selectedVehicle?.capacity_weight_kg) return 0;
    
    const volumeUtil = (totalVolume / selectedVehicle.capacity_volume_m3) * 100;
    const weightUtil = (totalWeight / selectedVehicle.capacity_weight_kg) * 100;
    
    return Math.max(volumeUtil, weightUtil);
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Requisitions
        return selectedRequisitions.size > 0;
      case 1: // Vehicle & Driver
        return batchData.vehicle_id !== '';
      case 2: // Route
        return routeStops.length > 0;
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNext() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (selectedRequisitions.size === 0) {
      toast.error('Please select at least one requisition');
      return;
    }

    if (!batchData.vehicle_id) {
      toast.error('Please select a vehicle');
      return;
    }

    const utilization = calculateUtilization();
    if (utilization > 100) {
      toast.error('Vehicle capacity exceeded. Please remove some requisitions or select a larger vehicle.');
      return;
    }

    const submissionData = {
      ...batchData,
      requisition_ids: Array.from(selectedRequisitions),
      stops: routeStops.map((stop, index) => ({
        facility_id: stop.facility_id,
        stop_sequence: index + 1,
        stop_type: stop.stop_type,
        estimated_arrival: stop.estimated_arrival,
        estimated_departure: stop.estimated_departure
      }))
    };

    onSubmit(submissionData);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'text-red-600';
    if (utilization > 90) return 'text-yellow-600';
    return 'text-green-600';
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Select Requisitions
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Select Requisitions</h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedRequisitions.size === approvedRequisitions.length && approvedRequisitions.length > 0}
                  onCheckedChange={handleSelectAllRequisitions}
                />
                <Label>Select All</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{selectedRequisitions.size}</p>
                    <p className="text-sm text-muted-foreground">Selected Requisitions</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totalWeight.toFixed(1)} kg</p>
                    <p className="text-sm text-muted-foreground">{totalVolume.toFixed(2)} m³</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Requisition #</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Weight/Volume</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedRequisitions.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRequisitions.has(req.id)}
                          onCheckedChange={(checked) => handleRequisitionToggle(req.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {req.requisition_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{req.facility?.name}</div>
                          <div className="text-sm text-muted-foreground">{req.facility?.type}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{req.total_items}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{req.total_weight.toFixed(1)} kg</div>
                          <div className="text-muted-foreground">{req.total_volume.toFixed(2)} m³</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={req.requisition_type === 'emergency' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                          {req.requisition_type === 'emergency' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {req.requisition_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {req.expected_delivery_date 
                          ? new Date(req.expected_delivery_date).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case 1: // Vehicle & Driver Selection
        const utilization = calculateUtilization();
        
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Vehicle & Driver Assignment</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Select Vehicle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Vehicle *</Label>
                    <Select value={batchData.vehicle_id} onValueChange={(value) => setBatchData({...batchData, vehicle_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(vehicle => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            <div className="flex flex-col">
                              <span>{vehicle.model} ({vehicle.plateNumber})</span>
                              <span className="text-sm text-muted-foreground">
                                {(vehicle as any).capacity_volume_m3 || 0}m³ • {(vehicle as any).capacity_weight_kg || 0}kg
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedVehicle && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <h4 className="font-medium">Vehicle Capacity</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Volume:</span>
                          <span>{totalVolume.toFixed(2)} / {(selectedVehicle as any).capacity_volume_m3 || 0} m³</span>
                        </div>
                        <Progress 
                          value={(totalVolume / ((selectedVehicle as any).capacity_volume_m3 || 1)) * 100} 
                          className="h-2" 
                        />
                        <div className="flex items-center justify-between text-sm">
                          <span>Weight:</span>
                          <span>{totalWeight.toFixed(1)} / {(selectedVehicle as any).capacity_weight_kg || 0} kg</span>
                        </div>
                        <Progress 
                          value={(totalWeight / ((selectedVehicle as any).capacity_weight_kg || 1)) * 100} 
                          className="h-2" 
                        />
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>Utilization:</span>
                          <span className={getUtilizationColor(utilization)}>
                            {utilization.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      {utilization > 100 && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Capacity exceeded! Please remove some requisitions.</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Driver
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Driver (Optional)</Label>
                    <Select value={batchData.driver_id} onValueChange={(value) => setBatchData({...batchData, driver_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Driver Assigned</SelectItem>
                        {drivers.map(driver => (
                          <SelectItem key={driver.id} value={driver.id}>
                            <div className="flex flex-col">
                              <span>{driver.name}</span>
                              <span className="text-sm text-muted-foreground">{driver.phone}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Batch Type</Label>
                    <Select value={batchData.batch_type} onValueChange={(value: 'delivery' | 'pickup' | 'mixed') => setBatchData({...batchData, batch_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={batchData.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setBatchData({...batchData, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2: // Route Planning
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Route Planning & Optimization</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Route Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Route Optimization</Label>
                    <Select 
                      value={batchData.route_optimization_method} 
                      onValueChange={(value: 'client' | 'api' | 'manual') => setBatchData({...batchData, route_optimization_method: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client-side Optimization</SelectItem>
                        <SelectItem value="api">API-based Optimization</SelectItem>
                        <SelectItem value="manual">Manual Route</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="datetime-local"
                        value={batchData.expected_start_time}
                        onChange={(e) => setBatchData({...batchData, expected_start_time: e.target.value})}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="datetime-local"
                        value={batchData.expected_end_time}
                        onChange={(e) => setBatchData({...batchData, expected_end_time: e.target.value})}
                        min={batchData.expected_start_time || new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Delivery Instructions</Label>
                    <Textarea
                      placeholder="Special delivery instructions..."
                      value={batchData.delivery_instructions}
                      onChange={(e) => setBatchData({...batchData, delivery_instructions: e.target.value})}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Route Stops
                  </CardTitle>
                  <CardDescription>
                    {routeStops.length} stop{routeStops.length !== 1 ? 's' : ''} planned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {routeStops.map((stop, index) => (
                      <div key={stop.facility_id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{stop.facility_name}</div>
                          <div className="text-sm text-muted-foreground">{stop.facility_address}</div>
                        </div>
                        <Badge variant="outline">{stop.stop_type}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 3: // Review & Create
        const finalUtilization = calculateUtilization();
        
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Batch Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Batch Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Requisitions:</span>
                      <p className="font-medium">{selectedRequisitions.size}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total Weight:</span>
                      <p className="font-medium">{totalWeight.toFixed(1)} kg</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total Volume:</span>
                      <p className="font-medium">{totalVolume.toFixed(2)} m³</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Route Stops:</span>
                      <p className="font-medium">{routeStops.length}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <span className="text-sm text-muted-foreground">Vehicle:</span>
                    <p className="font-medium">
                      {selectedVehicle?.model} ({selectedVehicle?.plateNumber})
                    </p>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Driver:</span>
                    <p className="font-medium">
                      {batchData.driver_id 
                        ? drivers.find(d => d.id === batchData.driver_id)?.name || 'Unknown'
                        : 'No driver assigned'
                      }
                    </p>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Priority:</span>
                    <Badge className={batchData.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                      {batchData.priority.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Capacity Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedVehicle && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Volume Utilization:</span>
                          <span>{((totalVolume / ((selectedVehicle as any).capacity_volume_m3 || 1)) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={(totalVolume / ((selectedVehicle as any).capacity_volume_m3 || 1)) * 100} 
                          className="h-2" 
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Weight Utilization:</span>
                          <span>{((totalWeight / ((selectedVehicle as any).capacity_weight_kg || 1)) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={(totalWeight / ((selectedVehicle as any).capacity_weight_kg || 1)) * 100} 
                          className="h-2" 
                        />
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Overall Utilization:</span>
                          <span className={`font-bold ${getUtilizationColor(finalUtilization)}`}>
                            {finalUtilization.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {finalUtilization > 100 && (
                        <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-200">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Warning: Vehicle capacity exceeded!</span>
                        </div>
                      )}

                      {finalUtilization <= 100 && finalUtilization > 90 && (
                        <div className="flex items-center gap-2 text-green-600 text-sm p-3 bg-green-50 rounded-lg border border-green-200">
                          <CheckCircle className="h-4 w-4" />
                          <span>Excellent utilization! Ready to create batch.</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              index <= currentStep 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-gray-300 text-gray-400'
            }`}>
              {index < currentStep ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${
                index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
        <p className="text-muted-foreground">{steps[currentStep].description}</p>
      </div>

      {/* Step Content */}
      <div className="min-h-96">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : handlePrevious}
          disabled={isLoading}
        >
          {currentStep === 0 ? (
            'Cancel'
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </>
          )}
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceedToNext() || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isLoading || calculateUtilization() > 100}
          >
            {isLoading ? 'Creating...' : 'Create Batch'}
          </Button>
        )}
      </div>
    </div>
  );
}
