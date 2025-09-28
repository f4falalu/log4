import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Facility } from '@/types';

// Fix for default marker icons in React Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

interface MapViewProps {
  facilities: Facility[];
  center?: [number, number];
  zoom?: number;
}

const MapView = ({ facilities, center = [39.8283, -98.5795], zoom = 4 }: MapViewProps) => {
  // Fix for default marker icons - do this inside component
  useEffect(() => {
    let isComponentMounted = true;
    
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: markerIcon,
        iconRetinaUrl: markerIcon2x,
        shadowUrl: markerShadow,
      });
    } catch (error) {
      console.warn('Error setting up Leaflet icons:', error);
    }

    return () => {
      isComponentMounted = false;
    };
  }, []);

  // Memoize custom icon for facilities
  const facilityIcon = useMemo(() => L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }), []);

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-card border">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {facilities.map((facility) => {
          // Validate coordinates before rendering
          if (!facility.lat || !facility.lng || 
              isNaN(facility.lat) || isNaN(facility.lng) ||
              facility.lat < -90 || facility.lat > 90 ||
              facility.lng < -180 || facility.lng > 180) {
            console.warn(`Invalid coordinates for facility ${facility.id}:`, facility.lat, facility.lng);
            return null;
          }

          return (
            <Marker
              key={facility.id}
              position={[facility.lat, facility.lng]}
              icon={facilityIcon}
            >
              <Popup closeButton={true} maxWidth={300}>
                <div className="p-2">
                  <div className="mb-2">
                    <div className="font-semibold text-foreground">{facility.name}</div>
                    <div className="inline-block px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs mt-1">
                      {facility.type}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>📍 {facility.address}</div>
                    
                    {facility.phone && (
                      <div>📞 {facility.phone}</div>
                    )}
                    
                    {facility.contactPerson && (
                      <div>👤 {facility.contactPerson}</div>
                    )}
                    
                    {facility.operatingHours && (
                      <div>🕒 {facility.operatingHours}</div>
                    )}
                    
                    {facility.capacity && (
                      <div className="mt-2 pt-2 border-t border-border font-medium">
                        Capacity: {facility.capacity}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        }).filter(Boolean)}
      </MapContainer>
    </div>
  );
};

export default MapView;