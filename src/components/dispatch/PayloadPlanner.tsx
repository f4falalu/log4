import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { WeightInput, VolumeInput } from '@/components/ui/unit-input';
import { Plus, Trash2, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Vehicle } from '@/types';
import { validatePayload, suggestVehicle, PayloadItem } from '@/lib/payloadValidation';
import { type WeightUnit, type VolumeUnit, getUserUnitPreferences, saveUserUnitPreferences } from '@/lib/unitConversions';

interface PayloadPlannerProps {
  selectedVehicle?: Vehicle;
  availableVehicles: Vehicle[];
  onPayloadValidated: (items: PayloadItem[], totalWeight: number, totalVolume: number, utilization: number) => void;
  onVehicleSuggested?: (vehicle: Vehicle) => void;
}

export default function PayloadPlanner({
  selectedVehicle,
  availableVehicles,
  onPayloadValidated,
  onVehicleSuggested
}: PayloadPlannerProps) {
  const [items, setItems] = useState<PayloadItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<PayloadItem>>({
    name: '',
    quantity: 1,
    weight_kg: 0,
    volume_m3: 0
  });

  // Unit preferences
  const userPrefs = getUserUnitPreferences();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(userPrefs.weight);
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(userPrefs.volume);

  const handleWeightUnitChange = (unit: WeightUnit) => {
    setWeightUnit(unit);
    saveUserUnitPreferences({ weight: unit });
  };

  const handleVolumeUnitChange = (unit: VolumeUnit) => {
    setVolumeUnit(unit);
    saveUserUnitPreferences({ volume: unit });
  };

  const addItem = () => {
    if (!currentItem.name || !currentItem.weight_kg || !currentItem.volume_m3) {
      return;
    }

    const newItem: PayloadItem = {
      name: currentItem.name,
      quantity: currentItem.quantity || 1,
      weight_kg: currentItem.weight_kg,
      volume_m3: currentItem.volume_m3,
      temperature_required: currentItem.temperature_required || false,
      handling_instructions: currentItem.handling_instructions
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    
    // Validate and notify parent
    if (selectedVehicle) {
      const validation = validatePayload(updatedItems, selectedVehicle);
      onPayloadValidated(
        updatedItems, 
        validation.totalWeight, 
        validation.totalVolume,
        Math.max(validation.weightUtilization, validation.volumeUtilization)
      );
    }

    // Reset form
    setCurrentItem({
      name: '',
      quantity: 1,
      weight_kg: 0,
      volume_m3: 0
    });
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    
    if (selectedVehicle) {
      const validation = validatePayload(updatedItems, selectedVehicle);
      onPayloadValidated(
        updatedItems, 
        validation.totalWeight, 
        validation.totalVolume,
        Math.max(validation.weightUtilization, validation.volumeUtilization)
      );
    }
  };

  const getSuggestedVehicle = () => {
    if (items.length === 0) return;
    const suggested = suggestVehicle(items, availableVehicles);
    if (suggested && onVehicleSuggested) {
      onVehicleSuggested(suggested);
    }
  };

  const validation = selectedVehicle ? validatePayload(items, selectedVehicle) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Payload Planning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Item Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="item-name">Item Name</Label>
            <Input
              id="item-name"
              value={currentItem.name || ''}
              onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
              placeholder="Medical supplies..."
            />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={currentItem.quantity || 1}
              onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) })}
            />
          </div>
          <WeightInput
            label="Weight"
            value={currentItem.weight_kg || 0}
            onChange={(value) => setCurrentItem({ ...currentItem, weight_kg: value })}
            unit={weightUnit}
            onUnitChange={handleWeightUnitChange}
            min={0}
            placeholder="Enter weight"
          />
          <VolumeInput
            label="Volume"
            value={currentItem.volume_m3 || 0}
            onChange={(value) => setCurrentItem({ ...currentItem, volume_m3: value })}
            unit={volumeUnit}
            onUnitChange={handleVolumeUnitChange}
            min={0}
            placeholder="Enter volume"
          />
        </div>

        <Button onClick={addItem} size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>

        {/* Items List */}
        {items.length > 0 && (
          <div className="space-y-2">
            <Label>Payload Items ({items.length})</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} • {item.weight_kg}kg • {item.volume_m3}m³
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Results */}
        {validation && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Weight</span>
              <Badge variant={validation.totalWeight > (selectedVehicle?.maxWeight || 0) ? 'destructive' : 'secondary'}>
                {validation.totalWeight.toFixed(1)} / {selectedVehicle?.maxWeight} kg
              </Badge>
            </div>
            <Progress value={validation.weightUtilization} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Weight Utilization: {validation.weightUtilization.toFixed(1)}%
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Volume</span>
              <Badge variant={validation.totalVolume > (selectedVehicle?.capacity || 0) ? 'destructive' : 'secondary'}>
                {validation.totalVolume.toFixed(2)} / {selectedVehicle?.capacity} m³
              </Badge>
            </div>
            <Progress value={validation.volumeUtilization} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Volume Utilization: {validation.volumeUtilization.toFixed(1)}%
            </div>

            {/* Warnings */}
            {validation.overloadWarnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validation.overloadWarnings.map((warning, i) => (
                    <div key={i}>{warning}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {validation.isValid && (
              <Alert variant="success" className="border-success/20 bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Payload validated successfully
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Suggest Vehicle */}
        {items.length > 0 && !selectedVehicle && (
          <Button onClick={getSuggestedVehicle} variant="outline" className="w-full">
            Suggest Optimal Vehicle
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
