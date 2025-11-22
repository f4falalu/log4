/**
 * Vehicle Silhouette Asset Mapping
 * Maps vehicle category codes to their corresponding silhouette image paths
 */

export interface VehicleSilhouetteInfo {
  path: string;
  fallbackIcon: string; // Lucide icon name as fallback
  cargoHighlightPath?: string; // Optional cargo area highlight overlay
}

/**
 * Map of category codes to silhouette asset paths
 */
export const VEHICLE_SILHOUETTES: Record<string, VehicleSilhouetteInfo> = {
  // EU Categories
  L1: {
    path: '/assets/vehicles/silhouettes/moped.svg',
    fallbackIcon: 'bike',
  },
  L2: {
    path: '/assets/vehicles/silhouettes/motorcycle.svg',
    fallbackIcon: 'bike',
  },
  M1: {
    path: '/assets/vehicles/silhouettes/passenger-car.svg',
    fallbackIcon: 'car',
  },
  M2: {
    path: '/assets/vehicles/silhouettes/minibus.svg',
    fallbackIcon: 'bus',
  },
  N1: {
    path: '/assets/vehicles/silhouettes/van.svg',
    fallbackIcon: 'truck',
    cargoHighlightPath: '/assets/vehicles/silhouettes/van-cargo.svg',
  },
  N2: {
    path: '/assets/vehicles/silhouettes/medium-truck.svg',
    fallbackIcon: 'truck',
    cargoHighlightPath: '/assets/vehicles/silhouettes/medium-truck-cargo.svg',
  },
  N3: {
    path: '/assets/vehicles/silhouettes/heavy-truck.svg',
    fallbackIcon: 'truck',
    cargoHighlightPath: '/assets/vehicles/silhouettes/heavy-truck-cargo.svg',
  },

  // BIKO Shortcuts
  BIKO_MINIVAN: {
    path: '/assets/vehicles/silhouettes/minivan.svg',
    fallbackIcon: 'van',
    cargoHighlightPath: '/assets/vehicles/silhouettes/minivan-cargo.svg',
  },
  BIKO_KEKE: {
    path: '/assets/vehicles/silhouettes/keke.svg',
    fallbackIcon: 'bike',
  },
  BIKO_MOPED: {
    path: '/assets/vehicles/silhouettes/delivery-moped.svg',
    fallbackIcon: 'bike',
  },
  BIKO_COLDCHAIN: {
    path: '/assets/vehicles/silhouettes/refrigerated-van.svg',
    fallbackIcon: 'snowflake',
    cargoHighlightPath: '/assets/vehicles/silhouettes/refrigerated-van-cargo.svg',
  },
};

/**
 * Get silhouette info for a vehicle category
 */
export function getVehicleSilhouette(
  categoryCode: string | null | undefined
): VehicleSilhouetteInfo {
  const defaultSilhouette: VehicleSilhouetteInfo = {
    path: '/assets/vehicles/silhouettes/generic-truck.svg',
    fallbackIcon: 'truck',
  };

  if (!categoryCode) return defaultSilhouette;

  return VEHICLE_SILHOUETTES[categoryCode] || defaultSilhouette;
}

/**
 * Check if silhouette image exists (client-side)
 * Returns a promise that resolves to true if image loads successfully
 */
export function checkSilhouetteExists(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = path;
  });
}

/**
 * Get cargo area dimensions as percentage of total vehicle length
 * Used for positioning cargo highlight overlay
 */
export function getCargoAreaDimensions(categoryCode: string): {
  offsetPercent: number; // From left edge
  widthPercent: number; // Of total length
} {
  const defaults = { offsetPercent: 40, widthPercent: 50 };

  const dimensions: Record<string, typeof defaults> = {
    L1: { offsetPercent: 0, widthPercent: 30 }, // Moped cargo basket
    L2: { offsetPercent: 0, widthPercent: 30 }, // Motorcycle cargo
    M1: { offsetPercent: 0, widthPercent: 0 }, // No cargo area
    M2: { offsetPercent: 0, widthPercent: 0 }, // Passenger only
    N1: { offsetPercent: 45, widthPercent: 55 }, // Van cargo
    N2: { offsetPercent: 40, widthPercent: 60 }, // Medium truck
    N3: { offsetPercent: 35, widthPercent: 65 }, // Heavy truck
    BIKO_MINIVAN: { offsetPercent: 50, widthPercent: 50 },
    BIKO_KEKE: { offsetPercent: 60, widthPercent: 40 },
    BIKO_MOPED: { offsetPercent: 0, widthPercent: 25 },
    BIKO_COLDCHAIN: { offsetPercent: 45, widthPercent: 55 },
  };

  return dimensions[categoryCode] || defaults;
}
