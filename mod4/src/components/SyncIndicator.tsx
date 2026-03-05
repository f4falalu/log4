// MOD4 Sync Status Indicator
// Always-visible sync state display

import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Cloud, CloudOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useSyncStore, SyncState } from '@/lib/sync/machine';
import { cn } from '@/lib/utils';

const stateConfig: Record<SyncState, {
  icon: typeof Wifi;
  label: string;
  color: string;
  pulse: boolean;
}> = {
  IDLE: {
    icon: Check,
    label: 'Synced',
    color: 'text-sync-success',
    pulse: false,
  },
  OFFLINE: {
    icon: WifiOff,
    label: 'Offline',
    color: 'text-muted-foreground',
    pulse: false,
  },
  QUEUED: {
    icon: Cloud,
    label: 'Pending',
    color: 'text-sync-pending',
    pulse: true,
  },
  SYNCING: {
    icon: Loader2,
    label: 'Syncing',
    color: 'text-sync-syncing',
    pulse: false,
  },
  SYNCED: {
    icon: Check,
    label: 'Synced',
    color: 'text-sync-success',
    pulse: false,
  },
  ERROR: {
    icon: AlertCircle,
    label: 'Error',
    color: 'text-sync-error',
    pulse: true,
  },
};

export function SyncIndicator() {
  const { state, pendingCount, errorCount, isOnline } = useSyncStore();
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-secondary/50 backdrop-blur-sm border border-border/50",
        "touch-target"
      )}
    >
      {/* Connection indicator */}
      <div className={cn("flex items-center gap-1", isOnline ? "text-success" : "text-muted-foreground")}>
        {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
      </div>

      <div className="w-px h-4 bg-border" />

      {/* Sync state */}
      <div className={cn("flex items-center gap-1.5", config.color)}>
        <motion.div
          animate={state === 'SYNCING' ? { rotate: 360 } : config.pulse ? { scale: [1, 1.1, 1] } : {}}
          transition={state === 'SYNCING' 
            ? { duration: 1, repeat: Infinity, ease: 'linear' }
            : { duration: 2, repeat: Infinity }
          }
        >
          <Icon className="w-3.5 h-3.5" />
        </motion.div>
        <span className="text-xs font-medium">{config.label}</span>
      </div>

      {/* Pending/error count */}
      <AnimatePresence>
        {(pendingCount > 0 || errorCount > 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center",
              "text-[10px] font-bold",
              errorCount > 0 
                ? "bg-destructive text-destructive-foreground" 
                : "bg-primary text-primary-foreground"
            )}
          >
            {errorCount > 0 ? errorCount : pendingCount}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Compact version for headers
export function SyncIndicatorCompact() {
  const { state, pendingCount, isOnline } = useSyncStore();
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5", config.color)}>
      {!isOnline && <WifiOff className="w-4 h-4 text-muted-foreground" />}
      <motion.div
        animate={state === 'SYNCING' ? { rotate: 360 } : {}}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Icon className="w-4 h-4" />
      </motion.div>
      {pendingCount > 0 && (
        <span className="text-xs font-semibold">{pendingCount}</span>
      )}
    </div>
  );
}
