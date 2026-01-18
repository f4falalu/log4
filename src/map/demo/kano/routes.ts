/**
 * Kano State Routes - Demo Dataset
 *
 * Precomputed polylines for vehicle routes with delivery waypoints
 * Format: [lng, lat] (GeoJSON standard)
 */

export interface DeliveryWaypoint {
  facilityId: string;
  position: [number, number]; // [lng, lat]
  polylineIndex: number; // Index in polyline where this waypoint is located
  dwellMinutes: number; // How long to pause at this location
  slotsToDeliver: number; // Capacity to decrease
}

export interface DemoRoute {
  id: string;
  vehicleId: string;
  warehouseId: string;
  facilityIds: string[];
  polyline: [number, number][];
  waypoints: DeliveryWaypoint[]; // Delivery stops along the route
}

export const routes: DemoRoute[] = [
  // VAN-01: Central warehouse → Sabon Gari → Dala → Gwale
  {
    id: 'route-van-01',
    vehicleId: 'veh-van-01',
    warehouseId: 'wh-kano-central',
    facilityIds: ['phc-km-01', 'phc-dala-01', 'phc-gwale-01'],
    polyline: [
      [8.5167, 12.0022], // Warehouse
      [8.5197, 12.0038],
      [8.5227, 12.0054], // PHC Sabon Gari
      [8.5197, 12.0025],
      [8.5115, 12.0001],
      [8.5048, 11.9940],
      [8.4982, 11.9903], // PHC Dala
      [8.4951, 11.9922],
      [8.4898, 11.9953],
      [8.4862, 11.9985], // PHC Gwale
    ],
    waypoints: [
      {
        facilityId: 'phc-km-01',
        position: [8.5227, 12.0054],
        polylineIndex: 2,
        dwellMinutes: 15,
        slotsToDeliver: 8,
      },
      {
        facilityId: 'phc-dala-01',
        position: [8.4982, 11.9903],
        polylineIndex: 6,
        dwellMinutes: 12,
        slotsToDeliver: 6,
      },
      {
        facilityId: 'phc-gwale-01',
        position: [8.4862, 11.9985],
        polylineIndex: 9,
        dwellMinutes: 10,
        slotsToDeliver: 5,
      },
    ],
  },

  // VAN-02: Central warehouse → Kofar Wambai → Fagge
  {
    id: 'route-van-02',
    vehicleId: 'veh-van-02',
    warehouseId: 'wh-kano-central',
    facilityIds: ['phc-km-02', 'phc-fagge-01'],
    polyline: [
      [8.5167, 12.0022], // Warehouse
      [8.5135, 12.0051],
      [8.5103, 12.0101], // PHC Kofar Wambai
      [8.5137, 12.0136],
      [8.5189, 12.0153],
      [8.5241, 12.0171], // PHC Fagge
    ],
    waypoints: [
      {
        facilityId: 'phc-km-02',
        position: [8.5103, 12.0101],
        polylineIndex: 2,
        dwellMinutes: 18,
        slotsToDeliver: 10,
      },
      {
        facilityId: 'phc-fagge-01',
        position: [8.5241, 12.0171],
        polylineIndex: 5,
        dwellMinutes: 14,
        slotsToDeliver: 7,
      },
    ],
  },

  // TRUCK-01: Central warehouse → Hotoro → Ungogo → Gezawa
  {
    id: 'route-truck-01',
    vehicleId: 'veh-truck-01',
    warehouseId: 'wh-kano-central',
    facilityIds: ['phc-tarauni-01', 'phc-ungogo-01', 'phc-gezawa-01'],
    polyline: [
      [8.5167, 12.0022], // Warehouse
      [8.5255, 11.9814],
      [8.5344, 11.9607], // PHC Hotoro
      [8.5361, 11.9887],
      [8.5377, 12.0345],
      [8.5377, 12.0668], // PHC Ungogo
      [8.5845, 12.0779],
      [8.6729, 12.0909],
      [8.7513, 12.0991], // PHC Gezawa
    ],
    waypoints: [
      {
        facilityId: 'phc-tarauni-01',
        position: [8.5344, 11.9607],
        polylineIndex: 2,
        dwellMinutes: 20,
        slotsToDeliver: 12,
      },
      {
        facilityId: 'phc-ungogo-01',
        position: [8.5377, 12.0668],
        polylineIndex: 5,
        dwellMinutes: 25,
        slotsToDeliver: 15,
      },
      {
        facilityId: 'phc-gezawa-01',
        position: [8.7513, 12.0991],
        polylineIndex: 8,
        dwellMinutes: 22,
        slotsToDeliver: 13,
      },
    ],
  },

  // BIKE-01: Sabon Gari → Kabuga (dense urban)
  {
    id: 'route-bike-01',
    vehicleId: 'veh-bike-01',
    warehouseId: 'wh-kano-central',
    facilityIds: ['phc-km-01', 'phc-km-03'],
    polyline: [
      [8.5227, 12.0054], // PHC Sabon Gari
      [8.5269, 12.0017],
      [8.5311, 11.9975],
      [8.5311, 11.9934], // PHC Kabuga
    ],
    waypoints: [
      {
        facilityId: 'phc-km-01',
        position: [8.5227, 12.0054],
        polylineIndex: 0,
        dwellMinutes: 8,
        slotsToDeliver: 3,
      },
      {
        facilityId: 'phc-km-03',
        position: [8.5311, 11.9934],
        polylineIndex: 3,
        dwellMinutes: 10,
        slotsToDeliver: 4,
      },
    ],
  },

  // TRUCK-02: Kumbotso warehouse → Kumbotso → Nassarawa
  {
    id: 'route-truck-02',
    vehicleId: 'veh-truck-02',
    warehouseId: 'wh-kumbotso',
    facilityIds: ['phc-kumbotso-01', 'phc-nassarawa-01'],
    polyline: [
      [8.4956, 11.9312], // Kumbotso warehouse
      [8.4965, 11.9315],
      [8.4974, 11.9319], // PHC Kumbotso
      [8.5149, 11.9230],
      [8.5311, 11.9176],
      [8.5423, 11.9141], // PHC Nassarawa
    ],
    waypoints: [
      {
        facilityId: 'phc-kumbotso-01',
        position: [8.4974, 11.9319],
        polylineIndex: 2,
        dwellMinutes: 16,
        slotsToDeliver: 11,
      },
      {
        facilityId: 'phc-nassarawa-01',
        position: [8.5423, 11.9141],
        polylineIndex: 5,
        dwellMinutes: 19,
        slotsToDeliver: 9,
      },
    ],
  },
];
