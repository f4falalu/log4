/**
 * MovementEngine.ts — Tick-based vehicle movement simulation.
 *
 * Moves vehicles along their routes based on elapsed time.
 * Deterministic given same inputs.
 */

import type { VehicleData } from '../../layers/VehicleLayer';
import type { RouteData } from '../../layers/RouteLayer';
import { interpolateCoord, bearing, distanceMeters } from './geoUtils';

export interface SimulationState {
  vehicles: VehicleData[];
  routes: RouteData[];
}

interface VehicleProgress {
  routeProgress: number; // 0–1 overall route progress
  segmentIndex: number;  // current segment
  segmentT: number;      // 0–1 within segment
  speed: number;         // km/h
  direction: 1 | -1;    // forward or reverse (for looping)
}

export class MovementEngine {
  private vehicles: VehicleData[];
  private routes: RouteData[];
  private progress = new Map<string, VehicleProgress>();
  private baseSpeedKmh = 30;

  constructor(vehicles: VehicleData[], routes: RouteData[]) {
    this.vehicles = [...vehicles];
    this.routes = [...routes];
    this.initProgress();
  }

  /**
   * Advance simulation by deltaMs milliseconds.
   * Returns updated state.
   */
  tick(deltaMs: number): SimulationState {
    for (const vehicle of this.vehicles) {
      if (vehicle.status === 'offline' || vehicle.status === 'idle') continue;

      const route = this.routes.find((r) => r.vehicleId === vehicle.id);
      if (!route || route.coordinates.length < 2) continue;

      const prog = this.progress.get(vehicle.id);
      if (!prog) continue;

      // Calculate distance to move (in degrees, approximation)
      const speedFactor = vehicle.status === 'delayed' ? 0.4 : 1.0;
      const speedKmh = this.baseSpeedKmh * speedFactor * (0.8 + Math.random() * 0.4);
      const distanceKm = (speedKmh * deltaMs) / 3600000;

      // Advance along route
      this.advanceVehicle(vehicle, route, prog, distanceKm);
    }

    return {
      vehicles: [...this.vehicles],
      routes: this.routes.map((r) => ({
        ...r,
        progress: this.progress.get(r.vehicleId)?.routeProgress ?? r.progress,
      })),
    };
  }

  /**
   * Get current simulation state without advancing.
   */
  getState(): SimulationState {
    return {
      vehicles: [...this.vehicles],
      routes: this.routes.map((r) => ({
        ...r,
        progress: this.progress.get(r.vehicleId)?.routeProgress ?? r.progress,
      })),
    };
  }

  private initProgress(): void {
    for (const vehicle of this.vehicles) {
      const route = this.routes.find((r) => r.vehicleId === vehicle.id);
      if (!route) continue;

      this.progress.set(vehicle.id, {
        routeProgress: route.progress,
        segmentIndex: Math.floor(route.progress * (route.coordinates.length - 1)),
        segmentT: 0,
        speed: this.baseSpeedKmh,
        direction: 1,
      });
    }
  }

  private advanceVehicle(
    vehicle: VehicleData,
    route: RouteData,
    prog: VehicleProgress,
    distanceKm: number
  ): void {
    const coords = route.coordinates;
    const totalSegments = coords.length - 1;
    if (totalSegments < 1) return;

    // Convert routeProgress to position
    let currentPos = prog.routeProgress * totalSegments;
    const segmentAdvance = distanceKm / this.estimateSegmentLengthKm(coords);

    currentPos += segmentAdvance * prog.direction;

    // Loop: reverse direction at ends
    if (currentPos >= totalSegments) {
      currentPos = totalSegments - (currentPos - totalSegments);
      prog.direction = -1;
    } else if (currentPos <= 0) {
      currentPos = -currentPos;
      prog.direction = 1;
    }

    currentPos = Math.max(0, Math.min(totalSegments, currentPos));
    prog.routeProgress = currentPos / totalSegments;

    // Interpolate position
    const segIdx = Math.min(Math.floor(currentPos), totalSegments - 1);
    const t = currentPos - segIdx;
    const from = coords[segIdx];
    const to = coords[segIdx + 1] ?? coords[segIdx];

    const [lng, lat] = interpolateCoord(from, to, t);
    vehicle.lat = lat;
    vehicle.lng = lng;
    vehicle.bearing = bearing(from, to);
    vehicle.speed = prog.speed * (vehicle.status === 'delayed' ? 0.4 : 1.0);
  }

  private estimateSegmentLengthKm(coords: [number, number][]): number {
    if (coords.length < 2) return 1;
    const totalM = coords.reduce((sum, c, i) => {
      if (i === 0) return 0;
      return sum + distanceMeters(coords[i - 1], c);
    }, 0);
    return Math.max(0.1, totalM / 1000 / (coords.length - 1));
  }
}
