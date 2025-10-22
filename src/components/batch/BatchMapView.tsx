import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Route, Navigation } from 'lucide-react';

interface BatchMapViewProps {
  batch: any;
}

export function BatchMapView({ batch }: BatchMapViewProps) {
  // This would integrate with the existing MapCore component
  // For now, we'll show a placeholder with route information
  
  const stops = batch.stops || [];
  const totalDistance = batch.estimated_distance_km || 0;
  const estimatedDuration = batch.estimated_duration_min || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Route Overview
          </CardTitle>
          <CardDescription>
            Interactive map showing batch route and stops
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <MapPin className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stops.length}</p>
              <p className="text-sm text-muted-foreground">Total Stops</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Route className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{totalDistance.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">km Distance</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Navigation className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{Math.floor(estimatedDuration / 60)}h {estimatedDuration % 60}m</p>
              <p className="text-sm text-muted-foreground">Est. Duration</p>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="w-full h-96 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Interactive Route Map</p>
              <p className="text-sm">This would integrate with MapCore.tsx to show:</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• Vehicle current location (if in progress)</li>
                <li>• Optimized route path</li>
                <li>• Stop markers with status indicators</li>
                <li>• Real-time traffic conditions</li>
                <li>• Geofencing alerts</li>
              </ul>
            </div>
          </div>

          {/* Route Sequence */}
          <div className="mt-6">
            <h4 className="font-medium mb-4">Route Sequence</h4>
            <div className="space-y-3">
              {stops.map((stop: any, index: number) => (
                <div key={stop.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{stop.facility?.name}</div>
                    <div className="text-sm text-muted-foreground">{stop.facility?.address}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {stop.estimated_arrival 
                        ? new Date(stop.estimated_arrival).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'TBD'
                      }
                    </div>
                    <div className="text-muted-foreground capitalize">{stop.stop_type}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${
                      stop.status === 'completed' ? 'bg-green-500' :
                      stop.status === 'arrived' ? 'bg-blue-500' :
                      stop.status === 'en_route' ? 'bg-yellow-500' :
                      'bg-gray-300'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
