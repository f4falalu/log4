import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Package, MapPin, Clock } from 'lucide-react';
import type { DeliveryBatch } from '@/types';

interface BatchDetailsOverlayProps {
  batch: DeliveryBatch;
  onClose: () => void;
}

export function BatchDetailsOverlay({ batch, onClose }: BatchDetailsOverlayProps) {
  const statusColors: Record<string, string> = {
    planned: 'bg-muted',
    assigned: 'bg-primary',
    'in-progress': 'bg-warning',
    completed: 'bg-success',
    cancelled: 'bg-destructive',
  };

  return (
    <Card className="bg-background/95 backdrop-blur border shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {batch.name}
          </CardTitle>
          <Badge className={statusColors[batch.status]}>
            {batch.status.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Key Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{batch.facilities.length} stops</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{Math.ceil(batch.estimatedDuration / 60)} hrs</span>
            </div>
          </div>
          
          {/* Stops List */}
          <div>
            <h4 className="font-semibold mb-2">Delivery Stops</h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {batch.facilities.map((facility, idx) => (
                  <div key={facility.id} className="flex items-start gap-2 text-sm">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{facility.name}</div>
                      <div className="text-xs text-muted-foreground">{facility.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
