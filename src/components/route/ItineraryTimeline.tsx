import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Facility, Slot } from '@/lib/db/schema';
import { ItineraryStop } from './ItineraryStop';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, Truck, Search, X, Clock, Sparkles, Route, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTelemetryStore } from '@/lib/gps/telemetry';
import { 
  calculateCumulativeETA, 
  formatETA, 
  formatDistance, 
  optimizeRoute,
  OptimizationResult 
} from '@/lib/gps/eta';
import { 
  getCurrentTrafficCondition, 
  applyTrafficToETA,
  TrafficCondition 
} from '@/lib/gps/traffic';
import { useBatchStore } from '@/stores/batchStore';
import { toast } from 'sonner';

interface ItineraryTimelineProps {
  facilities: Facility[];
  slots: Slot[];
  batchId?: string;
  selectedFacilityId?: string;
  onFacilitySelect: (facility: Facility) => void;
  onNavigate: (facility: Facility) => void;
  className?: string;
}

export function ItineraryTimeline({
  facilities,
  slots,
  batchId,
  selectedFacilityId,
  onFacilitySelect,
  onNavigate,
  className,
}: ItineraryTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeStopRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationPreview, setOptimizationPreview] = useState<OptimizationResult | null>(null);

  // Store action for reordering
  const reorderPendingSlots = useBatchStore((state) => state.reorderPendingSlots);

  // GPS telemetry for ETA calculations
  const currentPosition = useTelemetryStore((state) => state.currentPosition);

  // Calculate progress
  const completedCount = slots.filter(
    (s) => s.status === 'delivered' || s.status === 'skipped'
  ).length;
  const totalCount = slots.length || facilities.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Sort facilities by slot sequence
  const sortedFacilities = useMemo(() => {
    return [...facilities].sort((a, b) => {
      const slotA = slots.find((s) => s.facility_id === a.id);
      const slotB = slots.find((s) => s.facility_id === b.id);
      return (slotA?.sequence || 0) - (slotB?.sequence || 0);
    });
  }, [facilities, slots]);

  // Calculate ETAs for all pending stops
  const etaMap = useMemo(() => {
    const activeIndex = sortedFacilities.findIndex((f) => {
      const slot = slots.find((s) => s.facility_id === f.id);
      return slot?.status === 'active';
    });
    
    if (activeIndex === -1) return new Map();
    
    return calculateCumulativeETA(
      currentPosition,
      sortedFacilities,
      activeIndex,
      5 // 5 min average stop duration
    );
  }, [sortedFacilities, slots, currentPosition]);

  // Get current traffic condition
  const trafficCondition = useMemo(() => {
    return getCurrentTrafficCondition();
  }, []);

  // Calculate traffic-aware ETAs
  const trafficEtaMap = useMemo(() => {
    const map = new Map<string, { adjustedMinutes: number; condition: TrafficCondition }>();
    
    etaMap.forEach((eta, facilityId) => {
      const adjustedMinutes = applyTrafficToETA(eta.etaMinutes, trafficCondition.level);
      map.set(facilityId, {
        adjustedMinutes,
        condition: trafficCondition,
      });
    });
    
    return map;
  }, [etaMap, trafficCondition]);

  // Filter facilities based on search
  const filteredFacilities = useMemo(() => {
    if (!searchQuery.trim()) return sortedFacilities;
    
    const query = searchQuery.toLowerCase().trim();
    return sortedFacilities.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.address.toLowerCase().includes(query) ||
        (f.contact_name && f.contact_name.toLowerCase().includes(query))
    );
  }, [sortedFacilities, searchQuery]);

  // Total remaining ETA with traffic
  const totalRemainingETA = useMemo(() => {
    let total = 0;
    trafficEtaMap.forEach((value) => {
      total = Math.max(total, value.adjustedMinutes);
    });
    // Fallback to base ETA if no traffic data
    if (total === 0) {
      etaMap.forEach((value) => {
        total = Math.max(total, value.etaMinutes);
      });
    }
    return total;
  }, [trafficEtaMap, etaMap]);

  // Scroll to active stop on mount
  useEffect(() => {
    const activeIndex = slots.findIndex((s) => s.status === 'active');
    if (activeIndex !== -1 && scrollContainerRef.current && !searchQuery) {
      const container = scrollContainerRef.current;
      const targetScroll = Math.max(0, activeIndex * 120 - 100);
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [slots, searchQuery]);

  // Calculate optimization preview
  const pendingCount = slots.filter((s) => s.status === 'pending').length;

  // Handle route optimization
  const handleOptimize = useCallback(() => {
    if (!currentPosition) {
      toast.error('GPS position required', {
        description: 'Enable location services to optimize route',
      });
      return;
    }

    setIsOptimizing(true);

    // Simulate brief calculation time for UX
    setTimeout(() => {
      const result = optimizeRoute(currentPosition, facilities, slots);
      
      if (!result) {
        toast.info('Route already optimal', {
          description: 'No pending stops to reorder',
        });
        setIsOptimizing(false);
        return;
      }

      if (result.savedPercentage < 1) {
        toast.info('Route already optimal', {
          description: 'Current order is efficient',
        });
        setIsOptimizing(false);
        return;
      }

      setOptimizationPreview(result);
      setIsOptimizing(false);
    }, 500);
  }, [currentPosition, facilities, slots]);

  // Apply optimization
  const applyOptimization = useCallback(() => {
    if (!optimizationPreview) return;

    reorderPendingSlots(optimizationPreview.optimizedOrder);
    
    toast.success('Route optimized!', {
      description: `Saved ${formatDistance(Math.round(optimizationPreview.savedDistance))} (${Math.round(optimizationPreview.savedPercentage)}%)`,
    });
    
    setOptimizationPreview(null);
  }, [optimizationPreview, reorderPendingSlots]);

  // Cancel optimization preview
  const cancelOptimization = useCallback(() => {
    setOptimizationPreview(null);
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Optimization preview banner */}
      <AnimatePresence>
        {optimizationPreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-success/10 border-b border-success/30"
          >
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-success">
                  Save {formatDistance(Math.round(optimizationPreview.savedDistance))}
                </span>
                <span className="text-xs text-success/70">
                  ({Math.round(optimizationPreview.savedPercentage)}% shorter)
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={applyOptimization}
                >
                  Apply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={cancelOptimization}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with batch info and progress */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border-b border-border/50"
      >
        {/* Batch ID */}
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-primary/20">
            <Truck className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Dispatch
            </p>
            <p className="text-sm font-mono font-semibold text-foreground">
              #{batchId?.slice(-8) || 'BATCH-001'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono text-foreground">
              {completedCount}/{totalCount} Stops
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Stats row with optimize button */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-success" />
              <span className="text-xs text-muted-foreground">
                <span className="text-success font-semibold">{completedCount}</span> done
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">
                <span className="text-primary font-semibold">{pendingCount}</span> left
              </span>
            </div>
          </div>
          
          {/* Optimize button */}
          {pendingCount >= 2 && !optimizationPreview && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-accent hover:text-accent hover:bg-accent/10"
              onClick={handleOptimize}
              disabled={isOptimizing || !currentPosition}
            >
              {isOptimizing ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Route className="w-3.5 h-3.5 mr-1" />
              )}
              Optimize
            </Button>
          )}
        </div>

        {/* Search input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search stops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={cn(
              'pl-9 pr-8 h-9 text-sm bg-secondary/50 border-border/50 transition-all',
              isSearchFocused && 'ring-1 ring-primary border-primary/50'
            )}
            maxLength={100}
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Timeline list */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      >
        {filteredFacilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No stops match "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No stops assigned</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Stops will appear here when a batch is loaded
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-0">
            {filteredFacilities.map((facility, index) => {
              const slot = slots.find((s) => s.facility_id === facility.id);
              const isActive = slot?.status === 'active';
              const isCompleted = slot?.status === 'delivered' || slot?.status === 'skipped';
              const eta = etaMap.get(facility.id);
              const trafficEta = trafficEtaMap.get(facility.id);

              // Get original index for sequence display
              const originalIndex = sortedFacilities.findIndex((f) => f.id === facility.id);

              return (
                <div
                  key={facility.id}
                  ref={isActive ? activeStopRef : undefined}
                  className={cn(
                    isCompleted && 'opacity-50'
                  )}
                >
                  <ItineraryStop
                    facility={facility}
                    slot={slot}
                    index={originalIndex}
                    isLast={index === filteredFacilities.length - 1}
                    isSelected={selectedFacilityId === facility.id}
                    onSelect={onFacilitySelect}
                    onNavigate={onNavigate}
                    eta={eta}
                    trafficEta={trafficEta}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Transport info with live ETA and traffic */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-3 border-t border-border/50 bg-secondary/30"
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Est. completion</span>
          </div>
          <span className="font-mono text-foreground font-semibold">
            {totalRemainingETA > 0 
              ? formatETA(totalRemainingETA)
              : `~${Math.max(1, totalCount - completedCount) * 15} min`
            }
          </span>
        </div>

        {/* Traffic status */}
        <div className="flex items-center justify-between text-xs mt-1">
          <div className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: trafficCondition.color }}
            />
            <span className="text-muted-foreground/70">{trafficCondition.description}</span>
          </div>
          {trafficCondition.level !== 'light' && (
            <span 
              className="font-mono text-xs"
              style={{ color: trafficCondition.color }}
            >
              +{Math.round((trafficCondition.multiplier - 1) * 100)}%
            </span>
          )}
        </div>

        {currentPosition && (
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground/70">GPS active</span>
            <span className="text-success/70 font-mono">
              {currentPosition.speed !== null 
                ? `${Math.round(currentPosition.speed * 3.6)} km/h`
                : 'Acquiring...'
              }
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
