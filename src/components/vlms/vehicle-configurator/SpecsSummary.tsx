/**
 * Vehicle Specs Summary Component
 * Displays key vehicle specifications in a clean card format
 */

import React from 'react';
import { formatVolume, formatWeight } from '@/lib/vlms/capacityCalculations';
import type { TierConfig } from '@/types/vlms-onboarding';

interface SpecsSummaryProps {
  dimensions?: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    volume_m3?: number;
  };
  payload?: {
    max_payload_kg?: number;
  };
  tiers?: TierConfig[];
}

export function SpecsSummary({ dimensions, payload, tiers }: SpecsSummaryProps) {
  const totalSlots = tiers?.reduce((sum, tier) => sum + (tier.slot_count || 0), 0) || 0;
  const tierCount = tiers?.length || 0;

  const hasDimensions = dimensions?.length_cm && dimensions?.width_cm && dimensions?.height_cm;
  const hasData = hasDimensions || dimensions?.volume_m3 || payload?.max_payload_kg;

  if (!hasData) {
    return (
      <div className="bg-muted/20 rounded-lg p-6 border-2 border-dashed">
        <p className="text-sm text-muted-foreground text-center">
          Enter dimensions and payload to see specifications
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border shadow-sm">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">
        SPECIFICATIONS
      </h3>

      <div className="space-y-3">
        {/* Cargo Volume */}
        {dimensions?.volume_m3 && (
          <SpecRow
            label="Cargo Volume"
            value={formatVolume(dimensions.volume_m3)}
            emphasis
          />
        )}

        {/* Max Payload */}
        {payload?.max_payload_kg && (
          <SpecRow
            label="Max Payload"
            value={formatWeight(payload.max_payload_kg)}
            emphasis
          />
        )}

        {/* Dimensions */}
        {hasDimensions && (
          <SpecRow
            label="Dimensions"
            value={`${dimensions.length_cm} × ${dimensions.width_cm} × ${dimensions.height_cm} cm`}
          />
        )}

        {/* Tier Count */}
        {tierCount > 0 && (
          <SpecRow
            label="Tiers"
            value={tierCount.toString()}
          />
        )}

        {/* Total Slots */}
        {totalSlots > 0 && (
          <SpecRow
            label="Total Slots"
            value={totalSlots.toString()}
          />
        )}
      </div>
    </div>
  );
}

interface SpecRowProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function SpecRow({ label, value, emphasis }: SpecRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={emphasis ? 'text-base font-semibold' : 'text-sm font-medium'}>
        {value}
      </span>
    </div>
  );
}
