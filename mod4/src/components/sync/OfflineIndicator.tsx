// MOD4 Offline Indicator
// Always-visible offline mode banner

import { motion, AnimatePresence } from 'framer-motion';
import { useSyncStore } from '@/lib/sync/machine';
import { WifiOff, Cloud, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineIndicator() {
  const { isOnline, pendingCount, triggerSync } = useSyncStore();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-warning text-warning-foreground px-4 py-2 flex items-center justify-center gap-3 safe-top"
        >
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">
            Offline Mode
            {pendingCount > 0 && ` · ${pendingCount} events queued`}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              // Check connection and try to sync
              if (navigator.onLine) {
                triggerSync();
              }
            }}
            className="h-6 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Floating sync status for bottom of screen
export function FloatingSyncStatus() {
  const { state, pendingCount, isOnline } = useSyncStore();

  if (isOnline && pendingCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-warning" />
            <span className="text-sm text-warning">Offline</span>
          </>
        ) : state === 'SYNCING' ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Cloud className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm text-primary">Syncing...</span>
          </>
        ) : (
          <>
            <Cloud className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{pendingCount} pending</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
