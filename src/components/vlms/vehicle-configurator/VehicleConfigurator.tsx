/**
 * Vehicle Configurator - Main Component
 * Single-screen vehicle onboarding interface inspired by Tesla/Arrival configurators
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useVehicleConfiguratorStore } from '@/hooks/useVehicleConfiguratorStore';
import { CategoryTypeSelector } from './CategoryTypeSelector';
import { DimensionPayloadInput } from './DimensionPayloadInput';
import { AiDimensionButton } from './AiDimensionButton';
import { VehicleVisualizer } from './VehicleVisualizer';
import { SpecsSummary } from './SpecsSummary';
import { TierSlotBuilder } from './TierSlotBuilder';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

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

  return (
    <div className="h-full flex flex-col">
      {/* Main Content Grid */}
      <div className="flex-1 grid lg:grid-cols-[minmax(400px,_40%)_1fr] gap-6 p-6">
        {/* Left Panel - Configuration */}
        <div className="space-y-6 overflow-y-auto">
          {/* Category & Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vehicle Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryTypeSelector
                selectedCategory={selectedCategory}
                selectedType={selectedType}
                modelName={modelName}
                onCategoryChange={setCategory}
                onTypeChange={setVehicleType}
                onModelNameChange={setModelName}
              />
            </CardContent>
          </Card>

          {/* AI Assistant */}
          {selectedCategory && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Dimension Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <AiDimensionButton
                  onAnalysisComplete={applyAiSuggestions}
                  isProcessing={isAiProcessing}
                  onProcessingChange={setAiProcessing}
                />
              </CardContent>
            </Card>
          )}

          {/* Dimensions & Payload */}
          {selectedCategory && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capacity Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <DimensionPayloadInput
                  dimensions={dimensions}
                  payload={payload}
                  onDimensionsChange={updateDimensions}
                  onPayloadChange={updatePayload}
                  errors={errors}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Visualizer & Specs */}
        <div className="space-y-6">
          {/* Vehicle Visualizer */}
          <Card className="h-[500px]">
            <CardContent className="p-0 h-full">
              <VehicleVisualizer
                categoryCode={selectedCategory?.code || null}
                dimensions={dimensions}
                className="h-full"
              />
            </CardContent>
          </Card>

          {/* Specs Summary */}
          <SpecsSummary
            dimensions={dimensions}
            payload={payload}
            tiers={tiers}
          />
        </div>
      </div>

      {/* Bottom Section - Tier Builder */}
      {selectedCategory && dimensions.volume_m3 && (
        <div className="border-t bg-muted/10">
          <div className="p-6">
            <TierSlotBuilder
              tiers={tiers}
              onUpdateSlots={updateTierSlots}
              totalCapacityKg={payload.max_payload_kg}
              totalVolumeM3={dimensions.volume_m3}
            />
          </div>
        </div>
      )}

      <Separator />

      {/* Sticky Footer - Actions */}
      <div className="p-6 bg-background border-t">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Validation Status */}
          <div>
            {!selectedCategory ? (
              <Alert variant="default" className="inline-flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Select a vehicle category to begin</AlertDescription>
              </Alert>
            ) : !isValid() ? (
              <Alert variant="default" className="inline-flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Enter either dimensions (L×W×H) or manual capacity (volume + weight)
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="default" className="inline-flex items-center gap-2 bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">Ready to save vehicle configuration</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
            )}

            <Button onClick={handleSave} disabled={!canSave} size="lg">
              {isSaving ? 'Saving...' : 'Create Vehicle'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
