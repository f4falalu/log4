// MOD4 Sync Queue Drawer
// Visualization of pending events and sync status

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSyncStore } from '@/lib/sync/machine';
import { getSyncStatus, getPendingEvents, getErrorEvents } from '@/lib/db/events';
import { Mod4Event } from '@/lib/db/schema';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  Wifi,
  WifiOff,
  Package,
  MapPin,
  Camera,
  FileText,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const eventTypeIcons: Record<string, React.ElementType> = {
  slot_delivered: Package,
  slot_skipped: Package,
  location_update: MapPin,
  photo_captured: Camera,
  signature_captured: FileText,
  support_request: AlertCircle,
  batch_started: Zap,
  batch_completed: Check,
};

export function SyncQueueDrawer() {
  const { 
    state, 
    isOnline, 
    pendingCount, 
    errorCount, 
    lastSync,
    triggerSync,
    retryErrors,
    refreshCounts
  } = useSyncStore();

  const [pendingEvents, setPendingEvents] = useState<Mod4Event[]>([]);
  const [errorEvents, setErrorEvents] = useState<Mod4Event[]>([]);
  const [syncStats, setSyncStats] = useState({ pending: 0, syncing: 0, synced: 0, error: 0 });

  const loadEvents = async () => {
    const [pending, errors, stats] = await Promise.all([
      getPendingEvents(),
      getErrorEvents(),
      getSyncStatus()
    ]);
    setPendingEvents(pending.slice(0, 20));
    setErrorEvents(errors.slice(0, 10));
    setSyncStats(stats);
    refreshCounts();
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalEvents = syncStats.pending + syncStats.syncing + syncStats.synced + syncStats.error;
  const syncedPercent = totalEvents > 0 ? (syncStats.synced / totalEvents) * 100 : 100;

  return (
    <Sheet onOpenChange={(open) => open && loadEvents()}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            "gap-2 px-3",
            !isOnline && "text-muted-foreground"
          )}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4 text-success" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          
          {state === 'SYNCING' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : pendingCount > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {pendingCount} pending
            </Badge>
          ) : errorCount > 0 ? (
            <Badge variant="destructive" className="text-xs">
              {errorCount} failed
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Synced</span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Sync Queue
            </SheetTitle>
            <div className="flex items-center gap-2">
              {errorCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryErrors}
                  className="text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Retry Failed
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={triggerSync}
                disabled={state === 'SYNCING' || !isOnline}
                className="text-xs"
              >
                {state === 'SYNCING' ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                )}
                Sync Now
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Connection status */}
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg mb-4",
          isOnline ? "bg-success/10" : "bg-muted"
        )}>
          {isOnline ? (
            <>
              <Wifi className="w-5 h-5 text-success" />
              <div>
                <p className="text-sm font-medium text-success">Online</p>
                <p className="text-xs text-muted-foreground">
                  {lastSync 
                    ? `Last synced ${formatDistanceToNow(lastSync, { addSuffix: true })}`
                    : 'Ready to sync'
                  }
                </p>
              </div>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Offline Mode</p>
                <p className="text-xs text-muted-foreground">
                  Events will sync when connection is restored
                </p>
              </div>
            </>
          )}
        </div>

        {/* Sync progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Sync Progress</span>
            <span className="font-mono">{Math.round(syncedPercent)}%</span>
          </div>
          <Progress value={syncedPercent} className="h-2" />
          
          <div className="flex items-center justify-between mt-3 text-xs">
            <StatBadge icon={Clock} label="Pending" count={syncStats.pending} color="text-warning" />
            <StatBadge icon={Loader2} label="Syncing" count={syncStats.syncing} color="text-primary" />
            <StatBadge icon={Check} label="Synced" count={syncStats.synced} color="text-success" />
            <StatBadge icon={AlertCircle} label="Failed" count={syncStats.error} color="text-destructive" />
          </div>
        </div>

        {/* Error events */}
        <AnimatePresence>
          {errorEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Failed Events ({errorCount})
              </h4>
              <div className="space-y-2">
                {errorEvents.map((event) => (
                  <EventItem key={event.id} event={event} status="error" />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending events */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Pending Events ({pendingCount})
          </h4>
          <ScrollArea className="h-[calc(80vh-350px)]">
            {pendingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Check className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">All events synced</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {pendingEvents.map((event) => (
                  <EventItem key={event.id} event={event} status="pending" />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatBadge({ 
  icon: Icon, 
  label, 
  count, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  count: number; 
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("font-medium", color)}>{count}</span>
    </div>
  );
}

function EventItem({ event, status }: { event: Mod4Event; status: 'pending' | 'error' }) {
  const Icon = eventTypeIcons[event.type] || FileText;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
        status === 'error' ? "bg-destructive/10" : "bg-secondary/50"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        status === 'error' ? "bg-destructive/20" : "bg-primary/20"
      )}>
        <Icon className={cn(
          "w-4 h-4",
          status === 'error' ? "text-destructive" : "text-primary"
        )} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(event.timestamp, { addSuffix: true })}
          {event.sync_attempts > 0 && ` · ${event.sync_attempts} attempts`}
        </p>
      </div>

      {status === 'pending' && (
        <Clock className="w-4 h-4 text-muted-foreground" />
      )}
      {status === 'error' && (
        <AlertCircle className="w-4 h-4 text-destructive" />
      )}
    </motion.div>
  );
}
