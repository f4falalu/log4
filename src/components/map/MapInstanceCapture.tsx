import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type L from 'leaflet';

interface MapInstanceCaptureProps {
  onMapReady: (map: L.Map) => void;
}

export function MapInstanceCapture({ onMapReady }: MapInstanceCaptureProps) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      console.info('[MapInstanceCapture] Leaflet map captured');
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}
