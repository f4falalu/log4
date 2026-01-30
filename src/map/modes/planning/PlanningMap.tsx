/**
 * PlanningMap.tsx
 *
 * Planning mode map adapter.
 *
 * GOVERNANCE:
 * - PlanningMap does NOT implement logic
 * - It CONFIGURES the map system
 * - React never calls MapLibre directly
 *
 * RESPONSIBILITIES:
 * - Initialize MapShell
 * - Register layers via LayerRegistry
 * - Bind PlanningPolicy to InteractionFSM
 * - Mount PlanningToolbar
 * - Pass callbacks only
 *
 * FORBIDDEN:
 * - No MapLibre calls
 * - No geometry math
 * - No H3 logic
 * - No spatial mutation
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { MapShell } from '@/map/core/MapShell';
import { LayerRegistry } from '@/map/core/LayerRegistry';
import { interactionFSM, type InteractionState } from '@/map/core/InteractionFSM';
import { createRenderContext, findLabelLayer } from '@/map/core/rendering';
import { getBaseStyleUrl, DEFAULT_BASE_STYLE } from '@/map/core/rendering/BaseMapLayer';
import { H3HexagonLayerNew } from '@/map/layers/H3HexagonLayerNew';
import { H3SelectionLayer } from '@/map/layers/H3SelectionLayer';
import { ZoneDrawController } from './ZoneDrawController';
import { PlanningToolbar, usePlanningKeyboardShortcuts } from './PlanningToolbar';
import { PlanningPolicy } from './planning.policy';
import type { H3CellState, Zone } from '@/map/core/spatial';
import {
  subscribeViewportHexes,
  mergeCellStates,
  type ViewportHexUpdate,
} from '@/map/utils/viewportHexes';
import { cn } from '@/lib/utils';

const EMPTY_CELL_STATES: H3CellState[] = [];

/**
 * Warehouse for origin display
 */
export interface WarehouseMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: 'central' | 'zonal';
}

/**
 * Props
 */
interface PlanningMapProps {
  /** Initial center [lng, lat] */
  center?: [number, number];

  /** Initial zoom */
  zoom?: number;

  /** Dark mode */
  isDarkMode?: boolean;

  /** H3 cell states to render */
  cellStates?: H3CellState[];

  /** Currently selected zone ID */
  selectedZoneId?: string | null;

  /** Warehouses to display as origin markers (RFC-012 spec) */
  warehouses?: WarehouseMarker[];

  /** Callback when zone is created */
  onZoneCreated?: (zone: Zone) => void;

  /** Callback when cell is selected */
  onCellSelected?: (h3Index: string, cellState: H3CellState) => void;

  /** Callback when zone is selected for tagging */
  onZoneTagRequest?: (zoneId: string) => void;

  /** Callback when warehouse origin is clicked */
  onWarehouseClick?: (warehouse: WarehouseMarker) => void;

  /** Additional class name */
  className?: string;

  /** User ID for audit */
  userId?: string;
}

/**
 * PlanningMap - Mode adapter for Planning
 *
 * This is a CONDUCTOR, not a musician.
 * It configures and coordinates, but does not implement logic.
 */
export function PlanningMap({
  center = DEFAULT_BASE_STYLE.defaultCenter,
  zoom = DEFAULT_BASE_STYLE.defaultZoom,
  isDarkMode = false,
  cellStates = EMPTY_CELL_STATES,
  selectedZoneId,
  warehouses = [],
  onZoneCreated,
  onCellSelected,
  onZoneTagRequest,
  onWarehouseClick,
  className,
  userId = 'anonymous',
}: PlanningMapProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const warehouseMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const mapShellRef = useRef<MapShell | null>(null);
  const layerRegistryRef = useRef<LayerRegistry | null>(null);
  const drawControllerRef = useRef<ZoneDrawController | null>(null);
  const viewportUnsubRef = useRef<(() => void) | null>(null);

  // State
  const [isReady, setIsReady] = useState(false);
  const [currentState, setCurrentState] = useState<InteractionState>('inspect');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPointCount, setDrawPointCount] = useState(0);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [baselineCells, setBaselineCells] = useState<H3CellState[]>([]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    // Set FSM mode
    interactionFSM.setMode('planning');
    setCurrentState(interactionFSM.getState());

    // Subscribe to FSM changes
    const unsubscribe = interactionFSM.subscribe((event) => {
      setCurrentState(event.to);
    });

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
        mode: 'planning',
      });

      registry.setRenderContext(ctx);

      // Register layers
      const h3Layer = new H3HexagonLayerNew({
        onSelect: handleCellSelect,
        onHover: handleCellHover,
      });
      registry.register(h3Layer);

      const selectionLayer = new H3SelectionLayer();
      registry.register(selectionLayer);

      // Mount all layers
      registry.mountAll();

      // Initialize draw controller
      const drawController = new ZoneDrawController(
        {
          onDrawStart: () => setIsDrawing(true),
          onPointAdded: (points) => setDrawPointCount(points.length),
          onDrawCancel: () => {
            setIsDrawing(false);
            setDrawPointCount(0);
            interactionFSM.setState('inspect', 'Drawing cancelled');
          },
          onDrawComplete: (zone) => {
            setIsDrawing(false);
            setDrawPointCount(0);
            interactionFSM.setState('inspect', 'Zone created');
            onZoneCreated?.(zone);
          },
          onError: (error) => {
            console.error('[PlanningMap] Draw error:', error);
            setIsDrawing(false);
            setDrawPointCount(0);
          },
        },
        userId
      );
      drawController.attach(map);
      drawControllerRef.current = drawController;

      setIsReady(true);
    });

    // Cleanup
    return () => {
      unsubscribe();
      drawControllerRef.current?.detach();
      layerRegistryRef.current?.removeAll();
      mapShellRef.current?.destroy();
    };
  }, []);

  // Update baseline H3 coverage from viewport
  useEffect(() => {
    if (!mapShellRef.current) return;
    const map = mapShellRef.current.getMap();
    if (!map) return;

    const handleUpdate: ViewportHexUpdate = (cells) => {
      setBaselineCells(cells);
    };

    viewportUnsubRef.current?.();
    viewportUnsubRef.current = subscribeViewportHexes(map, handleUpdate);

    return () => {
      viewportUnsubRef.current?.();
      viewportUnsubRef.current = null;
    };
  }, [isReady]);

  // Merge baseline cells with overlay data
  const mergedCells = useMemo(
    () => mergeCellStates(baselineCells, cellStates),
    [baselineCells, cellStates]
  );

  // Update cell states when they change
  useEffect(() => {
    if (!isReady || !layerRegistryRef.current) return;

    layerRegistryRef.current.update('h3-hexagon', mergedCells);
  }, [isReady, mergedCells]);

  // Update selection when selectedCell changes
  useEffect(() => {
    if (!isReady || !layerRegistryRef.current) return;

    const selectionLayer = layerRegistryRef.current.getLayer<H3SelectionLayer>('h3-selection');
    selectionLayer?.setSelected(selectedCell);
  }, [isReady, selectedCell]);

  // RFC-012: Render warehouse origin markers
  useEffect(() => {
    if (!isReady || !mapShellRef.current) return;
    const map = mapShellRef.current.getMap();
    if (!map) return;

    // Clear existing markers
    warehouseMarkersRef.current.forEach(marker => marker.remove());
    warehouseMarkersRef.current.clear();

    // Add warehouse markers
    warehouses.forEach(warehouse => {
      if (!warehouse.lat || !warehouse.lng) return;

      // Create marker element
      const el = document.createElement('div');
      el.className = 'warehouse-origin-marker';
      el.style.cssText = `
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s;
      `;
      el.innerHTML = `<span style="font-size: 18px;">🏭</span>`;

      // Hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Click handler
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onWarehouseClick?.(warehouse);
      });

      // Create popup
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
      }).setHTML(`
        <div style="padding: 8px; min-width: 180px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
            ${warehouse.name}
          </div>
          <div style="font-size: 12px; color: #666; display: flex; align-items: center; gap: 4px;">
            <span style="background: ${warehouse.type === 'central' ? '#3b82f6' : '#10b981'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase;">
              ${warehouse.type || 'warehouse'}
            </span>
            Origin
          </div>
        </div>
      `);

      // Create and add marker
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([warehouse.lng, warehouse.lat])
        .setPopup(popup)
        .addTo(map);

      warehouseMarkersRef.current.set(warehouse.id, marker);
    });

    // Cleanup
    return () => {
      warehouseMarkersRef.current.forEach(marker => marker.remove());
      warehouseMarkersRef.current.clear();
    };
  }, [isReady, warehouses, onWarehouseClick]);

  // Handle state changes
  const handleStateChange = useCallback((state: InteractionState) => {
    // Validate state is allowed
    if (!PlanningPolicy.allowedStates.includes(state)) {
      console.warn(`[PlanningMap] State '${state}' not allowed in Planning`);
      return;
    }

    const prevState = interactionFSM.getState();
    // If entering draw mode, start drawing
    if (state === 'draw_zone') {
      drawControllerRef.current?.start();
    } else if (prevState === 'draw_zone' && state !== 'draw_zone') {
      // Leaving draw mode, cancel if drawing
      if (isDrawing) {
        drawControllerRef.current?.cancel();
      }
    }

    interactionFSM.setState(state, 'User action');
  }, [isDrawing]);

  // Handle cell selection
  const handleCellSelect = useCallback((h3Index: string, cellState: H3CellState) => {
    if (interactionFSM.getState() === 'draw_zone') return; // Don't select while drawing

    setSelectedCell(h3Index);
    onCellSelected?.(h3Index, cellState);

    // If in select mode and cell has zones, allow tagging
    if (interactionFSM.getState() === 'select' && cellState.zoneIds.length > 0) {
      // Could show zone picker if multiple zones
      onZoneTagRequest?.(cellState.zoneIds[0]);
    }
  }, [onCellSelected, onZoneTagRequest]);

  // Handle cell hover
  const handleCellHover = useCallback((h3Index: string | null) => {
    if (!isReady || !layerRegistryRef.current) return;

    const selectionLayer = layerRegistryRef.current.getLayer<H3SelectionLayer>('h3-selection');
    selectionLayer?.setHovered(h3Index);
  }, [isReady]);

  // Handle cancel drawing
  const handleCancelDraw = useCallback(() => {
    drawControllerRef.current?.cancel();
  }, []);

  // Handle complete drawing
  const handleCompleteDraw = useCallback(() => {
    // For now, use a default name. UI should prompt for name.
    const zoneName = `Zone ${new Date().toISOString().slice(0, 10)}`;
    drawControllerRef.current?.complete(zoneName);
  }, []);

  // Keyboard shortcuts
  usePlanningKeyboardShortcuts(
    handleStateChange,
    handleCancelDraw,
    handleCompleteDraw,
    isDrawing
  );

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Map container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
      />

      {/* Toolbar */}
      {isReady && (
        <div className="absolute top-4 left-4 z-10">
          <PlanningToolbar
            currentState={currentState}
            onStateChange={handleStateChange}
            hasSelectedZone={selectedCell !== null}
            isDrawing={isDrawing}
            onCancelDraw={handleCancelDraw}
            onCompleteDraw={handleCompleteDraw}
            drawPointCount={drawPointCount}
          />
        </div>
      )}

      {/* Loading indicator */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-sm text-muted-foreground">Loading map...</div>
        </div>
      )}
    </div>
  );
}
