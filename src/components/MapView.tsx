import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Facility, Warehouse, RouteOptimization, DeliveryBatch } from '@/types';
import { useDrivers } from '@/hooks/useDrivers';

// Fix for default marker icons in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Setup icons outside component to prevent re-initialization
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const facilityIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create a custom warehouse icon (larger, different color)
const warehouseIcon = L.divIcon({
  html: `
    <div style="
      background-color: hsl(195 100% 28%);
      border: 3px solid hsl(0 0% 100%);
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px -2px hsl(195 100% 28% / 0.3);
    ">
      <div style="
        background-color: hsl(0 0% 100%);
        width: 8px;
        height: 8px;
        border-radius: 50%;
      "></div>
    </div>
  `,
  className: 'warehouse-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

// Create driver marker icon generator
const createDriverIcon = (initials: string, status: 'available' | 'busy' | 'offline', isActive: boolean) => {
  const statusColors = {
    available: 'hsl(142 76% 36%)',
    busy: 'hsl(38 92% 50%)',
    offline: 'hsl(240 3.8% 46.1%)'
  };
  
  const bgColor = statusColors[status];
  const pulseAnimation = isActive ? `
    @keyframes pulse-driver {
      0%, 100% { box-shadow: 0 0 0 0 ${bgColor}80; }
      50% { box-shadow: 0 0 0 8px ${bgColor}00; }
    }
  ` : '';
  
  return L.divIcon({
    html: `
      <style>${pulseAnimation}</style>
      <div style="
        background-color: ${bgColor};
        border: 3px solid hsl(0 0% 100%);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px -2px ${bgColor}80;
        font-weight: 600;
        color: white;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ${isActive ? `animation: pulse-driver 2s infinite;` : ''}
      ">
        ${initials}
      </div>
    `,
    className: 'driver-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

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
  center = [12.0, 8.5], 
  zoom = 6 
}: MapViewProps) => {
  const { data: drivers = [] } = useDrivers();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
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

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('Initializing Leaflet map');
    
    try {
      const map = L.map(mapRef.current, {
        zoomControl: false // We'll add custom controls
      }).setView(center, zoom);
      
      // Define multiple tile layers
      const humanitarianOSM = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>',
        maxZoom: 19
      });

      const standardOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      });

      const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      });

      const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      });

      // Add default layer (Humanitarian OSM - best for medical facilities)
      humanitarianOSM.addTo(map);

      // Layer control
      const baseMaps = {
        "Humanitarian (Recommended)": humanitarianOSM,
        "Standard": standardOSM,
        "Light": cartoLight,
        "Dark": cartoDark
      };

      L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map);

      // Add zoom control to bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add scale control
      L.control.scale({ 
        position: 'bottomleft',
        metric: true,
        imperial: false
      }).addTo(map);

      // Add custom reset view button
      const resetControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          container.innerHTML = '<a href="#" title="Reset View" style="width: 30px; height: 30px; line-height: 30px; display: flex; align-items: center; justify-content: center; font-size: 18px; text-decoration: none; background: white; color: #333;">↻</a>';
          container.onclick = (e) => {
            e.preventDefault();
            if (markersRef.current.length > 0) {
              const group = new L.FeatureGroup(markersRef.current);
              map.fitBounds(group.getBounds().pad(0.1));
            } else {
              map.setView(center, zoom);
            }
          };
          return container;
        }
      });
      map.addControl(new resetControl());

      mapInstanceRef.current = map;
      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (mapInstanceRef.current) {
        console.log('Cleaning up map');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom]);

  // Update markers and routes when data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers and routes
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    routeLinesRef.current.forEach(line => {
      mapInstanceRef.current?.removeLayer(line);
    });
    markersRef.current = [];
    routeLinesRef.current = [];

    // Add warehouse markers
    warehouses.forEach(warehouse => {
      if (!mapInstanceRef.current) return;

      const marker = L.marker([warehouse.lat, warehouse.lng], { icon: warehouseIcon });
      
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
      marker.addTo(mapInstanceRef.current);
      markersRef.current.push(marker);
    });

    // Add driver position markers
    drivers.forEach(driver => {
      if (!mapInstanceRef.current || !driver.currentLocation) return;

      // Check if driver is assigned to an in-progress batch
      const driverBatch = batches.find(b => b.driverId === driver.id && b.status === 'in-progress');
      const isActive = !!driverBatch;
      
      // Get driver initials
      const initials = driver.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      
      const driverIcon = createDriverIcon(initials, driver.status, isActive);
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
      marker.addTo(mapInstanceRef.current);
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
          dashedLine.addTo(mapInstanceRef.current);
          routeLinesRef.current.push(dashedLine);
        }
      }
    });

    // Add facility markers
    validFacilities.forEach(facility => {
      if (!mapInstanceRef.current) return;

      const marker = L.marker([facility.lat, facility.lng], { icon: facilityIcon });
      
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
      marker.addTo(mapInstanceRef.current);
      markersRef.current.push(marker);
    });

    // Add route lines
    routes.forEach((route, index) => {
      if (!mapInstanceRef.current || route.facilities.length === 0) return;

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

      polyline.addTo(mapInstanceRef.current);
      routeLinesRef.current.push(polyline);
    });

    // Fit bounds to include all markers
    const allMarkers = [...markersRef.current];
    if (allMarkers.length > 0) {
      const group = new L.FeatureGroup(allMarkers);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }

    // Add batch route lines (with focus mode styling)
    batches.forEach((batch, index) => {
      if (!mapInstanceRef.current || batch.facilities.length === 0 || batch.status === 'cancelled') return;

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
      batchPolyline.addTo(mapInstanceRef.current);
      routeLinesRef.current.push(batchPolyline);
    });

    // Auto-zoom to selected batch if exists
    if (selectedBatchId && mapInstanceRef.current) {
      const selectedBatch = batches.find(b => b.id === selectedBatchId);
      if (selectedBatch && selectedBatch.facilities.length > 0) {
        const warehouse = warehouses.find(w => w.id === selectedBatch.warehouseId);
        if (warehouse) {
          const bounds = L.latLngBounds([
            [warehouse.lat, warehouse.lng],
            ...selectedBatch.facilities.map(f => [f.lat, f.lng] as [number, number])
          ]);
          mapInstanceRef.current.fitBounds(bounds.pad(0.2));
        }
      }
    }

    console.log(`Added ${validFacilities.length} facility markers, ${warehouses.length} warehouse markers, ${routes.length} routes, and ${batches.length} batch routes`);
  }, [validFacilities, warehouses, routes, batches, selectedBatchId]);

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-card border">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
};

export default MapView;