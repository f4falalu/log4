export interface StorageZone {
  id: string;
  name: string;
  type: 'cold' | 'ambient' | 'controlled' | 'hazardous' | 'general';
  temp_range?: string;
  capacity_m3: number;
  used_m3: number;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  operating_hours?: string;
  total_capacity_m3?: number;
  used_capacity_m3?: number;
  storage_zones?: StorageZone[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface WarehouseFilters {
  search?: string;
  state?: string;
  is_active?: boolean;
}

export interface WarehouseFormData {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  operating_hours?: string;
  total_capacity_m3?: number;
  storage_zones?: Omit<StorageZone, 'id'>[];
}

export interface WarehouseStats {
  total_warehouses: number;
  active_warehouses: number;
  total_capacity_m3: number;
  used_capacity_m3: number;
  utilization_pct: number;
}

export const STORAGE_ZONE_TYPES = [
  { value: 'cold', label: 'Cold Storage', color: 'bg-blue-100 text-blue-800' },
  { value: 'ambient', label: 'Ambient', color: 'bg-green-100 text-green-800' },
  { value: 'controlled', label: 'Controlled', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hazardous', label: 'Hazardous', color: 'bg-red-100 text-red-800' },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800' },
] as const;
