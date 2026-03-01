// MOD4 Day Deliveries
// Panel showing deliveries for a selected date

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  MapPin,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarStore } from '@/stores/calendarStore';
import { Slot } from '@/lib/db/schema';

interface DayDeliveriesProps {
  date: Date;
}

const statusConfig: Record<Slot['status'], { icon: typeof CheckCircle2; color: string; label: string }> = {
  delivered: { icon: CheckCircle2, color: 'text-success', label: 'Delivered' },
  skipped: { icon: AlertTriangle, color: 'text-warning', label: 'Skipped' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Failed' },
  pending: { icon: Clock, color: 'text-muted-foreground', label: 'Scheduled' },
  active: { icon: Clock, color: 'text-primary', label: 'In Progress' },
};

export function DayDeliveries({ date }: DayDeliveriesProps) {
  const { selectedDayDeliveries, isLoadingDay } = useCalendarStore();

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '--:--';
    return format(new Date(timestamp), 'HH:mm');
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-2xl bg-card border border-border/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {format(date, 'EEEE, MMMM d')}
          </h4>
          <p className="text-xs text-muted-foreground">
            {selectedDayDeliveries.length} {selectedDayDeliveries.length === 1 ? 'delivery' : 'deliveries'}
          </p>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="max-h-[300px] overflow-y-auto">
        {isLoadingDay ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : selectedDayDeliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No deliveries on this day</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {selectedDayDeliveries.map((delivery, index) => {
              const config = statusConfig[delivery.status];
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={delivery.slotId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-4 hover:bg-secondary/50 transition-colors"
                >
                  {/* Time */}
                  <div className="flex-shrink-0 w-12 text-right">
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatTime(delivery.actualTime ?? delivery.scheduledTime)}
                    </span>
                  </div>
                  
                  {/* Status Icon */}
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0",
                    delivery.status === 'delivered' && "bg-success/20",
                    delivery.status === 'skipped' && "bg-warning/20",
                    delivery.status === 'failed' && "bg-destructive/20",
                    (delivery.status === 'pending' || delivery.status === 'active') && "bg-secondary"
                  )}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                  </div>
                  
                  {/* Facility Info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-foreground truncate">
                      {delivery.facilityName}
                    </h5>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">
                        {delivery.facilityAddress}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={cn(
                    "flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium",
                    delivery.status === 'delivered' && "bg-success/20 text-success",
                    delivery.status === 'skipped' && "bg-warning/20 text-warning",
                    delivery.status === 'failed' && "bg-destructive/20 text-destructive",
                    (delivery.status === 'pending' || delivery.status === 'active') && "bg-secondary text-muted-foreground"
                  )}>
                    {config.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
