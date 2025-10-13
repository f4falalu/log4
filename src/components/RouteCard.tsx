import { useState, useEffect } from 'react';
import { Route } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package, Clock, Weight, Box } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteCardProps {
  route: Route;
}

export function RouteCard({ route }: RouteCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getStatusBadge = (status: Route['status']) => {
    const statusMap = {
      on_the_way: { label: 'ON THE WAY', className: 'bg-green-500' },
      loading: { label: 'LOADING', className: 'bg-orange-500' },
      unloading: { label: 'UNLOADING', className: 'bg-blue-500' },
      waiting: { label: 'WAITING', className: 'bg-yellow-500' },
      completed: { label: 'COMPLETED', className: 'bg-gray-500' },
    };
    return statusMap[status] || statusMap.waiting;
  };

  const statusBadge = getStatusBadge(route.status);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-lg">{route.id}</span>
              <Badge variant="secondary" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                {route.packageCount} packages
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
          <Badge className={`text-white ${statusBadge.className}`}>
            {statusBadge.label}
          </Badge>
        </div>

        {/* Mini Map */}
        <div className="h-32 rounded-lg overflow-hidden mb-3 border">
          {mounted && (
            <MapContainer
              center={route.mapPoints[0]}
              zoom={13}
              scrollWheelZoom={false}
              zoomControl={false}
              dragging={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {route.mapPoints.map((point, idx) => (
                <Marker key={idx} position={[point.lat, point.lng]} />
              ))}
              {route.mapPoints.length > 1 && (
                <Polyline
                  positions={route.mapPoints.map(p => [p.lat, p.lng] as [number, number])}
                  color="#3b82f6"
                  weight={3}
                />
              )}
            </MapContainer>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-3 w-3" />
              Distance
            </div>
            <div className="font-semibold text-sm">{route.distance} mi</div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3 w-3" />
              Time Left
            </div>
            <div className="font-semibold text-sm">{route.timeLeft} min</div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Weight className="h-3 w-3" />
              Weight
            </div>
            <div className="font-semibold text-sm">{route.weight} lbs</div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Box className="h-3 w-3" />
              Volume
            </div>
            <div className="font-semibold text-sm">{(route.volume / 1000).toFixed(0)}k</div>
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
