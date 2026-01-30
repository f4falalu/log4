/**
 * DemoDataEngine.ts — Top-level simulation engine.
 *
 * Orchestrates:
 * - Vehicle movement along routes
 * - Alert generation
 * - Forensic snapshot recording
 *
 * Provides a single tick() interface for the demo UI.
 */

import { MovementEngine, type SimulationState } from './simulator/movementEngine';
import { DEMO_VEHICLES } from './kano/vehicles';
import { DEMO_FACILITIES } from './kano/facilities';
import { DEMO_WAREHOUSES } from './kano/warehouses';
import { DEMO_ROUTES } from './kano/routes';
import { getDemoZones, getDemoZoneTags } from './kano/zones';
import type { VehicleData } from '../layers/VehicleLayer';
import type { FacilityData } from '../layers/FacilityLayer';
import type { WarehouseData } from '../layers/WarehouseLayer';
import type { RouteData } from '../layers/RouteLayer';
import type { AlertData } from '../layers/AlertLayer';
import type { Zone } from '../contracts/Zone';
import type { ZoneTag } from '../contracts/ZoneTag';
import { StateReplay, type TemporalSnapshot, type InterpolatablePosition } from '../forensic/StateReplay';

export interface DemoState {
  vehicles: VehicleData[];
  routes: RouteData[];
  facilities: FacilityData[];
  warehouses: WarehouseData[];
  alerts: AlertData[];
  zones: Zone[];
  zoneTags: ZoneTag[];
}

export class DemoDataEngine {
  private movementEngine: MovementEngine;
  private facilities: FacilityData[];
  private warehouses: WarehouseData[];
  private zones: Zone[];
  private zoneTags: ZoneTag[];
  private alerts: AlertData[] = [];
  private tickCount = 0;
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(state: DemoState) => void>();

  // Forensic replay recording
  private vehicleReplay = new Map<string, StateReplay<InterpolatablePosition>>();
  private recordingStartTime: number;

  constructor() {
    this.movementEngine = new MovementEngine([...DEMO_VEHICLES], [...DEMO_ROUTES]);
    this.facilities = [...DEMO_FACILITIES];
    this.warehouses = [...DEMO_WAREHOUSES];
    this.zones = getDemoZones();
    this.zoneTags = getDemoZoneTags();
    this.recordingStartTime = Date.now();
    this.initAlerts();
    this.initReplay();
  }

  /**
   * Start the simulation loop.
   */
  start(tickIntervalMs = 100): void {
    if (this.running) return;
    this.running = true;

    this.intervalId = setInterval(() => {
      this.tick(tickIntervalMs);
    }, tickIntervalMs);
  }

  /**
   * Stop the simulation.
   */
  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Advance one tick manually.
   */
  tick(deltaMs: number): void {
    this.tickCount++;
    const simState = this.movementEngine.tick(deltaMs);
    this.updateAlerts();
    this.recordSnapshots(simState);
    this.emit(simState);
  }

  /**
   * Get current state without advancing.
   */
  getState(): DemoState {
    const simState = this.movementEngine.getState();
    return {
      vehicles: simState.vehicles,
      routes: simState.routes,
      facilities: this.facilities,
      warehouses: this.warehouses,
      alerts: this.alerts,
      zones: this.zones,
      zoneTags: this.zoneTags,
    };
  }

  /**
   * Get replay data for forensic mode.
   */
  getVehicleReplay(): Map<string, StateReplay<InterpolatablePosition>> {
    return this.vehicleReplay;
  }

  /**
   * Get replay time bounds.
   */
  getReplayBounds(): { start: Date; end: Date } {
    return {
      start: new Date(this.recordingStartTime),
      end: new Date(),
    };
  }

  /**
   * Subscribe to state changes.
   */
  subscribe(listener: (state: DemoState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Destroy and release resources.
   */
  destroy(): void {
    this.stop();
    this.listeners.clear();
  }

  private initAlerts(): void {
    this.alerts = [
      {
        id: 'alert-001',
        lat: 12.015,
        lng: 8.525,
        severity: 'high',
        message: 'Vehicle KN-TRUCK-02 delayed in congestion',
        active: true,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'alert-002',
        lat: 11.985,
        lng: 8.535,
        severity: 'medium',
        message: 'Route deviation detected: KN-VAN-02',
        active: true,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'alert-003',
        lat: 12.025,
        lng: 8.530,
        severity: 'low',
        message: 'Approaching restricted zone',
        active: false,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  private initReplay(): void {
    for (const vehicle of DEMO_VEHICLES) {
      this.vehicleReplay.set(vehicle.id, new StateReplay());
    }
  }

  private recordSnapshots(simState: SimulationState): void {
    const now = new Date();
    for (const vehicle of simState.vehicles) {
      const replay = this.vehicleReplay.get(vehicle.id);
      if (replay) {
        replay.addSnapshot(now, {
          lat: vehicle.lat,
          lng: vehicle.lng,
          bearing: vehicle.bearing,
        });
      }
    }
  }

  private updateAlerts(): void {
    // Occasionally toggle alert states for demo
    if (this.tickCount % 50 === 0) {
      const idx = this.tickCount % this.alerts.length;
      this.alerts[idx] = {
        ...this.alerts[idx],
        active: !this.alerts[idx].active,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private emit(simState: SimulationState): void {
    const state: DemoState = {
      vehicles: simState.vehicles,
      routes: simState.routes,
      facilities: this.facilities,
      warehouses: this.warehouses,
      alerts: this.alerts,
      zones: this.zones,
      zoneTags: this.zoneTags,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('[DemoDataEngine] Listener error:', error);
      }
    });
  }
}
