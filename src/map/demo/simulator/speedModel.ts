/**
 * Speed Model
 *
 * Calculates realistic vehicle speeds based on:
 * - Base vehicle speed
 * - Traffic zones
 * - Time of day
 * - Day of week
 * - Random variation
 */

import { trafficZones, timeOfDayMultiplier, dayOfWeekMultiplier } from './trafficZones';
import { haversineMeters } from './geoUtils';

export interface SpeedParams {
  baseSpeedKmh: number;
  position: [number, number];
  timestamp: Date;
  rng: () => number;
}

/**
 * Compute traffic-aware speed in km/h
 */
export function computeSpeedKmh({
  baseSpeedKmh,
  position,
  timestamp,
  rng,
}: SpeedParams): number {
  const hour = timestamp.getHours();
  const day = timestamp.getDay();

  // Start with time-based multipliers
  let multiplier = timeOfDayMultiplier(hour);
  multiplier *= dayOfWeekMultiplier(day);

  // Check if vehicle is in any traffic zone
  for (const zone of trafficZones) {
    const distanceToCenter = haversineMeters(position, zone.center);

    if (distanceToCenter < zone.radiusMeters) {
      // Apply zone multiplier (compounding if in multiple zones)
      multiplier *= zone.baseSpeedMultiplier;

      // Additional slowdown near zone center
      const centerFactor = 1 - distanceToCenter / zone.radiusMeters;
      const centerSlowdown = 1 - centerFactor * 0.2; // Up to 20% additional slowdown
      multiplier *= centerSlowdown;
    }
  }

  // Random jitter ±15% for realism
  const jitter = 0.85 + rng() * 0.3;
  multiplier *= jitter;

  // Minimum speed of 5 km/h (even in worst traffic)
  return Math.max(5, baseSpeedKmh * multiplier);
}

/**
 * Probabilistic delay event generation
 * Returns delay event or null
 */
export interface DelayEvent {
  type: 'delay';
  reason: 'traffic_jam' | 'road_obstruction' | 'vehicle_breakdown' | 'fuel_stop';
  durationMin: number;
}

export function maybeEmitDelay(rng: () => number): DelayEvent | null {
  // 2% chance of delay per tick
  if (rng() < 0.02) {
    const reasons: DelayEvent['reason'][] = [
      'traffic_jam',
      'road_obstruction',
      'vehicle_breakdown',
      'fuel_stop',
    ];

    const reason = reasons[Math.floor(rng() * reasons.length)];

    // Delay duration varies by reason
    let durationMin: number;
    switch (reason) {
      case 'traffic_jam':
        durationMin = 5 + rng() * 15; // 5-20 min
        break;
      case 'road_obstruction':
        durationMin = 10 + rng() * 20; // 10-30 min
        break;
      case 'vehicle_breakdown':
        durationMin = 30 + rng() * 60; // 30-90 min
        break;
      case 'fuel_stop':
        durationMin = 10 + rng() * 10; // 10-20 min
        break;
    }

    return {
      type: 'delay',
      reason,
      durationMin,
    };
  }

  return null;
}
