// MOD4 Traffic Estimation
// Time-of-day based traffic multipliers and route-aware ETA adjustments

import { Facility } from '@/lib/db/schema';
import { haversineDistance } from './eta';

// Traffic levels based on typical urban patterns
export type TrafficLevel = 'light' | 'moderate' | 'heavy' | 'severe';

export interface TrafficCondition {
  level: TrafficLevel;
  multiplier: number;
  description: string;
  color: string;
}

// Traffic conditions with ETA multipliers
export const TRAFFIC_CONDITIONS: Record<TrafficLevel, TrafficCondition> = {
  light: {
    level: 'light',
    multiplier: 1.0,
    description: 'Light traffic',
    color: 'hsl(var(--success))',
  },
  moderate: {
    level: 'moderate',
    multiplier: 1.25,
    description: 'Moderate traffic',
    color: 'hsl(var(--primary))',
  },
  heavy: {
    level: 'heavy',
    multiplier: 1.6,
    description: 'Heavy traffic',
    color: 'hsl(var(--warning))',
  },
  severe: {
    level: 'severe',
    multiplier: 2.2,
    description: 'Severe congestion',
    color: 'hsl(var(--destructive))',
  },
};

// Get traffic level based on time of day and day of week
export function getTimeBasedTrafficLevel(date: Date = new Date()): TrafficLevel {
  const hour = date.getHours();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    // Weekend patterns - generally lighter
    if (hour >= 11 && hour <= 14) return 'moderate'; // Lunch rush
    if (hour >= 16 && hour <= 19) return 'moderate'; // Evening activities
    return 'light';
  }

  // Weekday patterns
  // Morning rush: 7-9 AM
  if (hour >= 7 && hour <= 8) return 'heavy';
  if (hour === 9) return 'moderate';
  
  // Lunch period: 11 AM - 1 PM
  if (hour >= 11 && hour <= 13) return 'moderate';
  
  // Evening rush: 4-7 PM
  if (hour >= 16 && hour <= 17) return 'heavy';
  if (hour === 18) return 'severe';
  if (hour === 19) return 'heavy';
  
  // School pickup: 2-3 PM
  if (hour >= 14 && hour <= 15) return 'moderate';
  
  // Late night / early morning
  if (hour >= 22 || hour <= 5) return 'light';
  
  return 'light';
}

// Get traffic condition with all details
export function getCurrentTrafficCondition(date: Date = new Date()): TrafficCondition {
  const level = getTimeBasedTrafficLevel(date);
  return TRAFFIC_CONDITIONS[level];
}

// Apply traffic multiplier to ETA
export function applyTrafficToETA(etaMinutes: number, trafficLevel: TrafficLevel): number {
  const condition = TRAFFIC_CONDITIONS[trafficLevel];
  return Math.round(etaMinutes * condition.multiplier);
}

// Calculate traffic-adjusted cumulative ETA
export function calculateTrafficAwareETA(
  baseEtaMinutes: number,
  startTime: Date = new Date()
): { adjustedMinutes: number; conditions: TrafficCondition[] } {
  const conditions: TrafficCondition[] = [];
  let adjustedMinutes = 0;
  let currentTime = new Date(startTime);
  let remainingMinutes = baseEtaMinutes;

  // Simulate journey in 15-minute segments
  const segmentSize = 15;
  
  while (remainingMinutes > 0) {
    const segmentDuration = Math.min(remainingMinutes, segmentSize);
    const condition = getCurrentTrafficCondition(currentTime);
    
    // Apply traffic to this segment
    const adjustedSegment = segmentDuration * condition.multiplier;
    adjustedMinutes += adjustedSegment;
    
    // Track unique conditions
    if (!conditions.find(c => c.level === condition.level)) {
      conditions.push(condition);
    }
    
    // Advance time
    currentTime = new Date(currentTime.getTime() + adjustedSegment * 60 * 1000);
    remainingMinutes -= segmentDuration;
  }

  return {
    adjustedMinutes: Math.round(adjustedMinutes),
    conditions,
  };
}

// Area-based traffic zones (simplified)
export interface TrafficZone {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  peakMultiplier: number; // Additional multiplier for this zone during peak
}

// Check if a facility is in a high-traffic zone
export function isInTrafficZone(
  facility: Facility,
  zones: TrafficZone[]
): TrafficZone | null {
  for (const zone of zones) {
    const distance = haversineDistance(
      facility.lat,
      facility.lng,
      zone.centerLat,
      zone.centerLng
    );
    if (distance <= zone.radiusMeters) {
      return zone;
    }
  }
  return null;
}

// Get traffic forecast for next few hours
export function getTrafficForecast(
  startTime: Date = new Date(),
  hoursAhead: number = 4
): Array<{ time: Date; condition: TrafficCondition }> {
  const forecast: Array<{ time: Date; condition: TrafficCondition }> = [];
  
  for (let i = 0; i <= hoursAhead; i++) {
    const forecastTime = new Date(startTime.getTime() + i * 60 * 60 * 1000);
    forecast.push({
      time: forecastTime,
      condition: getCurrentTrafficCondition(forecastTime),
    });
  }
  
  return forecast;
}

// Format traffic-adjusted time difference
export function formatTrafficDelay(baseMinutes: number, adjustedMinutes: number): string {
  const delay = adjustedMinutes - baseMinutes;
  if (delay <= 0) return '';
  if (delay < 5) return '+few min';
  return `+${delay} min`;
}
