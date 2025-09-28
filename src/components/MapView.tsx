import { useEffect } from 'react';
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
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: markerIcon,
      iconRetinaUrl: markerIcon2x,
      shadowUrl: markerShadow,
    });
  }, []);

  // Custom icon for facilities
  const facilityIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

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
        
        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.lat, facility.lng]}
            icon={facilityIcon}
          >
            <Popup>
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>{facility.name}</strong>
                  <span style={{ 
                    backgroundColor: '#e5e7eb', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '12px', 
                    marginLeft: '8px' 
                  }}>
                    {facility.type}
                  </span>
                </div>
                
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  <div style={{ marginBottom: '4px' }}>
                    📍 {facility.address}
                  </div>
                  
                  {facility.phone && (
                    <div style={{ marginBottom: '4px' }}>
                      📞 {facility.phone}
                    </div>
                  )}
                  
                  {facility.contactPerson && (
                    <div style={{ marginBottom: '4px' }}>
                      👤 {facility.contactPerson}
                    </div>
                  )}
                  
                  {facility.operatingHours && (
                    <div style={{ marginBottom: '4px' }}>
                      🕒 {facility.operatingHours}
                    </div>
                  )}
                  
                  {facility.capacity && (
                    <div style={{ 
                      marginTop: '8px', 
                      paddingTop: '8px', 
                      borderTop: '1px solid #e5e7eb',
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