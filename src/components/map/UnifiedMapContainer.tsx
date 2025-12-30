import { useState, ReactNode, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LeafletMapCore } from './LeafletMapCore';
import { BottomDataPanel } from './BottomDataPanel';
import { DriversLayer } from './layers/DriversLayer';
import { FacilitiesLayer } from './layers/FacilitiesLayer';
import { WarehousesLayer } from './layers/WarehousesLayer';
import { ZonesLayer } from './layers/ZonesLayer';
import { VehiclesLayer } from './layers/VehiclesLayer';
import { RoutesLayer } from './layers/RoutesLayer';
import { BatchesLayer } from './layers/BatchesLayer';
import { DeliveriesLayer } from './layers/DeliveriesLayer';
import { MapHUD } from './ui/MapHUD';
import { useWorkspace } from '@/contexts/WorkspaceContext';
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
  const [tileProviderState, setTileProviderState] = useState<TileProvider>(
    tileProvider || (workspace === 'fleetops' ? 'cartoDark' : 'cartoLight')
  );
  
  // Workspace-aware theme: FleetOps → dark, Storefront → light
  const effectiveTileProvider = tileProvider || tileProviderState;
  
  // Determine layout class based on mode
  const layoutClass = mode === 'fullscreen' 
    ? MAP_DESIGN_SYSTEM.layout.fullscreen
    : mode === 'dashboard'
    ? MAP_DESIGN_SYSTEM.layout.dashboard
    : MAP_DESIGN_SYSTEM.layout.embedded;

  const handleMapReady = useCallback((mapInstance: L.Map) => {
    const pollReady = (attempt: number = 0) => {
      if (MapUtils.isMapReady(mapInstance)) {
        setMap(mapInstance);
        MapUtils.safeInvalidateSize(mapInstance);
        onMapReady?.(mapInstance);
      } else if (attempt < 5) {  // Max 5 retries at this level
        const delay = Math.min(100 * Math.pow(1.5, attempt), 500);
        setTimeout(() => pollReady(attempt + 1), delay);
      } else {
        console.warn('[UnifiedMapContainer] Map readiness check failed after 5 retries, proceeding anyway');
        setMap(mapInstance);
        MapUtils.safeInvalidateSize(mapInstance);
        onMapReady?.(mapInstance);
      }
    };

    pollReady(0);
  }, [onMapReady]);

  return (
    <div className={cn('relative', layoutClass, className)}>
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
      />

      {/* Map HUD */}
      <MapHUD
        map={map}
        tileProvider={effectiveTileProvider}
        onTileProviderToggle={() =>
          setTileProviderState((prev) =>
            prev === 'cartoDark' ? 'cartoLight' : 'cartoDark'
          )
        }
      />
      
      {/* Modular Layers - Conditionally Rendered */}
      {showWarehouses && (
        <WarehousesLayer 
          map={map} 
          warehouses={warehouses}
          selectedIds={selectedWarehouseIds}
          onWarehouseClick={onWarehouseClick}
        />
      )}
      {showDrivers && (
        <DriversLayer 
          map={map} 
          drivers={drivers}
          batches={batches}
          onDriverClick={onDriverClick}
        />
      )}
      {showFacilities && (
        <FacilitiesLayer 
          map={map} 
          facilities={facilities}
          selectedIds={selectedFacilityIds}
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
      {showVehicles && vehicles.length > 0 && (
        <VehiclesLayer 
          selectedVehicleId={null}
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
            onDriverClick?.(driverId);
            const driver = drivers.find(d => d.id === driverId);
            if (driver?.currentLocation && map) {
              map.setView([driver.currentLocation.lat, driver.currentLocation.lng], 14);
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
