import { Route } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package, Clock, Weight, Box } from 'lucide-react';
import { RouteMapPreview } from './RouteMapPreview';
import 'leaflet/dist/leaflet.css';

interface RouteCardProps {
  route: Route;
}

export function RouteCard({ route }: RouteCardProps) {
  const getStatusVariant = (status: Route['status']): 'success' | 'warning' | 'info' | 'secondary' => {
    const statusMap = {
      on_the_way: 'success' as const,
      loading: 'warning' as const,
      unloading: 'info' as const,
      waiting: 'warning' as const,
      completed: 'secondary' as const,
    };
    return statusMap[status] || 'secondary';
  };

  const getStatusLabel = (status: Route['status']) => {
    const labelMap = {
      on_the_way: 'ON THE WAY',
      loading: 'LOADING',
      unloading: 'UNLOADING',
      waiting: 'WAITING',
      completed: 'COMPLETED',
    };
    return labelMap[status] || 'WAITING';
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-lg">{route.id}</span>
              <Badge size="sm" variant="secondary">
                <Package className="h-3 w-3 mr-1" />
                {route.packageCount}
              </Badge>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div>{route.address}</div>
                <div className="text-xs mt-0.5">→ {route.destination}</div>
              </div>
            </div>
          </div>
          <Badge size="sm" variant={getStatusVariant(route.status)}>
            {getStatusLabel(route.status)}
          </Badge>
        </div>

        {/* Mini Map */}
        <div className="h-32 rounded-lg overflow-hidden mb-3 border">
          <RouteMapPreview 
            routeId={route.id}
            mapPoints={route.mapPoints || []}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-3 w-3" />
              Distance
            </div>
            <div className="font-semibold text-sm">
              {route.distance}
              <span className="text-xs text-muted-foreground ml-0.5">mi</span>
            </div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3 w-3" />
              Time Left
            </div>
            <div className="font-semibold text-sm">
              {route.timeLeft}
              <span className="text-xs text-muted-foreground ml-0.5">min</span>
            </div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Weight className="h-3 w-3" />
              Weight
            </div>
            <div className="font-semibold text-sm">
              {route.weight}
              <span className="text-xs text-muted-foreground ml-0.5">lbs</span>
            </div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Box className="h-3 w-3" />
              Volume
            </div>
            <div className="font-semibold text-sm">
              {(route.volume / 1000).toFixed(0)}k
              <span className="text-xs text-muted-foreground ml-0.5">ft³</span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground text-right">
          {new Date(route.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </CardContent>
    </Card>
  );
}
