import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Truck, 
  Package, 
  CheckCircle2, 
  User, 
  Clock, 
  AlertTriangle,
  MapPin,
  Play,
  Square
} from 'lucide-react';
import { DeliveryBatch } from '@/types';
import { DRIVERS } from '@/data/fleet';

interface ActivityTimelineProps {
  batches: DeliveryBatch[];
}

interface TimelineEvent {
  id: string;
  type: 'batch-created' | 'driver-assigned' | 'delivery-started' | 'delivery-completed' | 'status-change' | 'delay';
  timestamp: Date;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  batchId?: string;
  batchName?: string;
}

const ActivityTimeline = ({ batches }: ActivityTimelineProps) => {
  // Generate timeline events from batches
  const generateEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    batches.forEach(batch => {
      // Batch created event
      events.push({
        id: `${batch.id}-created`,
        type: 'batch-created',
        timestamp: new Date(batch.createdAt),
        title: 'Batch Created',
        description: `${batch.name} • ${batch.facilities.length} facilities • ${batch.totalDistance}km`,
        icon: Package,
        iconColor: 'text-blue-600',
        batchId: batch.id,
        batchName: batch.name
      });

      // Driver assigned event
      if (batch.driverId) {
        const driver = DRIVERS.find(d => d.id === batch.driverId);
        const assignedTime = new Date(batch.createdAt);
        assignedTime.setMinutes(assignedTime.getMinutes() + 5); // Simulate 5 min after creation
        
        events.push({
          id: `${batch.id}-driver-assigned`,
          type: 'driver-assigned',
          timestamp: assignedTime,
          title: 'Driver Assigned',
          description: `${driver?.name || 'Unknown Driver'} → ${batch.name}`,
          icon: User,
          iconColor: 'text-purple-600',
          batchId: batch.id,
          batchName: batch.name
        });
      }

      // Delivery started event
      if (batch.actualStartTime) {
        events.push({
          id: `${batch.id}-started`,
          type: 'delivery-started',
          timestamp: new Date(batch.actualStartTime),
          title: 'Delivery Started',
          description: `${batch.name} • ${DRIVERS.find(d => d.id === batch.driverId)?.name || 'Driver'}`,
          icon: Play,
          iconColor: 'text-green-600',
          batchId: batch.id,
          batchName: batch.name
        });
      }

      // In progress updates (simulated stop completions)
      if (batch.status === 'in-progress' && batch.actualStartTime) {
        const startTime = new Date(batch.actualStartTime);
        const stopsCompleted = Math.min(3, Math.floor(batch.facilities.length * 0.4));
        
        for (let i = 0; i < stopsCompleted; i++) {
          const stopTime = new Date(startTime);
          stopTime.setMinutes(stopTime.getMinutes() + (i + 1) * 20);
          
          events.push({
            id: `${batch.id}-stop-${i}`,
            type: 'status-change',
            timestamp: stopTime,
            title: 'Stop Completed',
            description: `${batch.facilities[i]?.name || `Stop ${i + 1}`} • ${batch.name}`,
            icon: CheckCircle2,
            iconColor: 'text-green-600',
            batchId: batch.id,
            batchName: batch.name
          });
        }
      }

      // Delivery completed event
      if (batch.status === 'completed' && batch.actualEndTime) {
        events.push({
          id: `${batch.id}-completed`,
          type: 'delivery-completed',
          timestamp: new Date(batch.actualEndTime),
          title: 'Delivery Completed',
          description: `${batch.name} • All ${batch.facilities.length} stops completed`,
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
          batchId: batch.id,
          batchName: batch.name
        });
      }

      // Cancelled event
      if (batch.status === 'cancelled') {
        const cancelTime = new Date(batch.createdAt);
        cancelTime.setHours(cancelTime.getHours() + 1);
        
        events.push({
          id: `${batch.id}-cancelled`,
          type: 'status-change',
          timestamp: cancelTime,
          title: 'Batch Cancelled',
          description: `${batch.name}`,
          icon: Square,
          iconColor: 'text-red-600',
          batchId: batch.id,
          batchName: batch.name
        });
      }
    });

    // Sort by timestamp (most recent first)
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const events = generateEvents();

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
          <Badge variant="outline">{events.length} events</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-6 pt-0 space-y-1">
            {events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              events.map((event, index) => {
                const Icon = event.icon;
                const isLast = index === events.length - 1;

                return (
                  <div key={event.id} className="flex gap-3 pb-4 relative">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                    )}
                    
                    {/* Icon */}
                    <div className={`relative flex-shrink-0 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center ${
                      index === 0 ? 'animate-scale-in' : ''
                    }`}>
                      <Icon className={`h-3 w-3 ${event.iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 ${index === 0 ? 'animate-fade-in' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <div className="font-medium text-sm">{event.title}</div>
                        <time className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTime(event.timestamp)}
                        </time>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.description}
                      </div>
                      {event.batchName && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {event.batchName}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityTimeline;
