import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Driver } from '@/types';

interface ClusteredDriversLayerProps {
  drivers: Driver[];
  onDriverClick: (driverId: string) => void;
}

export const ClusteredDriversLayer: React.FC<ClusteredDriversLayerProps> = ({ drivers, onDriverClick }) => {
  return (
    <MarkerClusterGroup>
      {drivers.map((driver) => (
        <Marker
          key={driver.id}
          position={[driver.currentLocation.lat, driver.currentLocation.lng]}
          onClick={() => onDriverClick(driver.id)}
        >
          <Popup>{driver.name}</Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
};
