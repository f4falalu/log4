/**
 * BaseMapLayer.ts
 *
 * Visual foundation layer.
 *
 * GOVERNANCE:
 * - Renders roads, land, labels ONLY
 * - No semantics, no metrics, no zones
 * - Provides label anchor for insertion order
 *
 * All custom layers insert BELOW labels.
 */

import type maplibregl from 'maplibre-gl';

/**
 * Base style configurations
 */
export interface BaseStyleConfig {
  /** Style URL for light theme */
  lightStyle: string;

  /** Style URL for dark theme */
  darkStyle: string;

  /** Default center [lng, lat] */
  defaultCenter: [number, number];

  /** Default zoom level */
  defaultZoom: number;

  /** Min zoom level */
  minZoom: number;

  /** Max zoom level */
  maxZoom: number;
}

/**
 * Default base style configuration
 * Uses CartoDB basemaps for clean, professional appearance
 */
export const DEFAULT_BASE_STYLE: BaseStyleConfig = {
  lightStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  darkStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  defaultCenter: [3.3792, 6.5244], // Lagos, Nigeria
  defaultZoom: 11,
  minZoom: 3,
  maxZoom: 18,
};

/**
 * Get base style URL based on theme
 */
export function getBaseStyleUrl(
  isDarkMode: boolean,
  config: BaseStyleConfig = DEFAULT_BASE_STYLE
): string {
  return isDarkMode ? config.darkStyle : config.lightStyle;
}

/**
 * Find label anchor layer in the style
 * All custom layers should be inserted BEFORE this layer
 * so that labels remain on top
 */
export function findLabelAnchor(map: maplibregl.Map): string | undefined {
  const style = map.getStyle();
  if (!style?.layers) return undefined;

  // Priority order for finding label layer
  const labelPatterns = [
    'place-',       // Place labels
    'poi-',         // POI labels
    'road-label',   // Road labels
    'label',        // Generic labels
  ];

  for (const pattern of labelPatterns) {
    const layer = style.layers.find(
      (l) => l.type === 'symbol' && l.id.includes(pattern)
    );
    if (layer) {
      return layer.id;
    }
  }

  // Fallback: first symbol layer
  const firstSymbol = style.layers.find((l) => l.type === 'symbol');
  return firstSymbol?.id;
}

/**
 * Get all label layer IDs in the style
 * Useful for debugging layer ordering
 */
export function getAllLabelLayers(map: maplibregl.Map): string[] {
  const style = map.getStyle();
  if (!style?.layers) return [];

  return style.layers
    .filter((l) => l.type === 'symbol')
    .map((l) => l.id);
}

/**
 * Verify custom layer is below labels
 * Returns true if layer ordering is correct
 */
export function verifyLayerBelowLabels(
  map: maplibregl.Map,
  layerId: string
): boolean {
  const style = map.getStyle();
  if (!style?.layers) return false;

  const layerIndex = style.layers.findIndex((l) => l.id === layerId);
  if (layerIndex === -1) return false;

  // Find first symbol layer
  const firstSymbolIndex = style.layers.findIndex((l) => l.type === 'symbol');
  if (firstSymbolIndex === -1) return true; // No symbols, we're fine

  return layerIndex < firstSymbolIndex;
}

/**
 * Base map configuration options
 */
export interface BaseMapOptions {
  /** Container element */
  container: HTMLElement;

  /** Dark mode */
  isDarkMode: boolean;

  /** Custom style config */
  styleConfig?: BaseStyleConfig;

  /** Initial center override */
  center?: [number, number];

  /** Initial zoom override */
  zoom?: number;
}

/**
 * Create MapLibre options for initialization
 */
export function createMapOptions(
  options: BaseMapOptions
): maplibregl.MapOptions {
  const config = options.styleConfig ?? DEFAULT_BASE_STYLE;

  return {
    container: options.container,
    style: getBaseStyleUrl(options.isDarkMode, config),
    center: options.center ?? config.defaultCenter,
    zoom: options.zoom ?? config.defaultZoom,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    dragRotate: false,
    pitchWithRotate: false,
    attributionControl: true,
  };
}
