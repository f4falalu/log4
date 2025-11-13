import { useVehicleWizard } from '@/hooks/useVehicleWizard';
import { TierVisualizer } from '../TierVisualizer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function Step2CapacityConfig() {
  const { draft, updateDraft, setStep, canProceed } = useVehicleWizard();

  const handleTierRatioChange = (index: number, newRatio: number) => {
    const newTiers = [...(draft.tiers || [])];
    newTiers[index].ratio = newRatio;
    newTiers[index].capacity_kg = ((draft.capacity || 0) * newRatio) / 100;
    updateDraft({ tiers: newTiers });
  };

  const handleCapacityChange = (newCap: number) => {
    updateDraft({ 
      capacity: newCap,
      max_weight: newCap,
      tiers: draft.tiers?.map(t => ({
        ...t,
        capacity_kg: (newCap * t.ratio) / 100
      }))
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base">Vehicle Capacity</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Configure total capacity and tier distribution
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Total Capacity (kg)</Label>
          <Input 
            type="number"
            value={draft.capacity || 0}
            onChange={(e) => handleCapacityChange(parseFloat(e.target.value) || 0)}
            min={0}
          />
        </div>
        <div>
          <Label>Max Weight (kg)</Label>
          <Input 
            type="number"
            value={draft.max_weight || 0}
            onChange={(e) => updateDraft({ max_weight: parseFloat(e.target.value) || 0 })}
            min={0}
          />
        </div>
      </div>

      <TierVisualizer 
        tiers={draft.tiers || []}
        totalCapacity={draft.capacity || 0}
      />

      <div>
        <Label>Tier Distribution</Label>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier Name</TableHead>
              <TableHead>Ratio (%)</TableHead>
              <TableHead>Capacity (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draft.tiers?.map((tier, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{tier.name}</TableCell>
                <TableCell>
                  <Input 
                    type="number"
                    value={tier.ratio}
                    onChange={(e) => handleTierRatioChange(idx, parseFloat(e.target.value) || 0)}
                    className="w-20"
                    min={0}
                    max={100}
                  />
                </TableCell>
                <TableCell>{tier.capacity_kg.toFixed(0)} kg</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2 justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button 
          onClick={() => setStep(3)} 
          disabled={!canProceed(2)}
        >
          Next: Operational Specs
        </Button>
      </div>
    </div>
  );
}
