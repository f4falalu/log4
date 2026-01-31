/**
 * PlaybackMapView - Map container for Playback mode
 * Renders historical driver positions based on timeline
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { LiveMapKernel } from '@/maps-v3/core/LiveMapKernel';
import { DriverMarkerLayer } from '@/maps-v3/layers/DriverMarkerLayer';
import { RouteLineLayer } from '@/maps-v3/layers/RouteLineLayer';
import { DeliveryMarkerLayer } from '@/maps-v3/layers/DeliveryMarkerLayer';
import { useLiveMapStore } from '@/stores/liveMapStore';
import type { PlaybackEvent, MapFeatureCollection, DriverMarkerProperties, RouteLineProperties, DeliveryMarkerProperties } from '@/types/live-map';

interface PlaybackMapViewProps {
  events: PlaybackEvent[];
  currentPosition: [number, number] | null;
  currentStatus: string | null;
  facilities?: Array<{ id: string; name: string; position: [number, number] }>;
}

export function PlaybackMapView({
  events,
  currentPosition,
  currentStatus,
  facilities = [],
}: PlaybackMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kernelRef = useRef<LiveMapKernel | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const playback = useLiveMapStore((s) => s.playback);
  const viewState = useLiveMapStore((s) => s.viewState);

  // Layer refs
  const layersRef = useRef<{
    driver: DriverMarkerLayer;
    route: RouteLineLayer;
    stops: DeliveryMarkerLayer;
  } | null>(null);

  // Initialize map kernel
  useEffect(() => {
    if (!containerRef.current) return;

    const kernel = new LiveMapKernel({
      onReady: () => {
        setMapReady(true);
        console.log('[PlaybackMapView] Map ready');
      },
      onError: (error) => {
        console.error('[PlaybackMapView] Map error:', error);
      },
    });

    // Create layers
    const layers = {
      driver: new DriverMarkerLayer(),
      route: new RouteLineLayer(),
      stops: new DeliveryMarkerLayer(),
    };

    // Register layers
    kernel.registerLayer('driver', layers.driver);
    kernel.registerLayer('route', layers.route);
    kernel.registerLayer('stops', layers.stops);

    // Initialize map
    kernel.init({
      container: containerRef.current,
      center: viewState.center,
      zoom: viewState.zoom,
    });

    kernelRef.current = kernel;
    layersRef.current = layers;

    return () => {
      kernel.destroy();
      kernelRef.current = null;
      layersRef.current = null;
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update driver marker when position changes
  useEffect(() => {
    if (!mapReady || !layersRef.current) return;

    if (currentPosition && currentPosition[0] !== 0 && currentPosition[1] !== 0) {
      const driverEvent = events[0];
      const driverGeoJSON: MapFeatureCollection<DriverMarkerProperties> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: currentPosition,
            },
            properties: {
              id: driverEvent?.driverId || 'playback-driver',
              name: driverEvent?.driverName || 'Driver',
              status: (currentStatus as any) || 'EN_ROUTE',
              heading: 0,
              isOnline: true,
              batchId: driverEvent?.batchId || null,
            },
          },
        ],
      };

      layersRef.current.driver.update(driverGeoJSON);

      // Center map on driver
      kernelRef.current?.flyTo(currentPosition, 14);
    }
  }, [mapReady, currentPosition, currentStatus, events]);

  // Build route from events
  useEffect(() => {
    if (!mapReady || !layersRef.current || events.length === 0) return;

    // Build route line from all event positions
    const coordinates: [number, number][] = [];
    for (const event of events) {
      if (event.location[0] !== 0 && event.location[1] !== 0) {
        coordinates.push(event.location);
      }
    }

    if (coordinates.length > 1) {
      const routeGeoJSON: MapFeatureCollection<RouteLineProperties> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates,
            },
            properties: {
              id: events[0].batchId,
              batchId: events[0].batchId,
              driverId: events[0].driverId,
              progress: 100,
              status: 'COMPLETED',
            },
          },
        ],
      };

      layersRef.current.route.update(routeGeoJSON);
    }
  }, [mapReady, events]);

  // Update stop markers
  useEffect(() => {
    if (!mapReady || !layersRef.current) return;

    if (playback.showStopMarkers && facilities.length > 0) {
      const stopsGeoJSON: MapFeatureCollection<DeliveryMarkerProperties> = {
        type: 'FeatureCollection',
        features: facilities.map((facility, index) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: facility.position,
          },
          properties: {
            id: facility.id,
            name: facility.name,
            status: 'COMPLETED',
            progress: 100,
            stopsCount: facilities.length,
            currentStopIndex: index,
          },
        })),
      };

      layersRef.current.stops.update(stopsGeoJSON);
      layersRef.current.stops.setVisibility(true);
    } else {
      layersRef.current.stops.setVisibility(false);
    }
  }, [mapReady, playback.showStopMarkers, facilities]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Current event indicator */}
      {currentStatus && (
        <div className="absolute top-4 left-4 bg-background/90 px-3 py-2 rounded-md shadow-sm">
          <span className="text-sm font-medium">Status: {currentStatus}</span>
        </div>
      )}
    </div>
  );
}
