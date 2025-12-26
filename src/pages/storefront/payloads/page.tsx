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
import { Plus, Package, Truck, Calculator, Trash2, AlertTriangle, Send, Wand2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useVehicles } from '@/hooks/useVehicles';
import { useFacilities } from '@/hooks/useFacilities';
import { usePayloadItems, useCreatePayloadItem, useDeletePayloadItem } from '@/hooks/usePayloadItems';
import { usePayloads, useCreatePayload, useUpdatePayload, useFinalizePayload } from '@/hooks/usePayloads';
import { PayloadVisualizer } from '@/components/payload/PayloadVisualizer';
import { FinalizePayloadDialog } from '@/components/storefront/FinalizePayloadDialog';
import { useRequisitions } from '@/hooks/useRequisitions';

const boxTypes = [
  { value: 'small', label: 'Small (45×30×67cm)', volume: 0.091 },
  { value: 'medium', label: 'Medium (50×35×80cm)', volume: 0.142 },
  { value: 'large', label: 'Large (60×40×120cm)', volume: 0.288 },
  { value: 'custom', label: 'Custom Dimensions', volume: 0 }
];

export default function PayloadPlannerPage() {
  // Data hooks
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const { data: facilities = [], isLoading: facilitiesLoading } = useFacilities();
  const { data: approvedRequisitions = [] } = useRequisitions('approved');
  const { data: draftPayloads = [] } = usePayloads('draft');

  // Mutations
  const createPayloadMutation = useCreatePayload();
  const updatePayloadMutation = useUpdatePayload();
  const createPayloadItemMutation = useCreatePayloadItem();
  const deletePayloadItemMutation = useDeletePayloadItem();
  const finalizePayloadMutation = useFinalizePayload();

  // Local state
  const [currentPayloadId, setCurrentPayloadId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [payloadName, setPayloadName] = useState('');

  // Get current payload items
  const { data: payloadItems = [] } = usePayloadItems(undefined, currentPayloadId || undefined);

  // Get current payload details
  const currentPayload = draftPayloads.find(p => p.id === currentPayloadId);

  // Item form state
  const [itemFormData, setItemFormData] = useState({
    facilityId: '',
    boxType: 'small',
    quantity: 1,
    customLength: 0,
    customWidth: 0,
    customHeight: 0,
    weightKg: 10
  });

  // Initialize or load existing draft payload
  useEffect(() => {
    if (draftPayloads.length > 0 && !currentPayloadId) {
      // Load the most recent draft
      setCurrentPayloadId(draftPayloads[0].id);
      setPayloadName(draftPayloads[0].name);
      setSelectedVehicleId(draftPayloads[0].vehicle_id);
    }
  }, [draftPayloads, currentPayloadId]);

  const createNewPayload = async () => {
    const name = `Payload ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const result = await createPayloadMutation.mutateAsync({
      name,
      vehicle_id: selectedVehicleId,
      status: 'draft',
    });
    setCurrentPayloadId(result.id);
    setPayloadName(result.name);
  };

  const handleVehicleSelect = async (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);

    if (currentPayloadId) {
      // Update existing payload
      await updatePayloadMutation.mutateAsync({
        id: currentPayloadId,
        data: { vehicle_id: vehicleId }
      });
    }
  };

  const handleSavePayload = async () => {
    if (!currentPayloadId) return;

    await updatePayloadMutation.mutateAsync({
      id: currentPayloadId,
      data: { name: payloadName }
    });
    toast.success('Payload saved successfully');
  };

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

  const handleAddPayloadItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemFormData.facilityId) {
      toast.error('Please select a facility');
      return;
    }

    if (!currentPayloadId) {
      toast.error('Please create or select a payload first');
      return;
    }

    await createPayloadItemMutation.mutateAsync({
      payload_id: currentPayloadId,
      facility_id: itemFormData.facilityId,
      box_type: itemFormData.boxType as 'small' | 'medium' | 'large' | 'custom',
      custom_length_cm: itemFormData.boxType === 'custom' ? itemFormData.customLength : undefined,
      custom_width_cm: itemFormData.boxType === 'custom' ? itemFormData.customWidth : undefined,
      custom_height_cm: itemFormData.boxType === 'custom' ? itemFormData.customHeight : undefined,
      quantity: itemFormData.quantity,
      weight_kg: itemFormData.weightKg,
      status: 'pending',
    });

    setIsAddItemDialogOpen(false);
    resetItemForm();
  };

  const handleRemovePayloadItem = async (itemId: string) => {
    await deletePayloadItemMutation.mutateAsync(itemId);
  };

  const handleFinalizePayload = async () => {
    if (!currentPayloadId) return;

    await finalizePayloadMutation.mutateAsync(currentPayloadId);
    setIsFinalizeDialogOpen(false);
    setCurrentPayloadId(null);
    setSelectedVehicleId(null);
    setPayloadName('');
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

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const payloadUtilization = currentPayload?.utilization_pct || 0;
  const totalWeight = currentPayload?.total_weight_kg || 0;
  const totalVolume = currentPayload?.total_volume_m3 || 0;
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
          {!currentPayloadId && (
            <Button onClick={createNewPayload}>
              <Plus className="h-4 w-4 mr-2" />
              New Payload
            </Button>
          )}
          {currentPayloadId && (
            <>
              <Button variant="outline" onClick={handleSavePayload}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={() => setIsFinalizeDialogOpen(true)}
                disabled={!selectedVehicleId || payloadItems.length === 0}
                className="bg-biko-primary hover:bg-biko-primary/90"
              >
                <Send className="h-4 w-4 mr-2" />
                Finalize & Send to FleetOps
              </Button>
            </>
          )}
        </div>
      </div>

      {!currentPayloadId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Payload</h3>
            <p className="text-muted-foreground mb-4">Create a new payload to start planning</p>
            <Button onClick={createNewPayload}>
              <Plus className="h-4 w-4 mr-2" />
              Create Payload
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                <div>
                  <Label htmlFor="payload-name">Payload Name</Label>
                  <Input
                    id="payload-name"
                    value={payloadName}
                    onChange={(e) => setPayloadName(e.target.value)}
                    placeholder="Enter payload name"
                  />
                </div>

                <div>
                  <Label htmlFor="vehicle">Select Vehicle</Label>
                  <Select
                    value={selectedVehicleId || ''}
                    onValueChange={handleVehicleSelect}
                  >
                    <SelectTrigger id="vehicle">
                      <SelectValue placeholder="Choose a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehiclesLoading ? (
                        <SelectItem value="loading" disabled>Loading vehicles...</SelectItem>
                      ) : (
                        vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.registration_number} - {vehicle.type}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedVehicle && (
                  <div className="pt-4 space-y-3 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacity (Volume)</span>
                      <span className="font-medium">{selectedVehicle.capacityVolume?.toFixed(2) || 'N/A'} m³</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacity (Weight)</span>
                      <span className="font-medium">{selectedVehicle.capacityWeight?.toFixed(0) || 'N/A'} kg</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Utilization</span>
                        <span className={`font-medium ${utilizationStatus.color}`}>
                          {payloadUtilization.toFixed(1)}% - {utilizationStatus.label}
                        </span>
                      </div>
                      <Progress
                        value={payloadUtilization}
                        className={`h-2 ${getUtilizationColor(payloadUtilization)}`}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payload Summary */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Payload Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Items</span>
                  <span className="font-semibold">{payloadItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Weight</span>
                  <span className="font-semibold">{totalWeight.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Volume</span>
                  <span className="font-semibold">{totalVolume.toFixed(3)} m³</span>
                </div>
                {payloadUtilization > 90 && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">Capacity Warning</p>
                      <p className="text-muted-foreground">Vehicle is over 90% capacity. Consider redistributing items.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
                    <CardDescription>Add items to this payload</CardDescription>
                  </div>
                  <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <form onSubmit={handleAddPayloadItem}>
                        <DialogHeader>
                          <DialogTitle>Add Payload Item</DialogTitle>
                          <DialogDescription>
                            Add a new item to this payload
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="facility">Facility</Label>
                            <Select
                              value={itemFormData.facilityId}
                              onValueChange={(value) => setItemFormData({...itemFormData, facilityId: value})}
                            >
                              <SelectTrigger id="facility">
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

                          <div>
                            <Label htmlFor="boxType">Box Type</Label>
                            <Select
                              value={itemFormData.boxType}
                              onValueChange={(value) => setItemFormData({...itemFormData, boxType: value})}
                            >
                              <SelectTrigger id="boxType">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {boxTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {itemFormData.boxType === 'custom' && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label htmlFor="length">Length (cm)</Label>
                                <Input
                                  id="length"
                                  type="number"
                                  value={itemFormData.customLength}
                                  onChange={(e) => setItemFormData({...itemFormData, customLength: parseFloat(e.target.value)})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="width">Width (cm)</Label>
                                <Input
                                  id="width"
                                  type="number"
                                  value={itemFormData.customWidth}
                                  onChange={(e) => setItemFormData({...itemFormData, customWidth: parseFloat(e.target.value)})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="height">Height (cm)</Label>
                                <Input
                                  id="height"
                                  type="number"
                                  value={itemFormData.customHeight}
                                  onChange={(e) => setItemFormData({...itemFormData, customHeight: parseFloat(e.target.value)})}
                                />
                              </div>
                            </div>
                          )}

                          <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              min="1"
                              value={itemFormData.quantity}
                              onChange={(e) => setItemFormData({...itemFormData, quantity: parseInt(e.target.value)})}
                            />
                          </div>

                          <div>
                            <Label htmlFor="weight">Weight per Box (kg)</Label>
                            <Input
                              id="weight"
                              type="number"
                              min="0"
                              step="0.1"
                              value={itemFormData.weightKg}
                              onChange={(e) => setItemFormData({...itemFormData, weightKg: parseFloat(e.target.value)})}
                            />
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
                    <p>No items added yet</p>
                    <p className="text-sm">Click "Add Item" to start building your payload</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Facility</TableHead>
                        <TableHead>Box Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Volume (m³)</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payloadItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.facility?.name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {boxTypes.find(t => t.value === item.box_type)?.label.split(' ')[0] || item.box_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{(item.weight_kg * item.quantity).toFixed(2)}</TableCell>
                          <TableCell>{item.volume_m3.toFixed(3)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePayloadItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Payload Visualizer */}
            {selectedVehicle && payloadItems.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Payload Visualization</CardTitle>
                  <CardDescription>Visual representation of vehicle utilization</CardDescription>
                </CardHeader>
                <CardContent>
                  <PayloadVisualizer
                    items={payloadItems.map(item => ({
                      id: item.id,
                      facilityId: item.facility_id || '',
                      facilityName: item.facility?.name || 'Unknown',
                      boxType: item.box_type,
                      quantity: item.quantity,
                      customLength: item.custom_length_cm,
                      customWidth: item.custom_width_cm,
                      customHeight: item.custom_height_cm,
                      weightKg: item.weight_kg,
                      volumeM3: item.volume_m3,
                    }))}
                    vehicleCapacity={selectedVehicle.capacityVolume || 0}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Finalize Dialog */}
      {currentPayloadId && (
        <FinalizePayloadDialog
          open={isFinalizeDialogOpen}
          onOpenChange={setIsFinalizeDialogOpen}
          onConfirm={handleFinalizePayload}
          payloadSummary={{
            vehicleName: selectedVehicle?.registration_number || 'No vehicle selected',
            totalItems: payloadItems.length,
            totalWeight,
            totalVolume,
            utilization: payloadUtilization,
          }}
        />
      )}
    </div>
  );
}
