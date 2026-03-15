import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Weight, Box, Warehouse, Calendar } from 'lucide-react';
import type { DriverBatch } from '@/hooks/useDriverBatches';

interface BatchCardProps {
  batch: DriverBatch;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'secondary' | 'destructive' }> = {
  'planned': { label: 'PLANNED', variant: 'secondary' },
  'assigned': { label: 'ASSIGNED', variant: 'info' },
  'in-progress': { label: 'IN PROGRESS', variant: 'success' },
  'completed': { label: 'COMPLETED', variant: 'secondary' },
  'cancelled': { label: 'CANCELLED', variant: 'destructive' },
};

export function BatchCard({ batch }: BatchCardProps) {
  const config = statusConfig[batch.status] || statusConfig.planned;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-lg">{batch.name}</span>
              <Badge size="sm" variant="secondary">
                <MapPin className="h-3 w-3 mr-1" />
                {batch.facilityCount} stops
              </Badge>
            </div>
            {batch.warehouseName && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Warehouse className="h-3.5 w-3.5" />
                {batch.warehouseName}
              </div>
            )}
          </div>
          <Badge size="sm" variant={config.variant}>
            {config.label}
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-3 w-3" />
              Distance
            </div>
            <div className="font-semibold text-sm">
              {batch.totalDistance.toFixed(1)}
              <span className="text-xs text-muted-foreground ml-0.5">km</span>
            </div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3 w-3" />
              Duration
            </div>
            <div className="font-semibold text-sm">
              {batch.estimatedDuration}
              <span className="text-xs text-muted-foreground ml-0.5">min</span>
            </div>
          </div>
          {batch.totalWeight != null && (
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
                <Weight className="h-3 w-3" />
                Weight
              </div>
              <div className="font-semibold text-sm">
                {batch.totalWeight.toFixed(0)}
                <span className="text-xs text-muted-foreground ml-0.5">kg</span>
              </div>
            </div>
          )}
          {batch.totalVolume != null && (
            <div className="bg-muted/50 rounded p-2">
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
                <Box className="h-3 w-3" />
                Volume
              </div>
              <div className="font-semibold text-sm">
                {(batch.totalVolume / 1000).toFixed(0)}k
                <span className="text-xs text-muted-foreground ml-0.5">cm³</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(batch.scheduledDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          {batch.scheduledTime && ` at ${batch.scheduledTime}`}
        </div>
      </CardContent>
    </Card>
  );
}
