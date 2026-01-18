/**
 * Kano State Warehouses - Demo Dataset
 *
 * Central supply nodes for medical/logistics distribution
 */

export interface DemoWarehouse {
  id: string;
  name: string;
  type: 'warehouse';
  lga: string;
  lat: number;
  lng: number;
  capacitySlots: number;
}

export const warehouses: DemoWarehouse[] = [
  {
    id: 'wh-kano-central',
    name: 'Kano Central Medical Store',
    type: 'warehouse',
    lga: 'Kano Municipal',
    lat: 12.0022,
    lng: 8.5167,
    capacitySlots: 1200,
  },
  {
    id: 'wh-kumbotso',
    name: 'Kumbotso Zonal Store',
    type: 'warehouse',
    lga: 'Kumbotso',
    lat: 11.9312,
    lng: 8.4956,
    capacitySlots: 600,
  },
];
