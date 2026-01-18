/**
 * ForensicMapLibre.tsx
 *
 * MapLibre-based Forensic Map implementation - Thin Client Pattern
 * Uses MapRuntime singleton to eliminate lifecycle bugs
 * Theme-aware basemap integration
 */

import { useRef, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import { mapRuntime } from '@/map/runtime/MapRuntime';
import { RepresentationToggle, useRepresentationMode } from './RepresentationToggle';
import { MapControls } from './MapControls';
import { TimelineSlider } from './TimelineSlider';
import { PlaybackControls } from './PlaybackControls';
import { MapLoadingSkeleton } from './MapLoadingSkeleton';
import { getMapLibreStyle } from '@/lib/mapConfig';
import { Badge } from '@/components/ui/badge';
import type { Vehicle, Driver, Route } from '@/types';

/**
 * Forensic Map Props
 */
export interface ForensicMapLibreProps {
  /** Historical vehicle positions */
  vehicles?: Vehicle[];

  /** Historical driver positions */
  drivers?: Driver[];

  /** Historical routes */
  routes?: Route[];

  /** Time range for playback */
  startTime?: Date;
  endTime?: Date;

  /** Current playback time */
  currentTime?: Date;

  /** Initial center [lng, lat] */
  center?: [number, number];

  /** Initial zoom level */
  zoom?: number;

  /** Playback controls */
  isPlaying?: boolean;
  playbackSpeed?: number;
  onTimeChange?: (time: Date) => void;
  onPlayPause?: () => void;
  onSpeedChange?: (speed: number) => void;

  /** Entity click handlers */
  onVehicleClick?: (vehicle: Vehicle) => void;
  onDriverClick?: (driver: Driver) => void;
  onRouteClick?: (route: Route) => void;

  /** Height className (default: h-screen) */
  height?: string;
}

/**
 * Forensic Map Component - Thin Client
 *
 * ARCHITECTURE:
 * - React NEVER calls MapLibre APIs directly
 * - MapRuntime owns map instance, layers, sources
 * - React only sends commands to MapRuntime
 * - No lifecycle bugs, no infinite loops, hot reload safe
 */
export function ForensicMapLibre({
  vehicles = [],
  drivers = [],
  routes = [],
  startTime = new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  endTime = new Date(),
  currentTime = new Date(),
  center = [8.6753, 9.0820], // Nigeria center
  zoom = 6,
  isPlaying = false,
  playbackSpeed = 1,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  onVehicleClick,
  onDriverClick,
  onRouteClick,
  height = 'h-screen',
}: ForensicMapLibreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  const { mode, setMode } = useRepresentationMode('minimal'); // Default to minimal for forensic

  /**
   * Validate playback state - ensures timestamps are valid before rendering controls
   */
  const playbackStateReady = !!(
    startTime &&
    endTime &&
    currentTime &&
    startTime instanceof Date &&
    endTime instanceof Date &&
    currentTime instanceof Date &&
    !isNaN(startTime.getTime()) &&
    !isNaN(endTime.getTime()) &&
    !isNaN(currentTime.getTime())
  );

  /**
   * Initialize MapRuntime once on mount
   * Uses theme-aware basemap style
   */
  useEffect(() => {
    if (!containerRef.current) return;

    mapRuntime.init(
      containerRef.current,
      {
        context: 'forensic',
        style: getMapLibreStyle(theme as 'light' | 'dark' | 'system' | undefined),
        center,
        zoom,
        minZoom: 0,
        maxZoom: 22,
      },
      {
        onVehicleClick: (vehicle: any) => {
          if (onVehicleClick) {
            onVehicleClick(vehicle);
          }
        },
        onDriverClick: (driver: any) => {
          if (onDriverClick) {
            onDriverClick(driver);
          }
        },
        onRouteClick: (route: any) => {
          if (onRouteClick) {
            onRouteClick(route);
          }
        },
      }
    );

    // Wait for map to actually load before enabling interactions
    const checkInitialized = setInterval(() => {
      const map = mapRuntime.getMap();
      if (map && map.loaded()) {
        setIsLoading(false);
        clearInterval(checkInitialized);
      }
    }, 100);

    return () => clearInterval(checkInitialized);
  }, []); // Empty deps - init once

  /**
   * Mode changes = simple command to MapRuntime
   */
  useEffect(() => {
    if (isLoading) return;
    mapRuntime.setMode(mode);
  }, [mode, isLoading]);

  /**
   * Data updates = centralized update to MapRuntime
   */
  useEffect(() => {
    if (isLoading) return;

    mapRuntime.update({
      vehicles,
      drivers,
      routes,
      playback: playbackStateReady
        ? {
            startTime,
            endTime,
            currentTime,
            isPlaying,
            speed: playbackSpeed,
          }
        : undefined,
    });
  }, [vehicles, drivers, routes, startTime, endTime, currentTime, isPlaying, playbackSpeed, isLoading, playbackStateReady]);

  /**
   * Map controls - now operate on MapRuntime's map instance
   */
  const handleZoomIn = () => {
    const map = mapRuntime.getMap();
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    const map = mapRuntime.getMap();
    if (map) map.zoomOut();
  };

  const handleResetBearing = () => {
    const map = mapRuntime.getMap();
    if (map) map.resetNorth();
  };

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const map = mapRuntime.getMap();
        if (map) {
          map.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 14,
          });
        }
      });
    }
  };

  const handleLayersToggle = () => {
    console.log('[ForensicMapLibre] Layers toggle clicked');
  };

  return (
    <div className={`relative ${height} w-full`}>
      {/* Map container - MapRuntime owns the map instance */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Loading skeleton */}
      {isLoading && (
        <MapLoadingSkeleton
          stage="data"
          message={`Loading historical data...`}
        />
      )}

      {/* Map Controls (only show when ready) */}
      {!isLoading && (
        <>
          {/* Main controls */}
          <div className="absolute top-4 right-4 z-[1000]">
            <MapControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetBearing={handleResetBearing}
              onLocate={handleLocate}
              onLayersToggle={handleLayersToggle}
            />
          </div>

          {/* Representation Toggle */}
          <div className="absolute top-4 left-4 z-[1000]">
            <RepresentationToggle mode={mode} onModeChange={setMode} />
          </div>

          {/* Playback controls - only render when state is ready */}
          {playbackStateReady ? (
            <>
              {/* Timeline slider (bottom) */}
              <div className="absolute bottom-20 left-4 right-4 z-[1000]">
                <TimelineSlider
                  startTimestamp={startTime.toISOString()}
                  endTimestamp={endTime.toISOString()}
                  currentTimestamp={currentTime.toISOString()}
                  onTimestampChange={(timestamp: string) => {
                    if (onTimeChange) {
                      onTimeChange(new Date(timestamp));
                    }
                  }}
                />
              </div>

              {/* Playback controls (bottom center) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
                <PlaybackControls
                  state={isPlaying ? 'playing' : 'paused'}
                  speed={playbackSpeed}
                  currentTimestamp={currentTime.toISOString()}
                  startTimestamp={startTime.toISOString()}
                  endTimestamp={endTime.toISOString()}
                  onPlay={() => {
                    if (onPlayPause && !isPlaying) {
                      onPlayPause();
                    }
                  }}
                  onPause={() => {
                    if (onPlayPause && isPlaying) {
                      onPlayPause();
                    }
                  }}
                  onStop={() => {
                    if (onPlayPause && isPlaying) {
                      onPlayPause();
                    }
                  }}
                  onSkipBackward={() => {
                    // Skip backward 1 minute
                    const newTime = new Date(currentTime.getTime() - 60000);
                    if (onTimeChange && newTime >= startTime) {
                      onTimeChange(newTime);
                    }
                  }}
                  onSkipForward={() => {
                    // Skip forward 1 minute
                    const newTime = new Date(currentTime.getTime() + 60000);
                    if (onTimeChange && newTime <= endTime) {
                      onTimeChange(newTime);
                    }
                  }}
                  onSpeedChange={onSpeedChange}
                  compact
                />
              </div>

              {/* Time indicator (top center) */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                <Badge variant="outline" className="bg-background/90 backdrop-blur-sm px-4 py-2">
                  {currentTime.toLocaleString()}
                </Badge>
              </div>
            </>
          ) : (
            /* Loading state for playback controls */
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
              <Badge variant="outline" className="bg-background/90 backdrop-blur-sm px-4 py-2">
                Initializing playback...
              </Badge>
            </div>
          )}

          {/* Entity counts (bottom-left) */}
          <div className="absolute bottom-4 left-4 z-[1000] flex gap-2">
            {vehicles.length > 0 && (
              <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                {vehicles.length} Vehicle{vehicles.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {drivers.length > 0 && (
              <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                {drivers.length} Driver{drivers.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {routes.length > 0 && (
              <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                {routes.length} Route{routes.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}
