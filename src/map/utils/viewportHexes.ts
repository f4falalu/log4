import type maplibregl from 'maplibre-gl';
import {
  polygonToCells,
  createEmptyCellState,
  type H3CellState,
} from '@/map/core/spatial';

export type ViewportHexUpdate = (cells: H3CellState[]) => void;

function boundsToPolygon(bounds: maplibregl.LngLatBounds): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [bounds.getWest(), bounds.getNorth()],
        [bounds.getEast(), bounds.getNorth()],
        [bounds.getEast(), bounds.getSouth()],
        [bounds.getWest(), bounds.getSouth()],
        [bounds.getWest(), bounds.getNorth()],
      ],
    ],
  };
}

function createBaselineCellState(h3Index: string): H3CellState {
  const base = createEmptyCellState(h3Index);
  return {
    ...base,
    riskLevel: 'low',
  };
}

export function getViewportHexCellStates(map: maplibregl.Map): H3CellState[] {
  const bounds = map.getBounds();
  const polygon = boundsToPolygon(bounds);
  const cells = polygonToCells(polygon);

  return cells.map(createBaselineCellState);
}

export function subscribeViewportHexes(
  map: maplibregl.Map,
  onUpdate: ViewportHexUpdate
): () => void {
  const handleUpdate = () => {
    onUpdate(getViewportHexCellStates(map));
  };

  map.on('moveend', handleUpdate);
  map.on('zoomend', handleUpdate);
  handleUpdate();

  return () => {
    map.off('moveend', handleUpdate);
    map.off('zoomend', handleUpdate);
  };
}

export function mergeCellStates(
  baseline: H3CellState[],
  overlay: H3CellState[]
): H3CellState[] {
  if (baseline.length === 0 && overlay.length === 0) {
    return [];
  }

  const merged = new Map<string, H3CellState>();
  baseline.forEach((cell) => merged.set(cell.h3Index, cell));
  overlay.forEach((cell) => merged.set(cell.h3Index, cell));

  return Array.from(merged.values());
}
