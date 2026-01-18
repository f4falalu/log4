import { useState, ReactNode, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LeafletMapCore } from './LeafletMapCore';
import { BottomDataPanel } from './BottomDataPanel';
import { ClusteredDriversLayer } from './layers/ClusteredDriversLayer';
import { ClusteredFacilitiesLayer } from './layers/ClusteredFacilitiesLayer';
import { ClusteredWarehousesLayer } from './layers/ClusteredWarehousesLayer';
import { ZonesLayer } from './layers/ZonesLayer';
import { ClusteredVehiclesLayer } from './layers/ClusteredVehiclesLayer';
import { RoutesLayer } from './layers/RoutesLayer';
import { BatchesLayer } from './layers/BatchesLayer';
import { DeliveriesLayer } from './layers/DeliveriesLayer';
import { MapHUD } from './ui/MapHUD';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { MAP_DESIGN_SYSTEM, MapMode } from '@/lib/mapDesignSystem';
import { MAP_CONFIG, TileProvider } from '@/lib/mapConfig';
import { MapUtils } from '@/lib/mapUtils';
import { cn } from '@/lib/utils';
import { useThemeAwareBasemap } from '@/hooks/useThemeAwareBasemap';
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
  vehicles?: any[];
  
  // Map configuration
  center?: [number, number];
  zoom?: number;
  tileProvider?: TileProvider;
  
  // Feature toggles
  showToolbar?: boolean;
  showBottomPanel?: boolean;
  showVehicles?: boolean;
  showDrivers?: boolean;
  showFacilities?: boolean;
  showWarehouses?: boolean;
  showRoutes?: boolean;
  showZones?: boolean;
  showBatches?: boolean;
  showAlerts?: boolean;
  
  // Toolbar callbacks
  onDrawToggle?: () => void;
  onServiceAreasClick?: () => void;
  onSearchClick?: () => void;
  onLayersClick?: () => void;
  onLegendClick?: () => void;
  onMeasureClick?: () => void;
  isDrawing?: boolean;
  isMeasuring?: boolean;
  
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
  onVehicleClick?: (id: string) => void;
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
  vehicles = [],
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  tileProvider,
  showToolbar = false,
  showBottomPanel = false,
  showVehicles = true,
  showDrivers = true,
  showFacilities = true,
  showWarehouses = true,
  showRoutes = true,
  showZones = true,
  showBatches = true,
  showAlerts = true,
  onDrawToggle,
  onServiceAreasClick,
  onSearchClick,
  onLayersClick,
  onLegendClick,
  onMeasureClick,
  isDrawing = false,
  isMeasuring = false,
  selectedFacilityIds = [],
  selectedWarehouseIds = [],
  selectedDriverId = null,
  selectedBatchId = null,
  onFacilityClick,
  onWarehouseClick,
  onDriverClick,
  onBatchClick,
  onVehicleClick,
  onMapReady,
  children,
  className,
}: UnifiedMapContainerProps) {
  const { workspace } = useWorkspace();
  const [map, setMap] = useState<L.Map | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // Theme-aware basemap: automatically switches with light/dark mode
  const [tileProviderState, setTileProviderState] = useThemeAwareBasemap(workspace);

  // Use controlled tileProvider prop if provided, otherwise use theme-aware state
  const effectiveTileProvider = tileProvider || tileProviderState;
  
  // Determine layout class based on mode
  const layoutClass = mode === 'fullscreen' 
    ? MAP_DESIGN_SYSTEM.layout.fullscreen
    : mode === 'dashboard'
    ? MAP_DESIGN_SYSTEM.layout.dashboard
    : MAP_DESIGN_SYSTEM.layout.embedded;

  const handleMapReady = useCallback((mapInstance: L.Map) => {
    setMap(mapInstance);
    MapUtils.safeInvalidateSize(mapInstance);
    onMapReady?.(mapInstance);
  }, [onMapReady]);

  const handleMapDestroy = useCallback(() => {
    setMap(null);
  }, []);

  return (
    <div className={cn('relative z-0 isolate', layoutClass, className)}>
      {/* Core Leaflet Map */}
      <LeafletMapCore
        center={center}
        zoom={zoom}
        tileProvider={effectiveTileProvider}
        showLayerSwitcher={mode === 'fullscreen'}
        showScaleControl={mode === 'fullscreen'}
        showResetControl={mode === 'fullscreen'}
        className="h-full w-full"
        onReady={handleMapReady}
        onDestroy={handleMapDestroy}
      />

      {/* Map HUD */}
      <MapHUD
        map={map}
        tileProvider={effectiveTileProvider}
        onTileProviderToggle={() => {
          const newProvider = tileProviderState === 'cartoDark' ? 'cartoLight' : 'cartoDark';
          setTileProviderState(newProvider);
        }}
      />
      
      {/* Modular Layers - Conditionally Rendered */}
      {showWarehouses && onWarehouseClick && (
        <ClusteredWarehousesLayer 
          warehouses={warehouses}
          onWarehouseClick={onWarehouseClick}
        />
      )}
      {showDrivers && onDriverClick && (
        <ClusteredDriversLayer 
          drivers={drivers}
          onDriverClick={onDriverClick}
        />
      )}
      {showFacilities && onFacilityClick && (
        <ClusteredFacilitiesLayer 
          facilities={facilities}
          onFacilityClick={onFacilityClick}
        />
      )}
      {showRoutes && (
        <RoutesLayer 
          map={map} 
          routes={routes}
          warehouses={warehouses}
        />
      )}
      {showBatches && (
        <BatchesLayer 
          map={map} 
          batches={batches}
          warehouses={warehouses}
          selectedBatchId={selectedBatchId}
          onBatchClick={onBatchClick}
        />
      )}
      {showVehicles && vehicles.length > 0 && onVehicleClick && (
        <ClusteredVehiclesLayer 
          vehicles={vehicles}
          onVehicleClick={onVehicleClick}
        />
      )}

      {/* Conditional UI Controls */}
      {showBottomPanel && mode === 'fullscreen' && (
        <BottomDataPanel 
          drivers={drivers}
          vehicles={vehicles}
          facilities={facilities}
          warehouses={warehouses}
          onDriverClick={(driverId) => {
            const driver = drivers.find(d => d.id === driverId);
            if (driver?.currentLocation && map) {
              map.flyTo([driver.currentLocation.lat, driver.currentLocation.lng], 14, { duration: 1.5 });
              map.once('moveend', () => {
                onDriverClick?.(driverId);
              });
            } else {
              onDriverClick?.(driverId);
            }
          }}
          onVehicleClick={(vehicleId) => onVehicleClick?.(vehicleId)}
          onFacilityClick={(facilityId) => onFacilityClick?.(facilityId)}
        />
      )}
      
      {/* Custom Context Overlays */}
      {children}
    </div>
  );
}
