import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG, TileProvider } from '@/lib/mapConfig';
import { MapUtils } from '@/lib/mapUtils';
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
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersRef = useRef<Record<string, L.TileLayer>>({});
  const viewTimeoutRef = useRef<NodeJS.Timeout>();
  const onReadyRef = useRef(onReady);
  const onDestroyRef = useRef(onDestroy);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);

  // Keep callback refs up to date
  useEffect(() => {
    onReadyRef.current = onReady;
    onDestroyRef.current = onDestroy;
  });

  // 1. Initialize Map (Run Once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize shared layer instances once
    if (Object.keys(layersRef.current).length === 0) {
      Object.entries(MAP_CONFIG.tileProviders).forEach(([key, config]) => {
        const layer = L.tileLayer(config.url, {
          attribution: config.attribution,
          maxZoom: MAP_CONFIG.maxZoom,
        });
        layer.on('load', () => setTilesLoaded(true));
        layersRef.current[key] = layer;
      });
    }

    const map = L.map(containerRef.current, {
      ...MAP_CONFIG.leafletOptions,
      center,
      zoom,
    });

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

    // Event-driven readiness check
    map.whenReady(() => {
      const panes = map.getPanes();
      if (panes && panes.overlayPane) {
        onReadyRef.current(map);
      } else {
        console.error('[LeafletMapCore] Map loaded but overlayPane is missing');
      }
    });

    return () => {
      try {
        cancelAnimationFrame(rafId);
      } catch {}
      try {
        map.remove();
      } catch (e) {
        // Silent cleanup
      }
      onDestroyRef.current?.();
      mapRef.current = null;
      tileLayerRef.current = null;
      if (viewTimeoutRef.current) clearTimeout(viewTimeoutRef.current);
    };
  }, []); // Mount only

  // 2. Handle View Updates (Center/Zoom)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    if (viewTimeoutRef.current) {
      clearTimeout(viewTimeoutRef.current);
    }

    viewTimeoutRef.current = setTimeout(() => {
      // Prevent jitter by checking if move is necessary
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      
      const dist = Math.sqrt(
        Math.pow(currentCenter.lat - center[0], 2) + 
        Math.pow(currentCenter.lng - center[1], 2)
      );

      if (dist > 0.0001 || currentZoom !== zoom) {
        map.setView(center, zoom);
      }
    }, 100);
  }, [center[0], center[1], zoom]);

  // 3. Handle Tile Provider Updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layer = layersRef.current[tileProvider];
    if (!layer) return;

    // Only remove if the layer has actually changed
    if (tileLayerRef.current && tileLayerRef.current !== layer) {
      map.removeLayer(tileLayerRef.current);
    }

    if (!map.hasLayer(layer)) {
      layer.addTo(map);
    }

    layer.on('tileerror', () => {
      if (!tileError) {
        console.warn(`Tiles failed for ${tileProvider}, falling back to standard`);
        setTileError(true);
        toast.info('Map tiles switched to fallback provider');
      }
    });

    tileLayerRef.current = layer;
  }, [tileProvider]);

  // 4. Handle Layer Switcher Control
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showLayerSwitcher) return;

    const baseLayers: Record<string, L.TileLayer> = {};
    Object.entries(MAP_CONFIG.tileProviders).forEach(([key, _]) => {
      // Format name: cartoDark -> Carto Dark
      const name = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      baseLayers[name] = layersRef.current[key];
    });

    const control = L.control.layers(baseLayers, undefined, { position: 'topright' });
    control.addTo(map);

    return () => {
      control.remove();
    };
  }, [showLayerSwitcher]);

  return (
    <>
      {!tilesLoaded && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse z-floating pointer-events-none flex items-center justify-center">
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
