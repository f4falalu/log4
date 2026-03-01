// MOD4 Telemetry Overlay
// GPS status and battery indicator for the map

import { motion, AnimatePresence } from 'framer-motion';
import { useGpsTelemetry } from '@/lib/gps/telemetry';
import { 
  Navigation, Battery, BatteryCharging, 
  BatteryLow, BatteryMedium, BatteryFull,
  Wifi, WifiOff, Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncStore } from '@/lib/sync/machine';

interface TelemetryOverlayProps {
  className?: string;
}

export function TelemetryOverlay({ className }: TelemetryOverlayProps) {
  const { 
    isTracking, 
    position, 
    batteryLevel, 
    isCharging,
    intervalMs 
  } = useGpsTelemetry();
  const { isOnline } = useSyncStore();

  const getBatteryIcon = () => {
    if (isCharging) return BatteryCharging;
    if (batteryLevel === null) return Battery;
    if (batteryLevel < 0.2) return BatteryLow;
    if (batteryLevel < 0.5) return BatteryMedium;
    return BatteryFull;
  };

  const getBatteryColor = () => {
    if (isCharging) return 'text-success';
    if (batteryLevel === null) return 'text-muted-foreground';
    if (batteryLevel < 0.2) return 'text-destructive';
    if (batteryLevel < 0.5) return 'text-warning';
    return 'text-success';
  };

  const BatteryIcon = getBatteryIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "absolute top-4 left-4 right-4 flex items-center justify-between gap-2",
        className
      )}
    >
      {/* GPS Status */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg">
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full",
          isTracking && position ? "bg-success/20" : "bg-muted"
        )}>
          <Navigation className={cn(
            "w-3.5 h-3.5",
            isTracking && position ? "text-success" : "text-muted-foreground"
          )} />
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">
            {isTracking ? (position ? 'GPS Active' : 'Acquiring...') : 'GPS Off'}
          </span>
          {position && (
            <span className="text-[10px] text-muted-foreground font-mono">
              ±{Math.round(position.accuracy)}m
            </span>
          )}
        </div>
      </div>

      {/* Right side stats */}
      <div className="flex items-center gap-2">
        {/* Speed */}
        <AnimatePresence>
          {position?.speed !== null && position?.speed !== undefined && position.speed > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg"
            >
              <Gauge className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono font-medium text-foreground">
                {Math.round(position.speed * 3.6)} km/h
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Network status */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-success" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-warning" />
          )}
        </div>

        {/* Battery */}
        {batteryLevel !== null && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg">
            <BatteryIcon className={cn("w-4 h-4", getBatteryColor())} />
            <span className="text-xs font-mono font-medium text-foreground">
              {Math.round(batteryLevel * 100)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
