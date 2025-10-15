import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG, TileProvider } from '@/lib/mapConfig';

interface LeafletMapCoreProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  tileProvider?: TileProvider;
  showLayerSwitcher?: boolean;
  showScaleControl?: boolean;
  showResetControl?: boolean;
  onReady: (map: L.Map) => void;
  onDestroy?: () => void;
}

export function LeafletMapCore({ 
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  className, 
  tileProvider = 'standard',
  showLayerSwitcher = false,
  showScaleControl = false,
  showResetControl = false,
  onReady, 
  onDestroy 
}: LeafletMapCoreProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      ...MAP_CONFIG.leafletOptions,
      center,
      zoom,
    });

    // Create tile layers
    const tileLayers: Record<TileProvider, L.TileLayer> = {
      standard: L.tileLayer(MAP_CONFIG.tileProviders.standard.url, {
        attribution: MAP_CONFIG.tileProviders.standard.attribution,
        maxZoom: MAP_CONFIG.maxZoom,
      }),
      humanitarian: L.tileLayer(MAP_CONFIG.tileProviders.humanitarian.url, {
        attribution: MAP_CONFIG.tileProviders.humanitarian.attribution,
        maxZoom: MAP_CONFIG.maxZoom,
      }),
      cartoLight: L.tileLayer(MAP_CONFIG.tileProviders.cartoLight.url, {
        attribution: MAP_CONFIG.tileProviders.cartoLight.attribution,
        maxZoom: MAP_CONFIG.maxZoom,
      }),
      cartoDark: L.tileLayer(MAP_CONFIG.tileProviders.cartoDark.url, {
        attribution: MAP_CONFIG.tileProviders.cartoDark.attribution,
        maxZoom: MAP_CONFIG.maxZoom,
      }),
    };

    // Add default tile layer
    tileLayers[tileProvider].addTo(map);

    // Add layer switcher if requested
    if (showLayerSwitcher) {
      const baseMaps = {
        "Standard": tileLayers.standard,
        "Humanitarian": tileLayers.humanitarian,
        "Light": tileLayers.cartoLight,
        "Dark": tileLayers.cartoDark,
      };
      L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map);
    }

    // Add scale control if requested
    if (showScaleControl) {
      L.control.scale({ 
        position: 'bottomleft',
        metric: true,
        imperial: false
      }).addTo(map);
    }

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    // Invalidate size after first paint to avoid layout issues
    const rafId = requestAnimationFrame(() => {
      try {
        map.invalidateSize();
      } catch (e) {
        console.warn('[LeafletMapCore] Skipped invalidateSize after unmount');
      }
    });
    
    // Call onReady with map instance
    onReady(map);

    return () => {
      try {
        cancelAnimationFrame(rafId);
      } catch {}
      try {
        map.remove();
      } catch (e) {
        console.error('[LeafletMapCore] Error during map cleanup', e);
      }
      onDestroy?.();
      mapRef.current = null;
    };
    // Only re-run if map configuration changes, NOT on callback changes
  }, [center, zoom, tileProvider, showLayerSwitcher, showScaleControl, showResetControl]);

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
}
