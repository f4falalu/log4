import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Facility } from '@/types';

interface ClusteredFacilitiesLayerProps {
  facilities: Facility[];
  onFacilityClick: (facilityId: string) => void;
}

export const ClusteredFacilitiesLayer: React.FC<ClusteredFacilitiesLayerProps> = ({ facilities, onFacilityClick }) => {
  return (
    <MarkerClusterGroup>
      {facilities.map((facility) => (
        <Marker
          key={facility.id}
          position={[facility.lat, facility.lng]}
          onClick={() => onFacilityClick(facility.id)}
        >
          <Popup>{facility.name}</Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
};
