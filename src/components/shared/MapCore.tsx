import { MapContainer, TileLayer } from 'react-leaflet';
import { LatLngTuple } from 'leaflet';
import { ReactNode } from 'react';

interface MapCoreProps {
  center?: LatLngTuple;
  zoom?: number;
  tileProvider?: 'standard' | 'humanitarian' | 'dark' | 'satellite';
  children?: ReactNode;
  className?: string;
}

const TILE_PROVIDERS = {
  standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  humanitarian: 'https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

export function MapCore({ 
  center = [9.0820, 8.6753], 
  zoom = 6, 
  tileProvider = 'standard',
  children,
  className = "h-full w-full"
}: MapCoreProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      scrollWheelZoom={true}
      zoomControl={false}
    >
      <TileLayer
        url={TILE_PROVIDERS[tileProvider]}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {children}
    </MapContainer>
  );
}
