import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ruler } from 'lucide-react';
import { formatDimensions } from '@/lib/vlms/capacityCalculations';
import { VehicleWithRelations } from '@/types/vlms';

interface CargoDimensionsSectionProps {
  vehicle: VehicleWithRelations;
}

export function CargoDimensionsSection({ vehicle }: CargoDimensionsSectionProps) {
  const hasDimensions = vehicle.length_cm || vehicle.width_cm || vehicle.height_cm;

  if (!hasDimensions) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Cargo Dimensions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Length */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Length (cm)</div>
            <div className="text-lg font-medium">{vehicle.length_cm || 'N/A'}</div>
          </div>

          {/* Width */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Width (cm)</div>
            <div className="text-lg font-medium">{vehicle.width_cm || 'N/A'}</div>
          </div>

          {/* Height */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Height (cm)</div>
            <div className="text-lg font-medium">{vehicle.height_cm || 'N/A'}</div>
          </div>
        </div>

        {/* Formatted Summary */}
        {vehicle.length_cm && vehicle.width_cm && vehicle.height_cm && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Total Dimensions: <span className="font-medium text-foreground">
                {formatDimensions({ length_cm: vehicle.length_cm, width_cm: vehicle.width_cm, height_cm: vehicle.height_cm })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
