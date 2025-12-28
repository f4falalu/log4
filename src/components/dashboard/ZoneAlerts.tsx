import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ZoneAlert {
  id: string;
  zone_id: string;
  batch_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  alert_type: 'entry' | 'exit' | 'duration_exceeded';
  timestamp: string;
  acknowledged: boolean;
  metadata: any;
}

export default function ZoneAlerts() {
  const { data: alerts = [], refetch } = useQuery({
    queryKey: ['zone-alerts'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('zone_alerts' as any)
          .select(`
            *,
            zone:service_zones(name, color),
            vehicle:vehicles(model, plate_number),
            driver:drivers(name)
          `)
          .order('timestamp', { ascending: false })
          .limit(20);

        if (error) throw error;
        return data as any[];
      } catch (err) {
        console.error('Error fetching zone alerts:', err);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('zone_alerts' as any)
      .update({ 
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) {
      toast.error('Failed to acknowledge alert');
      return;
    }

    toast.success('Alert acknowledged');
    refetch();
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'entry':
        return <MapPin className="h-4 w-4 text-primary" />;
      case 'exit':
        return <MapPin className="h-4 w-4 text-warning" />;
      case 'duration_exceeded':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'entry':
        return <Badge variant="info">Entry</Badge>;
      case 'exit':
        return <Badge variant="warning">Exit</Badge>;
      case 'duration_exceeded':
        return <Badge variant="destructive">Duration Exceeded</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geofence Alerts
          </CardTitle>
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive">{unacknowledgedCount} New</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <Alert>
            <AlertDescription>No geofence alerts in the last 24 hours</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${
                  alert.acknowledged ? 'bg-muted/50' : 'bg-background border-primary'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.alert_type)}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {getAlertBadge(alert.alert_type)}
                        <span className="font-medium text-sm">
                          {alert.zone?.name || 'Unknown Zone'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {alert.vehicle && (
                          <div>Vehicle: {alert.vehicle.model} ({alert.vehicle.plate_number})</div>
                        )}
                        {alert.driver && (
                          <div>Driver: {alert.driver.name}</div>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(alert.timestamp), 'MMM dd, hh:mm a')}
                        </div>
                      </div>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Ack
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
