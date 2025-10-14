export interface ServiceZone {
  id: string;
  name: string;
  description?: string;
  geometry: GeoJSON.Feature<GeoJSON.Polygon>;
  color: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata?: {
    assigned_fleets?: string[];
    tags?: string[];
    [key: string]: any;
  };
}

export interface ZoneDrawingState {
  isDrawing: boolean;
  isEditing: boolean;
  selectedZoneId: string | null;
  temporaryGeometry: GeoJSON.Feature<GeoJSON.Polygon> | null;
}
