export type RouteCreationMode = 'facility_list' | 'upload' | 'sandbox';
export type RouteStatus = 'draft' | 'active' | 'locked' | 'archived';

export interface Route {
  id: string;
  name: string;
  zone_id: string;
  service_area_id: string;
  warehouse_id: string;
  creation_mode: RouteCreationMode;
  status: RouteStatus;
  total_distance_km: number | null;
  estimated_duration_min: number | null;
  optimized_geometry: any | null;
  algorithm_used: string | null;
  is_sandbox: boolean;
  locked_at: string | null;
  locked_by: string | null;
  metadata: Record<string, any>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  zones?: { id: string; name: string } | null;
  service_areas?: { id: string; name: string } | null;
  warehouses?: { id: string; name: string; lat: number | null; lng: number | null } | null;
  facility_count?: number;
}

export interface RouteFacility {
  id: string;
  route_id: string;
  facility_id: string;
  sequence_order: number;
  distance_from_previous_km: number | null;
  estimated_arrival_min: number | null;
  metadata: Record<string, any>;
  // Joined
  facilities?: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
    level_of_care: string | null;
    lga: string | null;
  } | null;
}

export interface CreateRouteInput {
  name: string;
  zone_id: string;
  service_area_id: string;
  warehouse_id: string;
  creation_mode: RouteCreationMode;
  facility_ids: string[];
  is_sandbox?: boolean;
  algorithm_used?: string;
}
