import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useZoneAlerts, useAcknowledgeAlert } from '@/hooks/useZoneAlerts';
import { useRealtimeEvents, SystemEvent } from '@/hooks/useRealtimeEvents';
import { Package, ArrowRightLeft, User, Truck, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface EventStreamDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function EventStreamDrawer({ open, onClose }: EventStreamDrawerProps) {
  const { alerts: zoneAlerts = [] } = useZoneAlerts();
  const { acknowledgeAlert } = useAcknowledgeAlert();
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);

  // Subscribe to real-time events from all sources
  useRealtimeEvents((event) => {
    setSystemEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50 events
  });

  // Combine zone alerts and system events into unified stream
  const allEvents = [
    ...zoneAlerts.map(alert => ({
      id: alert.id,
      type: 'zone' as const,
      event: alert.event_type,
      timestamp: alert.timestamp,
      data: alert,
      severity: alert.event_type === 'zone_exit' ? 'critical' as const : 'warning' as const,
      acknowledged: alert.acknowledged
    })),
    ...systemEvents
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getEventIcon = (event: SystemEvent) => {
    switch (event.type) {
      case 'zone': return MapPin;
      case 'batch': return Package;
      case 'handoff': return ArrowRightLeft;
      case 'driver': return User;
      case 'vehicle': return Truck;
      default: return AlertTriangle;
    }
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'critical') {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (severity === 'warning') {
      return <Badge variant="default">Warning</Badge>;
    }
    return <Badge variant="secondary">Info</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-[420px]"
        aria-label="Event stream drawer"
      >
        <SheetHeader>
          <SheetTitle>Event Stream</SheetTitle>
          <SheetDescription>
            Real-time system events across all operations
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div 
            className="space-y-4 pr-4" 
            role="log" 
            aria-live="polite" 
            aria-relevant="additions"
          >
            {allEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent events</p>
              </div>
            ) : (
              allEvents.map((event) => {
                const EventIcon = getEventIcon(event);
                const isZoneAlert = event.type === 'zone' && event.data.event_type === 'zone_exit';
                
                return (
                  <div
                    key={event.id}
                    className="p-4 border border-biko-border/20 rounded-lg space-y-3 bg-biko-surface hover:bg-biko-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1">
                        <EventIcon className="w-5 h-5 mt-0.5 text-biko-primary" aria-hidden="true" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm text-biko-foreground capitalize">
                              {event.event.replace(/_/g, ' ')}
                            </p>
                            {getSeverityBadge(event.severity)}
                            <Badge variant="outline" className="text-xs">
                              {event.type}
                            </Badge>
                          </div>
                          {event.data?.notes && (
                            <p className="text-sm text-biko-muted">{event.data.notes}</p>
                          )}
                          {event.data?.name && (
                            <p className="text-sm text-biko-muted">
                              {event.type === 'batch' ? 'Batch: ' : ''}
                              {event.data.name}
                            </p>
                          )}
                          <p className="text-xs text-biko-muted">
                            {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {!event.acknowledged && isZoneAlert && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => acknowledgeAlert(event.id)}
                        aria-label={`Acknowledge ${event.event} alert`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                        Acknowledge
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
