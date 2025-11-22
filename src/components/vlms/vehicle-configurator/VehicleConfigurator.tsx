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
import { CategoryTypeSelector } from './CategoryTypeSelector';
import { VehicleVisualizer } from './VehicleVisualizer';
import { AiDimensionButton } from './AiDimensionButton';
import { TierSlotBuilder } from './TierSlotBuilder';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatVolume, formatWeight } from '@/lib/vlms/capacityCalculations';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface VehicleConfiguratorProps {
  onSave?: (formData: any) => Promise<void>;
  onCancel?: () => void;
}

export function VehicleConfigurator({ onSave, onCancel }: VehicleConfiguratorProps) {
  const {
    selectedCategory,
    selectedType,
    modelName,
    dimensions,
    payload,
    tiers,
    isAiProcessing,
    errors,
    isDirty,
    setCategory,
    setVehicleType,
    setModelName,
    updateDimensions,
    updatePayload,
    updateTierSlots,
    applyAiSuggestions,
    setAiProcessing,
    clearAllErrors,
    getFormData,
    isValid,
  } = useVehicleConfiguratorStore();

  const [isSaving, setIsSaving] = React.useState(false);
  const [isTierBuilderOpen, setIsTierBuilderOpen] = React.useState(false);

  const handleSave = async () => {
    clearAllErrors();

    if (!isValid()) {
      return;
    }

    setIsSaving(true);

    try {
      const formData = getFormData();

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
    <div className="h-full flex flex-col bg-background">
      {/* Main Content Grid - INVERTED: Visual Left, Form Right */}
      <div className="flex-1 grid lg:grid-cols-[1fr_400px] gap-0">
        {/* LEFT PANEL - Vehicle Visualizer */}
        <div className="flex flex-col p-6 space-y-4 border-r">
          {/* Category & Type Selection - Top of Left Panel */}
          <div className="space-y-4">
            <CategoryTypeSelector
              selectedCategory={selectedCategory}
              selectedType={selectedType}
              modelName={modelName}
              onCategoryChange={setCategory}
              onTypeChange={setVehicleType}
              onModelNameChange={setModelName}
            />
          </div>

          {/* Large Vehicle Visualizer - Center */}
          <div className="flex-1 flex items-center justify-center min-h-[500px]">
            <VehicleVisualizer
              categoryCode={selectedCategory?.code || null}
              dimensions={dimensions}
              className="w-full h-full"
            />
          </div>

          {/* Tabs at Bottom - CONFIGURATOR | SPECS | INTERIOR */}
          <Tabs defaultValue="configurator" className="w-full">
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
                Interior specifications coming soon...
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT PANEL - Configuration Sidebar */}
        <div className="flex flex-col bg-muted/10 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Size Variant Badge */}
            {selectedCategory && (
              <div className="flex justify-end">
                <Badge variant="default" className="text-sm px-4 py-1">
                  SIZE VARIANT
                </Badge>
              </div>
            )}

            {/* Expanded Configuration Section */}
            {selectedCategory && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-4 tracking-wider">
                    EXPANDED CONFIGURATION
                  </h3>

                  <div className="space-y-4">
                    {/* Height & Length */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="height">Height (cm)</Label>
                        <Input
                          id="height"
                          type="number"
                          placeholder="180"
                          value={dimensions.height_cm || ''}
                          onChange={(e) => updateDimensions({ height_cm: parseInt(e.target.value) || undefined })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="length">Length (cm)</Label>
                        <Input
                          id="length"
                          type="number"
                          placeholder="400"
                          value={dimensions.length_cm || ''}
                          onChange={(e) => updateDimensions({ length_cm: parseInt(e.target.value) || undefined })}
                        />
                      </div>
                    </div>

                    {/* Width */}
                    <div className="space-y-2">
                      <Label htmlFor="width">Width (cm)</Label>
                      <Input
                        id="width"
                        type="number"
                        placeholder="200"
                        value={dimensions.width_cm || ''}
                        onChange={(e) => updateDimensions({ width_cm: parseInt(e.target.value) || undefined })}
                      />
                    </div>

                    {/* Cargo Volume - Read-only Calculated */}
                    <div className="space-y-2">
                      <Label>Cargo Volume</Label>
                      <Input
                        readOnly
                        value={calculatedVolume ? `${calculatedVolume.toFixed(2)} m³` : ''}
                        placeholder="Auto-calculated"
                        className="bg-muted"
                      />
                    </div>

                    <Separator />

                    {/* Gross Vehicle Weight */}
                    <div className="space-y-2">
                      <Label htmlFor="gross-weight">Gross Vehicle Weight (kg)</Label>
                      <Input
                        id="gross-weight"
                        type="number"
                        placeholder="5500"
                        value={payload.gross_weight_kg || ''}
                        onChange={(e) => updatePayload({ gross_weight_kg: parseFloat(e.target.value) || undefined })}
                      />
                    </div>

                    {/* Max Payload */}
                    <div className="space-y-2">
                      <Label htmlFor="max-payload">Max Payload (kg)</Label>
                      <Input
                        id="max-payload"
                        type="number"
                        placeholder="2100"
                        value={payload.max_payload_kg || ''}
                        onChange={(e) => updatePayload({ max_payload_kg: parseFloat(e.target.value) || undefined })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* AI-Assisted Image Upload */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    AI-ASSISTED IMAGE UPLOAD (OPTIONAL)
                  </h3>
                  <AiDimensionButton
                    onAnalysisComplete={applyAiSuggestions}
                    isProcessing={isAiProcessing}
                    onProcessingChange={setAiProcessing}
                  />
                </div>

                <Separator />

                {/* Option Section */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">
                    OPTION
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Optional features and upgrades coming soon...
                  </p>
                </div>

                {/* Expandable Tier Builder */}
                {calculatedVolume && (
                  <>
                    <Separator />
                    <Collapsible open={isTierBuilderOpen} onOpenChange={setIsTierBuilderOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span>Vehicle Capacity Payload</span>
                          {isTierBuilderOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <TierSlotBuilder
                          tiers={tiers}
                          onUpdateSlots={updateTierSlots}
                          totalCapacityKg={payload.max_payload_kg}
                          totalVolumeM3={calculatedVolume}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </>
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
