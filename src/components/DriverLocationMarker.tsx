import { Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Driver } from '@/types';

interface DriverLocationMarkerProps {
  driver: Driver;
}

const driverIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" fill="#eff6ff"/>
      <path d="M19 13v6h-6"/>
      <path d="M5 11V5h6"/>
      <path d="m19 19-4-4"/>
      <path d="M5 5l4 4"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export function DriverLocationMarker({ driver }: DriverLocationMarkerProps) {
  if (!driver.currentLocation) return null;

  return (
    <Marker 
      position={[driver.currentLocation.lat, driver.currentLocation.lng]}
      icon={driverIcon}
    >
      <Popup>
        <div className="p-2">
          <p className="font-semibold">{driver.name}</p>
          <p className="text-sm text-muted-foreground">Status: {driver.status}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}
