/**
 * OperationalMap.tsx
 *
 * Operational mode map adapter.
 *
 * GOVERNANCE:
 * - OperationalMap does NOT implement logic
 * - It CONFIGURES the map system for live ops
 * - React never calls MapLibre directly
 * - FSM locked to 'inspect' (read-only)
 *
 * RESPONSIBILITIES:
 * - Initialize MapShell
 * - Register layers via LayerRegistry
 * - Bind OperationalPolicy to InteractionFSM
 * - Wire LiveEntityAdapter → OperationalEventBridge
 * - Pass callbacks only
 *
 * FORBIDDEN:
 * - No MapLibre calls
 * - No geometry math
 * - No H3 logic
 * - No spatial mutation
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapShell } from '@/map/core/MapShell';
import { LayerRegistry } from '@/map/core/LayerRegistry';
import { interactionFSM } from '@/map/core/InteractionFSM';
import { createRenderContext, findLabelLayer } from '@/map/core/rendering';
import { getBaseStyleUrl, DEFAULT_BASE_STYLE } from '@/map/core/rendering/BaseMapLayer';
import { H3HexagonLayerNew } from '@/map/layers/H3HexagonLayerNew';
import { LiveEntityLayer } from '@/map/layers/LiveEntityLayer';
import {
  LiveEntityAdapter,
  type RawLiveEntity,
  type NormalizedEntity,
} from './LiveEntityAdapter';
import { OperationalEventBridge } from './OperationalEventBridge';
import type { H3CellState, GeoEvent, SpatialIndex } from '@/map/core/spatial';
import { cn } from '@/lib/utils';

/**
 * Props
 */
interface OperationalMapProps {
  /** Vehicles for live tracking */
  vehicles?: Array<{
    id: string;
    last_lat?: number | null;
    last_lng?: number | null;
    plate_number?: string;
    status?: string;
    updated_at?: string;
  }>;

  /** Drivers for live tracking */
  drivers?: Array<{
    id: string;
    last_lat?: number | null;
    last_lng?: number | null;
    name?: string;
    status?: string;
    updated_at?: string;
  }>;

  /** Pre-computed H3 cell states for zone display */
  cellStates?: H3CellState[];

  /** Spatial index for geofencing (optional) */
  spatialIndex?: SpatialIndex;

  /** Entity click callbacks */
  onVehicleClick?: (vehicleId: string) => void;
  onDriverClick?: (driverId: string) => void;
  onEntityClick?: (entityId: string, entityType: string) => void;

  /** Geo-event callback (zone enter/exit) */
  onGeoEvent?: (event: GeoEvent) => void;

  /** Initial center [lng, lat] */
  center?: [number, number];

  /** Initial zoom */
  zoom?: number;

  /** Dark mode */
  isDarkMode?: boolean;

  /** Additional class name */
  className?: string;
}

const EMPTY_VEHICLES: OperationalMapProps['vehicles'] = [];
const EMPTY_DRIVERS: OperationalMapProps['drivers'] = [];
const EMPTY_CELL_STATES: H3CellState[] = [];

/**
 * Convert vehicles and drivers to RawLiveEntity array
 */
function toRawEntities(
  vehicles: OperationalMapProps['vehicles'] = [],
  drivers: OperationalMapProps['drivers'] = []
): RawLiveEntity[] {
  const entities: RawLiveEntity[] = [];

  for (const v of vehicles) {
    if (v.last_lat != null && v.last_lng != null) {
      entities.push({
        id: v.id,
        lat: v.last_lat,
        lng: v.last_lng,
        timestamp: v.updated_at || new Date().toISOString(),
        type: 'vehicle',
        metadata: { plate: v.plate_number, status: v.status },
      });
    }
  }

  for (const d of drivers) {
    if (d.last_lat != null && d.last_lng != null) {
      entities.push({
        id: d.id,
        lat: d.last_lat,
        lng: d.last_lng,
        timestamp: d.updated_at || new Date().toISOString(),
        type: 'driver',
        metadata: { name: d.name, status: d.status },
      });
    }
  }

  return entities;
}

/**
 * OperationalMap - Mode adapter for Operational
 *
 * Read-only, live data. FSM locked to 'inspect'.
 */
export function OperationalMap({
  vehicles = EMPTY_VEHICLES,
  drivers = EMPTY_DRIVERS,
  cellStates = EMPTY_CELL_STATES,
  spatialIndex,
  onVehicleClick,
  onDriverClick,
  onEntityClick,
  onGeoEvent,
  center = DEFAULT_BASE_STYLE.defaultCenter,
  zoom = DEFAULT_BASE_STYLE.defaultZoom,
  isDarkMode = false,
  className,
}: OperationalMapProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<MapShell | null>(null);
  const layerRegistryRef = useRef<LayerRegistry | null>(null);
  const liveAdapterRef = useRef<LiveEntityAdapter | null>(null);
  const eventBridgeRef = useRef<OperationalEventBridge | null>(null);

  // State
  const [isReady, setIsReady] = useState(false);

  // Stable callback refs
  const onGeoEventRef = useRef(onGeoEvent);
  onGeoEventRef.current = onGeoEvent;

  // Entity click handler
  const handleEntityClick = useCallback((entity: NormalizedEntity) => {
    if (entity.type === 'vehicle') {
      onVehicleClick?.(entity.id);
    } else if (entity.type === 'driver') {
      onDriverClick?.(entity.id);
    } else {
      onEntityClick?.(entity.id, entity.type);
    }
  }, [onVehicleClick, onDriverClick, onEntityClick]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    // Set FSM mode (locks to 'inspect')
    interactionFSM.setMode('operational');

    // Create MapShell
    const shell = new MapShell(containerRef.current, {
      style: getBaseStyleUrl(isDarkMode),
      center,
      zoom,
      minZoom: DEFAULT_BASE_STYLE.minZoom,
      maxZoom: DEFAULT_BASE_STYLE.maxZoom,
    });
    mapShellRef.current = shell;

    // Create LayerRegistry
    const registry = new LayerRegistry();
    layerRegistryRef.current = registry;

    // When map is ready
    shell.onReady(() => {
      const map = shell.getMap();
      if (!map) return;

      // Create render context
      const labelAnchor = findLabelLayer(map);
      const ctx = createRenderContext(map, {
        beforeLayerId: labelAnchor,
        isDarkMode,
        mode: 'operational',
      });

      registry.setRenderContext(ctx);

      // Register H3 layer for zone visualization
      const h3Layer = new H3HexagonLayerNew({ showOnlyZoned: true });
      registry.register(h3Layer);

      // Register live entity layer
      const entityLayer = new LiveEntityLayer({
        onClick: handleEntityClick,
      });
      registry.register(entityLayer);

      // Mount all layers
      registry.mountAll();

      // Create LiveEntityAdapter
      const adapter = new LiveEntityAdapter({
        onUpdate: (normalized) => {
          // Update entity layer
          registry.update('live-entities', normalized);

          // Process through event bridge if available
          if (eventBridgeRef.current) {
            eventBridgeRef.current.processEntityUpdates(normalized);
          }
        },
      });
      liveAdapterRef.current = adapter;

      // Create OperationalEventBridge if spatial index is provided
      if (spatialIndex) {
        const bridge = new OperationalEventBridge({
          spatialIndex,
          onGeoEvent: (event) => {
            onGeoEventRef.current?.(event);
          },
        });
        eventBridgeRef.current = bridge;
      }

      setIsReady(true);
    });

    // Cleanup
    return () => {
      liveAdapterRef.current?.destroy();
      layerRegistryRef.current?.removeAll();
      mapShellRef.current?.destroy();
      mapShellRef.current = null;
      layerRegistryRef.current = null;
      liveAdapterRef.current = null;
      eventBridgeRef.current = null;
      setIsReady(false);
    };
  }, [isDarkMode]);

  // Push vehicles/drivers into LiveEntityAdapter when they change
  useEffect(() => {
    if (!isReady || !liveAdapterRef.current) return;

    const rawEntities = toRawEntities(vehicles, drivers);
    liveAdapterRef.current.push(rawEntities);
  }, [isReady, vehicles, drivers]);

  // Update H3 cell states
  useEffect(() => {
    if (!isReady || !layerRegistryRef.current) return;

    layerRegistryRef.current.update('h3-hexagon', cellStates);
  }, [isReady, cellStates]);

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Map container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
      />

      {/* Loading indicator */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-sm text-muted-foreground">Loading map...</div>
        </div>
      )}
    </div>
  );
}
