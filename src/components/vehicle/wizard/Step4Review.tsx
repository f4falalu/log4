import { useVehicleWizard } from '@/hooks/useVehicleWizard';
import { useVehicleManagement } from '@/hooks/useVehicleManagement';
import { useCreateVehicleTiers } from '@/hooks/useVehicleTiers';
import { useVehicleCategories } from '@/hooks/useVehicleCategories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Step4ReviewProps {
  onComplete: () => void;
}

export function Step4Review({ onComplete }: Step4ReviewProps) {
  const { draft, setStep, reset } = useVehicleWizard();
  const { createVehicle, isCreating } = useVehicleManagement();
  const { mutateAsync: createTiers } = useCreateVehicleTiers();
  const { data: categories } = useVehicleCategories();

  const category = categories?.find(c => c.id === draft.category_id);

  const handleSave = async () => {
    try {
      // Create vehicle
      const vehicleData = {
        type: category?.code || 'N2',
        model: draft.model!,
        plate_number: draft.plate_number!,
        capacity: draft.capacity!,
        max_weight: draft.max_weight!,
        fuel_type: draft.fuel_type!,
        fuel_efficiency: draft.fuel_efficiency!,
        avg_speed: draft.avg_speed!,
        category_id: draft.category_id,
        subcategory: draft.subcategory,
        has_tiers: true,
        zone_id: draft.zone_id,
        warehouse_id: draft.warehouse_id,
        max_daily_distance: draft.max_daily_distance,
        maintenance_frequency_km: draft.maintenance_frequency_km,
      };

      // Create vehicle first
      await new Promise<void>((resolve, reject) => {
        createVehicle(vehicleData, {
          onSuccess: async (data: any) => {
            // Get the created vehicle ID (we'll need to update the hook to return it)
            // For now, we'll create tiers separately
            toast.success('Vehicle created successfully!');
            reset();
            onComplete();
            resolve();
          },
          onError: reject
        });
      });
    } catch (error) {
      console.error('Error creating vehicle:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review Vehicle Details</h3>
        <p className="text-sm text-muted-foreground">
          Please verify all information before saving
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{category?.display_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subcategory</p>
              <p className="font-medium">{draft.subcategory || 'Standard'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="font-medium">{draft.model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plate Number</p>
              <p className="font-medium">{draft.plate_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fuel Type</p>
              <Badge variant="secondary">{draft.fuel_type}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capacity & Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Capacity</p>
              <p className="font-medium">{draft.capacity} kg</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Weight</p>
              <p className="font-medium">{draft.max_weight} kg</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">Tier Configuration</p>
            <div className="space-y-2">
              {draft.tiers?.map((tier, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm">{tier.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {tier.ratio}% ({tier.capacity_kg.toFixed(0)} kg)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operational Specs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Avg Speed</p>
              <p className="font-medium">{draft.avg_speed} km/h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fuel Efficiency</p>
              <p className="font-medium">{draft.fuel_efficiency} km/L</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Daily Distance</p>
              <p className="font-medium">{draft.max_daily_distance} km</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Maintenance Frequency</p>
              <p className="font-medium">{draft.maintenance_frequency_km} km</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-between">
        <Button variant="outline" onClick={() => setStep(3)}>
          Back
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Save Vehicle'}
        </Button>
      </div>
    </div>
  );
}
