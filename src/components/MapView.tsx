import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Facility, Warehouse, RouteOptimization, DeliveryBatch } from '@/types';
import { useDrivers } from '@/hooks/useDrivers';
import { LeafletMapCore } from './map/LeafletMapCore';
import { MapUtils } from '@/lib/mapUtils';
import { MAP_CONFIG } from '@/lib/mapConfig';
import { FacilitiesLayer } from './map/layers/FacilitiesLayer';
import { WarehousesLayer } from './map/layers/WarehousesLayer';
import { DriversLayer } from './map/layers/DriversLayer';
import { RoutesLayer } from './map/layers/RoutesLayer';
import { BatchesLayer } from './map/layers/BatchesLayer';

interface MapViewProps {
  facilities: Facility[];
  warehouses?: Warehouse[];
  routes?: RouteOptimization[];
  batches?: DeliveryBatch[];
  selectedBatchId?: string | null;
  center?: [number, number];
  zoom?: number;
}

const MapView = ({ 
  facilities, 
  warehouses = [], 
  routes = [], 
  batches = [], 
  selectedBatchId = null,
  center = MAP_CONFIG.defaultCenter, 
  zoom = MAP_CONFIG.defaultZoom 
}: MapViewProps) => {
  const { data: drivers = [] } = useDrivers();
  const [map, setMap] = useState<L.Map | null>(null);

  // Handle map ready
  const handleMapReady = (mapInstance: L.Map) => {
    console.log('[MapView] Map ready');
    
    // Wait for map to be fully initialized before setting state
    if (MapUtils.isMapReady(mapInstance)) {
      setMap(mapInstance);
      MapUtils.safeInvalidateSize(mapInstance);
    } else {
      // Retry after a short delay if map isn't fully ready
      setTimeout(() => {
        if (MapUtils.isMapReady(mapInstance)) {
          setMap(mapInstance);
          MapUtils.safeInvalidateSize(mapInstance);
        }
      }, 100);
    }
  };

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-card border">
      <LeafletMapCore
        center={center}
        zoom={zoom}
        tileProvider="standard"
        showLayerSwitcher={true}
        showScaleControl={true}
        className="h-full w-full"
        onReady={handleMapReady}
      />
      
      {/* Modular Layer Components */}
      <WarehousesLayer map={map} warehouses={warehouses} />
      <DriversLayer map={map} drivers={drivers} batches={batches} />
      <FacilitiesLayer map={map} facilities={facilities} />
      <RoutesLayer map={map} routes={routes} warehouses={warehouses} />
      <BatchesLayer 
        map={map} 
        batches={batches} 
        warehouses={warehouses} 
        selectedBatchId={selectedBatchId} 
      />
    </div>
  );
};

export default MapView;