// Item categories for pharmaceutical/medical supplies
export type ItemCategory =
  | 'Tablet'
  | 'Insertion'
  | 'Capsule'
  | 'Suspension'
  | 'Syrup'
  | 'Injection'
  | 'Intravenous'
  | 'Oral Fluid'
  | 'Opthal-Mics'
  | 'Cream'
  | 'Extemporaneous'
  | 'Consummable'
  | 'Aerosol'
  | 'Vaccine'
  | 'Powder'
  | 'Device';

export const ITEM_CATEGORIES: ItemCategory[] = [
  'Tablet',
  'Insertion',
  'Capsule',
  'Suspension',
  'Syrup',
  'Injection',
  'Intravenous',
  'Oral Fluid',
  'Opthal-Mics',
  'Cream',
  'Extemporaneous',
  'Consummable',
  'Aerosol',
  'Vaccine',
  'Powder',
  'Device',
];

// Common programs for pharmaceutical items
export const ITEM_PROGRAMS = [
  'Essential Medicines',
  'Reproductive Health',
  'Malaria Control',
  'HIV/AIDS',
  'Tuberculosis',
  'Immunization',
  'Family Planning',
  'Maternal Health',
  'Child Health',
  'Nutrition',
  'Other',
] as const;

export type ItemProgram = (typeof ITEM_PROGRAMS)[number];

export interface Item {
  id: string;
  serial_number: string;
  description: string;
  unit_pack: string;
  category: ItemCategory;
  program?: ItemProgram;
  weight_kg?: number;
  volume_m3?: number;
  batch_number?: string;
  mfg_date?: string;
  expiry_date?: string;
  store_address?: string;
  lot_number?: string;
  stock_on_hand: number;
  unit_price: number;
  total_price: number;
  warehouse_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Joined relations
  warehouse?: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface ItemFilters {
  search?: string;
  category?: ItemCategory;
  program?: ItemProgram;
  warehouse_id?: string;
  expiry_before?: string;
  expiry_after?: string;
  low_stock?: boolean;
  out_of_stock?: boolean;
  expiring_soon?: boolean;
  expired?: boolean;
  min_stock?: number;
  max_stock?: number;
}

export interface ItemFormData {
  serial_number: string;
  description: string;
  unit_pack: string;
  category: ItemCategory;
  program?: ItemProgram;
  weight_kg?: number;
  volume_m3?: number;
  batch_number?: string;
  mfg_date?: string;
  expiry_date?: string;
  store_address?: string;
  lot_number?: string;
  stock_on_hand: number;
  unit_price: number;
  warehouse_id?: string;
}

export interface ItemAnalytics {
  item_id: string;
  total_shipments: number;
  total_quantity_shipped: number;
  last_shipment_date?: string;
  average_monthly_usage: number;
  stock_turnover_rate: number;
  days_until_expiry?: number;
}

export interface ItemShipmentHistory {
  id: string;
  item_id: string;
  invoice_id?: string;
  requisition_id?: string;
  quantity: number;
  shipment_date: string;
  destination_facility?: {
    id: string;
    name: string;
  };
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
}
