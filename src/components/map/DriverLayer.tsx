import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Driver } from '@/types';

interface DriverLayerProps {
  drivers: Driver[];
  onDriverClick: (driver: Driver) => void;
  selectedDriverId: string | null;
}

const createDriverIcon = (status: string) => {
  const colors = {
    available: '#10b981',
    busy: '#f59e0b',
    offline: '#6b7280'
  };
  const color = colors[status as keyof typeof colors] || colors.offline;
  
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
        <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

export function DriverLayer({ drivers, onDriverClick, selectedDriverId }: DriverLayerProps) {
  return (
    <>
      {drivers.map((driver) => (
        driver.currentLocation ? (
          <Marker
            key={driver.id}
            position={[driver.currentLocation.lat, driver.currentLocation.lng]}
            icon={createDriverIcon(driver.status)}
            eventHandlers={{
              click: () => onDriverClick(driver),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{driver.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{driver.status}</p>
              </div>
            </Popup>
          </Marker>
        ) : null
      ))}
    </>
  );
}
