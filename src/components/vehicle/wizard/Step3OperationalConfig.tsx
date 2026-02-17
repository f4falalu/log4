import { useVehicleWizard } from '@/hooks/useVehicleWizard';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useWarehouses } from '@/hooks/useWarehouses';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Step3OperationalConfig() {
  const { draft, updateDraft, setStep, canProceed } = useVehicleWizard();
  const { data: zones = [] } = useServiceZones();
  const { data: warehousesData } = useWarehouses();
  const warehouses = warehousesData?.warehouses || [];

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base">Operational Specifications</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Configure performance metrics and assignments
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Average Speed (km/h)</Label>
          <Input 
            type="number"
            value={draft.avg_speed || 50}
            onChange={(e) => updateDraft({ avg_speed: parseFloat(e.target.value) || 50 })}
            min={0}
          />
        </div>
        <div>
          <Label>Fuel Efficiency (km/L)</Label>
          <Input 
            type="number"
            value={draft.fuel_efficiency || 12}
            onChange={(e) => updateDraft({ fuel_efficiency: parseFloat(e.target.value) || 12 })}
            min={0}
            step={0.1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Max Daily Distance (km)</Label>
          <Input 
            type="number"
            value={draft.max_daily_distance || 400}
            onChange={(e) => updateDraft({ max_daily_distance: parseInt(e.target.value) || 400 })}
            min={0}
          />
        </div>
        <div>
          <Label>Maintenance Frequency (km)</Label>
          <Input 
            type="number"
            value={draft.maintenance_frequency_km || 10000}
            onChange={(e) => updateDraft({ maintenance_frequency_km: parseInt(e.target.value) || 10000 })}
            min={0}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Service Zone (Optional)</Label>
          <Select 
            value={draft.zone_id} 
            onValueChange={(v) => updateDraft({ zone_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Warehouse Assignment (Optional)</Label>
          <Select 
            value={draft.warehouse_id} 
            onValueChange={(v) => updateDraft({ warehouse_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          Back
        </Button>
        <Button 
          onClick={() => setStep(4)} 
          disabled={!canProceed(3)}
        >
          Next: Review & Save
        </Button>
      </div>
    </div>
  );
}
