import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LeafletMapCore } from '@/components/map/LeafletMapCore';
import { MAP_CONFIG } from '@/lib/mapConfig';

interface RouteMapPreviewProps {
  routeId: string;
  mapPoints: Array<{ lat: number; lng: number }>;
}

export function RouteMapPreview({ routeId, mapPoints }: RouteMapPreviewProps) {
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  const handleMapReady = (map: L.Map) => {
    mapInstanceRef.current = map;
    
    // Disable interactions for preview
    map.scrollWheelZoom.disable();
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    
    // Clear existing layers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (mapPoints.length === 0) return;

    // Add markers
    const markers = mapPoints.map(point => 
      L.marker([point.lat, point.lng]).addTo(map)
    );
    markersRef.current = markers;

    // Add polyline if multiple points
    if (mapPoints.length > 1) {
      const polyline = L.polyline(
        mapPoints.map(p => [p.lat, p.lng] as [number, number]),
        { color: 'hsl(var(--primary))', weight: 3 }
      ).addTo(map);
      polylineRef.current = polyline;
    }

    // Fit bounds
    const group = new L.FeatureGroup(markers);
    const bounds = group.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2));
    }
  };

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        markersRef.current.forEach(m => m.remove());
        if (polylineRef.current) polylineRef.current.remove();
      }
    };
  }, []);

  if (mapPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <p className="text-sm text-muted-foreground">No route data</p>
      </div>
    );
  }

  return (
    <LeafletMapCore
      key={`route-map-${routeId}`}
      center={[mapPoints[0].lat, mapPoints[0].lng]}
      zoom={13}
      tileProvider="standard"
      onReady={handleMapReady}
      showLayerSwitcher={false}
      showScaleControl={false}
      showResetControl={false}
    />
  );
}
