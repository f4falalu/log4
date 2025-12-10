import { Package } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { VehicleWithRelations } from '@/types/vlms';
import { PayloadSummarySection } from './capacity/PayloadSummarySection';
import { BasicInformationCard } from './capacity/BasicInformationCard';
import { VehicleCapacityCard } from './capacity/VehicleCapacityCard';
import { CargoDimensionsSection } from './capacity/CargoDimensionsSection';
import { TierConfigurationSection } from './capacity/TierConfigurationSection';
import { AIMetadataSection } from './capacity/AIMetadataSection';

interface VehicleCapacityTabProps {
  vehicle: VehicleWithRelations;
}

export function VehicleCapacityTab({ vehicle }: VehicleCapacityTabProps) {
  // Check if capacity data exists
  const hasCapacityData =
    vehicle.capacity_kg ||
    vehicle.capacity_m3 ||
    vehicle.tiered_config ||
    vehicle.length_cm ||
    vehicle.width_cm ||
    vehicle.height_cm ||
    vehicle.gross_vehicle_weight_kg;

  if (!hasCapacityData) {
    return (
      <EmptyState
        icon={Package}
        title="No capacity information"
        description="This vehicle does not have capacity information. Please edit the vehicle to configure dimensions and payload."
        variant="dashed"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top: 3-column stat cards */}
      <PayloadSummarySection vehicle={vehicle} />

      {/* Bottom: 2-column side-by-side layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BasicInformationCard vehicle={vehicle} />
        <VehicleCapacityCard vehicle={vehicle} />
      </div>

      {/* Optional sections below */}
      <CargoDimensionsSection vehicle={vehicle} />
      <TierConfigurationSection vehicle={vehicle} />
      <AIMetadataSection vehicle={vehicle} />
    </div>
  );
}
