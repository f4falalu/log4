import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG, TileProvider } from '@/lib/mapConfig';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);

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

    // Add default tile layer with error handling
    tileLayers[tileProvider].on('tileerror', () => {
      if (!tileError) {
        console.warn(`Tiles failed for ${tileProvider}, falling back to standard`);
        setTileError(true);
        tileLayers.standard.addTo(map);
        toast.info('Map tiles switched to fallback provider');
      }
    });
    
    tileLayers[tileProvider].on('load', () => {
      setTilesLoaded(true);
    });
    
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

    // Add zoom control to top right
    L.control.zoom({ 
      position: 'topright',
      zoomInTitle: 'Zoom in',
      zoomOutTitle: 'Zoom out'
    }).addTo(map);

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

  return (
    <>
      {!tilesLoaded && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse z-[999] pointer-events-none flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className={className ?? 'h-full w-full'} />
    </>
  );
}
