import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Warehouse } from '@/types';

interface ClusteredWarehousesLayerProps {
  warehouses: Warehouse[];
  onWarehouseClick: (warehouseId: string) => void;
}

export const ClusteredWarehousesLayer: React.FC<ClusteredWarehousesLayerProps> = ({ warehouses, onWarehouseClick }) => {
  return (
    <MarkerClusterGroup>
      {warehouses.map((warehouse) => (
        <Marker
          key={warehouse.id}
          position={[warehouse.lat, warehouse.lng]}
          onClick={() => onWarehouseClick(warehouse.id)}
        >
          <Popup>{warehouse.name}</Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
};
