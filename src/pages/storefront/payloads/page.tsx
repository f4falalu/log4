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
import { Plus, Package, Truck, Calculator, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';

// Mock data - will be replaced with actual hooks
const mockVehicles = [
  {
    id: '1',
    model: 'Toyota Hiace',
    plateNumber: 'ABC-123-XY',
    type: 'van',
    capacityVolume: 8.0,
    capacityWeight: 2000,
    status: 'available'
  },
  {
    id: '2',
    model: 'Isuzu NPR',
    plateNumber: 'DEF-456-ZW',
    type: 'truck',
    capacityVolume: 15.0,
    capacityWeight: 5000,
    status: 'available'
  }
];

const mockFacilities = [
  {
    id: '1',
    name: 'Central Hospital Lagos',
    address: '123 Main St, Lagos',
    type: 'hospital'
  },
  {
    id: '2',
    name: 'Community Clinic Ikeja',
    address: '456 Oak Ave, Ikeja',
    type: 'clinic'
  },
  {
    id: '3',
    name: 'Pharmacy Plus Victoria Island',
    address: '789 Pine Rd, VI',
    type: 'pharmacy'
  }
];

const boxTypes = [
  { value: 'small', label: 'Small (45×30×67cm)', volume: 0.091 },
  { value: 'medium', label: 'Medium (50×35×80cm)', volume: 0.142 },
  { value: 'large', label: 'Large (60×40×120cm)', volume: 0.288 },
  { value: 'custom', label: 'Custom Dimensions', volume: 0 }
];

interface PayloadItem {
  id: string;
  facilityId: string;
  facilityName: string;
  boxType: string;
  quantity: number;
  customLength?: number;
  customWidth?: number;
  customHeight?: number;
  weightKg: number;
  volumeM3: number;
}

export default function PayloadPlannerPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [payloadItems, setPayloadItems] = useState<PayloadItem[]>([]);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [payloadUtilization, setPayloadUtilization] = useState(0);

  const [itemFormData, setItemFormData] = useState({
    facilityId: '',
    boxType: 'small',
    quantity: 1,
    customLength: 0,
    customWidth: 0,
    customHeight: 0,
    weightKg: 10
  });

  const calculateVolume = (boxType: string, quantity: number, customDimensions?: { length: number; width: number; height: number }) => {
    const boxTypeData = boxTypes.find(bt => bt.value === boxType);
    if (boxType === 'custom' && customDimensions) {
      return (customDimensions.length * customDimensions.width * customDimensions.height) / 1000000 * quantity;
    }
    return (boxTypeData?.volume || 0) * quantity;
  };

  const calculatePayloadUtilization = () => {
    if (!selectedVehicle || payloadItems.length === 0) return 0;
    
    const totalVolume = payloadItems.reduce((sum, item) => sum + item.volumeM3, 0);
    const utilization = (totalVolume / selectedVehicle.capacityVolume) * 100;
    return Math.min(utilization, 100);
  };

  useEffect(() => {
    setPayloadUtilization(calculatePayloadUtilization());
  }, [payloadItems, selectedVehicle]);

  const resetItemForm = () => {
    setItemFormData({
      facilityId: '',
      boxType: 'small',
      quantity: 1,
      customLength: 0,
      customWidth: 0,
      customHeight: 0,
      weightKg: 10
    });
  };

  const handleAddPayloadItem = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemFormData.facilityId) {
      toast.error('Please select a facility');
      return;
    }

    const facility = mockFacilities.find(f => f.id === itemFormData.facilityId);
    if (!facility) return;

    const volume = calculateVolume(
      itemFormData.boxType,
      itemFormData.quantity,
      itemFormData.boxType === 'custom' ? {
        length: itemFormData.customLength,
        width: itemFormData.customWidth,
        height: itemFormData.customHeight
      } : undefined
    );

    const newItem: PayloadItem = {
      id: Date.now().toString(),
      facilityId: itemFormData.facilityId,
      facilityName: facility.name,
      boxType: itemFormData.boxType,
      quantity: itemFormData.quantity,
      customLength: itemFormData.boxType === 'custom' ? itemFormData.customLength : undefined,
      customWidth: itemFormData.boxType === 'custom' ? itemFormData.customWidth : undefined,
      customHeight: itemFormData.boxType === 'custom' ? itemFormData.customHeight : undefined,
      weightKg: itemFormData.weightKg,
      volumeM3: volume
    };

    setPayloadItems([...payloadItems, newItem]);
    setIsAddItemDialogOpen(false);
    resetItemForm();
    toast.success('Payload item added successfully');
  };

  const handleRemovePayloadItem = (itemId: string) => {
    setPayloadItems(payloadItems.filter(item => item.id !== itemId));
    toast.success('Payload item removed');
  };

  const handleCreateDispatch = () => {
    if (!selectedVehicle) {
      toast.error('Please select a vehicle');
      return;
    }

    if (payloadItems.length === 0) {
      toast.error('Please add at least one payload item');
      return;
    }

    // TODO: Implement dispatch creation logic
    toast.success('Dispatch created successfully', {
      description: `${payloadItems.length} items assigned to ${selectedVehicle.model}`
    });
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 70) return 'bg-green-500';
    if (utilization <= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getUtilizationStatus = (utilization: number) => {
    if (utilization <= 70) return { label: 'Optimal', color: 'text-green-600' };
    if (utilization <= 90) return { label: 'Near Capacity', color: 'text-yellow-600' };
    return { label: 'Overloaded', color: 'text-red-600' };
  };

  const totalWeight = payloadItems.reduce((sum, item) => sum + (item.weightKg * item.quantity), 0);
  const totalVolume = payloadItems.reduce((sum, item) => sum + item.volumeM3, 0);
  const utilizationStatus = getUtilizationStatus(payloadUtilization);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payload Planner</h1>
            <p className="text-muted-foreground">Plan and optimize vehicle payload assignments</p>
          </div>
          <Button 
            onClick={handleCreateDispatch}
            disabled={!selectedVehicle || payloadItems.length === 0}
            className="bg-primary hover:bg-primary/90"
          >
            <Package className="h-4 w-4 mr-2" />
            Create Dispatch
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vehicle Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Vehicle Selection
                </CardTitle>
                <CardDescription>Choose a vehicle for this payload</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedVehicle?.id || ''}
                  onValueChange={(value) => {
                    const vehicle = mockVehicles.find(v => v.id === value);
                    setSelectedVehicle(vehicle);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <div className="flex flex-col">
                          <span>{vehicle.model} ({vehicle.plateNumber})</span>
                          <span className="text-sm text-muted-foreground">
                            {vehicle.capacityVolume}m³ • {vehicle.capacityWeight}kg
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedVehicle && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Capacity:</span>
                      <span>{selectedVehicle.capacityVolume}m³</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Max Weight:</span>
                      <span>{selectedVehicle.capacityWeight}kg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge variant="secondary">{selectedVehicle.status}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payload Utilization */}
            {selectedVehicle && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Payload Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Volume Used:</span>
                      <span>{totalVolume.toFixed(2)}m³ / {selectedVehicle.capacityVolume}m³</span>
                    </div>
                    <Progress 
                      value={payloadUtilization} 
                      className="h-3"
                    />
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${utilizationStatus.color}`}>
                        {utilizationStatus.label}
                      </span>
                      <span className="text-sm font-medium">
                        {payloadUtilization.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {payloadUtilization > 90 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">Vehicle overloaded!</span>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Total Weight:</span>
                      <span>{totalWeight}kg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Items:</span>
                      <span>{payloadItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Facilities:</span>
                      <span>{new Set(payloadItems.map(item => item.facilityId)).size}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payload Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Payload Items
                    </CardTitle>
                    <CardDescription>Add facilities and their delivery requirements</CardDescription>
                  </div>
                  <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetItemForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Payload Item</DialogTitle>
                        <DialogDescription>
                          Add a facility and specify the delivery requirements
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddPayloadItem}>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="facility">Facility</Label>
                            <Select
                              value={itemFormData.facilityId}
                              onValueChange={(value) => setItemFormData({ ...itemFormData, facilityId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select facility" />
                              </SelectTrigger>
                              <SelectContent>
                                {mockFacilities.map((facility) => (
                                  <SelectItem key={facility.id} value={facility.id}>
                                    <div className="flex flex-col">
                                      <span>{facility.name}</span>
                                      <span className="text-sm text-muted-foreground">{facility.type}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="box-type">Box Type</Label>
                            <Select
                              value={itemFormData.boxType}
                              onValueChange={(value) => setItemFormData({ ...itemFormData, boxType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {boxTypes.map((boxType) => (
                                  <SelectItem key={boxType.value} value={boxType.value}>
                                    {boxType.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {itemFormData.boxType === 'custom' && (
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-2">
                                <Label htmlFor="length">Length (cm)</Label>
                                <Input
                                  id="length"
                                  type="number"
                                  value={itemFormData.customLength}
                                  onChange={(e) => setItemFormData({ ...itemFormData, customLength: parseFloat(e.target.value) })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="width">Width (cm)</Label>
                                <Input
                                  id="width"
                                  type="number"
                                  value={itemFormData.customWidth}
                                  onChange={(e) => setItemFormData({ ...itemFormData, customWidth: parseFloat(e.target.value) })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="height">Height (cm)</Label>
                                <Input
                                  id="height"
                                  type="number"
                                  value={itemFormData.customHeight}
                                  onChange={(e) => setItemFormData({ ...itemFormData, customHeight: parseFloat(e.target.value) })}
                                />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="quantity">Quantity</Label>
                              <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={itemFormData.quantity}
                                onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseInt(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="weight">Weight per item (kg)</Label>
                              <Input
                                id="weight"
                                type="number"
                                step="0.1"
                                value={itemFormData.weightKg}
                                onChange={(e) => setItemFormData({ ...itemFormData, weightKg: parseFloat(e.target.value) })}
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Add Item</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {payloadItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payload items added yet</p>
                    <p className="text-sm">Add facilities and their delivery requirements to start planning</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Facility</TableHead>
                        <TableHead>Box Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payloadItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.facilityName}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="capitalize">{item.boxType}</span>
                              {item.boxType === 'custom' && (
                                <span className="text-xs text-muted-foreground">
                                  {item.customLength}×{item.customWidth}×{item.customHeight}cm
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{(item.weightKg * item.quantity).toFixed(1)}kg</TableCell>
                          <TableCell>{item.volumeM3.toFixed(3)}m³</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePayloadItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
