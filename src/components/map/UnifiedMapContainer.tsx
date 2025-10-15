import { useState, ReactNode, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LeafletMapCore } from './LeafletMapCore';
import { MapToolsToolbar } from './MapToolsToolbar';
import { BottomDataPanel } from './BottomDataPanel';
import { FacilitiesLayer } from './layers/FacilitiesLayer';
import { WarehousesLayer } from './layers/WarehousesLayer';
import { DriversLayer } from './layers/DriversLayer';
import { RoutesLayer } from './layers/RoutesLayer';
import { BatchesLayer } from './layers/BatchesLayer';
import { MAP_DESIGN_SYSTEM, MapMode } from '@/lib/mapDesignSystem';
import { MAP_CONFIG, TileProvider } from '@/lib/mapConfig';
import { MapUtils } from '@/lib/mapUtils';
import { cn } from '@/lib/utils';
import type { Facility, Warehouse, Driver, DeliveryBatch, RouteOptimization } from '@/types';

export interface UnifiedMapContainerProps {
  // Map mode determines layout and features
  mode?: MapMode;
  
  // Data props
  facilities?: Facility[];
  warehouses?: Warehouse[];
  drivers?: Driver[];
  batches?: DeliveryBatch[];
  routes?: RouteOptimization[];
  
  // Map configuration
  center?: [number, number];
  zoom?: number;
  tileProvider?: TileProvider;
  
  // Feature toggles
  showToolbar?: boolean;
  showBottomPanel?: boolean;
  
  // Selection state
  selectedFacilityIds?: string[];
  selectedWarehouseIds?: string[];
  selectedDriverId?: string | null;
  selectedBatchId?: string | null;
  
  // Event callbacks
  onFacilityClick?: (id: string) => void;
  onWarehouseClick?: (id: string) => void;
  onDriverClick?: (id: string) => void;
  onBatchClick?: (id: string) => void;
  onMapReady?: (map: L.Map) => void;
  
  // Custom overlays/panels as children
  children?: ReactNode;
  
  // Style overrides
  className?: string;
}

export function UnifiedMapContainer({
  mode = 'embedded',
  facilities = [],
  warehouses = [],
  drivers = [],
  batches = [],
  routes = [],
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  tileProvider = 'standard',
  showToolbar = false,
  showBottomPanel = false,
  selectedFacilityIds = [],
  selectedWarehouseIds = [],
  selectedDriverId = null,
  selectedBatchId = null,
  onFacilityClick,
  onWarehouseClick,
  onDriverClick,
  onBatchClick,
  onMapReady,
  children,
  className,
}: UnifiedMapContainerProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  
  // Determine layout class based on mode
  const layoutClass = mode === 'fullscreen' 
    ? MAP_DESIGN_SYSTEM.layout.fullscreen
    : mode === 'dashboard'
    ? MAP_DESIGN_SYSTEM.layout.dashboard
    : MAP_DESIGN_SYSTEM.layout.embedded;

  const handleMapReady = useCallback((mapInstance: L.Map) => {
    if (MapUtils.isMapReady(mapInstance)) {
      setMap(mapInstance);
      MapUtils.safeInvalidateSize(mapInstance);
      onMapReady?.(mapInstance);
    } else {
      // Retry after delay
      setTimeout(() => {
        if (MapUtils.isMapReady(mapInstance)) {
          setMap(mapInstance);
          MapUtils.safeInvalidateSize(mapInstance);
          onMapReady?.(mapInstance);
        }
      }, 100);
    }
  }, [onMapReady]);

  return (
    <div className={cn('relative', layoutClass, className)}>
      {/* Core Leaflet Map */}
      <LeafletMapCore
        center={center}
        zoom={zoom}
        tileProvider={tileProvider}
        showLayerSwitcher={mode === 'fullscreen'}
        showScaleControl={mode === 'fullscreen'}
        showResetControl={mode === 'fullscreen'}
        className="h-full w-full"
        onReady={handleMapReady}
      />
      
      {/* Modular Layers - Always Render */}
      <WarehousesLayer 
        map={map} 
        warehouses={warehouses}
        selectedIds={selectedWarehouseIds}
        onWarehouseClick={onWarehouseClick}
      />
      <DriversLayer 
        map={map} 
        drivers={drivers}
        batches={batches}
        onDriverClick={onDriverClick}
      />
      <FacilitiesLayer 
        map={map} 
        facilities={facilities}
        selectedIds={selectedFacilityIds}
        onFacilityClick={onFacilityClick}
      />
      <RoutesLayer 
        map={map} 
        routes={routes}
        warehouses={warehouses}
      />
      <BatchesLayer 
        map={map} 
        batches={batches}
        warehouses={warehouses}
        selectedBatchId={selectedBatchId}
        onBatchClick={onBatchClick}
      />
      
      {/* Conditional UI Controls */}
      {showToolbar && mode === 'fullscreen' && (
        <div className={MAP_DESIGN_SYSTEM.layout.toolbar.position}>
          <MapToolsToolbar
            onLocateMe={() => {
              if (map && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                  map.setView([position.coords.latitude, position.coords.longitude], 13);
                });
              }
            }}
            onServiceAreasClick={() => {}}
            onSearchClick={() => {}}
            onDrawToggle={() => {}}
            onLayersClick={() => {}}
            onMeasureClick={() => {}}
            onLegendClick={() => {}}
            isDrawing={false}
            isMeasuring={false}
          />
        </div>
      )}
      
      {showBottomPanel && mode === 'fullscreen' && (
        <div className={MAP_DESIGN_SYSTEM.layout.bottomPanel.position}>
          <BottomDataPanel 
            drivers={drivers}
            onDriverClick={(driverId) => {
              onDriverClick?.(driverId);
              const driver = drivers.find(d => d.id === driverId);
              if (driver?.currentLocation && map) {
                map.setView([driver.currentLocation.lat, driver.currentLocation.lng], 14);
              }
            }}
          />
        </div>
      )}
      
      {/* Custom Context Overlays */}
      {children}
    </div>
  );
}
