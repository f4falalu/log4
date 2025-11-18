/**
 * VLMS Vehicle Onboarding - Capacity Configurator Component
 * Step 3: Configure vehicle capacity and dimensions
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, ArrowLeft, AlertCircle, Ruler, Package, Weight, Layers } from 'lucide-react';
import { useVehicleOnboardState } from '@/hooks/useVehicleOnboardState';
import {
  calculateVolumeFromDimensions,
  formatVolume,
  formatWeight,
  formatDimensions,
  createDimensionalConfig,
} from '@/lib/vlms/capacityCalculations';
import { validateCapacityConfig } from '@/lib/vlms/tierValidation';
import { cn } from '@/lib/utils';

export function CapacityConfigurator() {
  const capacityConfig = useVehicleOnboardState((state) => state.capacityConfig);
  const updateCapacityConfig = useVehicleOnboardState((state) => state.updateCapacityConfig);
  const goToNextStep = useVehicleOnboardState((state) => state.goToNextStep);
  const goToPreviousStep = useVehicleOnboardState((state) => state.goToPreviousStep);

  const [lengthCm, setLengthCm] = useState(capacityConfig.dimensions?.length_cm?.toString() || '');
  const [widthCm, setWidthCm] = useState(capacityConfig.dimensions?.width_cm?.toString() || '');
  const [heightCm, setHeightCm] = useState(capacityConfig.dimensions?.height_cm?.toString() || '');
  const [manualWeightKg, setManualWeightKg] = useState(capacityConfig.capacity_kg?.toString() || '1000');
  const [manualVolumeM3, setManualVolumeM3] = useState(capacityConfig.capacity_m3?.toString() || '4.5');

  const useDimensions = capacityConfig.use_dimensions;

  // Calculate volume from dimensions
  const calculatedVolume = lengthCm && widthCm && heightCm
    ? calculateVolumeFromDimensions(
        parseInt(lengthCm) || 0,
        parseInt(widthCm) || 0,
        parseInt(heightCm) || 0
      )
    : 0;

  // Validate configuration
  const validation = validateCapacityConfig(capacityConfig);

  const handleToggleDimensions = (checked: boolean) => {
    if (checked && lengthCm && widthCm && heightCm) {
      // Switch to dimensional mode
      const dimensions = createDimensionalConfig(
        parseInt(lengthCm),
        parseInt(widthCm),
        parseInt(heightCm)
      );
      updateCapacityConfig({
        use_dimensions: true,
        dimensions,
        capacity_m3: dimensions.calculated_volume_m3,
      });
    } else {
      // Switch to manual mode
      updateCapacityConfig({
        use_dimensions: false,
        dimensions: undefined,
        capacity_kg: parseFloat(manualWeightKg) || undefined,
        capacity_m3: parseFloat(manualVolumeM3) || undefined,
      });
    }
  };

  const handleDimensionChange = () => {
    if (lengthCm && widthCm && heightCm) {
      const dimensions = createDimensionalConfig(
        parseInt(lengthCm),
        parseInt(widthCm),
        parseInt(heightCm)
      );
      updateCapacityConfig({
        dimensions,
        capacity_m3: dimensions.calculated_volume_m3,
      });
    }
  };

  const handleManualCapacityChange = () => {
    updateCapacityConfig({
      capacity_kg: parseFloat(manualWeightKg) || undefined,
      capacity_m3: parseFloat(manualVolumeM3) || undefined,
    });
  };

  const handleNext = () => {
    // Update config before proceeding
    if (useDimensions) {
      handleDimensionChange();
    } else {
      handleManualCapacityChange();
    }
    goToNextStep();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configure Capacity</CardTitle>
        <CardDescription>
          Enter vehicle cargo capacity details. You can provide exact dimensions or manual capacity values.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="use-dimensions" className="text-base">
              Use Dimensions
            </Label>
            <p className="text-sm text-muted-foreground">
              Calculate volume from cargo area dimensions (L × W × H)
            </p>
          </div>
          <Switch
            id="use-dimensions"
            checked={useDimensions}
            onCheckedChange={handleToggleDimensions}
          />
        </div>

        {/* Dimensional Input Mode */}
        {useDimensions ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Cargo Area Dimensions</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="length">Length (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  placeholder="400"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  onBlur={handleDimensionChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="width">Width (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  placeholder="200"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  onBlur={handleDimensionChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="180"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  onBlur={handleDimensionChange}
                />
              </div>
            </div>

            {/* Calculated Volume */}
            {calculatedVolume > 0 && (
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  <strong>Calculated Volume:</strong> {formatVolume(calculatedVolume)}
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Dimensions: {lengthCm} × {widthCm} × {heightCm} cm
                  </span>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Weight Capacity (still manual) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="weight-capacity">Maximum Weight Capacity (kg)</Label>
              </div>
              <Input
                id="weight-capacity"
                type="number"
                placeholder="1000"
                value={manualWeightKg}
                onChange={(e) => setManualWeightKg(e.target.value)}
                onBlur={handleDimensionChange}
              />
            </div>
          </div>
        ) : (
          /* Manual Capacity Input Mode */
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Manual Capacity</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-weight">Weight Capacity (kg)</Label>
                <Input
                  id="manual-weight"
                  type="number"
                  placeholder="1000"
                  value={manualWeightKg}
                  onChange={(e) => setManualWeightKg(e.target.value)}
                  onBlur={handleManualCapacityChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-volume">Volume Capacity (m³)</Label>
                <Input
                  id="manual-volume"
                  type="number"
                  step="0.1"
                  placeholder="4.5"
                  value={manualVolumeM3}
                  onChange={(e) => setManualVolumeM3(e.target.value)}
                  onBlur={handleManualCapacityChange}
                />
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Tier Configuration Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Tier Configuration</h3>
            <Badge variant="secondary" className="ml-auto">
              {capacityConfig.tiered_config.length > 0
                ? `${capacityConfig.tiered_config.length} tiers`
                : 'No tiers'}
            </Badge>
          </div>

          {capacityConfig.tiered_config.length > 0 ? (
            <div className="space-y-2">
              {capacityConfig.tiered_config.map((tier, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{tier.tier_order}</Badge>
                    <span className="font-medium">{tier.tier_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    {tier.max_weight_kg && (
                      <span className="flex items-center gap-1">
                        <Weight className="h-3 w-3" />
                        {formatWeight(tier.max_weight_kg)}
                      </span>
                    )}
                    {tier.max_volume_m3 && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {formatVolume(tier.max_volume_m3)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tier configuration is optional. You can add tiers later if needed.
            </p>
          )}
        </div>

        {/* Validation Messages */}
        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation.warnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Weight:</span>{' '}
              <strong>{capacityConfig.capacity_kg ? formatWeight(capacityConfig.capacity_kg) : 'Not set'}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Volume:</span>{' '}
              <strong>{capacityConfig.capacity_m3 ? formatVolume(capacityConfig.capacity_m3) : 'Not set'}</strong>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={goToPreviousStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button onClick={handleNext} size="lg" disabled={!validation.isValid}>
          Next: Registration Details
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
