/**
 * Rendering Module
 *
 * Map projection and rendering infrastructure.
 *
 * GOVERNANCE:
 * - This module owns all MapLibre interaction
 * - Layers receive RenderContext, never import map directly
 * - All rendering is deterministic and stable
 */

export {
  type RenderContext,
  createRenderContext,
  findLabelLayer,
} from './RenderContext';

export {
  type BaseStyleConfig,
  type BaseMapOptions,
  DEFAULT_BASE_STYLE,
  getBaseStyleUrl,
  findLabelAnchor,
  getAllLabelLayers,
  verifyLayerBelowLabels,
  createMapOptions,
} from './BaseMapLayer';
