/**
 * OperationalMapLibre.tsx
 *
 * MapLibre-based Operational Map implementation - Thin Client Pattern
 * Uses MapRuntime singleton to eliminate lifecycle bugs
 * Theme-aware basemap integration
 */

import { useRef, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import { mapRuntime } from '@/map/runtime/MapRuntime';
import { RepresentationToggle, useRepresentationMode } from './RepresentationToggle';
import { MapControls } from './MapControls';
import { TradeOffApprovalList, type Handoff } from './TradeOffApproval';
import { MapLoadingSkeleton } from './MapLoadingSkeleton';
import { LayerControl, type FocusMode } from './ui/LayerControl';
import { ThemeToggle } from './ui/ThemeToggle';
import { KPIRibbon } from './ui/KPIRibbon';
import { VehicleContextPanel } from './ui/VehicleContextPanel';
import { WarehouseInfoCard } from './ui/WarehouseInfoCard';
import { FacilityInfoCard } from './ui/FacilityInfoCard';
import { DriverInfoCard } from './ui/DriverInfoCard';
import { ExpandableFilterPanel, type FilterState } from './ui/ExpandableFilterPanel';
import { ControlRail } from './ui/ControlRail';
import { useDebouncedMapData } from '@/hooks/useDebouncedMapData';
import { getMapLibreStyle } from '@/lib/mapConfig';
import { AlertCircle, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { Vehicle, Driver, Route, DeliveryBatch, Warehouse, Facility } from '@/types';
import type { Alert } from '@/map/layers/AlertSymbolLayer';

/**
 * Operational Map Props
 */
export interface OperationalMapLibreProps {
  /** Vehicles to display */
  vehicles?: Vehicle[];

  /** Drivers to display */
  drivers?: Driver[];

  /** Routes to display */
  routes?: Route[];

  /** Alerts to display */
  alerts?: Alert[];

  /** Delivery batches (in-progress only) */
  batches?: DeliveryBatch[];

  /** Pending handoffs (system-proposed trade-offs) */
  pendingHandoffs?: Handoff[];

  /** Initial center [lng, lat] */
  center?: [number, number];

  /** Initial zoom level */
  zoom?: number;

  /** Entity click handlers */
  onVehicleClick?: (vehicle: Vehicle) => void;
  onDriverClick?: (driver: Driver) => void;
  onRouteClick?: (route: Route) => void;
  onAlertClick?: (alert: Alert) => void;
  onBatchClick?: (batch: DeliveryBatch) => void;

  /** Trade-off workflow handlers */
  onHandoffApprove?: (handoffId: string) => Promise<void>;
  onHandoffReject?: (handoffId: string, reason: string) => Promise<void>;
  onHandoffViewOnMap?: (handoff: Handoff) => void;

  /** Height className (default: h-screen) */
  height?: string;
}

/**
 * Operational Map Component - Thin Client
 *
 * ARCHITECTURE:
 * - React NEVER calls MapLibre APIs directly
 * - MapRuntime owns map instance, layers, sources
 * - React only sends commands to MapRuntime
 * - No lifecycle bugs, no infinite loops, hot reload safe
 */
export function OperationalMapLibre({
  vehicles = [],
  drivers = [],
  routes = [],
  alerts = [],
  batches = [],
  pendingHandoffs = [],
  center = [8.6753, 9.082], // Nigeria center
  zoom = 6,
  onVehicleClick,
  onDriverClick,
  onRouteClick,
  onAlertClick,
  onBatchClick,
  onHandoffApprove,
  onHandoffReject,
  onHandoffViewOnMap,
  height = 'h-screen',
}: OperationalMapLibreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [handoffsSheetOpen, setHandoffsSheetOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState({
    trails: true,
    routes: true,
    facilities: true,  // All layers visible by default
    warehouses: true,  // Reduction is by choice
  });
  const [focusMode, setFocusMode] = useState<FocusMode>({
    onlySelected: false,
    onlyIssues: false,
  });
  const { theme } = useTheme();

  const { mode, setMode } = useRepresentationMode('entity-rich');

  // Debounce data updates for better performance
  const debouncedVehicles = useDebouncedMapData(vehicles, { delay: 300, maxWait: 1000 });
  const debouncedDrivers = useDebouncedMapData(drivers, { delay: 300, maxWait: 1000 });
  const debouncedRoutes = useDebouncedMapData(routes, { delay: 500, maxWait: 1500 });
  const debouncedAlerts = useDebouncedMapData(alerts, { delay: 200, maxWait: 800 });
  const debouncedBatches = useDebouncedMapData(batches, { delay: 500, maxWait: 1500 });

  /**
   * Initialize MapRuntime once on mount
   * Uses theme-aware basemap style
   */
  useEffect(() => {
    if (!containerRef.current) return;

    mapRuntime.init(
      containerRef.current,
      {
        context: 'operational',
        style: getMapLibreStyle(theme as 'light' | 'dark' | 'system' | undefined),
        center,
        zoom,
        minZoom: 0,
        maxZoom: 22,
      },
      {
        onVehicleClick: (vehicle: any) => {
          // Close other entity panels
          setSelectedWarehouse(null);
          setSelectedFacility(null);
          setSelectedDriver(null);

          setSelectedVehicleId(vehicle.id);
          setSelectedVehicle(vehicle);

          // Recenter map on selected vehicle
          const map = mapRuntime.getMap();
          if (map && vehicle.current_location) {
            map.panTo([vehicle.current_location.lng, vehicle.current_location.lat], {
              duration: 500,
            });
          }

          if (onVehicleClick) {
            onVehicleClick(vehicle);
          }
        },
        onDriverClick: (driver: any) => {
          // Close other entity panels
          setSelectedVehicle(null);
          setSelectedVehicleId(null);
          setSelectedWarehouse(null);
          setSelectedFacility(null);

          setSelectedDriver(driver);

          if (onDriverClick) {
            onDriverClick(driver);
          }
        },
        onRouteClick: (route: any) => {
          if (onRouteClick) {
            onRouteClick(route);
          }
        },
        onAlertClick: (alert: any) => {
          if (onAlertClick) {
            onAlertClick(alert);
          }
        },
        onBatchClick: (batch: any) => {
          if (onBatchClick) {
            onBatchClick(batch);
          }
        },
        onFacilityClick: (facility: any) => {
          // Close other entity panels
          setSelectedVehicle(null);
          setSelectedVehicleId(null);
          setSelectedWarehouse(null);
          setSelectedDriver(null);

          setSelectedFacility(facility);

          // Recenter map on facility
          const map = mapRuntime.getMap();
          if (map && facility.lat && facility.lng) {
            map.panTo([facility.lng, facility.lat], {
              duration: 500,
            });
          }
        },
        onWarehouseClick: (warehouse: any) => {
          // Close other entity panels
          setSelectedVehicle(null);
          setSelectedVehicleId(null);
          setSelectedFacility(null);
          setSelectedDriver(null);

          setSelectedWarehouse(warehouse);

          // Recenter map on warehouse
          const map = mapRuntime.getMap();
          if (map && warehouse.lat && warehouse.lng) {
            map.panTo([warehouse.lng, warehouse.lat], {
              duration: 500,
            });
          }
        },
      }
    );

    // Wait for map to actually load before enabling interactions
    const checkInitialized = setInterval(() => {
      const map = mapRuntime.getMap();
      if (map && map.loaded()) {
        setIsLoading(false);
        clearInterval(checkInitialized);
      }
    }, 100);

    return () => clearInterval(checkInitialized);
  }, []); // Empty deps - init once

  /**
   * Mode changes = simple command to MapRuntime
   */
  useEffect(() => {
    if (isLoading) return;
    mapRuntime.setMode(mode);
  }, [mode, isLoading]);

  /**
   * Data updates = centralized update to MapRuntime
   */
  useEffect(() => {
    if (isLoading) return;

    mapRuntime.update({
      vehicles: debouncedVehicles,
      drivers: debouncedDrivers,
      routes: debouncedRoutes,
      alerts: debouncedAlerts,
      batches: debouncedBatches,
    });
  }, [debouncedVehicles, debouncedDrivers, debouncedRoutes, debouncedAlerts, debouncedBatches, isLoading]);

  /**
   * Focus mode changes = apply opacity filters
   */
  useEffect(() => {
    if (isLoading) return;

    mapRuntime.applyFocusMode({
      onlySelected: focusMode.onlySelected,
      onlyIssues: focusMode.onlyIssues,
      selectedVehicleId,
    });
  }, [focusMode, selectedVehicleId, isLoading]);

  /**
   * Map controls - now operate on MapRuntime's map instance
   */
  const handleZoomIn = () => {
    const map = mapRuntime.getMap();
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    const map = mapRuntime.getMap();
    if (map) map.zoomOut();
  };

  const handleResetBearing = () => {
    const map = mapRuntime.getMap();
    if (map) map.resetNorth();
  };

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const map = mapRuntime.getMap();
        if (map) {
          map.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 14,
          });
        }
      });
    }
  };

  const handleToggleLayer = (layer: string) => {
    const newVisibility = !layerVisibility[layer as keyof typeof layerVisibility];
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: newVisibility,
    }));
    // Call MapRuntime to actually toggle the layer
    mapRuntime.toggleLayerVisibility(layer, newVisibility);
  };

  /**
   * Calculate active alert count
   */
  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;

  /**
   * Calculate KPI stats
   */
  const kpiStats = {
    activeVehicles: vehicles.filter((v) => v.status === 'available' || v.status === 'en_route').length,
    inProgress: batches.filter((b) => b.status === 'in_progress').length,
    completed: batches.filter((b) => b.status === 'completed').length,
    alerts: activeAlertCount,
    onTimePercentage: 95, // TODO: Calculate from actual data
  };

  return (
    <div className={`map-shell relative ${height} w-full overflow-hidden`}>
      {/* Map canvas - MapRuntime owns the map instance */}
      <div ref={containerRef} className="map-canvas absolute inset-0 z-0" />

      {/* Loading skeleton */}
      {isLoading && (
        <MapLoadingSkeleton
          stage="data"
          message={`Loading ${vehicles.length + drivers.length + batches.length} entities...`}
        />
      )}

      {/* Map Controls - Anchored to canvas */}
      {!isLoading && (
        <>
          {/* Left Control Rail (64px vertical sidebar) */}
          <ControlRail
            onFilterClick={() => setFilterPanelOpen(true)}
            onLocateClick={handleLocate}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            layerVisibility={layerVisibility}
            onToggleLayer={handleToggleLayer}
          />

          {/* Top-right controls (Theme Toggle) */}
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <ThemeToggle />
          </div>

          {/* KPI Ribbon - Top center */}
          <KPIRibbon
            activeVehicles={kpiStats.activeVehicles}
            inProgress={kpiStats.inProgress}
            completed={kpiStats.completed}
            alerts={kpiStats.alerts}
            onTimePercentage={kpiStats.onTimePercentage}
            isLoading={false}
          />

          {/* Trade-Off Approvals */}
          {pendingHandoffs.length > 0 && (
            <div className="absolute bottom-4 right-4 z-[1000]">
              <Sheet open={handoffsSheetOpen} onOpenChange={setHandoffsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="default" className="shadow-lg">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {pendingHandoffs.length} Pending Trade-Off{pendingHandoffs.length !== 1 ? 's' : ''}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>System-Proposed Trade-Offs</SheetTitle>
                    <SheetDescription>
                      Review and approve trade-offs proposed by the optimization system.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <TradeOffApprovalList
                      handoffs={pendingHandoffs}
                      onApprove={async (id) => {
                        if (onHandoffApprove) {
                          await onHandoffApprove(id);
                        }
                      }}
                      onReject={async (id, reason) => {
                        if (onHandoffReject) {
                          await onHandoffReject(id, reason);
                        }
                      }}
                      onViewOnMap={(handoff) => {
                        if (onHandoffViewOnMap) {
                          onHandoffViewOnMap(handoff);
                        }
                        setHandoffsSheetOpen(false);
                      }}
                      compact
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Entity counts (bottom-left) */}
          <div className="absolute bottom-4 left-4 z-[1000] flex gap-2">
            {vehicles.length > 0 && (
              <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                {vehicles.length} Vehicle{vehicles.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {drivers.length > 0 && (
              <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                {drivers.length} Driver{drivers.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {routes.length > 0 && (
              <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                {routes.length} Route{routes.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Expandable Filter Panel - Left side */}
          <ExpandableFilterPanel
            open={filterPanelOpen}
            onClose={() => setFilterPanelOpen(false)}
            onApply={(filters: FilterState) => {
              // Apply layer visibility
              setLayerVisibility({
                trails: filters.showTrails,
                routes: filters.showRoutes,
                facilities: filters.showFacilities,
                warehouses: filters.showWarehouses,
              });

              // Apply focus mode based on filters
              setFocusMode({
                onlySelected: filters.onlySelectedVehicle,
                onlyIssues: filters.onlyIssues,
              });

              // TODO: Apply vehicle state filters to MapRuntime
              console.log('[OperationalMap] Filters applied:', filters);
            }}
            initialFilters={{
              showTrails: layerVisibility.trails,
              showRoutes: layerVisibility.routes,
              showFacilities: layerVisibility.facilities,
              showWarehouses: layerVisibility.warehouses,
              onlySelectedVehicle: focusMode.onlySelected,
              onlyIssues: focusMode.onlyIssues,
            }}
          />

          {/* Entity Info Cards - Right side */}
          {selectedVehicle && (
            <VehicleContextPanel
              vehicle={selectedVehicle}
              onClose={() => {
                setSelectedVehicle(null);
                setSelectedVehicleId(null);
              }}
            />
          )}

          {selectedWarehouse && (
            <WarehouseInfoCard
              warehouse={selectedWarehouse}
              onClose={() => setSelectedWarehouse(null)}
            />
          )}

          {selectedFacility && (
            <FacilityInfoCard
              facility={selectedFacility}
              onClose={() => setSelectedFacility(null)}
            />
          )}

          {selectedDriver && (
            <DriverInfoCard
              driver={selectedDriver}
              onClose={() => setSelectedDriver(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
