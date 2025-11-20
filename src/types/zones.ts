// Geographic service zones (GeoJSON-based)
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

// Operational zones for hierarchical organization
export interface OperationalZone {
  id: string;
  name: string;
  code: string | null;
  region_center: {
    lat: number;
    lng: number;
  } | null;
  zone_manager_id: string | null;
  description: string | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface LGA {
  id: string;
  name: string;
  zone_id: string | null;
  warehouse_id: string | null;
  state: string;
  population: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ZoneMetrics {
  zone_id: string;
  zone_name: string;
  zone_code: string | null;
  is_active: boolean;
  warehouse_count: number;
  lga_count: number;
  facility_count: number;
  fleet_count: number;
  created_at: string;
  updated_at: string;
}

export interface ZoneFacilityHierarchy {
  zone_id: string;
  zone_name: string;
  zone_code: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  lga_id: string | null;
  lga_name: string | null;
  facility_id: string | null;
  facility_name: string | null;
  facility_type: string | null;
  facility_lat: number | null;
  facility_lng: number | null;
}

export interface ZoneSummary {
  zone_name: string;
  warehouse_count: number;
  lga_count: number;
  facility_count: number;
  fleet_count: number;
  active_dispatches: number;
}

export interface CreateZoneInput {
  name: string;
  code?: string;
  description?: string;
  region_center?: {
    lat: number;
    lng: number;
  };
  zone_manager_id?: string;
  is_active?: boolean;
}

export interface UpdateZoneInput extends Partial<CreateZoneInput> {
  id: string;
}

export interface CreateLGAInput {
  name: string;
  zone_id: string;
  warehouse_id?: string;
  state?: string;
  population?: number;
}

export interface UpdateLGAInput extends Partial<CreateLGAInput> {
  id: string;
}

export interface ZoneFilterOptions {
  zone_type?: string[];
  is_active?: boolean;
  search?: string;
  tags?: string[];
}
