/**
 * Playback Data Preprocessing
 *
 * Transforms raw backend data into time-indexed, normalized structures
 * for the playback engine. This is the critical preprocessing step that
 * happens BEFORE playback starts.
 *
 * Responsibilities:
 * 1. Sort and validate GPS data
 * 2. Transform events into IndexedEvent format
 * 3. Build event activation maps (start/end)
 * 4. Compute cumulative distances
 * 5. Detect route deviations
 * 6. Create enhanced stop metadata
 */

import type {
  PlaybackEvent,
  StopAnalytics,
  TripAnalytics,
  NormalizedTrip,
  IndexedPosition,
  IndexedEvent,
  EnhancedStop,
  Polyline,
} from '@/types/live-map';
import {
  computeCumulativeDistances,
  detectDeviations,
  calculatePolylineDistance,
} from './playback-utils';

/**
 * Interface for raw data from usePlaybackData hook
 */
export interface RawPlaybackData {
  events: PlaybackEvent[];
  stopAnalytics: StopAnalytics[];
  analytics: TripAnalytics | null;
  timeRange: { start: Date; end: Date } | null;
}

/**
 * Main preprocessing function
 * Converts raw backend data into NormalizedTrip for playback engine
 *
 * @param data - Raw data from backend
 * @param batchId - Batch ID
 * @param plannedRoute - Optional planned route (if available)
 * @returns Normalized trip data or null if invalid
 */
export function preprocessTripData(
  data: RawPlaybackData,
  batchId: string,
  plannedRoute?: Polyline | null
): NormalizedTrip | null {
  const { events, stopAnalytics, analytics, timeRange } = data;

  // Validate data
  if (!timeRange || events.length === 0 || !analytics) {
    console.warn('[Preprocessing] Invalid trip data', { timeRange, eventsCount: events.length, analytics });
    return null;
  }

  // Step 1: Extract and sort GPS positions from events
  const gps = extractGPSPositions(events);

  if (gps.length === 0) {
    console.error('[Preprocessing] No valid GPS positions found');
    return null;
  }

  // Step 2: Validate GPS data
  if (!validateGPSData(gps, timeRange)) {
    console.error('[Preprocessing] GPS data validation failed');
    return null;
  }

  // Step 3: Transform events into IndexedEvent format
  const indexedEvents = transformEvents(events);

  // Step 4: Build event activation maps
  const { eventStartMap, eventEndMap } = buildEventMaps(indexedEvents);

  // Step 5: Compute cumulative distances
  const cumulativeDistances = computeCumulativeDistances(gps);

  // Step 6: Create enhanced stops
  const enhancedStops = createEnhancedStops(stopAnalytics, gps);

  // Step 7: Detect deviations (if planned route available)
  const deviations = plannedRoute
    ? detectDeviations(gps, plannedRoute, 100) // 100m threshold
    : [];

  // Add deviation events
  const deviationEvents = deviations.map((dev) => ({
    id: dev.id,
    type: 'deviation' as const,
    startTime: dev.startTime,
    endTime: dev.endTime,
    location: dev.coordinates[0] || [0, 0],
    metadata: {
      duration: (dev.endTime - dev.startTime) / 1000,
      severity: dev.maxDeviation > 500 ? ('high' as const) : dev.maxDeviation > 200 ? ('medium' as const) : ('low' as const),
    },
  }));

  const allEvents = [...indexedEvents, ...deviationEvents].sort(
    (a, b) => a.startTime - b.startTime
  );

  // Rebuild event maps with deviation events
  const finalMaps = buildEventMaps(allEvents);

  // Build normalized trip
  const normalizedTrip: NormalizedTrip = {
    id: analytics.batchId,
    batchId,
    startTime: timeRange.start.getTime(),
    endTime: timeRange.end.getTime(),
    gps,
    events: allEvents,
    stops: enhancedStops,
    plannedRoute: plannedRoute || null,
    analytics,
    cumulativeDistances,
    eventStartMap: finalMaps.eventStartMap,
    eventEndMap: finalMaps.eventEndMap,
  };

  console.log('[Preprocessing] Trip normalized successfully', {
    gpsPoints: gps.length,
    events: allEvents.length,
    stops: enhancedStops.length,
    deviations: deviations.length,
    duration: (normalizedTrip.endTime - normalizedTrip.startTime) / 1000 / 60,
    distance: cumulativeDistances[cumulativeDistances.length - 1] / 1000,
  });

  return normalizedTrip;
}

/**
 * Extract GPS positions from PlaybackEvents
 */
function extractGPSPositions(events: PlaybackEvent[]): IndexedPosition[] {
  const positions: IndexedPosition[] = [];

  for (const event of events) {
    const [lng, lat] = event.location;

    // Skip invalid coordinates
    if (lng === 0 && lat === 0) continue;
    if (!isFinite(lng) || !isFinite(lat)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

    positions.push({
      timestamp: event.timestamp.getTime(),
      lat,
      lng,
      heading: 0, // Would be computed from movement direction if not available
      speed: 0, // Would be computed from position changes if not available
      accuracy: 10, // Default accuracy
    });
  }

  // Sort by timestamp
  positions.sort((a, b) => a.timestamp - b.timestamp);

  // Remove duplicates (same timestamp)
  const unique: IndexedPosition[] = [];
  for (let i = 0; i < positions.length; i++) {
    if (i === 0 || positions[i].timestamp !== positions[i - 1].timestamp) {
      unique.push(positions[i]);
    }
  }

  // Compute heading and speed from position changes
  for (let i = 0; i < unique.length; i++) {
    if (i > 0) {
      const prev = unique[i - 1];
      const curr = unique[i];

      // Compute heading (bearing between two points)
      const heading = computeBearing(
        [prev.lng, prev.lat],
        [curr.lng, curr.lat]
      );
      curr.heading = heading;

      // Compute speed (distance / time)
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
      if (timeDiff > 0) {
        const distance = haversineDistance(
          [prev.lng, prev.lat],
          [curr.lng, curr.lat]
        );
        curr.speed = distance / timeDiff; // m/s
      }
    }
  }

  return unique;
}

/**
 * Compute bearing between two points
 */
function computeBearing(
  from: [number, number],
  to: [number, number]
): number {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;

  const dLng = toRadians(lng2 - lng1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  let bearing = toDegrees(Math.atan2(y, x));
  if (bearing < 0) bearing += 360;

  return bearing;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function haversineDistance(
  p1: [number, number],
  p2: [number, number]
): number {
  const [lng1, lat1] = p1;
  const [lng2, lat2] = p2;

  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate GPS data integrity
 */
function validateGPSData(
  gps: IndexedPosition[],
  timeRange: { start: Date; end: Date }
): boolean {
  if (gps.length === 0) return false;

  const startTime = timeRange.start.getTime();
  const endTime = timeRange.end.getTime();

  // Check if first GPS point is within time range
  if (gps[0].timestamp < startTime - 60000 || gps[0].timestamp > startTime + 60000) {
    console.warn('[Validation] First GPS point not aligned with trip start', {
      gpsStart: new Date(gps[0].timestamp),
      tripStart: timeRange.start,
    });
  }

  // Check if last GPS point is within time range
  const lastGPS = gps[gps.length - 1];
  if (lastGPS.timestamp < endTime - 60000 || lastGPS.timestamp > endTime + 60000) {
    console.warn('[Validation] Last GPS point not aligned with trip end', {
      gpsEnd: new Date(lastGPS.timestamp),
      tripEnd: timeRange.end,
    });
  }

  // Check for large time gaps
  for (let i = 1; i < gps.length; i++) {
    const gap = gps[i].timestamp - gps[i - 1].timestamp;
    if (gap > 120000) {
      // 2 minutes
      console.warn('[Validation] Large GPS gap detected', {
        gapMinutes: gap / 60000,
        index: i,
      });
    }
  }

  return true;
}

/**
 * Transform PlaybackEvents into IndexedEvents
 */
function transformEvents(events: PlaybackEvent[]): IndexedEvent[] {
  return events
    .map((event) => {
      let eventType: IndexedEvent['type'];

      switch (event.eventType) {
        case 'ARRIVED_AT_STOP':
          eventType = 'arrival';
          break;
        case 'DEPARTED_STOP':
          eventType = 'departure';
          break;
        case 'DELAY_REPORTED':
          eventType = 'delay';
          break;
        case 'PROOF_CAPTURED':
          eventType = 'proof';
          break;
        default:
          return null; // Skip other event types for now
      }

      return {
        id: event.id,
        type: eventType,
        startTime: event.timestamp.getTime(),
        endTime: undefined, // Instant event
        location: event.location,
        metadata: {
          stopId: event.facilityId,
          facilityName: event.facilityName,
          reason: (event.metadata as any)?.reason,
          duration: (event.metadata as any)?.duration,
          severity: (event.metadata as any)?.severity,
        },
      };
    })
    .filter((e): e is IndexedEvent => e !== null);
}

/**
 * Build event activation maps for efficient lookup
 */
function buildEventMaps(events: IndexedEvent[]): {
  eventStartMap: Map<number, IndexedEvent[]>;
  eventEndMap: Map<number, IndexedEvent[]>;
} {
  const eventStartMap = new Map<number, IndexedEvent[]>();
  const eventEndMap = new Map<number, IndexedEvent[]>();

  for (const event of events) {
    // Add to start map
    const startList = eventStartMap.get(event.startTime) || [];
    startList.push(event);
    eventStartMap.set(event.startTime, startList);

    // Add to end map (if has end time)
    if (event.endTime !== undefined) {
      const endList = eventEndMap.get(event.endTime) || [];
      endList.push(event);
      eventEndMap.set(event.endTime, endList);
    }
  }

  return { eventStartMap, eventEndMap };
}

/**
 * Create enhanced stops with GPS coordinates
 */
function createEnhancedStops(
  stopAnalytics: StopAnalytics[],
  gps: IndexedPosition[]
): EnhancedStop[] {
  return stopAnalytics.map((stop) => {
    // Find GPS position closest to arrival time
    const arrivalTime = stop.arrivalTime.getTime();
    let closestGPS = gps[0];
    let minTimeDiff = Infinity;

    for (const pos of gps) {
      const timeDiff = Math.abs(pos.timestamp - arrivalTime);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestGPS = pos;
      }
    }

    // Determine status
    let status: EnhancedStop['status'];
    if (!stop.departureTime) {
      status = 'missed';
    } else if (stop.delayed) {
      status = 'delayed';
    } else {
      status = 'completed';
    }

    return {
      ...stop,
      location: [closestGPS.lng, closestGPS.lat],
      actualArrival: stop.arrivalTime,
      dwellTime: stop.duration,
      status,
    };
  });
}

/**
 * Downsample GPS data if exceeds max points
 * Uses simple interval-based downsampling to maintain performance
 *
 * @param gps - GPS array
 * @param maxPoints - Maximum number of points (default 50000)
 * @returns Downsampled GPS array
 */
export function downsampleGPS(
  gps: IndexedPosition[],
  maxPoints: number = 50000
): IndexedPosition[] {
  if (gps.length <= maxPoints) return gps;

  const interval = Math.ceil(gps.length / maxPoints);
  const downsampled: IndexedPosition[] = [];

  for (let i = 0; i < gps.length; i += interval) {
    downsampled.push(gps[i]);
  }

  // Always include last point
  if (downsampled[downsampled.length - 1] !== gps[gps.length - 1]) {
    downsampled.push(gps[gps.length - 1]);
  }

  console.log(`[Downsampling] ${gps.length} → ${downsampled.length} points`);

  return downsampled;
}
