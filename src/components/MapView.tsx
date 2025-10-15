import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Facility, Warehouse, RouteOptimization, DeliveryBatch } from '@/types';
import { useDrivers } from '@/hooks/useDrivers';
import { LeafletMapCore } from './map/LeafletMapCore';
import { MapIcons } from '@/lib/mapIcons';
import { MapUtils } from '@/lib/mapUtils';
import { MAP_CONFIG } from '@/lib/mapConfig';

interface MapViewProps {
  facilities: Facility[];
  warehouses?: Warehouse[];
  routes?: RouteOptimization[];
  batches?: DeliveryBatch[];
  selectedBatchId?: string | null;
  center?: [number, number];
  zoom?: number;
}

const MapView = ({ 
  facilities, 
  warehouses = [], 
  routes = [], 
  batches = [], 
  selectedBatchId = null,
  center = MAP_CONFIG.defaultCenter, 
  zoom = MAP_CONFIG.defaultZoom 
}: MapViewProps) => {
  const { data: drivers = [] } = useDrivers();
  const [map, setMap] = useState<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLinesRef = useRef<L.Polyline[]>([]);

  // Filter valid facilities
  const validFacilities = useMemo(() => {
    return facilities.filter(facility => {
      const hasValidCoords = facility.lat && facility.lng && 
        !isNaN(facility.lat) && !isNaN(facility.lng) &&
        facility.lat >= -90 && facility.lat <= 90 &&
        facility.lng >= -180 && facility.lng <= 180;
      
      if (!hasValidCoords) {
        console.warn(`Invalid coordinates for facility ${facility.id}:`, facility.lat, facility.lng);
      }
      return hasValidCoords;
    });
  }, [facilities]);

  // Handle map ready
  const handleMapReady = (mapInstance: L.Map) => {
    console.log('[MapView] Map ready');
    setMap(mapInstance);
    
    // Add custom reset control
    const ResetControl = MapUtils.createResetControl(
      mapInstance,
      () => markersRef.current,
      { center, zoom }
    );
    mapInstance.addControl(new ResetControl());
    
    MapUtils.safeInvalidateSize(mapInstance);
  };

  // Update markers and routes when data changes
  useEffect(() => {
    if (!map) return;

    // Clear existing markers and routes
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    routeLinesRef.current.forEach(line => {
      map.removeLayer(line);
    });
    markersRef.current = [];
    routeLinesRef.current = [];

    // Add warehouse markers
    warehouses.forEach(warehouse => {
      const marker = L.marker([warehouse.lat, warehouse.lng], { icon: MapIcons.warehouse() });
      
      const popupContent = `
        <div style="padding: 8px;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">🏭 ${warehouse.name}</div>
            <span style="display: inline-block; padding: 2px 8px; background-color: hsl(195 100% 28%); color: white; border-radius: 4px; font-size: 12px;">
              ${warehouse.type.toUpperCase()} WAREHOUSE
            </span>
          </div>
          
          <div style="font-size: 14px; color: #64748b;">
            <div style="margin-bottom: 4px;">📍 ${warehouse.address}</div>
            <div style="margin-bottom: 4px;">📦 Capacity: ${warehouse.capacity.toLocaleString()}</div>
            <div style="margin-bottom: 4px;">🕒 ${warehouse.operatingHours}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Add driver position markers
    drivers.forEach(driver => {
      if (!driver.currentLocation) return;

      // Check if driver is assigned to an in-progress batch
      const driverBatch = batches.find(b => b.driverId === driver.id && b.status === 'in-progress');
      const isActive = !!driverBatch;
      
      // Get driver initials
      const initials = driver.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      
      const driverIcon = MapIcons.driver(driver.status, initials, isActive);
      const marker = L.marker([driver.currentLocation.lat, driver.currentLocation.lng], { icon: driverIcon });
      
      const popupContent = `
        <div style="padding: 8px;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">👤 ${driver.name}</div>
            <div style="display: flex; gap: 4px;">
              <span style="display: inline-block; padding: 2px 8px; background-color: ${
                driver.status === 'available' ? '#22c55e' : 
                driver.status === 'busy' ? '#f59e0b' : '#64748b'
              }; color: white; border-radius: 4px; font-size: 12px;">
                ${driver.status.toUpperCase()}
              </span>
              <span style="display: inline-block; padding: 2px 8px; background-color: #f1f5f9; color: #475569; border-radius: 4px; font-size: 12px;">
                ${driver.licenseType.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div style="font-size: 14px; color: #64748b;">
            <div style="margin-bottom: 4px;">📞 ${driver.phone}</div>
            <div style="margin-bottom: 4px;">🕒 Shift: ${driver.shiftStart} - ${driver.shiftEnd}</div>
            ${driverBatch ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <div style="font-weight: 500; color: #22c55e;">🚛 Active Delivery</div>
              <div>${driverBatch.name}</div>
            </div>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });
      marker.addTo(map);
      markersRef.current.push(marker);

      // If driver is active, draw dashed line to next destination
      if (isActive && driverBatch) {
        const nextFacility = driverBatch.facilities[0]; // Simplified: first facility
        if (nextFacility) {
          const dashedLine = L.polyline(
            [[driver.currentLocation.lat, driver.currentLocation.lng], [nextFacility.lat, nextFacility.lng]],
            {
              color: '#22c55e',
              weight: 2,
              opacity: 0.6,
            dashArray: '5, 10'
            }
          );
          dashedLine.addTo(map);
          routeLinesRef.current.push(dashedLine);
        }
      }
    });

    // Add facility markers
    validFacilities.forEach(facility => {
      const marker = L.marker([facility.lat, facility.lng], { icon: MapIcons.facility() });
      
      const popupContent = `
        <div style="padding: 8px;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${facility.name}</div>
            <span style="display: inline-block; padding: 2px 8px; background-color: #f1f5f9; color: #475569; border-radius: 4px; font-size: 12px;">
              ${facility.type}
            </span>
          </div>
          
          <div style="font-size: 14px; color: #64748b;">
            <div style="margin-bottom: 4px;">📍 ${facility.address}</div>
            ${facility.phone ? `<div style="margin-bottom: 4px;">📞 ${facility.phone}</div>` : ''}
            ${facility.contactPerson ? `<div style="margin-bottom: 4px;">👤 ${facility.contactPerson}</div>` : ''}
            ${facility.operatingHours ? `<div style="margin-bottom: 4px;">🕒 ${facility.operatingHours}</div>` : ''}
            ${facility.capacity ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-weight: 500;">Capacity: ${facility.capacity}</div>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Add route lines
    routes.forEach((route, index) => {
      if (route.facilities.length === 0) return;

      const warehouse = warehouses.find(w => w.id === route.warehouseId);
      if (!warehouse) return;

      // Create route path: warehouse -> facilities
      const routeCoords: [number, number][] = [[warehouse.lat, warehouse.lng]];
      route.facilities.forEach(facility => {
        routeCoords.push([facility.lat, facility.lng]);
      });

      // Different colors for different routes
      const colors = ['hsl(195 100% 28%)', 'hsl(180 100% 25%)', 'hsl(140 60% 40%)'];
      const color = colors[index % colors.length];

      const polyline = L.polyline(routeCoords, {
        color: color,
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 10'
      });

      polyline.addTo(map);
      routeLinesRef.current.push(polyline);
    });

    // Fit bounds to include all markers
    MapUtils.fitBoundsToMarkers(map, markersRef.current);

    // Add batch route lines (with focus mode styling)
    batches.forEach((batch, index) => {
      if (batch.facilities.length === 0 || batch.status === 'cancelled') return;

      const warehouse = warehouses.find(w => w.id === batch.warehouseId);
      if (!warehouse) return;

      const isSelected = selectedBatchId === batch.id;
      const hasSelection = selectedBatchId !== null;

      // Use optimized route if available, otherwise create simple route
      let routeCoords: [number, number][];
      if (batch.optimizedRoute && batch.optimizedRoute.length > 0) {
        routeCoords = batch.optimizedRoute;
      } else {
        routeCoords = [[warehouse.lat, warehouse.lng]];
        batch.facilities.forEach(facility => {
          routeCoords.push([facility.lat, facility.lng]);
        });
      }

      // Different styling based on batch status and selection state
      let color = '#8b5cf6'; // default purple
      let weight = 4;
      let dashArray = undefined;
      let opacity = 0.9;

      switch (batch.status) {
        case 'planned':
          color = '#6b7280'; // gray
          dashArray = '15, 15';
          break;
        case 'assigned':
          color = '#f59e0b'; // amber
          dashArray = '10, 5';
          break;
        case 'in-progress':
          color = '#10b981'; // emerald
          weight = 5;
          break;
        case 'completed':
          color = '#059669'; // green
          weight = 3;
          dashArray = '5, 5';
          break;
      }

      // Apply selection styling
      if (hasSelection) {
        if (isSelected) {
          weight = weight + 2;
          opacity = 1.0;
        } else {
          opacity = 0.3;
          weight = weight - 1;
        }
      }

      const batchPolyline = L.polyline(routeCoords, {
        color: color,
        weight: weight,
        opacity: opacity,
        dashArray: dashArray
      });

      // Add popup with batch info
      const popupContent = `
        <div style="padding: 8px;">
          <div style="font-weight: 600; margin-bottom: 4px;">📦 ${batch.name}</div>
          <div style="font-size: 12px; margin-bottom: 8px;">
            <span style="padding: 2px 6px; background-color: ${color}; color: white; border-radius: 3px;">
              ${batch.status.toUpperCase()}
            </span>
            <span style="padding: 2px 6px; background-color: #f1f5f9; color: #475569; border-radius: 3px; margin-left: 4px;">
              ${batch.priority.toUpperCase()}
            </span>
          </div>
          <div style="font-size: 13px; color: #64748b;">
            <div>📍 ${batch.facilities.length} facilities</div>
            <div>🛣️ ${batch.totalDistance}km</div>
            <div>⏱️ ${Math.round(batch.estimatedDuration)}min</div>
            <div>💊 ${batch.medicationType}</div>
            ${batch.driverId ? `<div>👤 Assigned driver</div>` : ''}
          </div>
        </div>
      `;

      batchPolyline.bindPopup(popupContent, { maxWidth: 250 });
      batchPolyline.addTo(map);
      routeLinesRef.current.push(batchPolyline);
    });

    // Auto-zoom to selected batch if exists
    if (selectedBatchId && map) {
      const selectedBatch = batches.find(b => b.id === selectedBatchId);
      if (selectedBatch && selectedBatch.facilities.length > 0) {
        const warehouse = warehouses.find(w => w.id === selectedBatch.warehouseId);
        if (warehouse) {
          try {
            const bounds = L.latLngBounds([
              [warehouse.lat, warehouse.lng],
              ...selectedBatch.facilities.map(f => [f.lat, f.lng] as [number, number])
            ]);
            if (bounds.isValid()) {
              requestAnimationFrame(() => {
                map.fitBounds(bounds.pad(0.2));
              });
            }
          } catch (error) {
            console.error('[MapView] Error fitting bounds to selected batch:', error);
          }
        }
      }
    }

    console.log(`Added ${validFacilities.length} facility markers, ${warehouses.length} warehouse markers, ${routes.length} routes, and ${batches.length} batch routes`);
  }, [map, validFacilities, warehouses, routes, batches, selectedBatchId]);

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-card border">
      <LeafletMapCore
        center={center}
        zoom={zoom}
        tileProvider="standard"
        showLayerSwitcher={true}
        showScaleControl={true}
        className="h-full w-full"
        onReady={handleMapReady}
      />
    </div>
  );
};

export default MapView;