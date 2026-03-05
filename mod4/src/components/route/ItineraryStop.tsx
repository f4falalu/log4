import { motion } from 'framer-motion';
import { Check, X, Phone, Navigation, Clock, Route, AlertTriangle, Warehouse, Building2, MapPin } from 'lucide-react';
import { Facility, Slot, FacilityType } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistance, formatETA } from '@/lib/gps/eta';
import { TrafficCondition } from '@/lib/gps/traffic';

// Get icon component based on facility type
const getFacilityIcon = (type?: FacilityType) => {
  switch (type) {
    case 'warehouse':
      return Warehouse;
    case 'facility':
      return Building2;
    case 'public':
      return MapPin;
    default:
      return Building2;
  }
};

// Get icon color based on facility type
const getFacilityIconColor = (type?: FacilityType) => {
  switch (type) {
    case 'warehouse':
      return 'text-orange-500';
    case 'facility':
      return 'text-blue-500';
    case 'public':
      return 'text-muted-foreground';
    default:
      return 'text-primary';
  }
};

interface ItineraryStopProps {
  facility: Facility;
  slot: Slot | undefined;
  index: number;
  isLast: boolean;
  isSelected: boolean;
  onSelect: (facility: Facility) => void;
  onNavigate: (facility: Facility) => void;
  eta?: { distanceMeters: number; etaMinutes: number } | null;
  trafficEta?: { adjustedMinutes: number; condition: TrafficCondition } | null;
}

export function ItineraryStop({
  facility,
  slot,
  index,
  isLast,
  isSelected,
  onSelect,
  onNavigate,
  eta,
  trafficEta,
}: ItineraryStopProps) {
  const status = slot?.status || 'pending';
  const isActive = status === 'active';
  const isCompleted = status === 'delivered';
  const isSkipped = status === 'skipped';
  const isFailed = status === 'failed';

  // Get facility type icon
  const FacilityIcon = getFacilityIcon(facility.type);
  const facilityIconColor = getFacilityIconColor(facility.type);

  // Format time display
  const getTimeDisplay = () => {
    if (isCompleted && slot?.actual_time) {
      return new Date(slot.actual_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    if (slot?.scheduled_time) {
      return new Date(slot.scheduled_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    return `${9 + Math.floor(index * 0.5)}:${(index % 2) * 30 || '00'}`;
  };

  // Get status-specific styling
  const getMarkerStyles = () => {
    if (isCompleted) return 'bg-success text-success-foreground';
    if (isSkipped) return 'bg-muted text-muted-foreground';
    if (isFailed) return 'bg-destructive text-destructive-foreground';
    if (isActive) return 'bg-primary text-primary-foreground animate-pulse';
    return 'bg-transparent border-2 border-muted-foreground/50';
  };

  const getConnectorStyles = () => {
    if (isCompleted || isSkipped) return 'border-muted-foreground/30';
    if (isActive) return 'border-primary';
    return 'border-muted-foreground/20 border-dashed';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative flex gap-3"
    >
      {/* Time column */}
      <div className="w-12 shrink-0 pt-1">
        <span
          className={cn(
            'text-xs font-mono',
            isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
          )}
        >
          {getTimeDisplay()}
        </span>
      </div>

      {/* Timeline column */}
      <div className="flex flex-col items-center shrink-0">
        {/* Marker */}
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10',
            getMarkerStyles()
          )}
        >
          {isCompleted && <Check className="w-3.5 h-3.5" />}
          {isFailed && <X className="w-3.5 h-3.5" />}
          {isSkipped && <X className="w-3 h-3" />}
          {isActive && <FacilityIcon className={cn("w-3 h-3", facilityIconColor)} />}
          {!isCompleted && !isFailed && !isSkipped && !isActive && (
            <FacilityIcon className={cn("w-3 h-3", facilityIconColor)} />
          )}
        </div>

        {/* Connector line */}
        {!isLast && (
          <div
            className={cn(
              'w-0 flex-1 min-h-[20px] border-l-2 mt-1',
              getConnectorStyles()
            )}
          />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 pb-4 min-w-0">
        <button
          onClick={() => onSelect(facility)}
          className={cn(
            'w-full text-left p-3 rounded-xl transition-all',
            isActive
              ? 'bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10'
              : isSelected
              ? 'bg-secondary border border-border'
              : 'hover:bg-secondary/50 border border-transparent hover:border-border/50'
          )}
        >
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={cn(
                'text-sm font-semibold truncate flex-1',
                isCompleted || isSkipped
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              )}
            >
              {facility.name}
            </h4>
            {isActive && (
              <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shrink-0">
                Now
              </span>
            )}
          </div>

          {/* Address */}
          <p className="text-xs text-muted-foreground truncate mb-2">
            {facility.address}
          </p>

          {/* Status-specific content */}
          {isCompleted && slot?.actual_time && (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <Check className="w-3 h-3" />
              <span>Delivered at {getTimeDisplay()}</span>
            </div>
          )}

          {isSkipped && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <X className="w-3 h-3" />
              <span>Skipped</span>
            </div>
          )}

          {isFailed && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <X className="w-3 h-3" />
              <span>Delivery failed</span>
            </div>
          )}

          {isActive && (
            <div className="mt-3 space-y-2">
              {/* Live ETA with traffic */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-primary">
                  <Clock className="w-3 h-3" />
                  <span className="font-semibold">
                    {trafficEta 
                      ? formatETA(trafficEta.adjustedMinutes)
                      : eta 
                      ? formatETA(eta.etaMinutes) 
                      : '~8 min'
                    }
                  </span>
                </div>
                {eta && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Route className="w-3 h-3" />
                    <span>{formatDistance(eta.distanceMeters)}</span>
                  </div>
                )}
              </div>

              {/* Traffic indicator */}
              {trafficEta && trafficEta.condition.level !== 'light' && (
                <div 
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md"
                  style={{ 
                    backgroundColor: `${trafficEta.condition.color}20`,
                    color: trafficEta.condition.color 
                  }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{trafficEta.condition.description}</span>
                  {eta && trafficEta.adjustedMinutes > eta.etaMinutes && (
                    <span className="opacity-70">
                      (+{trafficEta.adjustedMinutes - eta.etaMinutes} min)
                    </span>
                  )}
                </div>
              )}

              {/* Contact info */}
              {facility.contact_name && (
                <div className="p-2 rounded-lg bg-secondary/50 text-xs">
                  <p className="font-medium text-foreground">{facility.contact_name}</p>
                  {facility.contact_phone && (
                    <p className="text-muted-foreground">{facility.contact_phone}</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 h-9"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(facility);
                  }}
                >
                  <Navigation className="w-3.5 h-3.5 mr-1.5" />
                  Start In-App Nav
                </Button>
                {facility.contact_phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`tel:${facility.contact_phone}`, '_self');
                    }}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Pending with ETA */}
          {!isActive && !isCompleted && !isSkipped && !isFailed && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>
                  {trafficEta 
                    ? `ETA: ${formatETA(trafficEta.adjustedMinutes)}`
                    : eta 
                    ? `ETA: ${formatETA(eta.etaMinutes)}` 
                    : `Sched: ${getTimeDisplay()}`
                  }
                </span>
              </div>
              {eta && (
                <div className="flex items-center gap-1.5">
                  <Route className="w-3 h-3" />
                  <span>{formatDistance(eta.distanceMeters)}</span>
                </div>
              )}
              {trafficEta && trafficEta.condition.level !== 'light' && (
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: trafficEta.condition.color }}
                  title={trafficEta.condition.description}
                />
              )}
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
}
