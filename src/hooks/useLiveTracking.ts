/**
 * useLiveTracking - Main aggregation hook for Live Map
 * Combines GPS positions, driver events, delivery batches, and vehicles
 * into a unified data model for the map layers
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDriverGPS } from './useDriverGPS';
import { useDriverEvents } from './useDriverEvents';
import { useLiveMapStore } from '@/stores/liveMapStore';
import type {
  LiveDriver,
  LiveVehicle,
  LiveDelivery,
  LiveFacility,
  DriverStatus,
  MapFeatureCollection,
  DriverMarkerProperties,
  VehicleMarkerProperties,
  DeliveryMarkerProperties,
  RouteLineProperties,
} from '@/types/live-map';

interface UseLiveTrackingOptions {
  enabled?: boolean;
}

// Fetch active delivery batches with driver status
async function fetchActiveBatches() {
  const { data, error } = await supabase
    .from('delivery_batches')
    .select(`
      *,
      driver:drivers!delivery_batches_assigned_driver_id_fkey(id, name, email, phone),
      vehicle:vehicles(id, plate_number, type, make, model, capacity_units),
      warehouse:warehouses(id, name, address, lat, lng),
      facilities:delivery_batch_facilities(
        id,
        facility_id,
        facilities(id, name, address, lat, lng),
        slot_index
      )
    `)
    .in('status', ['assigned', 'in-progress'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Fetch active drivers
async function fetchActiveDrivers() {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('status', 'active');

  if (error) throw error;
  return data || [];
}

// Fetch active vehicles
async function fetchActiveVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'active');

  if (error) throw error;
  return data || [];
}

export function useLiveTracking(options: UseLiveTrackingOptions = {}) {
  const { enabled = true } = options;
  const filters = useLiveMapStore((s) => s.filters);

  // Fetch base data
  const batchesQuery = useQuery({
    queryKey: ['active-batches'],
    queryFn: fetchActiveBatches,
    enabled,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const driversQuery = useQuery({
    queryKey: ['active-drivers'],
    queryFn: fetchActiveDrivers,
    enabled,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const vehiclesQuery = useQuery({
    queryKey: ['active-vehicles'],
    queryFn: fetchActiveVehicles,
    enabled,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Real-time GPS positions
  const gpsData = useDriverGPS({ enabled });

  // Real-time driver events (state transitions)
  const eventsData = useDriverEvents({ enabled });

  // Transform to LiveDriver objects
  const liveDrivers = useMemo((): LiveDriver[] => {
    const drivers = driversQuery.data || [];

    return drivers.map((driver): LiveDriver => {
      const gps = gpsData.positions[driver.id];
      const latestEvent = eventsData.latestByDriver[driver.id];

      // Find batch this driver is assigned to
      const batch = (batchesQuery.data || []).find(
        (b) => b.assigned_driver_id === driver.id
      );

      return {
        id: driver.id,
        name: driver.name || 'Unknown Driver',
        email: driver.email,
        phone: driver.phone,
        avatarUrl: driver.avatar_url,
        status: (latestEvent?.driverStatus || batch?.driver_status || 'INACTIVE') as DriverStatus,
        position: gps
          ? [gps.lng, gps.lat]
          : [driver.last_lng || 0, driver.last_lat || 0],
        batchId: batch?.id || null,
        vehicleId: batch?.vehicle_id || driver.assigned_vehicle_id || null,
        sessionId: gps?.sessionId || null,
        lastUpdate: gps?.capturedAt || new Date(driver.updated_at),
        speed: gps?.speed || 0,
        heading: gps?.heading || 0,
        accuracy: gps?.accuracy || 0,
        batteryLevel: gps?.batteryLevel,
        isOnline: gps ? Date.now() - gps.capturedAt.getTime() < 5 * 60 * 1000 : false,
      };
    });
  }, [driversQuery.data, batchesQuery.data, gpsData.positions, eventsData.latestByDriver]);

  // Transform to LiveVehicle objects
  const liveVehicles = useMemo((): LiveVehicle[] => {
    const vehicles = vehiclesQuery.data || [];

    return vehicles.map((vehicle): LiveVehicle => {
      // Find batch and driver for this vehicle
      const batch = (batchesQuery.data || []).find(
        (b) => b.vehicle_id === vehicle.id
      );
      const driver = batch?.driver;
      const gps = driver ? gpsData.positions[driver.id] : null;

      return {
        id: vehicle.id,
        plate: vehicle.plate_number || 'Unknown',
        type: vehicle.type || 'truck',
        make: vehicle.make,
        model: vehicle.model,
        position: gps
          ? [gps.lng, gps.lat]
          : [vehicle.last_lng || 0, vehicle.last_lat || 0],
        capacity: vehicle.capacity_units || 100,
        utilization: batch ? calculateBatchUtilization(batch) : 0,
        driverId: driver?.id || null,
        driverName: driver?.name,
        batchId: batch?.id || null,
        lastUpdate: gps?.capturedAt || new Date(vehicle.updated_at),
        speed: gps?.speed || 0,
        heading: gps?.heading || 0,
        fuelLevel: vehicle.fuel_level,
        isActive: !!batch,
      };
    });
  }, [vehiclesQuery.data, batchesQuery.data, gpsData.positions]);

  // Transform to LiveDelivery objects
  const liveDeliveries = useMemo((): LiveDelivery[] => {
    const batches = batchesQuery.data || [];

    return batches.map((batch): LiveDelivery => {
      const latestEvent = eventsData.latestByBatch[batch.id];
      const facilities = (batch.facilities || []).map(
        (f: Record<string, unknown>, index: number): LiveFacility => ({
          id: (f.facility_id as string) || `facility-${index}`,
          name: (f.facilities as Record<string, unknown>)?.name as string || `Stop ${index + 1}`,
          position: [
            ((f.facilities as Record<string, unknown>)?.lng as number) || 0,
            ((f.facilities as Record<string, unknown>)?.lat as number) || 0,
          ],
          address: (f.facilities as Record<string, unknown>)?.address as string,
          stopIndex: (f.slot_index as number) || index,
          status: getStopStatus(index, batch.current_stop_index || 0, batch.status),
          proofCaptured: false, // Would need to check events
        })
      );

      const currentStopIndex = batch.current_stop_index || 0;
      const totalStops = facilities.length;
      const completedStops = Math.min(currentStopIndex, totalStops);

      return {
        id: batch.id,
        batchId: batch.id,
        name: batch.name || `Batch ${batch.id.slice(0, 8)}`,
        driverId: batch.assigned_driver_id,
        driverName: batch.driver?.name,
        vehicleId: batch.vehicle_id,
        status: batch.status,
        driverStatus: (latestEvent?.driverStatus || batch.driver_status || 'INACTIVE') as DriverStatus,
        currentStopIndex,
        totalStops,
        completedStops,
        route: buildRouteFromFacilities(batch.warehouse, facilities),
        facilities,
        warehouseId: batch.warehouse_id,
        startTime: batch.actual_start_time ? new Date(batch.actual_start_time) : null,
        endTime: batch.actual_end_time ? new Date(batch.actual_end_time) : null,
        progress: totalStops > 0 ? (completedStops / totalStops) * 100 : 0,
      };
    });
  }, [batchesQuery.data, eventsData.latestByBatch]);

  // Apply filters
  const filteredDrivers = useMemo(() => {
    if (!filters.showDrivers) return [];

    return liveDrivers.filter((driver) => {
      if (filters.statusFilter !== 'all' && driver.status !== filters.statusFilter) {
        return false;
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          driver.name.toLowerCase().includes(query) ||
          driver.email?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [liveDrivers, filters]);

  const filteredVehicles = useMemo(() => {
    if (!filters.showVehicles) return [];

    return liveVehicles.filter((vehicle) => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          vehicle.plate.toLowerCase().includes(query) ||
          vehicle.driverName?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [liveVehicles, filters]);

  const filteredDeliveries = useMemo(() => {
    if (!filters.showDeliveries) return [];

    return liveDeliveries.filter((delivery) => {
      if (filters.statusFilter !== 'all' && delivery.driverStatus !== filters.statusFilter) {
        return false;
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          delivery.name.toLowerCase().includes(query) ||
          delivery.driverName?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [liveDeliveries, filters]);

  // Convert to GeoJSON for map layers
  const driverGeoJSON = useMemo(
    (): MapFeatureCollection<DriverMarkerProperties> => ({
      type: 'FeatureCollection',
      features: filteredDrivers
        .filter((d) => d.position[0] !== 0 && d.position[1] !== 0)
        .map((driver) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: driver.position,
          },
          properties: {
            id: driver.id,
            name: driver.name,
            status: driver.status,
            heading: driver.heading,
            isOnline: driver.isOnline,
            batchId: driver.batchId,
          },
        })),
    }),
    [filteredDrivers]
  );

  const vehicleGeoJSON = useMemo(
    (): MapFeatureCollection<VehicleMarkerProperties> => ({
      type: 'FeatureCollection',
      features: filteredVehicles
        .filter((v) => v.position[0] !== 0 && v.position[1] !== 0)
        .map((vehicle) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: vehicle.position,
          },
          properties: {
            id: vehicle.id,
            plate: vehicle.plate,
            type: vehicle.type,
            utilization: vehicle.utilization,
            isActive: vehicle.isActive,
            driverId: vehicle.driverId,
          },
        })),
    }),
    [filteredVehicles]
  );

  const deliveryGeoJSON = useMemo(
    (): MapFeatureCollection<DeliveryMarkerProperties> => ({
      type: 'FeatureCollection',
      features: filteredDeliveries
        .filter((d) => d.facilities.length > 0)
        .flatMap((delivery) =>
          delivery.facilities
            .filter((f) => f.position[0] !== 0 && f.position[1] !== 0)
            .map((facility) => ({
              type: 'Feature' as const,
              geometry: {
                type: 'Point' as const,
                coordinates: facility.position,
              },
              properties: {
                id: facility.id,
                name: facility.name,
                status: delivery.driverStatus,
                progress: delivery.progress,
                stopsCount: delivery.totalStops,
                currentStopIndex: delivery.currentStopIndex,
              },
            }))
        ),
    }),
    [filteredDeliveries]
  );

  const routeGeoJSON = useMemo(
    (): MapFeatureCollection<RouteLineProperties> => {
      if (!filters.showRoutes) {
        return { type: 'FeatureCollection', features: [] };
      }

      return {
        type: 'FeatureCollection',
        features: filteredDeliveries
          .filter((d) => d.route.length > 1)
          .map((delivery) => ({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: delivery.route,
            },
            properties: {
              id: delivery.id,
              batchId: delivery.batchId,
              driverId: delivery.driverId,
              progress: delivery.progress,
              status: delivery.driverStatus,
            },
          })),
      };
    },
    [filteredDeliveries, filters.showRoutes]
  );

  // Get entity by ID
  const getDriver = useCallback(
    (id: string) => liveDrivers.find((d) => d.id === id),
    [liveDrivers]
  );

  const getVehicle = useCallback(
    (id: string) => liveVehicles.find((v) => v.id === id),
    [liveVehicles]
  );

  const getDelivery = useCallback(
    (id: string) => liveDeliveries.find((d) => d.id === id),
    [liveDeliveries]
  );

  // Loading state
  const isLoading =
    batchesQuery.isLoading || driversQuery.isLoading || vehiclesQuery.isLoading;

  // Error state
  const error = batchesQuery.error || driversQuery.error || vehiclesQuery.error;

  return {
    // Raw data
    drivers: liveDrivers,
    vehicles: liveVehicles,
    deliveries: liveDeliveries,

    // Filtered data
    filteredDrivers,
    filteredVehicles,
    filteredDeliveries,

    // GeoJSON for layers
    driverGeoJSON,
    vehicleGeoJSON,
    deliveryGeoJSON,
    routeGeoJSON,

    // Getters
    getDriver,
    getVehicle,
    getDelivery,

    // Status
    isLoading,
    error,

    // Counts
    counts: {
      drivers: filteredDrivers.length,
      vehicles: filteredVehicles.length,
      deliveries: filteredDeliveries.length,
      activeDrivers: filteredDrivers.filter((d) => d.status === 'EN_ROUTE' || d.status === 'AT_STOP').length,
      delayedDrivers: filteredDrivers.filter((d) => d.status === 'DELAYED').length,
    },
  };
}

// Helper functions
function getStopStatus(
  index: number,
  currentIndex: number,
  batchStatus: string
): 'pending' | 'arrived' | 'completed' | 'skipped' {
  if (index < currentIndex) return 'completed';
  if (index === currentIndex && batchStatus === 'in-progress') return 'arrived';
  return 'pending';
}

function calculateBatchUtilization(batch: Record<string, unknown>): number {
  // Simple calculation - would need actual item counts
  const facilities = batch.facilities as Array<unknown>;
  if (!facilities?.length) return 0;
  return Math.min(facilities.length * 15, 100); // Rough estimate
}

function buildRouteFromFacilities(
  warehouse: Record<string, unknown> | null,
  facilities: LiveFacility[]
): [number, number][] {
  const route: [number, number][] = [];

  // Start from warehouse
  if (warehouse && warehouse.lng && warehouse.lat) {
    route.push([warehouse.lng as number, warehouse.lat as number]);
  }

  // Add facility positions in order
  const sortedFacilities = [...facilities].sort((a, b) => a.stopIndex - b.stopIndex);
  for (const facility of sortedFacilities) {
    if (facility.position[0] !== 0 && facility.position[1] !== 0) {
      route.push(facility.position);
    }
  }

  return route;
}
