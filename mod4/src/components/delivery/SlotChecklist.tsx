// MOD4 Slot Checklist
// Complete list of delivery slots with status indicators

import { motion } from 'framer-motion';
import { Slot, Facility } from '@/lib/db/schema';
import { 
  CheckCircle2, CircleDot, AlertCircle, 
  ChevronRight, MapPin, Clock, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlotChecklistProps {
  slots: Slot[];
  facilities: Facility[];
  activeSlotId: string | null;
  onSlotSelect: (slot: Slot) => void;
}

export function SlotChecklist({ 
  slots, 
  facilities, 
  activeSlotId,
  onSlotSelect 
}: SlotChecklistProps) {
  const getFacility = (facilityId: string) => 
    facilities.find(f => f.id === facilityId);

  const sortedSlots = [...slots].sort((a, b) => a.sequence - b.sequence);

  const statusConfig = {
    pending: { 
      icon: CircleDot, 
      color: 'text-muted-foreground', 
      bg: 'bg-muted',
      label: 'Pending'
    },
    active: { 
      icon: Package, 
      color: 'text-primary', 
      bg: 'bg-primary/20',
      label: 'Active'
    },
    delivered: { 
      icon: CheckCircle2, 
      color: 'text-success', 
      bg: 'bg-success/20',
      label: 'Delivered'
    },
    failed: { 
      icon: AlertCircle, 
      color: 'text-destructive', 
      bg: 'bg-destructive/20',
      label: 'Failed'
    },
    skipped: { 
      icon: AlertCircle, 
      color: 'text-warning', 
      bg: 'bg-warning/20',
      label: 'Skipped'
    },
  };

  return (
    <div className="space-y-1">
      {sortedSlots.map((slot, index) => {
        const facility = getFacility(slot.facility_id);
        const config = statusConfig[slot.status];
        const Icon = config.icon;
        const isActive = slot.id === activeSlotId;
        const isClickable = slot.status === 'active' || slot.status === 'pending';

        if (!facility) return null;

        return (
          <motion.div
            key={slot.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={cn(
              "relative flex items-center gap-3 p-4 rounded-xl transition-all duration-200",
              isActive 
                ? "bg-primary/10 border-2 border-primary/40" 
                : "bg-card border border-border/50",
              isClickable && "cursor-pointer hover:border-primary/30 hover:bg-card/80",
              !isClickable && "opacity-80"
            )}
            onClick={() => isClickable && onSlotSelect(slot)}
          >
            {/* Sequence number / status icon */}
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm",
                config.bg
              )}>
                {slot.status === 'delivered' || slot.status === 'skipped' || slot.status === 'failed' ? (
                  <Icon className={cn("w-5 h-5", config.color)} />
                ) : (
                  <span className={cn(config.color)}>{slot.sequence}</span>
                )}
              </div>
            </div>

            {/* Slot info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "text-sm font-semibold truncate",
                  slot.status === 'delivered' ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {facility.name}
                </h4>
                {slot.status === 'active' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary">
                    Now
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{facility.address}</span>
              </div>

              {/* Delivery time for completed slots */}
              {slot.actual_time && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>
                    Delivered at {new Date(slot.actual_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Status indicator / chevron */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                config.color
              )}>
                {config.label}
              </span>
              {isClickable && (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            {/* Active pulse indicator */}
            {slot.status === 'active' && (
              <div className="absolute top-3 right-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
