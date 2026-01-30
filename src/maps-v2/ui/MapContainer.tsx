/**
 * MapContainer.tsx — Thin React wrapper for MapKernel.
 *
 * This is the ONLY React component that touches MapLibre.
 * It uses a ref to mount the kernel and useEffect for one-way data pushes.
 *
 * Axiom: React declares intent, MapKernel renders deterministically.
 * No feedback loops. No map callbacks mutating app state.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { MapKernel } from '../core/MapKernel';
import { CellStateEngine } from '../core/CellStateEngine';
import { H3HexagonLayer } from '../layers/H3HexagonLayer';
import { VehicleLayer } from '../layers/VehicleLayer';
import { RouteLayer } from '../layers/RouteLayer';
import { FacilityLayer } from '../layers/FacilityLayer';
import { WarehouseLayer } from '../layers/WarehouseLayer';
import { AlertLayer } from '../layers/AlertLayer';
import { ZoneLayer } from '../layers/ZoneLayer';
import { useMapStore } from '../store/mapStore';
import type { DemoState } from '../demo/DemoDataEngine';

interface MapContainerProps {
  onKernelReady?: (kernel: MapKernel) => void;
}

export function MapContainer({ onKernelReady }: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kernelRef = useRef<MapKernel | null>(null);
  const cellEngineRef = useRef<CellStateEngine>(new CellStateEngine());
  const layersRef = useRef<{
    h3: H3HexagonLayer;
    vehicle: VehicleLayer;
    route: RouteLayer;
    facility: FacilityLayer;
    warehouse: WarehouseLayer;
    alert: AlertLayer;
    zone: ZoneLayer;
  } | null>(null);

  // Track when the map style is fully loaded and layers are attached
  const [mapReady, setMapReady] = useState(false);

  const mode = useMapStore((s) => s.mode);
  const zones = useMapStore((s) => s.zones);
  const zoneTags = useMapStore((s) => s.zoneTags);
  const selectedH3Indexes = useMapStore((s) => s.selectedH3Indexes);
  const hoveredH3Index = useMapStore((s) => s.hoveredH3Index);

  // Mount kernel once
  useEffect(() => {
    if (!containerRef.current) return;

    const kernel = new MapKernel({
      onReady: () => {
        setMapReady(true);
        onKernelReady?.(kernel);
      },
    });

    kernel.init(containerRef.current);

    // Create layers
    const layers = {
      h3: new H3HexagonLayer(),
      vehicle: new VehicleLayer(),
      route: new RouteLayer(),
      facility: new FacilityLayer(),
      warehouse: new WarehouseLayer(),
      alert: new AlertLayer(),
      zone: new ZoneLayer(),
    };

    // Register all layers with kernel (they will be attached once style loads)
    kernel.registerLayer('h3-hexagon', layers.h3);
    kernel.registerLayer('vehicle', layers.vehicle);
    kernel.registerLayer('route', layers.route);
    kernel.registerLayer('facility', layers.facility);
    kernel.registerLayer('warehouse', layers.warehouse);
    kernel.registerLayer('alert', layers.alert);
    kernel.registerLayer('zone', layers.zone);

    kernelRef.current = kernel;
    layersRef.current = layers;

    return () => {
      kernel.destroy();
      kernelRef.current = null;
      layersRef.current = null;
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mode switch → recreate map with new style
  useEffect(() => {
    if (!kernelRef.current) return;
    setMapReady(false);
    kernelRef.current.setMode(mode);
  }, [mode]);

  // Update H3 layer when zones/tags/selection change (only when map is ready)
  useEffect(() => {
    if (!mapReady) return;
    const engine = cellEngineRef.current;
    const layers = layersRef.current;
    if (!layers) return;

    engine.setZones(zones);
    engine.setTags(zoneTags);

    const cellStates = engine.deriveAll();
    useMapStore.getState().setCellStates(cellStates);

    layers.h3.update({
      cells: cellStates,
      selectedIndexes: new Set(selectedH3Indexes),
      hoveredIndex: hoveredH3Index,
    });

    layers.zone.update(zones);
  }, [zones, zoneTags, selectedH3Indexes, hoveredH3Index, mapReady]);

  // Public method for demo engine to push data
  const pushDemoState = useCallback((state: DemoState) => {
    const layers = layersRef.current;
    if (!layers) return;
    // Layers guard against updates when not attached, so this is safe
    // even if called before map is ready
    layers.vehicle.update(state.vehicles);
    layers.route.update(state.routes);
    layers.facility.update(state.facilities);
    layers.warehouse.update(state.warehouses);
    layers.alert.update(state.alerts);
  }, []);

  // Expose pushDemoState via a ref attached to the container div
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).__pushDemoState = pushDemoState;
    }
  }, [pushDemoState]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
