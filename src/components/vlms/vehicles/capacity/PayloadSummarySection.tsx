import { Card, CardContent } from '@/components/ui/card';
import { Package, Weight, Boxes } from 'lucide-react';
import { formatWeight, formatVolume } from '@/lib/vlms/capacityCalculations';
import { VehicleWithRelations } from '@/types/vlms';

interface PayloadSummarySectionProps {
  vehicle: VehicleWithRelations;
}

export function PayloadSummarySection({ vehicle }: PayloadSummarySectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Max Payload */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Weight className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Max Payload</div>
          </div>
          <div className="text-2xl font-bold">
            {vehicle.capacity_kg ? formatWeight(vehicle.capacity_kg) : 'N/A'}
          </div>
        </CardContent>
      </Card>

      {/* Gross Vehicle Weight */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Weight className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Gross Vehicle Weight</div>
          </div>
          <div className="text-2xl font-bold">
            {vehicle.gross_vehicle_weight_kg ? formatWeight(vehicle.gross_vehicle_weight_kg) : 'N/A'}
          </div>
        </CardContent>
      </Card>

      {/* Cargo Volume */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Cargo Volume</div>
          </div>
          <div className="text-2xl font-bold">
            {vehicle.capacity_m3 ? formatVolume(vehicle.capacity_m3) : 'N/A'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
