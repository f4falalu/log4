/**
 * Tier Count Selector Component
 * Allows selection of 1-4 tiers with vehicle class constraint enforcement
 */

import React from 'react';
import type { TierConfig } from '@/types/vlms-onboarding';

interface TierCountSelectorProps {
  currentCount: number;
  maxAllowed: number;
  minAllowed: number;
  onChange: (count: number, tierPreset: TierConfig[]) => void;
  categoryCode?: string;
}

export function TierCountSelector({
  currentCount,
  maxAllowed,
  minAllowed,
  onChange,
  categoryCode,
}: TierCountSelectorProps) {
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

  const handleTierCountChange = (count: number) => {
    if (count >= minAllowed && count <= maxAllowed) {
      const preset = tierPresets[count] || [];
      onChange(count, preset);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Tier Count</h3>
          <p className="text-xs text-muted-foreground">
            Select number of vertical cargo tiers
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((count) => {
          const isDisabled = count < minAllowed || count > maxAllowed;
          const isActive = count === currentCount;

          return (
            <button
              key={count}
              type="button"
              onClick={() => handleTierCountChange(count)}
              disabled={isDisabled}
              className={`
                inline-flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium
                transition-colors
                ${isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-muted/50'
                }
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background
              `}
              aria-label={`${count} tier${count !== 1 ? 's' : ''}`}
            >
              {count}
            </button>
          );
        })}
      </div>

      {categoryCode && (
        <p className="text-xs text-muted-foreground">
          {categoryCode} allows {minAllowed === maxAllowed
            ? `${minAllowed} tier${minAllowed !== 1 ? 's' : ''} only`
            : `${minAllowed}-${maxAllowed} tiers`}
        </p>
      )}
    </div>
  );
}
