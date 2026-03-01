// MOD4 Route Page
// Full-screen route map with progressive itinerary sidebar

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RouteMap, TelemetryOverlay } from '@/components/map';
import { 
  ItineraryTimeline, 
  CollapsedItinerary, 
  FacilityPopover,
  RouteTopBar,
  NavigationControls,
  RouteBottomTabs,
  AlternateRoutes,
  FacilityTypeFilter,
} from '@/components/route';
import { useBatchStore } from '@/stores/batchStore';
import { Facility, FacilityType } from '@/lib/db/schema';
import { optimizeRoute, getOptimizationStats, formatRouteDistance, formatRouteDuration } from '@/lib/route/optimization';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Route() {
  const navigate = useNavigate();
  const { facilities, slots, currentBatch, reorderPendingSlots } = useBatchStore();
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);
  const [currentMapLayer, setCurrentMapLayer] = useState('default');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [alternateRoutes, setAlternateRoutes] = useState<Array<{
    id: string;
    polyline: string;
    duration: string;
    distance: string;
    isSelected: boolean;
  }>>([]);
  const [activeTab, setActiveTab] = useState('go');
  
  // Facility type filters - all visible by default
  const [activeFilters, setActiveFilters] = useState<Set<FacilityType>>(
    new Set(['warehouse', 'facility', 'public'])
  );
  const [isOptimized, setIsOptimized] = useState(false);

  // Filter facilities based on active type filters
  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      const type = f.type || 'facility';
      return activeFilters.has(type);
    });
  }, [facilities, activeFilters]);

  // Handle filter toggle
  const handleFilterChange = useCallback((type: FacilityType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Don't allow removing last filter
        if (next.size > 1) {
          next.delete(type);
        }
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Handle route optimization
  const handleOptimizeRoute = useCallback(() => {
    if (isOptimized) {
      // Already optimized, maybe show stats or reset
      toast.info('Route is already optimized');
      return;
    }

    const optimized = optimizeRoute(facilities);
    const stats = getOptimizationStats(facilities, optimized);

    // Reorder slots based on optimized facility order
    const optimizedFacilityIds = optimized.map(f => f.id);
    reorderPendingSlots(optimizedFacilityIds);

    setIsOptimized(true);

    if (stats.savedPercent > 0) {
      toast.success(`Route optimized!`, {
        description: `Saved ${formatRouteDistance(stats.savedDistance)} (${stats.savedPercent}% shorter). Estimated time: ${formatRouteDuration(stats.estimatedTime)}`,
      });
    } else {
      toast.success('Route optimized!', {
        description: `Total distance: ${formatRouteDistance(stats.optimizedDistance)}. Estimated time: ${formatRouteDuration(stats.estimatedTime)}`,
      });
    }
  }, [facilities, isOptimized, reorderPendingSlots]);

  // Generate mock alternate routes
  useEffect(() => {
    if (currentBatch?.route_polyline && facilities.length > 0) {
      // Generate 2-3 alternate routes
      const routes = [
        {
          id: 'route-1',
          polyline: currentBatch.route_polyline,
          duration: '45 min',
          distance: '12.5 km',
          isSelected: true,
        },
        {
          id: 'route-2',
          polyline: currentBatch.route_polyline + '_alt1',
          duration: '52 min',
          distance: '14.2 km',
          isSelected: false,
        },
        {
          id: 'route-3',
          polyline: currentBatch.route_polyline + '_alt2',
          duration: '48 min',
          distance: '13.8 km',
          isSelected: false,
        },
      ];
      setAlternateRoutes(routes);
    }
  }, [currentBatch?.route_polyline, facilities.length]);

  const handleFacilityClick = useCallback((facility: Facility, position: { x: number; y: number }) => {
    setSelectedFacility(facility);
    setPopoverPosition(position);
  }, []);

  const handleTimelineSelect = useCallback((facility: Facility) => {
    // When selecting from timeline, we don't have position, so use center of map area
    setSelectedFacility(facility);
    setPopoverPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, []);

  // In-app navigation handler used by timeline and popover
  const handleInAppNavigate = (facility: Facility) => {
    setSelectedFacility(facility);
    setActiveDestinationId(facility.id);
    setIsNavigating(true);
  };

  const handleStartNavigation = () => {
    setIsNavigating(true);
    // Find active facility
    const activeSlot = slots.find(s => s.status === 'active');
    if (activeSlot) {
      const facility = facilities.find(f => f.id === activeSlot.facility_id);
      if (facility) {
        setSelectedFacility(facility);
        setActiveDestinationId(facility.id);
      }
    }
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
  };

  const handleExitNavigation = () => {
    setIsNavigating(false);
    setSelectedFacility(null);
    setActiveDestinationId(null);
  };

  const handleMapLayerChange = (layer: string) => {
    setCurrentMapLayer(layer);
  };

  const handleRouteSelect = (index: number) => {
    setAlternateRoutes(routes => 
      routes.map((route, i) => ({
        ...route,
        isSelected: i === index
      }))
    );
    setSelectedRouteIndex(index);
  };

  return (
    <div className="relative h-screen w-full bg-background overflow-hidden">
      {/* Top Navigation Bar */}
      <RouteTopBar
        onLayerChange={handleMapLayerChange}
        currentLayer={currentMapLayer}
      />

      {/* Facility Type Filters */}
      <FacilityTypeFilter
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onOptimizeRoute={handleOptimizeRoute}
        isOptimized={isOptimized}
        className="absolute top-16 left-1/2 -translate-x-1/2 z-20"
      />

      {/* Full-screen map */}
      <RouteMap
        facilities={filteredFacilities}
        routePolyline={currentBatch?.route_polyline}
        showUserLocation={true}
        onFacilityClick={handleFacilityClick}
        mapLayer={currentMapLayer}
        selectedRouteIndex={selectedRouteIndex}
        alternateRoutes={alternateRoutes}
        activeFacilityId={activeDestinationId || selectedFacility?.id || undefined}
        navigationMode={isNavigating}
        className="w-full h-full"
      />

      {/* Telemetry overlay */}
      <TelemetryOverlay className="z-10" />

      {/* Back button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute top-28 z-20 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm border-border/50 shadow-lg transition-all",
          isListExpanded ? "left-[332px]" : "left-[72px]"
        )}
        onClick={() => navigate('/dashboard')}
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {/* Sidebar toggle button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute top-44 z-20 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm border-border/50 shadow-lg transition-all",
          isListExpanded ? "left-[316px]" : "left-[56px]"
        )}
        onClick={() => setIsListExpanded(!isListExpanded)}
      >
        {isListExpanded ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </Button>

      {/* Navigation Controls */}
      <NavigationControls
        isNavigating={isNavigating}
        onStartNavigation={handleStartNavigation}
        onStopNavigation={handleStopNavigation}
        onExitNavigation={handleExitNavigation}
        eta={selectedFacility ? '8 min' : undefined}
        distance={selectedFacility ? '2.4 km' : undefined}
      />

      {/* Alternate Routes */}
      {alternateRoutes.length > 0 && !isNavigating && (
        <AlternateRoutes
          routes={alternateRoutes}
          onRouteSelect={handleRouteSelect}
        />
      )}

      {/* Bottom Tabs */}
      {!isNavigating && (
        <RouteBottomTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Left sidebar - Progressive Itinerary */}
      <AnimatePresence mode="wait">
        {isListExpanded ? (
          <motion.div
            key="expanded"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-0 left-0 bottom-0 z-10 w-80 bg-background/95 backdrop-blur-xl border-r border-border/50 shadow-2xl"
          >
            <ItineraryTimeline
              facilities={facilities}
              slots={slots}
              batchId={currentBatch?.id}
              selectedFacilityId={selectedFacility?.id}
              onFacilitySelect={handleTimelineSelect}
              onNavigate={handleInAppNavigate}
            />
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ x: -56 }}
            animate={{ x: 0 }}
            exit={{ x: -56 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-0 left-0 bottom-0 z-10"
          >
            <CollapsedItinerary
              facilities={facilities}
              slots={slots}
              onExpand={() => setIsListExpanded(true)}
              className="h-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Facility popover */}
      <AnimatePresence>
        {selectedFacility && (
          <>
            {/* Invisible backdrop to close popover */}
            <div
              className="absolute inset-0 z-30"
              onClick={() => setSelectedFacility(null)}
            />
            
            {/* Popover */}
            <FacilityPopover
              facility={selectedFacility}
              position={popoverPosition}
              onClose={() => setSelectedFacility(null)}
              onNavigate={handleInAppNavigate}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
