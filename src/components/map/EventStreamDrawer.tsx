import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useZoneAlerts } from '@/hooks/useZoneAlerts';
import { Bell, CheckCircle2, AlertTriangle, Info, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EventStreamDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function EventStreamDrawer({ open, onClose }: EventStreamDrawerProps) {
  const { data: alerts = [], acknowledgeAlert } = useZoneAlerts();

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'zone_entry':
        return <MapPin className="w-4 h-4 text-biko-success" />;
      case 'zone_exit':
        return <MapPin className="w-4 h-4 text-biko-muted" />;
      case 'zone_breach':
        return <AlertTriangle className="w-4 h-4 text-biko-danger" />;
      default:
        return <Info className="w-4 h-4 text-biko-accent" />;
    }
  };

  const getSeverityBadge = (eventType: string) => {
    if (eventType === 'zone_breach') {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (eventType === 'zone_entry') {
      return <Badge variant="default">Info</Badge>;
    }
    return <Badge variant="secondary">Normal</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-[420px]"
        aria-label="Event stream drawer"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-biko-primary" />
            Event Stream
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div 
            className="space-y-3" 
            role="log" 
            aria-live="polite" 
            aria-relevant="additions"
          >
            {alerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent events</p>
              </div>
            )}

            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 bg-card border rounded-biko-md space-y-2 transition-colors hover:bg-accent/5"
                role="article"
                aria-label={`${alert.event_type} event`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getEventIcon(alert.event_type)}
                    <span className="font-medium capitalize">
                      {alert.event_type.replace('_', ' ')}
                    </span>
                  </div>
                  {getSeverityBadge(alert.event_type)}
                </div>

                {alert.notes && (
                  <p className="text-sm text-muted-foreground">{alert.notes}</p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <time dateTime={alert.timestamp}>
                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                  </time>
                  
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="h-7 text-xs"
                      aria-label={`Acknowledge ${alert.event_type} event`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
