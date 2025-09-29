import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Facility, Warehouse, DeliveryBatch } from '@/types';

// Fix for default marker icons in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Setup icons outside component
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Facility icons (selected vs unselected)
const unselectedFacilityIcon = L.divIcon({
  html: `
    <div style="
      background-color: hsl(215 25% 25%);
      border: 2px solid hsl(0 0% 100%);
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px -2px hsl(215 25% 25% / 0.4);
      cursor: pointer;
    ">
      <div style="
        background-color: hsl(0 0% 100%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
      "></div>
    </div>
  `,
  className: 'facility-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

const selectedFacilityIcon = L.divIcon({
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
      box-shadow: 0 2px 12px -2px hsl(195 100% 28% / 0.6);
      cursor: pointer;
      animation: pulse 2s infinite;
    ">
      <div style="
        background-color: hsl(0 0% 100%);
        width: 8px;
        height: 8px;
        border-radius: 50%;
      "></div>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    </style>
  `,
  className: 'facility-marker selected',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

// Warehouse icon
const warehouseIcon = L.divIcon({
  html: `
    <div style="
      background-color: hsl(140 60% 40%);
      border: 3px solid hsl(0 0% 100%);
      border-radius: 8px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px -4px hsl(140 60% 40% / 0.4);
    ">
      <div style="
        background-color: hsl(0 0% 100%);
        width: 8px;
        height: 8px;
        border-radius: 2px;
      "></div>
    </div>
  `,
  className: 'warehouse-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],  
  popupAnchor: [0, -12]
});

const createUnselectedWarehouseIcon = () => L.divIcon({
  html: `
    <div style="
      background-color: hsl(215 25% 25%);
      border: 3px solid hsl(0 0% 100%);
      border-radius: 8px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px -4px hsl(215 25% 25% / 0.4);
    ">
      <div style="
        background-color: hsl(0 0% 100%);
        width: 8px;
        height: 8px;
        border-radius: 2px;
      "></div>
    </div>
  `,
  className: 'warehouse-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],  
  popupAnchor: [0, -12]
});

// Route waypoint icons
const createWaypointIcon = (number: number) => L.divIcon({
  html: `
    <div style="
      background-color: hsl(195 100% 28%);
      border: 2px solid hsl(0 0% 100%);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px -2px hsl(195 100% 28% / 0.6);
      font-size: 12px;
      font-weight: bold;
      color: white;
    ">
      ${number}
    </div>
  `,
  className: 'waypoint-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

interface TacticalMapViewProps {
  facilities: Facility[];
  warehouses: Warehouse[];
  selectedFacilities: Facility[];
  selectedWarehouse?: Warehouse;
  optimizedRoute?: any;
  batches: DeliveryBatch[];
  onFacilityToggle: (facilityId: string) => void;
}

const TacticalMapView = ({ 
  facilities, 
  warehouses, 
  selectedFacilities, 
  selectedWarehouse, 
  optimizedRoute,
  batches,
  onFacilityToggle 
}: TacticalMapViewProps) => {
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
      return hasValidCoords;
    });
  }, [facilities]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapRef.current).setView([12.0, 8.5], 6);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    } catch (error) {
      console.error('Error initializing tactical map:', error);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

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

    const selectedFacilityIds = selectedFacilities.map(f => f.id);

    // Add warehouse markers
    warehouses.forEach(warehouse => {
      if (!mapInstanceRef.current) return;

      const isSelected = selectedWarehouse?.id === warehouse.id;
      const icon = isSelected ? warehouseIcon : createUnselectedWarehouseIcon();

      const marker = L.marker([warehouse.lat, warehouse.lng], { icon });
      
      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center;">
              🏭 ${warehouse.name}
              ${isSelected ? '<div style="margin-left: 8px; padding: 2px 6px; background-color: hsl(140 60% 40%); color: white; border-radius: 3px; font-size: 10px;">SELECTED</div>' : ''}
            </div>
            <span style="display: inline-block; padding: 2px 8px; background-color: hsl(195 100% 28%); color: white; border-radius: 4px; font-size: 12px;">
              ${warehouse.type.toUpperCase()} WAREHOUSE
            </span>
          </div>
          <div style="font-size: 14px; color: #64748b;">
            <div style="margin-bottom: 4px;">📍 ${warehouse.address}</div>
            <div style="margin-bottom: 4px;">📦 Capacity: ${warehouse.capacity.toLocaleString()}</div>
            <div>🕒 ${warehouse.operatingHours}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });
      marker.addTo(mapInstanceRef.current);
      markersRef.current.push(marker);
    });

    // Add facility markers with click handlers
    validFacilities.forEach((facility, index) => {
      if (!mapInstanceRef.current) return;

      const isSelected = selectedFacilityIds.includes(facility.id);
      const icon = isSelected ? selectedFacilityIcon : unselectedFacilityIcon;

      const marker = L.marker([facility.lat, facility.lng], { icon });
      
      // Add click handler for facility selection
      marker.on('click', () => {
        onFacilityToggle(facility.id);
      });

      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
              <span>${facility.name}</span>
              ${isSelected ? '<div style="padding: 2px 6px; background-color: hsl(195 100% 28%); color: white; border-radius: 3px; font-size: 10px;">SELECTED</div>' : ''}
            </div>
            <span style="display: inline-block; padding: 2px 8px; background-color: #f1f5f9; color: #475569; border-radius: 4px; font-size: 12px;">
              ${facility.type}
            </span>
          </div>
          <div style="font-size: 14px; color: #64748b;">
            <div style="margin-bottom: 4px;">📍 ${facility.address}</div>
            ${facility.phone ? `<div style="margin-bottom: 4px;">📞 ${facility.phone}</div>` : ''}
            ${facility.contactPerson ? `<div style="margin-bottom: 4px;">👤 ${facility.contactPerson}</div>` : ''}
            ${facility.operatingHours ? `<div>🕒 ${facility.operatingHours}</div>` : ''}
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
            <button onclick="event.stopPropagation()" style="
              width: 100%;
              padding: 4px 8px;
              background-color: ${isSelected ? 'hsl(0 84% 60%)' : 'hsl(195 100% 28%)'};
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 12px;
              cursor: pointer;
            ">
              ${isSelected ? 'Remove from Route' : 'Add to Route'}
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });
      marker.addTo(mapInstanceRef.current);
      markersRef.current.push(marker);
    });

    // Add optimized route visualization
    if (optimizedRoute && optimizedRoute.optimizedRoute && optimizedRoute.optimizedRoute.length > 1) {
      const routeCoords = optimizedRoute.optimizedRoute;
      
      // Main route line
      const routeLine = L.polyline(routeCoords, {
        color: 'hsl(195 100% 28%)',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 10'
      });

      routeLine.addTo(mapInstanceRef.current);
      routeLinesRef.current.push(routeLine);

      // Add waypoint markers with numbers
      routeCoords.forEach((coord, index) => {
        if (index === 0) return; // Skip warehouse (already has marker)
        
        const waypointMarker = L.marker(coord, { 
          icon: createWaypointIcon(index),
          zIndexOffset: 1000
        });

        // Calculate ETA for waypoint
        const estimatedServiceTime = 20; // minutes per facility
        const baseTime = new Date();
        baseTime.setMinutes(baseTime.getMinutes() + (index * estimatedServiceTime));
        
        const waypointPopup = `
          <div style="padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">Stop ${index}</div>
            <div style="font-size: 12px; color: #64748b;">
              <div>⏰ ETA: ${baseTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              <div>📍 ${selectedFacilities[index - 1]?.name || 'Delivery Location'}</div>
            </div>
          </div>
        `;

        waypointMarker.bindPopup(waypointPopup);
        waypointMarker.addTo(mapInstanceRef.current);
        markersRef.current.push(waypointMarker);
      });
    }

    // Add existing batch routes (lighter styling)
    batches.filter(b => b.status !== 'cancelled').forEach((batch, batchIndex) => {
      if (!mapInstanceRef.current || batch.facilities.length === 0) return;

      const warehouse = warehouses.find(w => w.id === batch.warehouseId);
      if (!warehouse) return;

      let routeCoords: [number, number][];
      if (batch.optimizedRoute && batch.optimizedRoute.length > 0) {
        routeCoords = batch.optimizedRoute;
      } else {
        routeCoords = [[warehouse.lat, warehouse.lng]];
        batch.facilities.forEach(facility => {
          routeCoords.push([facility.lat, facility.lng]);
        });
      }

      let color = '#6b7280';
      let weight = 2;
      let opacity = 0.4;
      let dashArray = '2, 8';

      switch (batch.status) {
        case 'in-progress':
          color = '#10b981';
          weight = 3;
          opacity = 0.7;
          dashArray = '5, 5';
          break;
        case 'completed':
          color = '#059669';
          opacity = 0.3;
          break;
      }

      const batchRoute = L.polyline(routeCoords, {
        color: color,
        weight: weight,
        opacity: opacity,
        dashArray: dashArray
      });

      batchRoute.addTo(mapInstanceRef.current);
      routeLinesRef.current.push(batchRoute);
    });

    // Fit bounds to include all markers
    const allMarkers = [...markersRef.current];
    if (allMarkers.length > 0) {
      const group = new L.FeatureGroup(allMarkers);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }

  }, [validFacilities, warehouses, selectedFacilities, selectedWarehouse, optimizedRoute, batches, onFacilityToggle]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Map Legend */}
      <div className="absolute top-4 right-4 bg-card border rounded-lg p-3 shadow-card z-[1000] max-w-48">
        <h4 className="font-medium text-sm mb-2">Map Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-success rounded"></div>
            <span>Selected Warehouse</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span>Selected Facility</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
            <span>Available Facility</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-0.5 bg-primary"></div>
            <span>Optimized Route</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-0.5 bg-muted-foreground opacity-50"></div>
            <span>Existing Routes</span>
          </div>
        </div>
      </div>

      {/* Route Summary */}
      {optimizedRoute && selectedFacilities.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-card border rounded-lg p-3 shadow-card z-[1000] max-w-72">
          <h4 className="font-medium text-sm flex items-center mb-2">
            <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
            Optimized Route Preview
          </h4>
          <div className="text-xs space-y-1">
            <div>🏭 Start: {selectedWarehouse?.name}</div>
            <div>📍 Stops: {selectedFacilities.length} facilities</div>
            <div>🛣️ Distance: {optimizedRoute.totalDistance}km</div>
            <div>⏱️ Duration: {Math.round(optimizedRoute.estimatedDuration)} minutes</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalMapView;