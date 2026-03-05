import { motion } from 'framer-motion';
import { Facility, Slot } from '@/lib/db/schema';
import { Check, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsedItineraryProps {
  facilities: Facility[];
  slots: Slot[];
  onExpand: () => void;
  className?: string;
}

export function CollapsedItinerary({
  facilities,
  slots,
  onExpand,
  className,
}: CollapsedItineraryProps) {
  // Sort facilities by slot sequence
  const sortedFacilities = [...facilities].sort((a, b) => {
    const slotA = slots.find((s) => s.facility_id === a.id);
    const slotB = slots.find((s) => s.facility_id === b.id);
    return (slotA?.sequence || 0) - (slotB?.sequence || 0);
  });

  const getStopStatus = (facility: Facility) => {
    const slot = slots.find((s) => s.facility_id === facility.id);
    return slot?.status || 'pending';
  };

  return (
    <motion.div
      initial={{ x: -56 }}
      animate={{ x: 0 }}
      exit={{ x: -56 }}
      className={cn(
        'flex flex-col items-center py-4 w-14 bg-background/95 backdrop-blur-xl border-r border-border/50',
        className
      )}
    >
      {/* Progress indicator at top */}
      <div className="mb-3 px-2">
        <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{
              width: `${
                (slots.filter((s) => s.status === 'delivered' || s.status === 'skipped').length /
                  Math.max(1, slots.length)) *
                100
              }%`,
            }}
          />
        </div>
      </div>

      {/* Stop indicators */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 px-2 scrollbar-none">
        {sortedFacilities.map((facility, index) => {
          const status = getStopStatus(facility);
          const isActive = status === 'active';
          const isCompleted = status === 'delivered';
          const isSkipped = status === 'skipped';
          const isFailed = status === 'failed';

          return (
            <motion.button
              key={facility.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={onExpand}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                isActive && 'bg-primary/20 ring-2 ring-primary shadow-lg shadow-primary/20',
                isCompleted && 'bg-success/20',
                isSkipped && 'bg-muted',
                isFailed && 'bg-destructive/20',
                !isActive && !isCompleted && !isSkipped && !isFailed && 'bg-secondary hover:bg-secondary/80'
              )}
            >
              {isCompleted && <Check className="w-4 h-4 text-success" />}
              {isFailed && <X className="w-4 h-4 text-destructive" />}
              {isSkipped && <X className="w-3.5 h-3.5 text-muted-foreground" />}
              {isActive && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <MapPin className="w-4 h-4 text-primary" />
                </motion.div>
              )}
              {!isActive && !isCompleted && !isSkipped && !isFailed && (
                <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Expand hint */}
      <div className="mt-3 px-2">
        <motion.div
          animate={{ x: [0, 3, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-muted-foreground"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3 1L7 5L3 9" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
