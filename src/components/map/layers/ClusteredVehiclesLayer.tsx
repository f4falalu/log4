import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Vehicle } from '@/types';

interface ClusteredVehiclesLayerProps {
  vehicles: Vehicle[];
  onVehicleClick: (vehicleId: string) => void;
}

export const ClusteredVehiclesLayer: React.FC<ClusteredVehiclesLayerProps> = ({ vehicles, onVehicleClick }) => {
  return (
    <MarkerClusterGroup>
      {vehicles.map((vehicle) => (
        <Marker
          key={vehicle.id}
          position={[vehicle.lat, vehicle.lng]}
          onClick={() => onVehicleClick(vehicle.id)}
        >
          <Popup>{vehicle.name}</Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
};
