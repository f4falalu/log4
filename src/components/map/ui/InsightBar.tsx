import { useDrawerState } from '@/hooks/useDrawerState';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { Activity, Navigation, Clock, Package } from 'lucide-react';

export function InsightBar() {
  const { entityType, entityId } = useDrawerState();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();

  if (!entityId || !entityType) {
    return (
      <div className="h-[120px] bg-background border-t border-border shadow-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Select an entity to view insights
        </p>
      </div>
    );
  }

  let entity = null;
  let metrics: Array<{ icon: any; label: string; value: string }> = [];

  if (entityType === 'driver') {
    entity = drivers.find(d => d.id === entityId);
    if (entity) {
      metrics = [
        { icon: Navigation, label: 'Distance', value: '42 km' },
        { icon: Activity, label: 'Idle', value: '12%' },
        { icon: Clock, label: 'ETA', value: '1h 45m' },
        { icon: Package, label: 'Deliveries', value: '8' },
      ];
    }
  } else if (entityType === 'vehicle') {
    entity = vehicles.find(v => v.id === entityId);
    if (entity) {
      metrics = [
        { icon: Package, label: 'Payload', value: '70%' },
        { icon: Navigation, label: 'Route Progress', value: '60%' },
        { icon: Activity, label: 'Stops Completed', value: '3/5' },
        { icon: Clock, label: 'Avg Speed', value: `${entity.avg_speed || 0} km/h` },
      ];
    }
  }

  if (!entity) {
    return (
      <div className="h-[120px] bg-background border-t border-border shadow-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Entity not found
        </p>
      </div>
    );
  }

  return (
    <div className="h-[120px] bg-background border-t border-border shadow-lg px-6 py-4">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-8">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{metric.label}</div>
                <div className="text-lg font-semibold">{metric.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
