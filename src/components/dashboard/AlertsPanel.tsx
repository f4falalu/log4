import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, AlertCircle, Info, Clock, Navigation, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeliveryBatch } from '@/types';

interface AlertsPanelProps {
  batches: DeliveryBatch[];
}

interface Alert {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

const AlertsPanel = ({ batches }: AlertsPanelProps) => {
  const alerts = useMemo((): Alert[] => {
    const alertsList: Alert[] = [];

    // Check for delayed batches (urgent priority that are still planned)
    const delayedUrgent = batches.filter(
      b => b.priority === 'urgent' && b.status === 'planned'
    );
    delayedUrgent.forEach(batch => {
      alertsList.push({
        id: `delay-${batch.id}`,
        type: 'urgent',
        title: 'Urgent Delivery Not Started',
        description: `${batch.name} - ${batch.facilities.length} facilities waiting`,
        timestamp: new Date().toLocaleTimeString(),
        icon: <AlertTriangle className="h-4 w-4" />
      });
    });

    // Check for high-priority unassigned batches
    const unassignedHigh = batches.filter(
      b => (b.priority === 'high' || b.priority === 'urgent') && !b.driverId && b.status !== 'completed'
    );
    if (unassignedHigh.length > 0) {
      alertsList.push({
        id: 'unassigned-high',
        type: 'urgent',
        title: 'Unassigned High-Priority Batches',
        description: `${unassignedHigh.length} batch(es) need driver assignment`,
        timestamp: new Date().toLocaleTimeString(),
        icon: <Navigation className="h-4 w-4" />
      });
    }

    // Check for long routes (>100km)
    const longRoutes = batches.filter(
      b => b.totalDistance > 100 && b.status === 'in-progress'
    );
    longRoutes.forEach(batch => {
      alertsList.push({
        id: `long-route-${batch.id}`,
        type: 'warning',
        title: 'Long Route in Progress',
        description: `${batch.name} - ${batch.totalDistance}km route`,
        timestamp: new Date().toLocaleTimeString(),
        icon: <TrendingUp className="h-4 w-4" />
      });
    });

    // Check for batches with many stops
    const manyStops = batches.filter(
      b => b.facilities.length > 5 && (b.status === 'in-progress' || b.status === 'assigned')
    );
    manyStops.forEach(batch => {
      alertsList.push({
        id: `stops-${batch.id}`,
        type: 'warning',
        title: 'High Stop Count',
        description: `${batch.name} - ${batch.facilities.length} delivery stops`,
        timestamp: new Date().toLocaleTimeString(),
        icon: <AlertCircle className="h-4 w-4" />
      });
    });

    // Info: New batches created today
    const recentBatches = batches.filter(b => {
      const createdDate = new Date(b.createdAt);
      const today = new Date();
      return createdDate.toDateString() === today.toDateString();
    });
    if (recentBatches.length > 0) {
      alertsList.push({
        id: 'new-batches',
        type: 'info',
        title: 'New Delivery Requests',
        description: `${recentBatches.length} new batch(es) created today`,
        timestamp: new Date().toLocaleTimeString(),
        icon: <Info className="h-4 w-4" />
      });
    }

    // Check for extended delivery times
    const longDuration = batches.filter(
      b => b.estimatedDuration > 180 && b.status !== 'completed'
    );
    longDuration.forEach(batch => {
      alertsList.push({
        id: `duration-${batch.id}`,
        type: 'info',
        title: 'Extended Delivery Time',
        description: `${batch.name} - ${Math.round(batch.estimatedDuration / 60)}h estimated`,
        timestamp: new Date().toLocaleTimeString(),
        icon: <Clock className="h-4 w-4" />
      });
    });

    return alertsList.sort((a, b) => {
      const priority = { urgent: 0, warning: 1, info: 2 };
      return priority[a.type] - priority[b.type];
    });
  }, [batches]);

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'urgent': return 'border-destructive/50 bg-destructive/10';
      case 'warning': return 'border-warning/50 bg-warning/10';
      case 'info': return 'border-info/50 bg-info/10';
    }
  };

  const getBadgeVariant = (type: Alert['type']): 'destructive' | 'warning' | 'info' => {
    switch (type) {
      case 'urgent': return 'destructive';
      case 'warning': return 'warning';
      case 'info': return 'info';
    }
  };

  const urgentCount = alerts.filter(a => a.type === 'urgent').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const infoCount = alerts.filter(a => a.type === 'info').length;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alerts & Issues
          </span>
          <div className="flex gap-2">
            {urgentCount > 0 && (
              <Badge variant="destructive">{urgentCount}</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning">{warningCount}</Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="info">{infoCount}</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 p-6 pt-0">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Info className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No alerts at this time</p>
                <p className="text-xs mt-1">All systems operating normally</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${getAlertColor(alert.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5',
                      alert.type === 'urgent' && 'text-destructive',
                      alert.type === 'warning' && 'text-warning',
                      alert.type === 'info' && 'text-info'
                    )}>
                      {alert.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{alert.title}</span>
                        <Badge variant={getBadgeVariant(alert.type)} className="text-xs">
                          {alert.type.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {alert.timestamp}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;
