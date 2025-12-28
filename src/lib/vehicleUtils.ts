/**
 * Vehicle Utility Functions
 * Helper functions for vehicle-related operations
 */

/**
 * Get vehicle silhouette image path based on vehicle type
 * Maps vehicle types to their corresponding silhouette images
 *
 * Vehicle Classification System:
 * - M1: Passenger cars (sedan, suv, hatchback)
 * - M2: Large passenger vehicles (minibus, van with seats)
 * - N1: Light commercial vehicles (pickup, small truck)
 * - N2: Medium trucks
 * - N3: Heavy trucks
 * - L1: Motorcycles/mopeds
 * - L2: Three-wheelers (keke, rickshaw)
 * - BIKO_*: Custom BIKO vehicle types
 */
export function getVehicleSilhouette(vehicleType: string): string {
  if (!vehicleType) {
    return '/assets/vehicles/silhouettes/M1.webp'; // Default fallback
  }

  const type = vehicleType.toLowerCase();

  // Map vehicle types to silhouette files
  const typeMapping: Record<string, string> = {
    // M1 - Passenger cars
    'sedan': '/assets/vehicles/silhouettes/M1.webp',
    'suv': '/assets/vehicles/silhouettes/M1.webp',
    'hatchback': '/assets/vehicles/silhouettes/M1.webp',
    'car': '/assets/vehicles/silhouettes/M1.webp',
    'passenger': '/assets/vehicles/silhouettes/M1.webp',

    // M2 - Large passenger vehicles
    'van': '/assets/vehicles/silhouettes/M2.webp',
    'minivan': '/assets/vehicles/silhouettes/M2.webp',
    'minibus': '/assets/vehicles/silhouettes/M2.webp',
    'bus': '/assets/vehicles/silhouettes/M2.webp',
    'biko_minivan': '/assets/vehicles/silhouettes/BIKO_MINIVAN.webp',

    // N1 - Light commercial
    'pickup': '/assets/vehicles/silhouettes/N1.webp',
    'light_truck': '/assets/vehicles/silhouettes/N1.webp',
    'small_truck': '/assets/vehicles/silhouettes/N1.webp',

    // N2 - Medium trucks
    'truck': '/assets/vehicles/silhouettes/N2.webp',
    'medium_truck': '/assets/vehicles/silhouettes/N2.webp',
    'delivery_truck': '/assets/vehicles/silhouettes/N2.webp',

    // N3 - Heavy trucks
    'heavy_truck': '/assets/vehicles/silhouettes/N3.webp',
    'large_truck': '/assets/vehicles/silhouettes/N3.webp',
    'lorry': '/assets/vehicles/silhouettes/N3.webp',

    // L1 - Motorcycles
    'motorcycle': '/assets/vehicles/silhouettes/L1.webp',
    'bike': '/assets/vehicles/silhouettes/L1.webp',
    'moped': '/assets/vehicles/silhouettes/L1.webp',
    'motorbike': '/assets/vehicles/silhouettes/L1.webp',
    'biko_moped': '/assets/vehicles/silhouettes/BIKO_MOPED.webp',

    // L2 - Three-wheelers
    'tricycle': '/assets/vehicles/silhouettes/L2.webp',
    'keke': '/assets/vehicles/silhouettes/L2.webp',
    'rickshaw': '/assets/vehicles/silhouettes/L2.webp',
    'three_wheeler': '/assets/vehicles/silhouettes/L2.webp',
    'biko_keke': '/assets/vehicles/silhouettes/BIKO_KEKE.webp',

    // Special vehicles
    'cold_chain': '/assets/vehicles/silhouettes/BIKO_COLDCHAIN.webp',
    'refrigerated': '/assets/vehicles/silhouettes/BIKO_COLDCHAIN.webp',
    'biko_coldchain': '/assets/vehicles/silhouettes/BIKO_COLDCHAIN.webp',
  };

  // Try exact match first
  if (typeMapping[type]) {
    return typeMapping[type];
  }

  // Try partial match (contains)
  for (const [key, path] of Object.entries(typeMapping)) {
    if (type.includes(key) || key.includes(type)) {
      return typeMapping[key];
    }
  }

  // Default fallback to M1 (sedan)
  return '/assets/vehicles/silhouettes/M1.webp';
}

/**
 * Get vehicle type display name
 */
export function getVehicleTypeDisplayName(vehicleType: string): string {
  const displayNames: Record<string, string> = {
    'sedan': 'Sedan',
    'suv': 'SUV',
    'van': 'Van',
    'truck': 'Truck',
    'pickup': 'Pickup Truck',
    'motorcycle': 'Motorcycle',
    'keke': 'Keke (Tricycle)',
    'moped': 'Moped',
    'minivan': 'Minivan',
    'cold_chain': 'Cold Chain Vehicle',
  };

  return displayNames[vehicleType.toLowerCase()] || vehicleType;
}
