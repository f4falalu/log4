/**
 * Dimension & Payload Input Component
 * Handles cargo dimensions and payload configuration with real-time calculations
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { formatVolume, formatWeight } from '@/lib/vlms/capacityCalculations';

interface DimensionPayloadInputProps {
  dimensions: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    volume_m3?: number;
  };
  payload: {
    gross_weight_kg?: number;
    max_payload_kg?: number;
  };
  onDimensionsChange: (dimensions: any) => void;
  onPayloadChange: (payload: any) => void;
  errors?: Record<string, string>;
}

export function DimensionPayloadInput({
  dimensions,
  payload,
  onDimensionsChange,
  onPayloadChange,
  errors = {},
}: DimensionPayloadInputProps) {
  const hasDimensions = dimensions.length_cm && dimensions.width_cm && dimensions.height_cm;
  const hasCalculatedVolume = dimensions.volume_m3 && hasDimensions;

  // Warning if payload seems inconsistent with volume
  const showCapacityWarning =
    dimensions.volume_m3 &&
    payload.max_payload_kg &&
    (payload.max_payload_kg / dimensions.volume_m3) > 500; // > 500 kg/m³ is very dense

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-4">Cargo Dimensions</h3>

        <div className="grid grid-cols-3 gap-4">
          {/* Length */}
          <div className="space-y-2">
            <Label htmlFor="length">Length (cm)</Label>
            <Input
              id="length"
              type="number"
              min="0"
              step="1"
              placeholder="400"
              value={dimensions.length_cm || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                onDimensionsChange({ length_cm: value });
              }}
              className={errors.length_cm ? 'border-destructive' : ''}
            />
            {errors.length_cm && (
              <p className="text-xs text-destructive">{errors.length_cm}</p>
            )}
          </div>

          {/* Width */}
          <div className="space-y-2">
            <Label htmlFor="width">Width (cm)</Label>
            <Input
              id="width"
              type="number"
              min="0"
              step="1"
              placeholder="200"
              value={dimensions.width_cm || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                onDimensionsChange({ width_cm: value });
              }}
              className={errors.width_cm ? 'border-destructive' : ''}
            />
            {errors.width_cm && (
              <p className="text-xs text-destructive">{errors.width_cm}</p>
            )}
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              min="0"
              step="1"
              placeholder="180"
              value={dimensions.height_cm || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                onDimensionsChange({ height_cm: value });
              }}
              className={errors.height_cm ? 'border-destructive' : ''}
            />
            {errors.height_cm && (
              <p className="text-xs text-destructive">{errors.height_cm}</p>
            )}
          </div>
        </div>

        {/* Calculated Volume Display */}
        {hasCalculatedVolume && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Calculated Volume</span>
              <span className="text-lg font-semibold text-primary">
                {formatVolume(dimensions.volume_m3)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Payload Section */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Payload Capacity</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Gross Weight */}
          <div className="space-y-2">
            <Label htmlFor="gross-weight">
              Gross Weight (kg) <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="gross-weight"
              type="number"
              min="0"
              step="10"
              placeholder="5500"
              value={payload.gross_weight_kg || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                onPayloadChange({ gross_weight_kg: value });
              }}
            />
          </div>

          {/* Max Payload */}
          <div className="space-y-2">
            <Label htmlFor="max-payload">Max Payload (kg)</Label>
            <Input
              id="max-payload"
              type="number"
              min="0"
              step="10"
              placeholder="1020"
              value={payload.max_payload_kg || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                onPayloadChange({ max_payload_kg: value });
              }}
              className={errors.max_payload_kg ? 'border-destructive' : ''}
            />
            {errors.max_payload_kg && (
              <p className="text-xs text-destructive">{errors.max_payload_kg}</p>
            )}
          </div>
        </div>

        {/* Capacity Warning */}
        {showCapacityWarning && (
          <Alert className="mt-4" variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              The payload ({formatWeight(payload.max_payload_kg!)}) seems high for the cargo volume ({formatVolume(dimensions.volume_m3!)}).
              This suggests very dense cargo. Please verify these values.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
