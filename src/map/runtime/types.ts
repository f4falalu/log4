/**
 * types.ts
 *
 * Type definitions for MapRuntime architecture
 */

import type { RepresentationMode } from '@/components/map/RepresentationToggle';

export type MapContext = 'operational' | 'planning' | 'forensic';

export interface MapConfig {
  context: MapContext;
  style: string | maplibregl.StyleSpecification;
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface LayerHandlers {
  onVehicleClick?: (vehicle: any) => void;
  onDriverClick?: (driver: any) => void;
  onRouteClick?: (route: any) => void;
  onAlertClick?: (alert: any) => void;
  onBatchClick?: (batch: any) => void;
}

export interface RuntimeCommand {
  type: 'SET_MODE' | 'UPDATE_LAYER' | 'SET_VISIBILITY';
  payload: any;
}
