import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { formatWeight } from '@/lib/vlms/capacityCalculations';
import { VehicleWithRelations } from '@/types/vlms';
import { TierConfig } from '@/types/vlms-onboarding';
import { VehicleCapacityVisualizer } from './VehicleCapacityVisualizer';

interface VehicleCapacityCardProps {
  vehicle: VehicleWithRelations;
  currentWeight?: number; // Optional current load for visualization
  currentVolume?: number; // Optional current volume for visualization
}

/**
 * Map VLMS vehicle types to visualizer types
 */
function mapVehicleType(vehicleType?: string | null): 'truck' | 'van' | 'pickup' | 'car' {
  const type = vehicleType?.toLowerCase();

  if (type === 'truck' || type === 'bus') return 'truck';
  if (type === 'van') return 'van';
  if (type === 'pickup' || type === 'suv') return 'pickup';
  if (type === 'sedan' || type === 'car') return 'car';

  // Default to van for logistics use case
  return 'van';
}

export function VehicleCapacityCard({ vehicle, currentWeight, currentVolume }: VehicleCapacityCardProps) {
  // Extract tiers array from tiered_config object
  const tieredConfig = vehicle.tiered_config as any;
  const tierConfigs: TierConfig[] = tieredConfig?.tiers || [];

  // Sort tiers by order (Upper first for visual display)
  const sortedTiers = [...tierConfigs].sort((a, b) => (b.tier_order || 0) - (a.tier_order || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Vehicle Capacity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vehicle Capacity Visualizer */}
        <div className="flex justify-center py-4 border-b">
          <VehicleCapacityVisualizer
            vehicleType={mapVehicleType(vehicle.vehicle_type)}
            currentWeight={currentWeight}
            maxWeight={vehicle.capacity_kg || undefined}
            currentVolume={currentVolume}
            maxVolume={vehicle.capacity_m3 || undefined}
            size="lg"
            showLabel={false}
            showMetrics={true}
          />
        </div>

        {/* Payload Capacity Header */}
        {vehicle.capacity_kg && (
          <div className="pb-4 border-b">
            <div className="text-sm text-muted-foreground mb-1">Payload Capacity</div>
            <div className="text-2xl font-bold">{formatWeight(vehicle.capacity_kg)}</div>
          </div>
        )}

        {/* Tier Visualization */}
        {sortedTiers.length > 0 ? (
          <div className="space-y-3">
            {sortedTiers.map((tier) => (
              <div key={tier.tier_order}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{tier.tier_name}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {tier.max_weight_kg ? formatWeight(tier.max_weight_kg) : ''}
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {/* Render boxes based on capacity percentage */}
                  {Array.from({ length: Math.max(1, Math.ceil((tier.weight_pct || 0) / 10)) }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 w-12 border-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                      title={`${tier.tier_name} capacity slot`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">
            No tier configuration available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
