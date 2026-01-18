/**
 * useMapRealtime.ts
 *
 * Unified real-time hook that connects existing Supabase hooks
 * to MapLibre telemetry system
 */

import { useEffect, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { TelemetryManager } from '@/map/telemetry/TelemetryAdapter';
import {
  vehiclesToGeoJSON,
  facilitiesToGeoJSON,
  driversToGeoJSON,
  warehousesToGeoJSON,
  batchRoutesToGeoJSON,
} from '@/map/telemetry/GeoJSONTransformer';

// Import existing real-time hooks
import { useRealtimeVehicles } from './useRealtimeVehicles';
import { useRealtimeDrivers } from './useRealtimeDrivers';
import { useRealtimeBatches } from './useRealtimeBatches';
import { useVehicles } from './useVehicles';
import { useDrivers } from './useDrivers';
import { useFacilities } from './useFacilities';
import { useWarehouses } from './useWarehouses';
import { useDeliveryBatches } from './useDeliveryBatches';

/**
 * Map real-time configuration
 */
export interface MapRealtimeConfig {
  /** Enable vehicle tracking */
  vehicles?: boolean;

  /** Enable driver tracking */
  drivers?: boolean;

  /** Enable facility display */
  facilities?: boolean;

  /** Enable warehouse display */
  warehouses?: boolean;

  /** Enable batch route display */
  batches?: boolean;

  /** Enable smooth position transitions */
  smoothTransitions?: boolean;

  /** Persist to IndexedDB for offline */
  persistOffline?: boolean;

  /** Debug logging */
  debug?: boolean;
}

/**
 * Map real-time hook
 *
 * Connects existing Supabase real-time hooks to MapLibre telemetry
 */
export function useMapRealtime(
  map: MapLibreMap | null,
  config: MapRealtimeConfig = {}
) {
  const {
    vehicles = true,
    drivers = true,
    facilities = true,
    warehouses = true,
    batches = true,
    smoothTransitions = true,
    persistOffline = false,
    debug = false,
  } = config;

  const telemetryManagerRef = useRef<TelemetryManager | null>(null);

  // Fetch initial data (React Query)
  const { data: vehiclesData } = useVehicles();
  const { data: driversData } = useDrivers();
  const { data: facilitiesData } = useFacilities();
  const { data: warehousesData } = useWarehouses();
  const { data: batchesData } = useDeliveryBatches();

  // Subscribe to real-time updates (Supabase)
  useRealtimeVehicles();
  useRealtimeDrivers();
  useRealtimeBatches();

  // Initialize telemetry manager
  useEffect(() => {
    if (!map) return;

    telemetryManagerRef.current = new TelemetryManager(map);

    // Register adapters for each entity type
    if (vehicles) {
      telemetryManagerRef.current.register({
        sourceId: 'vehicles-source',
        layerId: 'vehicles-layer',
        debounceMs: 300,
        debug,
      });
    }

    if (drivers) {
      telemetryManagerRef.current.register({
        sourceId: 'drivers-source',
        layerId: 'drivers-layer',
        debounceMs: 300,
        debug,
      });
    }

    if (facilities) {
      telemetryManagerRef.current.register({
        sourceId: 'facilities-source',
        layerId: 'facilities-layer',
        debounceMs: 1000, // Less frequent updates
        debug,
      });
    }

    if (warehouses) {
      telemetryManagerRef.current.register({
        sourceId: 'warehouses-source',
        layerId: 'warehouses-layer',
        debounceMs: 1000,
        debug,
      });
    }

    if (batches) {
      telemetryManagerRef.current.register({
        sourceId: 'batches-source',
        layerId: 'batches-layer',
        debounceMs: 500,
        debug,
      });
    }

    return () => {
      telemetryManagerRef.current?.destroy();
    };
  }, [map, vehicles, drivers, facilities, warehouses, batches, debug]);

  // Update vehicles
  useEffect(() => {
    if (!telemetryManagerRef.current || !vehiclesData || !vehicles) return;

    const geoJson = vehiclesToGeoJSON(vehiclesData);
    telemetryManagerRef.current.update('vehicles-source', geoJson, {
      smooth: smoothTransitions,
      persistOffline,
    });
  }, [vehiclesData, vehicles, smoothTransitions, persistOffline]);

  // Update drivers
  useEffect(() => {
    if (!telemetryManagerRef.current || !driversData || !drivers) return;

    const geoJson = driversToGeoJSON(driversData);
    telemetryManagerRef.current.update('drivers-source', geoJson, {
      smooth: smoothTransitions,
      persistOffline,
    });
  }, [driversData, drivers, smoothTransitions, persistOffline]);

  // Update facilities
  useEffect(() => {
    if (!telemetryManagerRef.current || !facilitiesData || !facilities) return;

    const geoJson = facilitiesToGeoJSON(facilitiesData);
    telemetryManagerRef.current.update('facilities-source', geoJson, {
      smooth: false, // Facilities don't move
      persistOffline,
    });
  }, [facilitiesData, facilities, persistOffline]);

  // Update warehouses
  useEffect(() => {
    if (!telemetryManagerRef.current || !warehousesData || !warehouses) return;

    const geoJson = warehousesToGeoJSON(warehousesData);
    telemetryManagerRef.current.update('warehouses-source', geoJson, {
      smooth: false, // Warehouses don't move
      persistOffline,
    });
  }, [warehousesData, warehouses, persistOffline]);

  // Update batch routes
  useEffect(() => {
    if (!telemetryManagerRef.current || !batchesData || !batches) return;

    const geoJson = batchRoutesToGeoJSON(batchesData);
    telemetryManagerRef.current.update('batches-source', geoJson, {
      smooth: false, // Routes don't animate
      persistOffline,
    });
  }, [batchesData, batches, persistOffline]);

  return {
    telemetryManager: telemetryManagerRef.current,
    isConnected: !!telemetryManagerRef.current,
  };
}
