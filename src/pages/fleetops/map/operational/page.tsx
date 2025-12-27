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
import { useDrivers } from '@/hooks/useDrivers';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useVehicles } from '@/hooks/useVehicles';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { useRealtimeZones } from '@/hooks/useRealtimeZones';
import { useRealtimeVehicles } from '@/hooks/useRealtimeVehicles';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { useMapLayers } from '@/hooks/useMapLayers';
import { useRealtimeStats } from '@/hooks/useRealtimeStats';
import { UnifiedMapContainer } from '@/components/map/UnifiedMapContainer';
import { KPIRibbon } from '@/components/map/ui/KPIRibbon';
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
import L from 'leaflet';

export default function OperationalMapPage() {
  const { setCapability, setTimeHorizon } = useMapContext();

  // Set capability on mount
  useEffect(() => {
    setCapability('operational');
    setTimeHorizon('present');
  }, [setCapability, setTimeHorizon]);

  // Reuse TacticalMap data hooks
  const { data: drivers = [] } = useDrivers();
  const { data: zones = [] } = useServiceZones();
  const { data: facilities = [] } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useDeliveryBatches();
  const { data: stats } = useRealtimeStats();
  const { layers } = useMapLayers();

  // Realtime subscriptions
  useRealtimeDrivers();
  useRealtimeZones();
  useRealtimeVehicles();
  useRealtimeDeliveries();

  // UI state
  const [searchOpen, setSearchOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(false);
  const [selectedDrawerType, setSelectedDrawerType] = useState<
    'driver' | 'vehicle' | 'batch' | null
  >(null);
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);

  const mapInstanceRef = useRef<L.Map | null>(null);

  const handleMapCapture = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

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

  return (
    <div className="h-full relative bg-background">
      {/* Map Container */}
      <UnifiedMapContainer
        mode="fullscreen"
        center={[9.082, 8.6753]} // Nigeria center
        zoom={6}
        drivers={drivers}
        zones={zones}
        facilities={facilities}
        warehouses={warehouses}
        vehicles={vehicles}
        batches={batches}
        onMapReady={handleMapCapture}
        onDriverClick={(id) => handleEntityClick('driver', id)}
        onVehicleClick={(id) => handleEntityClick('vehicle', id)}
        onBatchClick={(id) => handleEntityClick('batch', id)}
      >
        <DeliveriesLayer />
        {canInitiateTradeOff && <TradeOffRoutesLayer map={mapInstanceRef.current} />}
      </UnifiedMapContainer>

      {/* KPI Ribbon */}
      {stats && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[900]">
          <KPIRibbon stats={stats} />
        </div>
      )}

      {/* Toolbar */}
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

      {/* Search Panel */}
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

      {/* Layers Panel */}
      {layersOpen && (
        <div className="absolute top-4 left-20 z-[1000]">
          <LayersPanel onClose={() => setLayersOpen(false)} />
        </div>
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

      {/* Trade-Off Dialog (ONLY reassignment mechanism) */}
      {canInitiateTradeOff && <TradeOffDialog />}
    </div>
  );
}
