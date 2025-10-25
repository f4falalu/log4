import { useState } from 'react';
import { useDrawerState } from '@/hooks/useDrawerState';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useTelemetryData } from '@/hooks/useTelemetryData';
import { TimelineScrubber } from './TimelineScrubber';
import { Activity, Navigation, Clock, Package } from 'lucide-react';

export function InsightBar() {
  const { entityType, entityId } = useDrawerState();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  
  // Only fetch telemetry for supported types
  const telemetryType = entityType && ['driver', 'vehicle', 'batch'].includes(entityType) 
    ? (entityType as 'driver' | 'vehicle' | 'batch') 
    : null;
  const { data: telemetry } = useTelemetryData(entityId, telemetryType);
  
  // Timeline state
  const [playbackMode, setPlaybackMode] = useState<'live' | 'playback'>('live');
  const [playbackTime, setPlaybackTime] = useState(new Date());
  
  const shiftStart = new Date();
  shiftStart.setHours(8, 0, 0, 0);
  const shiftEnd = new Date();
  shiftEnd.setHours(17, 0, 0, 0);

  if (!entityId || !entityType) {
    return (
      <div className="min-h-[160px] bg-background border-t border-border shadow-lg flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select an entity to view insights
          </p>
        </div>
        <div className="border-t border-border p-3">
          <TimelineScrubber 
            mode={playbackMode}
            currentTime={playbackTime}
            shiftStart={shiftStart}
            shiftEnd={shiftEnd}
            onTimeChange={setPlaybackTime}
            onModeToggle={() => setPlaybackMode(prev => 
              prev === 'live' ? 'playback' : 'live'
            )}
          />
        </div>
      </div>
    );
  }

  let entity = null;
  let metrics: Array<{ icon: any; label: string; value: string }> = [];

  if (entityType === 'driver') {
    entity = drivers.find(d => d.id === entityId);
    if (entity && telemetry) {
      metrics = [
        { icon: Navigation, label: 'Distance', value: telemetry.distance },
        { icon: Activity, label: 'Idle', value: telemetry.idle },
        { icon: Clock, label: 'ETA', value: telemetry.eta },
        { icon: Package, label: 'Deliveries', value: telemetry.deliveries.toString() },
      ];
    }
  } else if (entityType === 'vehicle') {
    entity = vehicles.find(v => v.id === entityId);
    if (entity && telemetry) {
      metrics = [
        { icon: Package, label: 'Payload', value: telemetry.payload },
        { icon: Navigation, label: 'Route Progress', value: telemetry.routeProgress },
        { icon: Activity, label: 'Stops Completed', value: telemetry.stopsCompleted },
        { icon: Clock, label: 'Avg Speed', value: telemetry.avgSpeed },
      ];
    }
  } else if (entityType === 'batch' && telemetry) {
    metrics = [
      { icon: Package, label: 'Completion', value: telemetry.completion },
      { icon: Clock, label: 'Avg Stop Time', value: telemetry.avgStopTime },
      { icon: Navigation, label: 'Total Distance', value: telemetry.totalDistance },
      { icon: Activity, label: 'ETA Progress', value: telemetry.etaProgress },
    ];
  }

  if (!entity && entityType !== 'batch') {
    return (
      <div className="min-h-[160px] bg-background border-t border-border shadow-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Entity not found
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[160px] bg-background border-t border-border shadow-lg flex flex-col">
      <div className="flex-1 px-6 py-4">
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
      
      <div className="border-t border-border p-3">
        <TimelineScrubber 
          mode={playbackMode}
          currentTime={playbackTime}
          shiftStart={shiftStart}
          shiftEnd={shiftEnd}
          onTimeChange={setPlaybackTime}
          onModeToggle={() => setPlaybackMode(prev => 
            prev === 'live' ? 'playback' : 'live'
          )}
        />
      </div>
    </div>
  );
}
