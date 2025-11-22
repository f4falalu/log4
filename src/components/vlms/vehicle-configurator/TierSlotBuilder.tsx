/**
 * Tier & Slot Builder Component
 * Visual slot grid system for cargo capacity allocation
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TierConfig } from '@/types/vlms-onboarding';
import { formatWeight, formatVolume } from '@/lib/vlms/capacityCalculations';
import { cn } from '@/lib/utils';

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
    <div className="space-y-6">
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

      {/* Tier Sections */}
      <div className="space-y-6">
        {tiers.map((tier, index) => (
          <TierSection
            key={`tier-${tier.tier_order}-${index}`}
            tier={tier}
            tierIndex={index}
            onUpdateSlots={onUpdateSlots}
            totalCapacityKg={totalCapacityKg}
            totalVolumeM3={totalVolumeM3}
          />
        ))}
      </div>

      {/* Summary */}
      {(totalCapacityKg || totalVolumeM3) && (
        <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {totalCapacityKg && (
              <div>
                <span className="text-muted-foreground">Total Capacity:</span>
                <span className="ml-2 font-semibold">{formatWeight(totalCapacityKg)}</span>
              </div>
            )}
            {totalVolumeM3 && (
              <div>
                <span className="text-muted-foreground">Total Volume:</span>
                <span className="ml-2 font-semibold">{formatVolume(totalVolumeM3)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TierSectionProps {
  tier: TierConfig;
  tierIndex: number;
  onUpdateSlots: (tierIndex: number, newSlotCount: number) => void;
  totalCapacityKg?: number;
  totalVolumeM3?: number;
}

function TierSection({
  tier,
  tierIndex,
  onUpdateSlots,
  totalCapacityKg,
  totalVolumeM3,
}: TierSectionProps) {
  const slotCount = tier.slot_count || 3;

  const tierInfo = getTierInfo(tier.tier_name);

  return (
    <div className="space-y-3">
      {/* Tier Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">{tier.tier_name}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">{tierInfo}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Slot Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateSlots(tierIndex, slotCount - 1)}
            disabled={slotCount <= 1}
          >
            <Minus className="w-4 h-4" />
          </Button>

          <span className="text-sm font-medium min-w-[4ch] text-center">
            {slotCount}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateSlots(tierIndex, slotCount + 1)}
            disabled={slotCount >= 12}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Slot Grid */}
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: slotCount }).map((_, slotIndex) => (
          <div
            key={`slot-${tierIndex}-${slotIndex}`}
            className={cn(
              'aspect-[11/9] rounded border-2 border-muted bg-background',
              'hover:border-primary/50 hover:bg-primary/5 transition-all duration-200',
              'cursor-pointer'
            )}
          >
            {/* Empty slot - ready for future loading planner integration */}
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground/30 font-mono">
                {slotIndex + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tier Capacity Info */}
      {(tier.max_weight_kg || tier.max_volume_m3) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {tier.max_weight_kg && (
            <span>{formatWeight(tier.max_weight_kg)} max</span>
          )}
          {tier.max_volume_m3 && (
            <span>{formatVolume(tier.max_volume_m3)} max</span>
          )}
        </div>
      )}
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
