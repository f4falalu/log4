import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FacilityMapSelector } from './FacilityMapSelector';
import { VehicleSlotGrid } from './VehicleSlotGrid';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useFacilities } from '@/hooks/useFacilities';
import { useCreateDeliveryBatch } from '@/hooks/useDeliveryBatches';
import {
  CalendarIcon,
  Clock,
  Building2,
  MapPin,
  User,
  Truck,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  scheduledDate: Date | undefined;
  scheduledTime: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes: string;
  warehouseId: string;
  facilityIds: string[];
  driverId: string;
  vehicleId: string;
}

const STEPS = [
  { id: 1, title: 'Schedule', icon: CalendarIcon },
  { id: 2, title: 'Route Planning', icon: MapPin },
  { id: 3, title: 'Assignment', icon: User },
  { id: 4, title: 'Review', icon: Check },
];

export function CreateBatchDialog({ open, onOpenChange }: CreateBatchDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    scheduledDate: undefined,
    scheduledTime: '08:00',
    priority: 'medium',
    notes: '',
    warehouseId: '',
    facilityIds: [],
    driverId: '',
    vehicleId: '',
  });

  const { data: warehouses = [] } = useWarehouses();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const { data: facilitiesData } = useFacilities();
  const createBatch = useCreateDeliveryBatch();

  const facilities = facilitiesData?.facilities || [];

  // Get selected data for display
  const selectedWarehouse = warehouses.find(w => w.id === formData.warehouseId);
  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const selectedFacilities = facilities.filter(f => formData.facilityIds.includes(f.id));

  // Available drivers and vehicles
  const availableDrivers = drivers.filter(d => d.status === 'available');
  const availableVehicles = vehicles.filter(v => v.status === 'available');

  // Calculate slot validation for selected vehicle
  const slotValidation = useMemo(() => {
    if (!selectedVehicle || formData.facilityIds.length === 0) {
      return { valid: true, totalSlots: 0, requiredSlots: 0 };
    }

    // Get total slots from vehicle tiered_config
    const tieredConfig = (selectedVehicle as any).tiered_config;
    let totalSlots = 0;

    if (tieredConfig?.tiers && Array.isArray(tieredConfig.tiers)) {
      totalSlots = tieredConfig.tiers.reduce((sum: number, tier: any) => sum + (tier.slot_count || 0), 0);
    }

    // Each facility requires 1 slot (simplified - in real app, derive from requisition packaging)
    const requiredSlots = formData.facilityIds.length;

    return {
      valid: requiredSlots <= totalSlots,
      totalSlots,
      requiredSlots,
      overflow: requiredSlots > totalSlots ? requiredSlots - totalSlots : 0,
    };
  }, [selectedVehicle, formData.facilityIds]);

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!formData.scheduledDate || !formData.warehouseId || formData.facilityIds.length === 0) {
      return;
    }

    // Block if slot overflow and vehicle selected
    if (formData.vehicleId && !slotValidation.valid) {
      return;
    }

    try {
      await createBatch.mutateAsync({
        name: formData.name || `Batch ${format(formData.scheduledDate, 'MMM d, yyyy')}`,
        warehouseId: formData.warehouseId,
        facilities: selectedFacilities,
        scheduledDate: format(formData.scheduledDate, 'yyyy-MM-dd'),
        scheduledTime: formData.scheduledTime,
        status: formData.driverId && formData.vehicleId ? 'assigned' : 'planned',
        priority: formData.priority,
        medicationType: 'Mixed', // Default - actual types come from requisitions
        totalQuantity: 0, // Derived from requisitions, not entered here
        totalDistance: 0, // Will be calculated by route optimization
        estimatedDuration: formData.facilityIds.length * 20, // Rough estimate: 20min per facility
        optimizedRoute: [],
        driverId: formData.driverId || undefined,
        vehicleId: formData.vehicleId || undefined,
        notes: formData.notes || undefined,
      });

      // Reset and close
      setFormData({
        name: '',
        scheduledDate: undefined,
        scheduledTime: '08:00',
        priority: 'medium',
        notes: '',
        warehouseId: '',
        facilityIds: [],
        driverId: '',
        vehicleId: '',
      });
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.scheduledDate && formData.scheduledTime;
      case 2:
        return formData.warehouseId && formData.facilityIds.length > 0;
      case 3:
        // If vehicle is selected, must pass slot validation
        if (formData.vehicleId && !slotValidation.valid) {
          return false;
        }
        return true; // Assignment is optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Batch Name (optional)</Label>
              <Input
                id="name"
                placeholder="e.g., Morning Kano Deliveries"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate from date
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scheduled Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.scheduledDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.scheduledDate
                        ? format(formData.scheduledDate, 'PPP')
                        : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.scheduledDate}
                      onSelect={(date) => setFormData({ ...formData, scheduledDate: date })}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Start Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                  setFormData({ ...formData, priority: value })
                }
              >
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions or notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Origin Warehouse *</Label>
              <Select
                value={formData.warehouseId}
                onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {warehouse.name}
                        <Badge variant="outline" className="text-xs">
                          {warehouse.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Select Facilities * (Map-assisted)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select facilities from the map or list. Geographic clustering helps optimize routes.
              </p>
              <FacilityMapSelector
                selectedFacilityIds={formData.facilityIds}
                onSelectionChange={(ids) => setFormData({ ...formData, facilityIds: ids })}
                warehouse={selectedWarehouse}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Optionally assign a driver and vehicle to this batch. You can also do this later.
            </p>

            <div className="space-y-2">
              <Label>Driver</Label>
              <Select
                value={formData.driverId}
                onValueChange={(value) => setFormData({ ...formData, driverId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No driver assigned</SelectItem>
                  {availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {driver.name}
                        <Badge variant="secondary" className="text-xs">
                          {driver.licenseType}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableDrivers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No available drivers at the moment
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No vehicle assigned</SelectItem>
                  {availableVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {vehicle.model} ({vehicle.plateNumber})
                        <Badge variant="outline" className="text-xs">
                          {vehicle.capacity}m³
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableVehicles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No available vehicles at the moment
                </p>
              )}
            </div>

            {/* Vehicle Slot Grid - Read-only display */}
            {formData.vehicleId && selectedVehicle && (
              <div className="space-y-2">
                <Separator className="my-4" />
                <Label>Vehicle Slot Capacity</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Slot allocation is based on vehicle configuration (read-only)
                </p>
                <VehicleSlotGrid
                  vehicle={selectedVehicle}
                  requiredSlots={formData.facilityIds.length}
                />

                {/* Slot overflow warning */}
                {!slotValidation.valid && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This batch requires {slotValidation.requiredSlots} slots but the vehicle only has {slotValidation.totalSlots}.
                      Please select a different vehicle or reduce the number of facilities.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium">Batch Summary</h4>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {formData.name || `Batch ${formData.scheduledDate ? format(formData.scheduledDate, 'MMM d, yyyy') : ''}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <Badge
                    variant={
                      formData.priority === 'urgent'
                        ? 'destructive'
                        : formData.priority === 'high'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {formData.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Scheduled</p>
                  <p className="font-medium">
                    {formData.scheduledDate
                      ? format(formData.scheduledDate, 'PPP')
                      : 'Not set'}{' '}
                    at {formData.scheduledTime}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={formData.driverId && formData.vehicleId ? 'default' : 'secondary'}>
                    {formData.driverId && formData.vehicleId ? 'Assigned' : 'Planned'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Origin Warehouse</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{selectedWarehouse?.name || 'Not selected'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Facilities ({formData.facilityIds.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedFacilities.slice(0, 5).map((f) => (
                    <Badge key={f.id} variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {f.name}
                    </Badge>
                  ))}
                  {selectedFacilities.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedFacilities.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Driver</p>
                  <p className="font-medium">
                    {selectedDriver?.name || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-medium">
                    {selectedVehicle
                      ? `${selectedVehicle.model} (${selectedVehicle.plateNumber})`
                      : 'Not assigned'}
                  </p>
                </div>
              </div>

              {/* Slot allocation summary */}
              {selectedVehicle && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Slot Allocation</p>
                  <p className="font-medium">
                    {slotValidation.requiredSlots} / {slotValidation.totalSlots} slots
                    {slotValidation.valid ? (
                      <Badge variant="secondary" className="ml-2 text-xs">OK</Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-2 text-xs">Overflow</Badge>
                    )}
                  </p>
                </div>
              )}

              {formData.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm">Notes</p>
                    <p className="text-sm">{formData.notes}</p>
                  </div>
                </>
              )}
            </div>

            {/* Final validation warning */}
            {formData.vehicleId && !slotValidation.valid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Cannot create batch: slot overflow detected. Please go back and select a different vehicle or reduce facilities.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Determine dialog size based on step
  const getDialogClass = () => {
    if (currentStep === 2) {
      // Larger dialog for map-assisted facility selection
      return 'sm:max-w-[900px] max-h-[90vh]';
    }
    return 'sm:max-w-[600px] max-h-[90vh]';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(getDialogClass(), 'overflow-y-auto')}>
        <DialogHeader>
          <DialogTitle>Create Delivery Batch</DialogTitle>
          <DialogDescription>
            Plan a delivery route with map-assisted facility selection
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'ml-2 text-xs hidden sm:inline',
                    isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-8 h-0.5 mx-2',
                      isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Step content */}
        <div className="py-4 min-h-[300px]">{renderStepContent()}</div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createBatch.isPending || (formData.vehicleId && !slotValidation.valid)}
            >
              {createBatch.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Batch
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateBatchDialog;
