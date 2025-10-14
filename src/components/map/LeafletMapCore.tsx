import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapCoreProps {
  center: [number, number];
  zoom: number;
  className?: string;
  onReady: (map: L.Map) => void;
}

export function LeafletMapCore({ center, zoom, className, onReady }: LeafletMapCoreProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      preferCanvas: true,
      zoomAnimation: false,
      fadeAnimation: false,
      inertia: false,
    });

    // Base tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    // Invalidate size after first paint to avoid layout issues
    requestAnimationFrame(() => map.invalidateSize());
    onReady(map);

    return () => {
      try {
        map.remove();
      } catch (e) {
        console.error('[LeafletMapCore] Error during map cleanup', e);
      }
      mapRef.current = null;
    };
  }, [center, zoom, onReady]);

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
}
