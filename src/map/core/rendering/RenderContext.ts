/**
 * RenderContext.ts
 *
 * Strict interface between spatial core and rendering layers.
 *
 * GOVERNANCE:
 * - Layers receive this context, never import map directly
 * - Prevents layers from reaching into domain logic
 * - Provides controlled access to map instance
 */

import type maplibregl from 'maplibre-gl';

/**
 * Render context passed to map layers
 * This is the ONLY way layers access the map
 */
export interface RenderContext {
  /** MapLibre map instance */
  map: maplibregl.Map;

  /** Layer ID to insert custom layers before (usually labels) */
  beforeLayerId?: string;

  /** Whether the map is in dark mode */
  isDarkMode: boolean;

  /** Current map mode for styling decisions */
  mode: 'planning' | 'operational' | 'forensic';
}

/**
 * Create a render context from a map instance
 */
export function createRenderContext(
  map: maplibregl.Map,
  options: {
    beforeLayerId?: string;
    isDarkMode?: boolean;
    mode?: 'planning' | 'operational' | 'forensic';
  } = {}
): RenderContext {
  return {
    map,
    beforeLayerId: options.beforeLayerId,
    isDarkMode: options.isDarkMode ?? false,
    mode: options.mode ?? 'operational',
  };
}

/**
 * Find the first label layer in the style
 * Used to insert custom layers below labels
 */
export function findLabelLayer(map: maplibregl.Map): string | undefined {
  const style = map.getStyle();
  if (!style?.layers) return undefined;

  const labelLayer = style.layers.find(
    (layer) =>
      layer.type === 'symbol' &&
      (layer.id.includes('label') ||
        layer.id.includes('place') ||
        layer.id.includes('poi') ||
        layer.id.includes('road-name'))
  );

  return labelLayer?.id;
}
