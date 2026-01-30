/**
 * ZoneDrawController.ts — Polygon draw → H3 conversion.
 *
 * Flow:
 * 1. User activates DRAW_ZONE mode
 * 2. Clicks on map to add polygon vertices
 * 3. Double-clicks or presses Enter to complete
 * 4. Polygon → polygonToH3Cells → preview H3 cells
 * 5. Transitions to CONFIRM state
 *
 * The polygon is an INPUT AFFORDANCE only.
 * The H3 cell set is the actual payload.
 */

import type { Map as MapLibreMap, GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import { polygonToH3Cells, pointsToPolygon, cellToPolygon } from '../layers/h3Utils';
import type { InteractionController } from '../core/InteractionController';
import { mapTokens } from '../tokens/mapTokens';

export interface ZoneDrawResult {
  h3Cells: string[];
  polygon: GeoJSON.Polygon;
}

export type DrawCompleteCallback = (result: ZoneDrawResult) => void;

export class ZoneDrawController {
  private map: MapLibreMap;
  private interactionController: InteractionController;
  private onComplete: DrawCompleteCallback;

  private points: [number, number][] = [];
  private active = false;

  private readonly drawSourceId = 'zone-draw-source';
  private readonly drawLineLayerId = 'zone-draw-line';
  private readonly drawPointsLayerId = 'zone-draw-points';
  private readonly previewSourceId = 'zone-draw-preview';
  private readonly previewLayerId = 'zone-draw-preview-fill';

  private clickHandler: ((e: MapMouseEvent) => void) | null = null;
  private dblClickHandler: ((e: MapMouseEvent) => void) | null = null;
  private mouseMoveHandler: ((e: MapMouseEvent) => void) | null = null;

  constructor(
    map: MapLibreMap,
    interactionController: InteractionController,
    onComplete: DrawCompleteCallback
  ) {
    this.map = map;
    this.interactionController = interactionController;
    this.onComplete = onComplete;
  }

  /**
   * Start a drawing session.
   */
  start(): void {
    if (this.active) return;
    if (!this.interactionController.transition('DRAW_ZONE', 'Start zone drawing')) return;

    this.active = true;
    this.points = [];
    this.setupSources();
    this.bindEvents();
    this.map.getCanvas().style.cursor = 'crosshair';
  }

  /**
   * Cancel drawing and return to IDLE.
   */
  cancel(): void {
    this.cleanup();
    this.interactionController.transition('IDLE', 'Drawing cancelled');
  }

  /**
   * Check if drawing is active.
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Destroy controller and clean up all resources.
   */
  destroy(): void {
    this.cleanup();
  }

  private setupSources(): void {
    // Drawing line source
    this.map.addSource(this.drawSourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    this.map.addLayer({
      id: this.drawLineLayerId,
      type: 'line',
      source: this.drawSourceId,
      paint: {
        'line-color': mapTokens.selectionStroke,
        'line-width': 2,
        'line-dasharray': [3, 2],
      },
    });

    this.map.addLayer({
      id: this.drawPointsLayerId,
      type: 'circle',
      source: this.drawSourceId,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': mapTokens.selectionStroke,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });

    // H3 preview source
    this.map.addSource(this.previewSourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    this.map.addLayer({
      id: this.previewLayerId,
      type: 'fill',
      source: this.previewSourceId,
      paint: {
        'fill-color': mapTokens.selectionFill,
        'fill-opacity': 0.4,
      },
    });
  }

  private bindEvents(): void {
    this.clickHandler = (e: MapMouseEvent) => {
      this.addPoint([e.lngLat.lng, e.lngLat.lat]);
    };

    this.dblClickHandler = (e: MapMouseEvent) => {
      e.preventDefault();
      this.complete();
    };

    this.mouseMoveHandler = (e: MapMouseEvent) => {
      this.updatePreviewLine(e.lngLat.lng, e.lngLat.lat);
    };

    this.map.on('click', this.clickHandler);
    this.map.on('dblclick', this.dblClickHandler);
    this.map.on('mousemove', this.mouseMoveHandler);

    // Disable double-click zoom during drawing
    this.map.doubleClickZoom.disable();
  }

  private addPoint(point: [number, number]): void {
    this.points.push(point);
    this.updateDrawVisuals();
    this.updateH3Preview();
  }

  private complete(): void {
    if (this.points.length < 3) {
      console.warn('[ZoneDrawController] Need at least 3 points');
      return;
    }

    const polygon = pointsToPolygon(this.points);
    if (!polygon) return;

    const h3Cells = polygonToH3Cells(polygon);
    if (h3Cells.length === 0) {
      console.warn('[ZoneDrawController] No H3 cells in polygon');
      return;
    }

    // Transition to CONFIRM
    this.interactionController.transition('CONFIRM', 'Zone drawing complete');

    const result: ZoneDrawResult = { h3Cells, polygon };
    this.cleanup();
    this.onComplete(result);
  }

  private updateDrawVisuals(): void {
    const source = this.map.getSource(this.drawSourceId) as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];

    // Points
    for (const pt of this.points) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pt },
        properties: {},
      });
    }

    // Line connecting points
    if (this.points.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: this.points },
        properties: {},
      });
    }

    source.setData({ type: 'FeatureCollection', features });
  }

  private updatePreviewLine(cursorLng: number, cursorLat: number): void {
    if (this.points.length < 1) return;

    const source = this.map.getSource(this.drawSourceId) as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];

    // Points
    for (const pt of this.points) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pt },
        properties: {},
      });
    }

    // Line with cursor position
    const lineCoords = [...this.points, [cursorLng, cursorLat] as [number, number]];
    if (this.points.length >= 2) {
      // Close the preview polygon
      lineCoords.push(this.points[0]);
    }

    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: lineCoords },
      properties: {},
    });

    source.setData({ type: 'FeatureCollection', features });
  }

  private updateH3Preview(): void {
    if (this.points.length < 3) return;

    const polygon = pointsToPolygon(this.points);
    if (!polygon) return;

    const h3Cells = polygonToH3Cells(polygon);
    const previewSource = this.map.getSource(this.previewSourceId) as GeoJSONSource;
    if (!previewSource) return;

    const features: GeoJSON.Feature[] = h3Cells.map((h3Index) => ({
      type: 'Feature',
      geometry: cellToPolygon(h3Index),
      properties: { h3Index },
    }));

    previewSource.setData({ type: 'FeatureCollection', features });
  }

  private cleanup(): void {
    if (!this.active) return;
    this.active = false;

    // Unbind events
    if (this.clickHandler) this.map.off('click', this.clickHandler);
    if (this.dblClickHandler) this.map.off('dblclick', this.dblClickHandler);
    if (this.mouseMoveHandler) this.map.off('mousemove', this.mouseMoveHandler);

    this.clickHandler = null;
    this.dblClickHandler = null;
    this.mouseMoveHandler = null;

    // Re-enable double-click zoom
    this.map.doubleClickZoom.enable();

    // Remove layers and sources
    const layerIds = [this.drawLineLayerId, this.drawPointsLayerId, this.previewLayerId];
    for (const id of layerIds) {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }

    const sourceIds = [this.drawSourceId, this.previewSourceId];
    for (const id of sourceIds) {
      if (this.map.getSource(id)) this.map.removeSource(id);
    }

    this.map.getCanvas().style.cursor = '';
    this.points = [];
  }
}
