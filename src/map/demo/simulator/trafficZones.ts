/**
 * Traffic Zones - Kano State
 *
 * Defines congestion areas with speed multipliers
 * Based on real Kano congestion patterns
 */

export interface TrafficZone {
  id: string;
  name: string;
  lga: string;
  center: [number, number]; // [lng, lat]
  radiusMeters: number;
  baseSpeedMultiplier: number; // < 1 = slower traffic
}

export const trafficZones: TrafficZone[] = [
  // Sabon Gari Market (Dense commercial area)
  {
    id: 'tz-sabon-gari',
    name: 'Sabon Gari Market Zone',
    lga: 'Kano Municipal',
    center: [8.5231, 12.0058],
    radiusMeters: 800,
    baseSpeedMultiplier: 0.45, // 55% speed reduction
  },

  // Dala Congestion Zone (Old city)
  {
    id: 'tz-dala',
    name: 'Dala Congestion Zone',
    lga: 'Dala',
    center: [8.4982, 11.9903],
    radiusMeters: 600,
    baseSpeedMultiplier: 0.55, // 45% speed reduction
  },

  // Zaria Road Corridor (Major arterial)
  {
    id: 'tz-ungogo-road',
    name: 'Zaria Road Corridor',
    lga: 'Ungogo',
    center: [8.5351, 12.0715],
    radiusMeters: 1200,
    baseSpeedMultiplier: 0.65, // 35% speed reduction
  },

  // Fagge Market Area
  {
    id: 'tz-fagge-market',
    name: 'Fagge Market Area',
    lga: 'Fagge',
    center: [8.5241, 12.0171],
    radiusMeters: 700,
    baseSpeedMultiplier: 0.50, // 50% speed reduction
  },

  // Hotoro Junction (Intersection bottleneck)
  {
    id: 'tz-hotoro',
    name: 'Hotoro Junction',
    lga: 'Tarauni',
    center: [8.5344, 11.9607],
    radiusMeters: 400,
    baseSpeedMultiplier: 0.60, // 40% speed reduction
  },
];

/**
 * Time-of-day traffic multiplier
 * Returns factor to apply based on hour (0-23)
 */
export function timeOfDayMultiplier(hour: number): number {
  // Morning rush (7-9 AM)
  if (hour >= 7 && hour <= 9) return 0.6;

  // Evening rush (4-7 PM)
  if (hour >= 16 && hour <= 19) return 0.5;

  // Midday moderate (12-2 PM)
  if (hour >= 12 && hour <= 14) return 0.8;

  // Off-peak
  return 1.0;
}

/**
 * Day-of-week multiplier
 * Market days (Thursdays) have more congestion
 */
export function dayOfWeekMultiplier(day: number): number {
  // Thursday (market day)
  if (day === 4) return 0.7;

  // Friday (prayer day, afternoon congestion)
  if (day === 5) return 0.8;

  // Weekend (less commercial traffic)
  if (day === 0 || day === 6) return 1.1;

  // Regular weekday
  return 1.0;
}
