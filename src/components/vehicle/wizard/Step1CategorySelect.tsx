import { useVehicleWizard } from '@/hooks/useVehicleWizard';
import { useVehicleCategories } from '@/hooks/useVehicleCategories';
import { CategoryCard } from '../CategoryCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function Step1CategorySelect() {
  const { draft, updateDraft, setStep, canProceed } = useVehicleWizard();
  const { data: categories, isLoading } = useVehicleCategories();

  const handleCategorySelect = (category: any) => {
    updateDraft({
      category_id: category.id,
      capacity: category.default_capacity_kg,
      max_weight: category.default_capacity_kg,
      tiers: category.default_tiers.map((t: any) => ({
        ...t,
        capacity_kg: (category.default_capacity_kg * t.ratio) / 100
      }))
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base">Select Vehicle Category</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the type of vehicle you're adding to the fleet
        </p>
        <div className="grid grid-cols-3 gap-4">
          {categories?.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              selected={draft.category_id === cat.id}
              onClick={() => handleCategorySelect(cat)}
            />
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Subcategory / Body Type</Label>
          <Select 
            value={draft.subcategory} 
            onValueChange={(v) => updateDraft({ subcategory: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select body type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Flatbed">Flatbed</SelectItem>
              <SelectItem value="Box">Box / Enclosed</SelectItem>
              <SelectItem value="Refrigerated">Refrigerated</SelectItem>
              <SelectItem value="Tanker">Tanker</SelectItem>
              <SelectItem value="Standard">Standard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Fuel Type</Label>
          <Select 
            value={draft.fuel_type} 
            onValueChange={(v: any) => updateDraft({ fuel_type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diesel">Diesel</SelectItem>
              <SelectItem value="petrol">Petrol</SelectItem>
              <SelectItem value="electric">Electric</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Model</Label>
          <Input 
            value={draft.model} 
            onChange={(e) => updateDraft({ model: e.target.value })}
            placeholder="e.g., Toyota HUAC, Isuzu NPR"
          />
        </div>
        <div>
          <Label>Plate Number</Label>
          <Input 
            value={draft.plate_number} 
            onChange={(e) => updateDraft({ plate_number: e.target.value })}
            placeholder="e.g., ABC-1234"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={() => setStep(2)} 
          disabled={!canProceed(1)}
        >
          Next: Configure Capacity
        </Button>
      </div>
    </div>
  );
}
