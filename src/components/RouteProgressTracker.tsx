import { DeliveryBatch } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CheckCircle2, Circle, Clock, MapPin } from 'lucide-react';
import { Progress } from './ui/progress';
import { useMemo } from 'react';

interface RouteProgressTrackerProps {
  batch: DeliveryBatch;
  routeHistory?: any[];
}

export function RouteProgressTracker({ batch, routeHistory = [] }: RouteProgressTrackerProps) {
  const progress = useMemo(() => {
    if (!routeHistory.length) return 0;
    const completed = routeHistory.filter(r => r.status === 'completed').length;
    return (completed / routeHistory.length) * 100;
  }, [routeHistory]);

  const getStopIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'in-transit':
        return <Clock className="h-5 w-5 text-primary animate-pulse" />;
      case 'arrived':
        return <MapPin className="h-5 w-5 text-warning" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'in-transit': return 'bg-primary';
      case 'arrived': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Route Progress</CardTitle>
          <Badge variant="outline">
            {routeHistory.filter(r => r.status === 'completed').length} / {routeHistory.length} stops
          </Badge>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {routeHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No route data available
            </p>
          ) : (
            routeHistory.map((stop, index) => (
              <div key={stop.id} className="flex items-start gap-3">
                <div className="relative">
                  {getStopIcon(stop.status)}
                  {index < routeHistory.length - 1 && (
                    <div className={`absolute top-6 left-1/2 w-0.5 h-8 -translate-x-1/2 ${getStatusColor(stop.status)}`} />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">Stop {stop.sequence_number}</p>
                      <p className="text-sm text-muted-foreground">{stop.facility_name || 'Facility'}</p>
                      {stop.check_in_time && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Checked in: {new Date(stop.check_in_time).toLocaleTimeString()}
                        </p>
                      )}
                      {stop.check_out_time && (
                        <p className="text-xs text-muted-foreground">
                          Checked out: {new Date(stop.check_out_time).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {stop.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
