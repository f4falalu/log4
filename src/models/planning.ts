export interface PlanningCell {
    h3Index: string; // H3 index string, e.g., "8928308280fffff"
    resolution: number; // H3 resolution (7‑10)
    geometry: GeoJSON.Polygon; // GeoJSON polygon for MapLibre rendering
    metrics: {
        demand: number; // forecasted deliveries
        deliveries: number; // historical count
        activeFacilities: number;
        activeWarehouses: number;
        capacity: {
            available: number;
            utilized: number;
            utilizationPct: number;
        };
        sla: {
            atRisk: number;
            breachRatePct: number;
        };
        congestionScore?: number;
    };
    tags?: {
        rural?: boolean;
        highRisk?: boolean;
        underserved?: boolean;
    };
}

export interface FacilityPlanningProjection {
    facilityId: string;
    h3Index: string;
    serviceCapacity: number;
    demandLoad: number;
}

export interface WarehouseCoverage {
    warehouseId: string;
    h3Indexes: string[]; // result of h3.kRing(...)
    totalDemand: number;
    capacityRemaining: number;
}
