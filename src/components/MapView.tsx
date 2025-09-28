import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Facility } from '@/types';

// Fix for default marker icons in React Leaflet
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

interface MapViewProps {
  facilities: Facility[];
  center?: [number, number];
  zoom?: number;
}

const MapView = ({ facilities, center = [39.8283, -98.5795], zoom = 4 }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

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
      const map = L.map(mapRef.current).setView(center, zoom);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

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

  // Update markers when facilities change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new markers
    validFacilities.forEach(facility => {
      if (!mapInstanceRef.current) return;

      const marker = L.marker([facility.lat, facility.lng], { icon: facilityIcon });
      
      // Create popup content
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

    // Fit bounds if there are facilities
    if (validFacilities.length > 0) {
      const group = new L.FeatureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }

    console.log(`Added ${validFacilities.length} markers to map`);
  }, [validFacilities]);

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-card border">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
};

export default MapView;