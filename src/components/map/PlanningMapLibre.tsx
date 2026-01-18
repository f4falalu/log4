/**
 * PlanningMapLibre.tsx
 *
 * MapLibre map component for Planning mode.
 * Renders H3 hexagonal grid with data-driven metrics visualization.
 *
 * Features:
 * - H3 hexagonal grid with demand/capacity/SLA coloring
 * - Warehouse coverage rings (k-ring visualization)
 * - Viewport-aware data fetching with caching
 * - Metric toggle (demand, capacity, SLA)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { H3HexagonLayer, type H3CellClickData } from '@/map/layers/H3HexagonLayer';
import { H3WarehouseCoverageLayer, type WarehouseCoverageData } from '@/map/layers/H3WarehouseCoverageLayer';
import { useH3CellMetrics } from '@/hooks/useH3CellMetrics';
import { resolutionForZoomPrecise } from '@/services/h3Planner';
import type { ViewportBounds } from '@/services/h3Planner';
import { getMapLibreStyle } from '@/lib/mapConfig';
import { useTheme } from 'next-themes';
import type { Facility, Warehouse } from '@/types';
import type { Feature, Polygon } from 'geojson';
import type { PlanningMetric } from '@/components/map/ui/MetricsTogglePanel';

// ============================================================================
// TYPES
// ============================================================================

export interface PlanningMapLibreProps {
  /** Facilities to display */
  facilities?: Facility[];
  /** Warehouses to display */
  warehouses?: Warehouse[];
  /** Optional initial center [lng, lat] */
  center?: [number, number];
  /** Optional initial zoom */
  zoom?: number;
  /** Enable zone drawing (optional) */
  enableZoneDrawing?: boolean;
  /** Zones (GeoJSON) */
  zones?: Feature<Polygon>[];
  /** Callbacks for zone actions */
  onZoneCreate?: (zone: Feature<Polygon>) => void;
  onZoneUpdate?: (zone: Feature<Polygon>) => void;
  onZoneDelete?: (zoneId: string) => void;
  /** Active metric for visualization */
  selectedMetric?: PlanningMetric;
  /** Callback when metric changes */
  onMetricChange?: (metric: PlanningMetric) => void;
  /** Callback when H3 cell is clicked */
  onCellClick?: (cellData: H3CellClickData) => void;
  /** Show warehouse coverage rings */
  showWarehouseCoverage?: boolean;
  /** Default radius for warehouse coverage (k-ring) */
  coverageRadius?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PlanningMapLibre renders a MapLibre map with H3 hexagonal cells.
 * It dynamically adjusts H3 resolution based on zoom level and colors cells
 * according to a selected metric using real database data.
 */
export function PlanningMapLibre({
  facilities = [],
  warehouses = [],
  center = [8.6753, 9.082], // Nigeria center [lng, lat]
  zoom = 6,
  enableZoneDrawing = false,
  zones = [],
  onZoneCreate,
  onZoneUpdate,
  onZoneDelete,
  selectedMetric = 'demand',
  onMetricChange,
  onCellClick,
  showWarehouseCoverage = true,
  coverageRadius = 3,
}: PlanningMapLibreProps) {
  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const h3LayerRef = useRef<H3HexagonLayer | null>(null);
  const coverageLayerRef = useRef<H3WarehouseCoverageLayer | null>(null);

  // State
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const [currentResolution, setCurrentResolution] = useState(resolutionForZoomPrecise(zoom));

  // Theme
  const { theme } = useTheme();

  // Fetch H3 metrics using the hook
  const { cells, isLoading, clearCache, cacheSize } = useH3CellMetrics({
    bounds: viewportBounds,
    resolution: currentResolution,
    metric: selectedMetric,
    enabled: mapLoaded && viewportBounds !== null,
  });

  // Update viewport bounds when map moves
  const updateBounds = useCallback(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const newResolution = resolutionForZoomPrecise(zoom);

    console.log('[PlanningMapLibre] updateBounds called:', {
      zoom: zoom.toFixed(2),
      newResolution,
      currentResolution,
      north: bounds.getNorth().toFixed(4),
      south: bounds.getSouth().toFixed(4),
      east: bounds.getEast().toFixed(4),
      west: bounds.getWest().toFixed(4),
    });

    // Clear cache if resolution changed
    if (newResolution !== currentResolution) {
      console.log('[PlanningMapLibre] Resolution changed, clearing cache');
      clearCache();
      h3LayerRef.current?.clearCache();
      setCurrentResolution(newResolution);
    }

    setViewportBounds({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  }, [currentResolution, clearCache]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapLibreStyle(theme),
      center,
      zoom,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add navigation control
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      setMapLoaded(true);

      // Initialize H3 hexagon layer
      h3LayerRef.current = new H3HexagonLayer(
        map,
        [], // Initial empty data
        {
          onClick: (cellData) => {
            if (onCellClick) {
              onCellClick(cellData);
            }
          },
          onHover: (cellData) => {
            // Could show tooltip here in future
          },
        },
        {
          metric: selectedMetric,
          debug: true, // Enable debug logging
        }
      );
      h3LayerRef.current.add();

      // Initialize warehouse coverage layer
      if (showWarehouseCoverage && warehouses.length > 0) {
        const coverageData: WarehouseCoverageData[] = warehouses.map((w) => ({
          warehouse: w,
          radius: coverageRadius,
          resolution: currentResolution,
        }));

        coverageLayerRef.current = new H3WarehouseCoverageLayer(
          map,
          coverageData,
          {},
          { debug: true }
        );
        coverageLayerRef.current.add();
      }

      // Trigger initial bounds update
      updateBounds();
    });

    // Update on map move
    map.on('moveend', updateBounds);

    // Cleanup
    return () => {
      h3LayerRef.current?.remove();
      coverageLayerRef.current?.remove();
      map.remove();
      setMapLoaded(false);
    };
  }, []); // Only run once on mount

  // Update H3 layer when cells change
  useEffect(() => {
    console.log('[PlanningMapLibre] Cells update:', {
      cellCount: cells.length,
      hasLayer: !!h3LayerRef.current,
      mapLoaded,
      viewportBounds: viewportBounds ? 'set' : 'null',
      currentResolution,
      firstCell: cells[0]?.h3Index || 'none',
    });
    if (h3LayerRef.current) {
      // Always update the layer with current cells (even if empty, to clear old data)
      h3LayerRef.current.update(cells);
    }
  }, [cells, mapLoaded, viewportBounds, currentResolution]);

  // Update metric when prop changes
  useEffect(() => {
    if (h3LayerRef.current) {
      h3LayerRef.current.changeMetric(selectedMetric);
    }
  }, [selectedMetric]);

  // Update warehouse coverage when warehouses change
  useEffect(() => {
    if (!mapLoaded) return;

    if (showWarehouseCoverage && warehouses.length > 0) {
      const coverageData: WarehouseCoverageData[] = warehouses.map((w) => ({
        warehouse: w,
        radius: coverageRadius,
        resolution: currentResolution,
      }));

      if (coverageLayerRef.current) {
        coverageLayerRef.current.update(coverageData);
      } else if (mapRef.current) {
        // Create layer if it doesn't exist yet
        coverageLayerRef.current = new H3WarehouseCoverageLayer(
          mapRef.current,
          coverageData,
          {},
          { debug: true }
        );
        coverageLayerRef.current.add();
      }
    } else if (coverageLayerRef.current) {
      // Hide coverage if disabled or no warehouses
      coverageLayerRef.current.toggle(false);
    }
  }, [warehouses, showWarehouseCoverage, coverageRadius, currentResolution, mapLoaded]);

  // Update map style when theme changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setStyle(getMapLibreStyle(theme));

      // Re-add layers after style change
      mapRef.current.once('style.load', () => {
        if (h3LayerRef.current) {
          h3LayerRef.current.remove();
          h3LayerRef.current.add();
          h3LayerRef.current.update(cells);
        }
        if (coverageLayerRef.current && showWarehouseCoverage) {
          coverageLayerRef.current.remove();
          coverageLayerRef.current.add();
        }
      });
    }
  }, [theme, mapLoaded]);

  return (
    <div className="relative h-full w-full">
      {/* Map container */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm flex items-center gap-2 shadow-md border border-border/50">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading H3 data...</span>
        </div>
      )}

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-20 left-4 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
          <div>Resolution: {currentResolution}</div>
          <div>Cells: {cells.length}</div>
          <div>Cache: {cacheSize}</div>
        </div>
      )}
    </div>
  );
}
