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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapShell } from '@/map/core/MapShell';
import { LayerRegistry } from '@/map/core/LayerRegistry';
import { InteractionFSM, interactionFSM, type InteractionState } from '@/map/core/InteractionFSM';
import { createRenderContext, findLabelLayer } from '@/map/core/rendering';
import { getBaseStyleUrl, DEFAULT_BASE_STYLE } from '@/map/core/rendering/BaseMapLayer';
import { H3HexagonLayerNew } from '@/map/layers/H3HexagonLayerNew';
import { H3SelectionLayer } from '@/map/layers/H3SelectionLayer';
import { ZoneDrawController } from './ZoneDrawController';
import { PlanningToolbar, usePlanningKeyboardShortcuts } from './PlanningToolbar';
import { PlanningPolicy } from './planning.policy';
import type { H3CellState, Zone } from '@/map/core/spatial';
import { cn } from '@/lib/utils';

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

  /** Callback when zone is created */
  onZoneCreated?: (zone: Zone) => void;

  /** Callback when cell is selected */
  onCellSelected?: (h3Index: string, cellState: H3CellState) => void;

  /** Callback when zone is selected for tagging */
  onZoneTagRequest?: (zoneId: string) => void;

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
  cellStates = [],
  selectedZoneId,
  onZoneCreated,
  onCellSelected,
  onZoneTagRequest,
  className,
  userId = 'anonymous',
}: PlanningMapProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<MapShell | null>(null);
  const layerRegistryRef = useRef<LayerRegistry | null>(null);
  const drawControllerRef = useRef<ZoneDrawController | null>(null);

  // State
  const [isReady, setIsReady] = useState(false);
  const [currentState, setCurrentState] = useState<InteractionState>('inspect');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPointCount, setDrawPointCount] = useState(0);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

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

  // Update cell states when they change
  useEffect(() => {
    if (!isReady || !layerRegistryRef.current) return;

    layerRegistryRef.current.update('h3-hexagon', cellStates);
  }, [isReady, cellStates]);

  // Update selection when selectedCell changes
  useEffect(() => {
    if (!isReady || !layerRegistryRef.current) return;

    const selectionLayer = layerRegistryRef.current.getLayer<H3SelectionLayer>('h3-selection');
    selectionLayer?.setSelected(selectedCell);
  }, [isReady, selectedCell]);

  // Handle state changes
  const handleStateChange = useCallback((state: InteractionState) => {
    // Validate state is allowed
    if (!PlanningPolicy.allowedStates.includes(state)) {
      console.warn(`[PlanningMap] State '${state}' not allowed in Planning`);
      return;
    }

    // If entering draw mode, start drawing
    if (state === 'draw_zone') {
      drawControllerRef.current?.start();
    } else if (currentState === 'draw_zone' && state !== 'draw_zone') {
      // Leaving draw mode, cancel if drawing
      if (isDrawing) {
        drawControllerRef.current?.cancel();
      }
    }

    interactionFSM.setState(state, 'User action');
  }, [currentState, isDrawing]);

  // Handle cell selection
  const handleCellSelect = useCallback((h3Index: string, cellState: H3CellState) => {
    if (currentState === 'draw_zone') return; // Don't select while drawing

    setSelectedCell(h3Index);
    onCellSelected?.(h3Index, cellState);

    // If in select mode and cell has zones, allow tagging
    if (currentState === 'select' && cellState.zoneIds.length > 0) {
      // Could show zone picker if multiple zones
      onZoneTagRequest?.(cellState.zoneIds[0]);
    }
  }, [currentState, onCellSelected, onZoneTagRequest]);

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
