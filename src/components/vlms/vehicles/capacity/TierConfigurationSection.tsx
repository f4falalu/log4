import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';
import { formatWeight, formatVolume, formatTierSummary } from '@/lib/vlms/capacityCalculations';
import { VehicleWithRelations } from '@/types/vlms';
import { TierConfig } from '@/types/vlms-onboarding';

interface TierConfigurationSectionProps {
  vehicle: VehicleWithRelations;
}

export function TierConfigurationSection({ vehicle }: TierConfigurationSectionProps) {
  // Handle both old format (bare array) and new format ({tiers: []})
  const tieredConfig = vehicle.tiered_config as { tiers: TierConfig[] } | TierConfig[] | null;
  const tierConfigs: TierConfig[] = Array.isArray(tieredConfig)
    ? tieredConfig
    : tieredConfig?.tiers || [];

  if (!tierConfigs || tierConfigs.length === 0) {
    return null;
  }

  // Sort tiers by order (Lower first for logical display)
  const sortedTiers = [...tierConfigs].sort((a, b) => (a.tier_order || 0) - (b.tier_order || 0));

  // Calculate total slots
  const totalSlots = tierConfigs.reduce((sum, tier) => sum + (tier.slot_count || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Tier Configuration
          {totalSlots > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {totalSlots} slots
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Horizontal Slot Visualization (matching configurator) */}
        <div className="space-y-4">
          {sortedTiers.map((tier) => (
            <div key={tier.tier_order} className="flex items-center gap-3">
              {/* Tier Name */}
              <div className="w-[90px] shrink-0">
                <Badge variant="outline" className="font-semibold">
                  {tier.tier_name}
                </Badge>
              </div>

              {/* Horizontal Slot Boxes */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex items-center gap-1">
                  {Array.from({ length: tier.slot_count || 0 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-7 w-9 rounded-md border border-dashed bg-muted/40 hover:bg-muted/60 transition-colors"
                      title={`${tier.tier_name} - Slot ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Slot Count */}
              <div className="shrink-0 text-sm text-muted-foreground">
                {tier.slot_count || 0} slots
              </div>
            </div>
          ))}
        </div>

        {/* Data Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Max Weight</TableHead>
                <TableHead>Max Volume</TableHead>
                <TableHead className="text-right">Weight %</TableHead>
                <TableHead className="text-right">Volume %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTiers.map((tier) => (
                <TableRow key={tier.tier_order}>
                  <TableCell className="font-medium">{tier.tier_name}</TableCell>
                  <TableCell>
                    {tier.max_weight_kg ? formatWeight(tier.max_weight_kg) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {tier.max_volume_m3 ? formatVolume(tier.max_volume_m3) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">{tier.weight_pct || 0}%</TableCell>
                  <TableCell className="text-right">{tier.volume_pct || 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
