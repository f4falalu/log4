import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
        
        {validFacilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.lat, facility.lng]}
            icon={facilityIcon}
          >
            <Popup closeButton={true} maxWidth={300}>
              <div style={{ padding: '8px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{facility.name}</div>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '2px 8px', 
                    backgroundColor: '#f1f5f9', 
                    color: '#475569',
                    borderRadius: '4px', 
                    fontSize: '12px' 
                  }}>
                    {facility.type}
                  </span>
                </div>
                
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  <div style={{ marginBottom: '4px' }}>📍 {facility.address}</div>
                  
                  {facility.phone && (
                    <div style={{ marginBottom: '4px' }}>📞 {facility.phone}</div>
                  )}
                  
                  {facility.contactPerson && (
                    <div style={{ marginBottom: '4px' }}>👤 {facility.contactPerson}</div>
                  )}
                  
                  {facility.operatingHours && (
                    <div style={{ marginBottom: '4px' }}>🕒 {facility.operatingHours}</div>
                  )}
                  
                  {facility.capacity && (
                    <div style={{ 
                      marginTop: '8px', 
                      paddingTop: '8px', 
                      borderTop: '1px solid #e2e8f0', 
                      fontWeight: '500' 
                    }}>
                      Capacity: {facility.capacity}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;