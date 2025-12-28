/**
 * Tier & Slot Builder Component
 * Visual slot grid system for cargo capacity allocation
 */

import React from 'react';
import type { TierConfig } from '@/types/vlms-onboarding';

interface TierSlotBuilderProps {
  tiers: TierConfig[];
  onUpdateSlots: (tierIndex: number, newSlotCount: number) => void;
  totalCapacityKg?: number;
  totalVolumeM3?: number;
}

export function TierSlotBuilder({
  tiers,
  onUpdateSlots,
  totalCapacityKg,
  totalVolumeM3,
}: TierSlotBuilderProps) {
  const totalSlots = tiers.reduce((sum, tier) => sum + (tier.slot_count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tier & Slot Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure cargo space allocation across {tiers.length} tier{tiers.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{totalSlots}</div>
          <div className="text-xs text-muted-foreground">Total Slots</div>
        </div>
      </div>

      {/* Horizontal Tier Rows */}
      <div className="space-y-3">
        {tiers.map((tier, index) => (
          <TierRow
            key={`tier-${tier.tier_order}-${index}`}
            tier={tier}
            tierIndex={index}
            onUpdateSlots={onUpdateSlots}
          />
        ))}
      </div>
    </div>
  );
}

interface TierRowProps {
  tier: TierConfig;
  tierIndex: number;
  onUpdateSlots: (tierIndex: number, newSlotCount: number) => void;
}

function TierRow({
  tier,
  tierIndex,
  onUpdateSlots,
}: TierRowProps) {
  const slotCount = tier.slot_count || 3;
  const tierInfo = getTierInfo(tier.tier_name);
  const canDecrement = slotCount > 1;
  const canIncrement = slotCount < 12;

  return (
    <div className="flex items-center gap-3">
      {/* LEFT: Tier name (fixed width ~90px) */}
      <div className="w-[90px] shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold leading-tight">
            {tier.tier_name}
          </span>
          {tierInfo && (
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] text-muted-foreground cursor-help"
              title={tierInfo}
            >
              i
            </span>
          )}
        </div>
      </div>

      {/* CENTER: Horizontal slot placeholder boxes */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex items-center gap-1">
          {Array.from({ length: slotCount }).map((_, index) => (
            <div
              key={index}
              className="h-7 w-9 rounded-md border border-dashed bg-muted/40"
              aria-label={`Slot ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* RIGHT: Slot controls (- count +) */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onUpdateSlots(tierIndex, slotCount - 1)}
          disabled={!canDecrement}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50"
          aria-label="Decrease slots"
        >
          –
        </button>
        <span className="w-6 text-center text-sm font-medium">
          {slotCount}
        </span>
        <button
          type="button"
          onClick={() => onUpdateSlots(tierIndex, slotCount + 1)}
          disabled={!canIncrement}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50"
          aria-label="Increase slots"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Get tier usage recommendations
 */
function getTierInfo(tierName: string): string {
  const info: Record<string, string> = {
    Upper: 'Top tier - best for lightweight, high-priority items. Easy access for urgent deliveries.',
    Middle: 'Middle tier - balanced for medium-weight packages. Good for standard deliveries.',
    Lower: 'Bottom tier - suitable for heavy items with lower center of gravity. Reduces vehicle instability.',
  };

  return info[tierName] || 'Cargo tier for organizing load capacity.';
}
