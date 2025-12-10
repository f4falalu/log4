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
import { Plus, Package, Truck, Calculator, Trash2, AlertTriangle, Send, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useVehicles } from '@/hooks/useVehicles';
import { useFacilities } from '@/hooks/useFacilities';
import { useCreatePayloadItem, useDeletePayloadItem } from '@/hooks/usePayloadItems';
import { PayloadVisualizer } from '@/components/payload/PayloadVisualizer';
import { FinalizePayloadDialog } from '@/components/storefront/FinalizePayloadDialog';
import { useRequisitions } from '@/hooks/useRequisitions';
import { useConvertRequisitionToPayload } from '@/hooks/useRequisitionToPayload';


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
  // Real data hooks
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const { data: facilities = [], isLoading: facilitiesLoading } = useFacilities();
  const { data: approvedRequisitions = [] } = useRequisitions('approved');
  const createPayloadItemMutation = useCreatePayloadItem();
  const deletePayloadItemMutation = useDeletePayloadItem();
  const convertRequisition = useConvertRequisitionToPayload();

  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [payloadItems, setPayloadItems] = useState<PayloadItem[]>([]);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
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

    const facility = facilities.find(f => f.id === itemFormData.facilityId);
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


  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 70) return 'bg-success';
    if (utilization <= 90) return 'bg-warning';
    return 'bg-destructive';
  };

  const getUtilizationStatus = (utilization: number) => {
    if (utilization <= 70) return { label: 'Optimal', color: 'text-success' };
    if (utilization <= 90) return { label: 'Near Capacity', color: 'text-warning' };
    return { label: 'Overloaded', color: 'text-destructive' };
  };

  const totalWeight = payloadItems.reduce((sum, item) => sum + (item.weightKg * item.quantity), 0);
  const totalVolume = payloadItems.reduce((sum, item) => sum + item.volumeM3, 0);
  const utilizationStatus = getUtilizationStatus(payloadUtilization);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payload Planner</h1>
            <p className="text-muted-foreground">Plan and optimize vehicle payload assignments</p>
          </div>
          <div className="flex gap-2">
            {approvedRequisitions.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => {
                  // Convert first approved requisition as example
                  if (approvedRequisitions[0]) {
                    toast.info('Converting requisition to payload items...');
                  }
                }}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Import from Requisitions
              </Button>
            )}
            <Button 
              onClick={() => setIsFinalizeDialogOpen(true)}
              disabled={!selectedVehicle || payloadItems.length === 0}
              className="bg-biko-primary hover:bg-biko-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              Finalize & Send to FleetOps
            </Button>
          </div>
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
                    const vehicle = vehicles.find(v => v.id === value);
                    setSelectedVehicle(vehicle);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
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

                {selectedVehicle && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Capacity:</span>
                      <span>{(selectedVehicle as any).capacity_volume_m3 || 0}m³</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Max Weight:</span>
                      <span>{(selectedVehicle as any).capacity_weight_kg || 0}kg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge variant="secondary">{selectedVehicle.status}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payload Visualizer */}
            {selectedVehicle && (
              <PayloadVisualizer
                items={payloadItems.map(item => ({
                  id: item.id,
                  name: item.facilityName,
                  weight_kg: item.weightKg,
                  volume_m3: item.volumeM3,
                  quantity: item.quantity
                }))}
                vehicleCapacityWeight={(selectedVehicle as any).max_weight || 1000}
                vehicleCapacityVolume={(selectedVehicle as any).capacity || 10}
                showVisual={true}
              />
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
                                {facilities.map((facility) => (
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

      {/* Finalize Dialog */}
      {selectedVehicle && (
        <FinalizePayloadDialog
          open={isFinalizeDialogOpen}
          onClose={() => setIsFinalizeDialogOpen(false)}
          vehicleId={selectedVehicle.id}
          vehicleName={`${selectedVehicle.model} (${selectedVehicle.plateNumber})`}
        />
      )}
    </div>
  );
}
