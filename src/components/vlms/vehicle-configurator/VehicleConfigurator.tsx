/**
 * Vehicle Configurator - Main Component
 * Single-screen vehicle onboarding interface - RESTRUCTURED to match mockups
 * Layout: LEFT (Visualizer) | RIGHT (Configuration Sidebar)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVehicleConfiguratorStore } from '@/hooks/useVehicleConfiguratorStore';
import { VehicleCarousel } from './VehicleCarousel';
import { VehicleVisualizer } from './VehicleVisualizer';
import { AiDimensionButton } from './AiDimensionButton';
import { TierSlotBuilder } from './TierSlotBuilder';
import { TierCountSelector } from './TierCountSelector';
import { useVehicleCategories } from '@/hooks/useVehicleCategories';
import { getDefaultConfig } from '@/lib/vlms/defaultVehicleConfigs';
import { getVehicleClassConstraints } from '@/lib/vlms/vehicleClassConstraints';
import { validateTierConfig, computeTotalSlots } from '@/lib/vlms/tierValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ArrowLeft, Sparkles, Eye } from 'lucide-react';
import { formatVolume, formatWeight } from '@/lib/vlms/capacityCalculations';
import type { TierConfig } from '@/types/vlms-onboarding';

interface VehicleConfiguratorProps {
  onSave?: (formData: any) => Promise<void>;
  onCancel?: () => void;
}

export function VehicleConfigurator({ onSave, onCancel }: VehicleConfiguratorProps) {
  const {
    selectedCategory,
    modelName,
    vehicleName,
    variant,
    dimensions,
    payload,
    tiers,
    fuelType,
    transmission,
    year,
    axles,
    numberOfWheels,
    dateAcquired,
    acquisitionMode,
    vendor,
    licensePlate,
    registrationExpiry,
    insuranceExpiry,
    interiorDimensions,
    numberOfSeats,
    isAiProcessing,
    errors,
    isDirty,
    setCategory,
    setModelName,
    setVehicleName,
    setVariant,
    updateDimensions,
    updatePayload,
    setFuelType,
    setTransmission,
    setYear,
    setAxles,
    setNumberOfWheels,
    setDateAcquired,
    setAcquisitionMode,
    setVendor,
    setLicensePlate,
    setRegistrationExpiry,
    setInsuranceExpiry,
    updateInteriorDimensions,
    setNumberOfSeats,
    updateTierSlots,
    setTiers,
    applyAiSuggestions,
    setAiProcessing,
    clearAllErrors,
    getFormData,
    isValid,
  } = useVehicleConfiguratorStore();

  const [isSaving, setIsSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('configurator');
  const [tierValidationError, setTierValidationError] = React.useState<string | null>(null);

  // Fetch vehicle categories for carousel
  const { data: categories } = useVehicleCategories();

  // Get vehicle class constraints
  const vehicleConstraints = React.useMemo(() => {
    return selectedCategory ? getVehicleClassConstraints(selectedCategory.code) : null;
  }, [selectedCategory?.code]);

  // Handler for tier count changes
  const handleTierCountChange = (count: number, tierPreset: TierConfig[]) => {
    // Calculate weight and volume per tier
    const totalWeight = payload.max_payload_kg || 0;
    const totalVolume = calculatedVolume || 0;

    const tiersWithCapacity = tierPreset.map((tier) => ({
      ...tier,
      max_weight_kg: totalWeight > 0 ? Math.round(totalWeight / count) : undefined,
      max_volume_m3: totalVolume > 0 ? Math.round((totalVolume / count) * 100) / 100 : undefined,
      weight_pct: Math.round(100 / count),
      volume_pct: Math.round(100 / count),
    }));

    setTiers(tiersWithCapacity);
  };

  // Auto-populate defaults when category changes
  React.useEffect(() => {
    if (selectedCategory && vehicleConstraints) {
      const defaultConfig = getDefaultConfig(selectedCategory.code);
      if (defaultConfig) {
        // Only populate if fields are empty
        if (!dimensions.length_cm && !dimensions.width_cm && !dimensions.height_cm) {
          updateDimensions(defaultConfig.dimensions);
        }
        if (!payload.gross_weight_kg && !payload.max_payload_kg) {
          updatePayload(defaultConfig.payload);
        }
      }

      // Initialize tiers based on vehicle class constraints
      if (tiers.length === 0) {
        const defaultTierCount = vehicleConstraints.defaultTiers;
        const tierPresets: Record<number, TierConfig[]> = {
          1: [{ tier_name: 'Rear Cargo', tier_order: 1, slot_count: 3 }],
          2: [
            { tier_name: 'Lower', tier_order: 1, slot_count: 4 },
            { tier_name: 'Upper', tier_order: 2, slot_count: 3 },
          ],
          3: [
            { tier_name: 'Lower', tier_order: 1, slot_count: 4 },
            { tier_name: 'Middle', tier_order: 2, slot_count: 4 },
            { tier_name: 'Upper', tier_order: 3, slot_count: 3 },
          ],
          4: [
            { tier_name: 'Lower', tier_order: 1, slot_count: 4 },
            { tier_name: 'Middle', tier_order: 2, slot_count: 4 },
            { tier_name: 'Upper', tier_order: 3, slot_count: 3 },
            { tier_name: 'Top', tier_order: 4, slot_count: 2 },
          ],
        };

        const preset = tierPresets[defaultTierCount] || tierPresets[2];
        handleTierCountChange(defaultTierCount, preset);
      }
    }
  }, [selectedCategory?.code]); // Only depend on category code change

  const handleSave = async () => {
    clearAllErrors();
    setTierValidationError(null);

    // Validate tier configuration
    if (selectedCategory && tiers.length > 0) {
      const tierValidation = validateTierConfig(
        tiers,
        payload.max_payload_kg,
        calculatedVolume,
        selectedCategory.code
      );

      if (!tierValidation.is_valid) {
        setTierValidationError(tierValidation.validation_message);
        return;
      }
    }

    if (!isValid()) {
      return;
    }

    setIsSaving(true);

    try {
      const formData = getFormData();

      // Don't send total_slots - it's auto-computed by PostgreSQL as a GENERATED column
      if (onSave) {
        await onSave(formData);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = isValid() && isDirty && !isSaving && !isAiProcessing;

  // Calculate cargo volume from dimensions
  const calculatedVolume = dimensions.volume_m3;

  return (
    <div className="h-[calc(90vh-140px)] flex flex-col bg-background">
      {/* Main Content Grid - INVERTED: Visual Left, Form Right */}
      <div className="h-full grid lg:grid-cols-[1fr_400px] gap-6">
        {/* LEFT PANEL - Vehicle Visualizer */}
        <div className="flex flex-col p-8 space-y-6 border-r overflow-hidden">
          {/* Category Header - Tesla/Arrival Style */}
          {selectedCategory && (
            <div className="mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {selectedCategory.display_name || selectedCategory.name}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-mono font-medium bg-primary/10 text-primary">
                  {selectedCategory.code}
                </span>
              </div>
              {modelName && (
                <p className="text-sm text-muted-foreground mt-1">{modelName}</p>
              )}
            </div>
          )}

          {/* Vehicle Visualizer with Embedded Carousel Navigation */}
          <div className="relative h-[400px] flex items-center justify-center mb-6">
            <VehicleVisualizer
              categoryCode={selectedCategory?.code || null}
              dimensions={dimensions}
              className="w-full h-full"
            />

            {/* Carousel Navigation Arrows Overlaid on Image */}
            {categories && categories.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
                  onClick={() => {
                    const currentIndex = categories.findIndex(c => c.id === selectedCategory?.id);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : categories.length - 1;
                    setCategory(categories[prevIndex]);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
                  onClick={() => {
                    const currentIndex = categories.findIndex(c => c.id === selectedCategory?.id);
                    const nextIndex = currentIndex < categories.length - 1 ? currentIndex + 1 : 0;
                    setCategory(categories[nextIndex]);
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Tabs at Bottom - CONFIGURATOR | SPECS | INTERIOR */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="configurator">CONFIGURATOR</TabsTrigger>
              <TabsTrigger value="specs">SPECS</TabsTrigger>
              <TabsTrigger value="interior">INTERIOR</TabsTrigger>
            </TabsList>

            <TabsContent value="configurator" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Configure your vehicle capacity and specifications using the panel on the right.
              </p>
            </TabsContent>

            <TabsContent value="specs" className="mt-4">
              <div className="space-y-2 text-sm">
                {calculatedVolume && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cargo Volume:</span>
                    <span className="font-semibold">{formatVolume(calculatedVolume)}</span>
                  </div>
                )}
                {payload.max_payload_kg && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Payload:</span>
                    <span className="font-semibold">{formatWeight(payload.max_payload_kg)}</span>
                  </div>
                )}
                {tiers.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tier Count:</span>
                    <span className="font-semibold">{tiers.length}</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="interior" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Configure interior dimensions and seating in the right panel →
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT PANEL - Configuration Sidebar */}
        <div className="flex flex-col bg-muted/10 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Preview Button */}
            {selectedCategory && activeTab !== 'preview' && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('preview')}
                  disabled={!isValid()}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </Button>
              </div>
            )}

            {/* Dynamic Content Based on Active Tab */}
            {selectedCategory && activeTab === 'configurator' && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    DIMENSIONS & PAYLOAD
                  </h3>

                  <div className="space-y-4">
                    {/* Height & Length */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="height" className="text-xs text-muted-foreground">Height (cm)</Label>
                        <Input
                          id="height"
                          type="number"
                          placeholder="180"
                          value={dimensions.height_cm || ''}
                          onChange={(e) => updateDimensions({ height_cm: parseInt(e.target.value) || undefined })}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="length" className="text-xs text-muted-foreground">Length (cm)</Label>
                        <Input
                          id="length"
                          type="number"
                          placeholder="400"
                          value={dimensions.length_cm || ''}
                          onChange={(e) => updateDimensions({ length_cm: parseInt(e.target.value) || undefined })}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Width */}
                    <div className="space-y-2">
                      <Label htmlFor="width" className="text-xs text-muted-foreground">Width (cm)</Label>
                      <Input
                        id="width"
                        type="number"
                        placeholder="200"
                        value={dimensions.width_cm || ''}
                        onChange={(e) => updateDimensions({ width_cm: parseInt(e.target.value) || undefined })}
                        className="h-9"
                      />
                    </div>

                    {/* Cargo Volume - Read-only Calculated */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cargo Volume</Label>
                      <Input
                        readOnly
                        value={calculatedVolume ? `${calculatedVolume.toFixed(2)} m³` : ''}
                        placeholder="Auto-calculated"
                        className="bg-muted h-9"
                      />
                    </div>

                    <Separator className="my-2" />

                    {/* Gross Vehicle Weight */}
                    <div className="space-y-1">
                      <Label htmlFor="gross-weight" className="text-xs text-muted-foreground">Gross Vehicle Weight (kg)</Label>
                      <Input
                        id="gross-weight"
                        type="number"
                        placeholder="5500"
                        value={payload.gross_weight_kg || ''}
                        onChange={(e) => updatePayload({ gross_weight_kg: parseFloat(e.target.value) || undefined })}
                        className="h-9"
                      />
                    </div>

                    {/* Max Payload */}
                    <div className="space-y-1">
                      <Label htmlFor="max-payload" className="text-xs text-muted-foreground">Max Payload (kg)</Label>
                      <Input
                        id="max-payload"
                        type="number"
                        placeholder="2100"
                        value={payload.max_payload_kg || ''}
                        onChange={(e) => updatePayload({ max_payload_kg: parseFloat(e.target.value) || undefined })}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* AI-Assisted Image Upload - Enhanced Visual */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                      AI-Assisted Dimensions
                    </h3>
                    <Badge variant="secondary" className="text-xs">Optional</Badge>
                  </div>
                  <AiDimensionButton
                    onAnalysisComplete={applyAiSuggestions}
                    isProcessing={isAiProcessing}
                    onProcessingChange={setAiProcessing}
                  />
                </div>

                <Separator className="my-6" />

                {/* Tier Builder - Always Visible */}
                {calculatedVolume && vehicleConstraints && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                      VEHICLE CAPACITY PAYLOAD
                    </h3>

                    {/* Tier Validation Error Alert */}
                    {tierValidationError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{tierValidationError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="w-[360px] min-h-[420px] max-h-[540px] p-4 rounded-xl border bg-card overflow-y-auto">
                      {/* Tier Count Selector */}
                      <TierCountSelector
                        currentCount={tiers.length}
                        maxAllowed={vehicleConstraints.maxTiers}
                        minAllowed={vehicleConstraints.minTiers}
                        onChange={handleTierCountChange}
                        categoryCode={selectedCategory?.code}
                      />

                      <Separator className="my-4" />

                      {/* Tier Slot Builder */}
                      <TierSlotBuilder
                        tiers={tiers}
                        onUpdateSlots={updateTierSlots}
                        totalCapacityKg={payload.max_payload_kg}
                        totalVolumeM3={calculatedVolume}
                      />

                      {/* Total Slots Display */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Slots:</span>
                          <span className="font-semibold">{computeTotalSlots(tiers)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="my-6" />

                {/* Required Vehicle Information */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    REQUIRED INFORMATION
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="model-name-required" className="text-xs text-muted-foreground">
                        Model Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="model-name-required"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="e.g., Toyota Hiace"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="license-plate" className="text-xs text-muted-foreground">
                        License Plate <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="license-plate"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        placeholder="ABC-1234"
                        className="h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="year" className="text-xs text-muted-foreground">
                          Year <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="year"
                          type="number"
                          value={year || ''}
                          onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="2024"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="fuel-type" className="text-xs text-muted-foreground">
                          Fuel Type <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="fuel-type"
                          value={fuelType}
                          onChange={(e) => setFuelType(e.target.value)}
                          placeholder="Diesel"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="date-acquired" className="text-xs text-muted-foreground">
                        Date Acquired <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="date-acquired"
                        type="date"
                        value={dateAcquired}
                        onChange={(e) => setDateAcquired(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="acquisition-mode" className="text-xs text-muted-foreground">
                        Acquisition Mode <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="acquisition-mode"
                        value={acquisitionMode}
                        onChange={(e) => setAcquisitionMode(e.target.value)}
                        placeholder="Purchase / Lease / Rent"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* SPECS TAB CONTENT */}
            {selectedCategory && activeTab === 'specs' && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    BASIC INFORMATION
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="vehicle-name" className="text-xs text-muted-foreground">Vehicle Name</Label>
                      <Input
                        id="vehicle-name"
                        value={vehicleName}
                        onChange={(e) => setVehicleName(e.target.value)}
                        placeholder="e.g., Fleet Truck 01"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="model-name" className="text-xs text-muted-foreground">Model Name (Optional)</Label>
                      <Input
                        id="model-name"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="e.g., Toyota Hiace"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="variant" className="text-xs text-muted-foreground">Variant (Optional)</Label>
                      <Input
                        id="variant"
                        value={variant}
                        onChange={(e) => setVariant(e.target.value)}
                        placeholder="e.g., LWB High Roof"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Specifications */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    SPECIFICATIONS
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Transmission</Label>
                      <Input
                        value={transmission}
                        onChange={(e) => setTransmission(e.target.value)}
                        placeholder="Manual"
                        className="h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Axles</Label>
                        <Input
                          type="number"
                          value={axles || ''}
                          onChange={(e) => setAxles(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="2"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Number of Wheels</Label>
                        <Input
                          type="number"
                          value={numberOfWheels || ''}
                          onChange={(e) => setNumberOfWheels(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="4"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Acquisition */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    ACQUISITION
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Vendor</Label>
                      <Input
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                        placeholder="Vendor Name"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Insurance & Registration */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    INSURANCE & REGISTRATION
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Registration Expiry</Label>
                      <Input
                        type="date"
                        value={registrationExpiry}
                        onChange={(e) => setRegistrationExpiry(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Insurance Expiry</Label>
                      <Input
                        type="date"
                        value={insuranceExpiry}
                        onChange={(e) => setInsuranceExpiry(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INTERIOR TAB CONTENT */}
            {selectedCategory && activeTab === 'interior' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    INTERIOR DIMENSIONS
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Length (cm)</Label>
                      <Input
                        type="number"
                        value={interiorDimensions.length_cm || ''}
                        onChange={(e) => updateInteriorDimensions({ length_cm: parseInt(e.target.value) || undefined })}
                        placeholder="300"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Width (cm)</Label>
                      <Input
                        type="number"
                        value={interiorDimensions.width_cm || ''}
                        onChange={(e) => updateInteriorDimensions({ width_cm: parseInt(e.target.value) || undefined })}
                        placeholder="180"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Height (cm)</Label>
                      <Input
                        type="number"
                        value={interiorDimensions.height_cm || ''}
                        onChange={(e) => updateInteriorDimensions({ height_cm: parseInt(e.target.value) || undefined })}
                        placeholder="190"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    SEATING
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Number of Seats</Label>
                      <Input
                        type="number"
                        value={numberOfSeats || ''}
                        onChange={(e) => setNumberOfSeats(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="2"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW CONTENT */}
            {selectedCategory && activeTab === 'preview' && (
              <div className="space-y-6">
                {/* Vehicle Visual */}
                <div className="flex justify-center p-6 bg-muted/20 rounded-lg">
                  <img
                    src={`/assets/vehicles/silhouettes/${selectedCategory.code}.webp`}
                    alt={selectedCategory.display_name || selectedCategory.name}
                    className="max-h-[200px] object-contain"
                  />
                </div>

                {/* Category Info */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    CATEGORY
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                      {selectedCategory.code}
                    </span>
                    <span className="text-sm">{selectedCategory.display_name || selectedCategory.name}</span>
                  </div>
                  {modelName && (
                    <p className="text-sm text-muted-foreground mt-2">Model: {modelName}</p>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Dimensions */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    DIMENSIONS
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Length:</span>
                      <span className="ml-2 font-medium">{dimensions.length_cm || '-'} cm</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Width:</span>
                      <span className="ml-2 font-medium">{dimensions.width_cm || '-'} cm</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Height:</span>
                      <span className="ml-2 font-medium">{dimensions.height_cm || '-'} cm</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cargo Volume:</span>
                      <span className="ml-2 font-medium">
                        {calculatedVolume ? formatVolume(calculatedVolume) : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Payload */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    PAYLOAD CAPACITY
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Gross Vehicle Weight:</span>
                      <span className="ml-2 font-medium">
                        {payload.gross_weight_kg ? formatWeight(payload.gross_weight_kg) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max Payload:</span>
                      <span className="ml-2 font-medium">
                        {payload.max_payload_kg ? formatWeight(payload.max_payload_kg) : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {tiers.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                        CAPACITY TIERS
                      </h3>
                      <div className="space-y-2 text-sm">
                        {tiers.map((tier, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-muted-foreground">{tier.tier_name}:</span>
                            <span className="font-medium">{tier.slot_count} slots</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Basic Information */}
                {(vehicleName || variant) && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                        BASIC INFORMATION
                      </h3>
                      <div className="space-y-2 text-sm">
                        {vehicleName && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Vehicle Name:</span>
                            <span className="font-medium">{vehicleName}</span>
                          </div>
                        )}
                        {variant && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Variant:</span>
                            <span className="font-medium">{variant}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Specifications */}
                {(fuelType || transmission || year || axles || numberOfWheels) && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                        SPECIFICATIONS
                      </h3>
                      <div className="space-y-2 text-sm">
                        {fuelType && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fuel Type:</span>
                            <span className="font-medium">{fuelType}</span>
                          </div>
                        )}
                        {transmission && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transmission:</span>
                            <span className="font-medium">{transmission}</span>
                          </div>
                        )}
                        {year && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Year:</span>
                            <span className="font-medium">{year}</span>
                          </div>
                        )}
                        {axles && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Axles:</span>
                            <span className="font-medium">{axles}</span>
                          </div>
                        )}
                        {numberOfWheels && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Number of Wheels:</span>
                            <span className="font-medium">{numberOfWheels}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Acquisition */}
                {(dateAcquired || acquisitionMode || vendor) && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                        ACQUISITION
                      </h3>
                      <div className="space-y-2 text-sm">
                        {dateAcquired && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date Acquired:</span>
                            <span className="font-medium">{dateAcquired}</span>
                          </div>
                        )}
                        {acquisitionMode && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Acquisition Mode:</span>
                            <span className="font-medium">{acquisitionMode}</span>
                          </div>
                        )}
                        {vendor && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Vendor:</span>
                            <span className="font-medium">{vendor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Insurance & Registration */}
                {(licensePlate || registrationExpiry || insuranceExpiry) && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                        INSURANCE & REGISTRATION
                      </h3>
                      <div className="space-y-2 text-sm">
                        {licensePlate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">License Plate:</span>
                            <span className="font-medium">{licensePlate}</span>
                          </div>
                        )}
                        {registrationExpiry && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Registration Expiry:</span>
                            <span className="font-medium">{registrationExpiry}</span>
                          </div>
                        )}
                        {insuranceExpiry && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Insurance Expiry:</span>
                            <span className="font-medium">{insuranceExpiry}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Interior */}
                {(interiorDimensions.length_cm || interiorDimensions.width_cm || interiorDimensions.height_cm || numberOfSeats) && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                        INTERIOR
                      </h3>
                      <div className="space-y-2 text-sm">
                        {(interiorDimensions.length_cm || interiorDimensions.width_cm || interiorDimensions.height_cm) && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Interior Dimensions:</span>
                            <span className="font-medium">
                              {interiorDimensions.length_cm || '-'} × {interiorDimensions.width_cm || '-'} × {interiorDimensions.height_cm || '-'} cm
                            </span>
                          </div>
                        )}
                        {numberOfSeats && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Number of Seats:</span>
                            <span className="font-medium">{numberOfSeats}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Save & Continue Button - Bottom of Sidebar */}
          <div className="mt-auto p-6 border-t bg-background">
            <div className="space-y-4">
              {/* Validation Status */}
              {!selectedCategory ? (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Select a vehicle category to begin</AlertDescription>
                </Alert>
              ) : !isValid() ? (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Enter dimensions and payload to continue
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Ready to save configuration
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {onCancel && (
                  <Button variant="outline" onClick={onCancel} disabled={isSaving} className="flex-1">
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="flex-1"
                  size="lg"
                >
                  {isSaving ? 'Saving...' : 'SAVE & CONTINUE'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
