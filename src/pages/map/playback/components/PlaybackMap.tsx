/**
 * PlaybackMap Component
 *
 * Time-synchronized map visualization for playback mode
 *
 * Layers:
 * 1. Route polyline (completed: solid, future: dashed)
 * 2. Vehicle marker (interpolated position with heading rotation)
 * 3. Stop markers (numbered circles)
 * 4. Event markers (delay, proof icons)
 * 5. Planned route overlay (toggleable)
 * 6. Deviation segments (toggleable)
 * 7. Heatmap overlays (toggleable)
 *
 * All rendering is driven by currentTime from PlaybackStore
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import { MapPin, AlertCircle, CheckCircle, Navigation } from 'lucide-react';
import { LiveMapKernel } from '@/maps-v3/core/LiveMapKernel';
import { DriverMarkerLayer } from '@/maps-v3/layers/DriverMarkerLayer';
import { RouteLineLayer } from '@/maps-v3/layers/RouteLineLayer';
import { usePlaybackStore } from '@/stores/playbackStore';
import { usePlaybackAnimation } from '@/hooks/usePlaybackAnimation';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import type {
  MapFeatureCollection,
  DriverMarkerProperties,
  RouteLineProperties,
} from '@/types/live-map';

interface PlaybackMapProps {
  className?: string;
  hasTrip?: boolean;
}

export function PlaybackMap({ className, hasTrip = false }: PlaybackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kernelRef = useRef<LiveMapKernel | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const tripData = usePlaybackStore((state) => state.tripData);
  const highlightedStopId = usePlaybackStore((state) => state.highlightedStopId);
  const highlightedEventId = usePlaybackStore((state) => state.highlightedEventId);
  const showPlannedRoute = usePlaybackStore((state) => state.showPlannedRoute);
  const showDeviations = usePlaybackStore((state) => state.showDeviations);
  const togglePlannedRoute = usePlaybackStore((state) => state.togglePlannedRoute);
  const toggleDeviations = usePlaybackStore((state) => state.toggleDeviations);

  // Get interpolated position and active events from animation hook
  const { interpolatedPosition, activeEvents, completedDistance, progress } =
    usePlaybackAnimation();

  // Layer refs
  const layersRef = useRef<{
    driver: DriverMarkerLayer;
    route: RouteLineLayer;
  } | null>(null);

  // Initialize map kernel
  useEffect(() => {
    if (!containerRef.current) return;

    const kernel = new LiveMapKernel({
      onReady: () => {
        setMapReady(true);
        console.log('[PlaybackMap] Map initialized');
      },
      onError: (error) => {
        console.error('[PlaybackMap] Map error:', error);
      },
    });

    // Create layers
    const layers = {
      driver: new DriverMarkerLayer(),
      route: new RouteLineLayer(),
    };

    // Register layers
    kernel.registerLayer('driver', layers.driver);
    kernel.registerLayer('route', layers.route);

    // Initialize map
    kernel.init({
      container: containerRef.current,
      center: [36.8219, -1.2921], // Nairobi default
      zoom: 12,
    });

    kernelRef.current = kernel;
    layersRef.current = layers;

    return () => {
      kernel.destroy();
      kernelRef.current = null;
      layersRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Build route polyline from GPS data
  const routeCoordinates = useMemo(() => {
    if (!tripData || tripData.gps.length === 0) return [];

    return tripData.gps.map((pos) => [pos.lng, pos.lat] as [number, number]);
  }, [tripData]);

  // Render route polyline
  useEffect(() => {
    if (!mapReady || !layersRef.current || !tripData) return;

    if (routeCoordinates.length < 2) return;

    const routeGeoJSON: MapFeatureCollection<RouteLineProperties> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
          properties: {
            id: tripData.batchId,
            batchId: tripData.batchId,
            driverId: tripData.analytics.driverId,
            progress: progress,
            status: 'EN_ROUTE',
          },
        },
      ],
    };

    layersRef.current.route.update(routeGeoJSON);
  }, [mapReady, tripData, routeCoordinates, progress]);

  // Update vehicle marker with interpolated position
  useEffect(() => {
    if (!mapReady || !layersRef.current || !interpolatedPosition || !tripData) return;

    const driverGeoJSON: MapFeatureCollection<DriverMarkerProperties> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [interpolatedPosition.lng, interpolatedPosition.lat],
          },
          properties: {
            id: tripData.analytics.driverId,
            name: 'Driver', // Would come from trip data
            status: 'EN_ROUTE',
            heading: interpolatedPosition.heading,
            isOnline: true,
            batchId: tripData.batchId,
          },
        },
      ],
    };

    layersRef.current.driver.update(driverGeoJSON);

    // Center map on vehicle (with smooth transition)
    if (kernelRef.current) {
      kernelRef.current.flyTo(
        [interpolatedPosition.lng, interpolatedPosition.lat],
        undefined,
        { duration: 500 }
      );
    }
  }, [mapReady, interpolatedPosition, tripData]);

  // Fit bounds to route on trip load
  useEffect(() => {
    if (!mapReady || !kernelRef.current || !tripData || routeCoordinates.length === 0) return;

    // Calculate bounds from route
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    for (const [lng, lat] of routeCoordinates) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    // Add padding
    const lngPadding = (maxLng - minLng) * 0.1;
    const latPadding = (maxLat - minLat) * 0.1;

    const bounds: [[number, number], [number, number]] = [
      [minLng - lngPadding, minLat - latPadding],
      [maxLng + lngPadding, maxLat + latPadding],
    ];

    // Fit to bounds
    // kernelRef.current.fitBounds(bounds);
  }, [mapReady, tripData, routeCoordinates]);

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      {/* Map container - Always renders */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Empty state overlay - Only shows when no trip selected */}
      {!hasTrip && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background border rounded-lg shadow-lg p-8 max-w-md pointer-events-auto">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Navigation className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Replay Completed Trips</h3>
                <p className="text-sm text-muted-foreground">
                  Select a batch from the dropdown above to visualize route playback with detailed analytics.
                </p>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                Playback engine ready
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map overlay controls - Only show when trip is active */}
      {hasTrip && tripData && (
        <>

      {/* Map controls (top-right) */}
      <div className="absolute top-4 right-4 bg-background border rounded-lg shadow-lg p-2 space-y-2">
        <Toggle
          pressed={showPlannedRoute}
          onPressedChange={togglePlannedRoute}
          size="sm"
          className="w-full justify-start"
          disabled={!tripData.plannedRoute}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Planned Route
        </Toggle>

        <Toggle
          pressed={showDeviations}
          onPressedChange={toggleDeviations}
          size="sm"
          className="w-full justify-start"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Deviations
        </Toggle>
      </div>

      {/* Active event indicator (top-left) */}
      {activeEvents.length > 0 && (
        <div className="absolute top-4 left-4 bg-background border rounded-lg shadow-lg p-3 space-y-2 max-w-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Active Events
          </div>
          {activeEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              {event.type === 'delay' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              {event.type === 'arrival' && (
                <MapPin className="h-4 w-4 text-green-500" />
              )}
              {event.type === 'proof' && (
                <CheckCircle className="h-4 w-4 text-blue-500" />
              )}
              <span className="capitalize">{event.type}</span>
              {event.metadata.facilityName && (
                <span className="text-xs">at {event.metadata.facilityName}</span>
              )}
            </div>
          ))}
          {activeEvents.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{activeEvents.length - 3} more events
            </div>
          )}
        </div>
      )}

      {/* Speed indicator (bottom-left) */}
      {interpolatedPosition && (
        <div className="absolute bottom-4 left-4 bg-background border rounded-lg shadow-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Current Speed</div>
          <div className="text-2xl font-bold">
            {(interpolatedPosition.speed * 3.6).toFixed(0)}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              km/h
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Distance: {(completedDistance / 1000).toFixed(1)} km
          </div>
        </div>
      )}

      {/* Progress bar (bottom) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-full px-4 py-2 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">Progress</div>
          <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs font-medium">{progress.toFixed(0)}%</div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
