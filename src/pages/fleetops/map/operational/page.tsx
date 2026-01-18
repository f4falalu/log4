/**
 * Operational Map Page
 *
 * Live execution control with Trade-Off workflow
 * Reuses 90% of existing TacticalMap.tsx logic
 *
 * Features:
 * - High-contrast status-colored objects
 * - Exception emphasis
 * - Live vehicle/driver tracking
 * - Trade-Off workflow (ONLY reassignment mechanism)
 * - Exception workflow triggers
 *
 * Forbidden:
 * - Zone editing
 * - Distance measurement tools
 * - Historical replay controls
 * - Route editing
 * - Generic reassignment
 * - Auto vehicle selection
 * - Route optimization
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMapContext } from '@/hooks/useMapContext';
import { useVirtualizedMapData } from '@/hooks/useVirtualizedMapData'; // Import the new hook
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { useRealtimeZones } from '@/hooks/useRealtimeZones';
import { useRealtimeVehicles } from '@/hooks/useRealtimeVehicles';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { useMapLayers } from '@/hooks/useMapLayers';
import { useRealtimeStats } from '@/hooks/useRealtimeStats';
import { UnifiedMapContainer } from '@/components/map/UnifiedMapContainer';
import { OperationalMapLibre } from '@/components/map/OperationalMapLibre';
import { KPIRibbon } from '@/components/map/ui/KPIRibbon';
import { ModeIndicator } from '@/components/map/ui/ModeIndicator';
import { MapToolbarClusters } from '@/components/map/ui/MapToolbarClusters';
import { AnalyticsDrawer } from '@/components/map/ui/AnalyticsDrawer';
import { DriverDrawer } from '@/components/map/drawers/DriverDrawer';
import { VehicleDrawer } from '@/components/map/drawers/VehicleDrawer';
import { BatchDrawer } from '@/components/map/drawers/BatchDrawer';
import { SearchPanel } from '@/components/map/SearchPanel';
import { LayersPanel } from '@/components/map/LayersPanel';
import { DeliveriesLayer } from '@/components/map/layers/DeliveriesLayer';
import { TradeOffDialog } from '@/components/map/dialogs/TradeOffDialog';
import { TradeOffRoutesLayer } from '@/components/map/layers/TradeOffRoutesLayer';
import { isActionAllowed } from '@/lib/mapCapabilities';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { mapRuntime } from '@/map/runtime/MapRuntime';
import { MapLegend } from '@/components/map/ui/MapLegend';
import { toast } from 'sonner';
import L from 'leaflet';

export default function OperationalMapPage() {
  const { setCapability, setTimeHorizon } = useMapContext();
  const [map, setMap] = useState<L.Map | null>(null);

  // Feature flag check
  const useMapLibre = FEATURE_FLAGS.ENABLE_MAPLIBRE_MAPS;

  // Set capability on mount
  useEffect(() => {
    setCapability('operational');
    setTimeHorizon('present');
  }, [setCapability, setTimeHorizon]);

  // Demo system initialization (Phase 8)
  // CRITICAL: MapRuntime now owns demo lifecycle
  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_MAP_DEMO) return;
    if (!useMapLibre) return; // Demo only works with MapLibre

    console.log('[Demo] Waiting for MapRuntime to be ready...');

    let stateInterval: number | undefined;

    // Wait for MapRuntime to be fully initialized, then enable demo
    mapRuntime.onReady(() => {
      console.log('[Demo] MapRuntime ready — enabling demo mode');

      // MapRuntime now owns demo lifecycle
      mapRuntime.enableDemoMode({
        mode: 'operational',
        seed: 42,
      });

      console.log('[Demo] Demo engine started - 7 vehicles moving with traffic simulation');
      toast.success('Demo mode active: 7 vehicles with Kano State traffic simulation', {
        duration: 5000,
      });

      // Log state every 10 seconds in dev
      if (import.meta.env.DEV) {
        stateInterval = window.setInterval(() => {
          const state = mapRuntime.getDemoState();
          if (state) {
            console.log('[Demo] State:', {
              running: state.isRunning,
              vehicles: state.vehicleCount,
              events: state.eventCount,
              completed: state.completedVehicles,
            });
          }
        }, 10000);
      }
    });

    return () => {
      console.log('[Demo] Disabling demo mode...');
      mapRuntime.disableDemoMode();
      if (stateInterval) clearInterval(stateInterval);
    };
  }, [useMapLibre]);

  // New virtualized data fetching
  const { data: mapData, isLoading: isMapDataLoading } = useVirtualizedMapData(map);

  // TODO: Replace this with real-time updates based on the current map view
  // Realtime subscriptions
  useRealtimeDrivers();
  useRealtimeZones();
  useRealtimeVehicles();
  useRealtimeDeliveries();

  const { data: stats } = useRealtimeStats();
  const { layers } = useMapLayers();

  // UI state
  const [searchOpen, setSearchOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(false);
  const [selectedDrawerType, setSelectedDrawerType] = useState<
    'driver' | 'vehicle' | 'batch' | null
  >(null);
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);

  const handleEntityClick = useCallback(
    (type: 'driver' | 'vehicle' | 'batch', id: string) => {
      setSelectedDrawerType(type);
      setSelectedDrawerId(id);
    },
    []
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedDrawerType(null);
    setSelectedDrawerId(null);
  }, []);

  // Check if Trade-Off action is allowed (should be allowed in operational mode)
  const canInitiateTradeOff = isActionAllowed('operational', 'initiate_tradeoff');

  // MapLibre handlers for handoffs
  const handleHandoffApprove = useCallback(async (handoffId: string) => {
    // TODO: Implement handoff approval mutation
    console.log('[OperationalMapPage] Approve handoff:', handoffId);
    toast.success('Trade-off approved', {
      description: 'The system-proposed trade-off has been approved.',
    });
  }, []);

  const handleHandoffReject = useCallback(async (handoffId: string, reason: string) => {
    // TODO: Implement handoff rejection mutation
    console.log('[OperationalMapPage] Reject handoff:', handoffId, reason);
    toast.success('Trade-off rejected', {
      description: `Rejection reason: ${reason}`,
    });
  }, []);

  const handleHandoffViewOnMap = useCallback((handoff: any) => {
    // TODO: Fly to handoff location on map
    console.log('[OperationalMapPage] View handoff on map:', handoff);
  }, []);

  const drivers = mapData?.drivers || [];
  const zones = mapData?.zones || [];
  const facilities = mapData?.facilities || [];
  const warehouses = mapData?.warehouses || [];
  const vehicles = mapData?.vehicles || [];
  const batches = mapData?.batches || [];

  return (
    <div className="h-full relative" style={{ backgroundColor: 'var(--operational-bg-primary)' }}>
      {/* Loading indicator */}
      {isMapDataLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] bg-background/80 p-4 rounded-lg backdrop-blur-sm">
          Loading map data...
        </div>
      )}

      {/* Map Container - Conditional rendering based on feature flag */}
      {useMapLibre ? (
        <>
          <OperationalMapLibre
            vehicles={vehicles}
            drivers={drivers}
            routes={[]} // TODO: Add routes data
            alerts={[]} // TODO: Add alerts data
            batches={batches.filter(b => b.status === 'in_progress')} // Only in-progress batches
            pendingHandoffs={[]} // TODO: Add pending handoffs query
            center={FEATURE_FLAGS.ENABLE_MAP_DEMO ? [8.5167, 12.0000] : [8.6753, 9.082]} // [lng, lat] - Kano State for demo, Nigeria center for production
            zoom={FEATURE_FLAGS.ENABLE_MAP_DEMO ? 10 : 6} // Zoom to Kano for demo, Nigeria overview for production
            onVehicleClick={(vehicle) => handleEntityClick('vehicle', vehicle.id)}
            onDriverClick={(driver) => handleEntityClick('driver', driver.id)}
            onRouteClick={(route) => console.log('Route clicked:', route)}
            onAlertClick={(alert) => console.log('Alert clicked:', alert)}
            onBatchClick={(batch) => handleEntityClick('batch', batch.id)}
            onHandoffApprove={handleHandoffApprove}
            onHandoffReject={handleHandoffReject}
            onHandoffViewOnMap={handleHandoffViewOnMap}
            height="h-full"
          />
          {/* Map Legend - Collapsible legend explaining visual encodings */}
          <MapLegend position="bottom-left" defaultExpanded={false} />
        </>
      ) : (
        <>
          <UnifiedMapContainer
            mode="fullscreen"
            center={[9.082, 8.6753]} // [lat, lng] for Leaflet
            zoom={6}
            drivers={drivers}
            zones={zones}
            facilities={facilities}
            warehouses={warehouses}
            vehicles={vehicles}
            batches={batches}
            onMapReady={setMap}
            onDriverClick={(id) => handleEntityClick('driver', id)}
            onVehicleClick={(id) => handleEntityClick('vehicle', id)}
            onBatchClick={(id) => handleEntityClick('batch', id)}
          >
            <DeliveriesLayer />
            {canInitiateTradeOff && <TradeOffRoutesLayer map={map} />}
          </UnifiedMapContainer>

          {/* Mode Indicator - Leaflet only */}
          <ModeIndicator mode="operational" />

          {/* KPI Ribbon - Leaflet only (MapLibre has integrated KPIRibbon) */}
          {stats && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[900]">
              <KPIRibbon stats={stats} />
            </div>
          )}

          {/* Toolbar - Leaflet only (MapLibre has integrated ControlRail) */}
          <div className="absolute top-24 left-4 z-[1000]">
            <MapToolbarClusters
              onSearchClick={() => setSearchOpen(!searchOpen)}
              onLayersClick={() => setLayersOpen(!layersOpen)}
              onAnalyticsClick={() => setAnalyticsDrawerOpen(!analyticsDrawerOpen)}
              // Forbidden actions in operational mode
              onMeasureClick={undefined} // Distance measurement forbidden
              onDrawClick={undefined} // Zone editing forbidden
            />
          </div>

          {/* Search Panel - Leaflet only */}
          {searchOpen && (
            <div className="absolute top-4 left-20 z-[1000]">
              <SearchPanel
                drivers={drivers}
                vehicles={vehicles}
                batches={batches}
                onClose={() => setSearchOpen(false)}
              />
            </div>
          )}

          {/* Layers Panel - Leaflet only */}
          {layersOpen && (
            <div className="absolute top-4 left-20 z-[1000]">
              <LayersPanel onClose={() => setLayersOpen(false)} />
            </div>
          )}
        </>
      )}

      {/* Analytics Drawer */}
      <AnalyticsDrawer
        open={analyticsDrawerOpen}
        onClose={() => setAnalyticsDrawerOpen(false)}
      />

      {/* Entity Drawers */}
      {selectedDrawerType === 'driver' && selectedDrawerId && (
        <DriverDrawer driverId={selectedDrawerId} onClose={handleCloseDrawer} />
      )}

      {selectedDrawerType === 'vehicle' && selectedDrawerId && (
        <VehicleDrawer vehicleId={selectedDrawerId} onClose={handleCloseDrawer} />
      )}

      {selectedDrawerType === 'batch' && selectedDrawerId && (
        <BatchDrawer batchId={selectedDrawerId} onClose={handleCloseDrawer} />
      )}

      {/* Trade-Off Dialog (ONLY reassignment mechanism) - Leaflet only */}
      {!useMapLibre && canInitiateTradeOff && <TradeOffDialog />}
    </div>
  );
}
