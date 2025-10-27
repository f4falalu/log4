import { Truck, MapPin, Clock, Gauge } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BatchData } from '@/hooks/useScheduleWizard';

interface BatchCardProps {
  batch: BatchData;
  compact?: boolean;
}

export function BatchCard({ batch, compact = false }: BatchCardProps) {
  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-semibold">{batch.name}</h4>
              <p className="text-sm text-muted-foreground">
                {batch.facilityIds.length} stops
              </p>
            </div>
            <Badge variant="outline">
              {batch.estimatedDistance?.toFixed(1)} mi
            </Badge>
          </div>
          {batch.capacityUsedPct && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Capacity</span>
                <span>{batch.capacityUsedPct}%</span>
              </div>
              <Progress value={batch.capacityUsedPct} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{batch.name}</h3>
              <p className="text-sm text-muted-foreground">
                Batch ID: {batch.id}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Stops</p>
              <p className="font-semibold">{batch.facilityIds.length}</p>
            </div>
          </div>

          {batch.estimatedDistance && (
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="font-semibold">{batch.estimatedDistance.toFixed(1)} mi</p>
              </div>
            </div>
          )}

          {batch.estimatedDuration && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold">
                  {Math.round(batch.estimatedDuration / 60)}h {batch.estimatedDuration % 60}m
                </p>
              </div>
            </div>
          )}

          {batch.capacityUsedPct && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Capacity</p>
              <div className="flex items-center gap-2">
                <Progress value={batch.capacityUsedPct} className="flex-1" />
                <span className="text-sm font-semibold">{batch.capacityUsedPct}%</span>
              </div>
            </div>
          )}
        </div>

        {(batch.driverId || batch.vehicleId) && (
          <div className="mt-4 pt-4 border-t flex gap-4 text-sm">
            {batch.vehicleId && (
              <div>
                <span className="text-muted-foreground">Vehicle:</span>{' '}
                <span className="font-medium">{batch.vehicleId}</span>
              </div>
            )}
            {batch.driverId && (
              <div>
                <span className="text-muted-foreground">Driver:</span>{' '}
                <span className="font-medium">{batch.driverId}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
