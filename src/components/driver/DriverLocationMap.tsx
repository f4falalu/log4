import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LeafletMapCore } from '@/components/map/LeafletMapCore';
import { MapPinOff } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface DriverLocationMapProps {
  lat: number | undefined;
  lng: number | undefined;
  driverName: string;
  heading?: number;
  lastUpdate?: Date;
  isOnline?: boolean;
}

export function DriverLocationMap({ lat, lng, driverName, heading, lastUpdate, isOnline }: DriverLocationMapProps) {
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const handleMapReady = (map: L.Map) => {
    mapInstanceRef.current = map;

    // Disable interactions for preview
    map.scrollWheelZoom.disable();
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();

    if (lat == null || lng == null) return;

    // Custom driver icon
    const color = isOnline ? '#22c55e' : '#94a3b8';
    const icon = L.divIcon({
      className: 'driver-marker',
      html: `<div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: bold; font-size: 12px;
      ">${driverName.charAt(0)}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);
    markerRef.current = marker;
    map.setView([lat, lng], 14);
  };

  useEffect(() => {
    return () => {
      if (markerRef.current) markerRef.current.remove();
    };
  }, []);

  // Update marker position when GPS data changes
  useEffect(() => {
    if (markerRef.current && lat != null && lng != null) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current?.setView([lat, lng], 14);
    }
  }, [lat, lng]);

  if (lat == null || lng == null) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted rounded-lg gap-2">
        <MapPinOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No location data available</p>
      </div>
    );
  }

  return (
    <div className="relative h-full rounded-lg overflow-hidden">
      <LeafletMapCore
        key={`driver-location-${lat}-${lng}`}
        center={[lat, lng]}
        zoom={14}
        tileProvider="standard"
        onReady={handleMapReady}
        showLayerSwitcher={false}
        showScaleControl={false}
        showResetControl={false}
      />
      {lastUpdate && (
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm text-xs px-2 py-1 rounded border">
          {isOnline ? 'Live' : 'Last seen'}: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
