import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { LeafletMapCore } from '@/components/map/LeafletMapCore';
import { MAP_CONFIG } from '@/lib/mapConfig';
import { searchAddress, GeoapifyPlace } from '@/lib/geoapify';
import {
  Plus,
  Minus,
  Locate,
  Lock,
  Pencil,
  Pentagon,
  Hand,
  Trash2,
  Search,
  MapPin,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface GeometrySummary {
  areaKm2: number;
  vertices: number;
  center: { lat: number; lng: number };
}

interface ZoneMapDrawerProps {
  onGeometryChange: (geometry: GeoJSON.Polygon | null, summary: GeometrySummary | null) => void;
}

type DrawMode = 'pan' | 'polygon' | 'freehand';

export function ZoneMapDrawer({ onGeometryChange }: ZoneMapDrawerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const drawHandlerRef = useRef<any>(null);
  const onGeometryChangeRef = useRef(onGeometryChange);
  onGeometryChangeRef.current = onGeometryChange;
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasPolygon, setHasPolygon] = useState(false);
  const [activeMode, setActiveMode] = useState<DrawMode>('pan');
  const [isLocked, setIsLocked] = useState(false);

  // Freehand drawing state
  const freehandPointsRef = useRef<L.LatLng[]>([]);
  const freehandPolylineRef = useRef<L.Polyline | null>(null);
  const isFreehandDrawingRef = useRef(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoapifyPlace[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const computeSummary = useCallback((latlngs: L.LatLng[]): GeometrySummary => {
    const area = L.GeometryUtil
      ? (L.GeometryUtil as any).geodesicArea(latlngs)
      : computeGeodesicArea(latlngs);

    const areaKm2 = Math.abs(area) / 1_000_000;
    const vertices = latlngs.length;

    const center = latlngs.reduce(
      (acc, ll) => ({ lat: acc.lat + ll.lat / vertices, lng: acc.lng + ll.lng / vertices }),
      { lat: 0, lng: 0 }
    );

    return {
      areaKm2: Math.round(areaKm2 * 10) / 10,
      vertices,
      center: {
        lat: Math.round(center.lat * 10000) / 10000,
        lng: Math.round(center.lng * 10000) / 10000,
      },
    };
  }, []);

  const toGeoJSON = useCallback((latlngs: L.LatLng[]): GeoJSON.Polygon => {
    const coords = latlngs.map(ll => [ll.lng, ll.lat]);
    coords.push([latlngs[0].lng, latlngs[0].lat]);
    return {
      type: 'Polygon',
      coordinates: [coords],
    };
  }, []);

  const finishFreehandDrawing = useCallback(() => {
    const map = mapRef.current;
    const fg = featureGroupRef.current;
    const points = freehandPointsRef.current;

    if (!map || !fg || points.length < 3) {
      // Not enough points, clean up
      if (freehandPolylineRef.current && map) {
        map.removeLayer(freehandPolylineRef.current);
      }
      freehandPolylineRef.current = null;
      freehandPointsRef.current = [];
      isFreehandDrawingRef.current = false;
      setIsDrawing(false);
      return;
    }

    // Remove the temporary polyline
    if (freehandPolylineRef.current) {
      map.removeLayer(freehandPolylineRef.current);
      freehandPolylineRef.current = null;
    }

    // Create polygon from freehand points
    fg.clearLayers();
    const polygon = L.polygon(points, {
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.2,
      weight: 2,
    });
    fg.addLayer(polygon);

    setHasPolygon(true);
    setIsDrawing(false);
    setActiveMode('pan');
    map.dragging.enable();

    const latlngs = points;
    const geometry = toGeoJSON(latlngs);
    const summary = computeSummary(latlngs);
    onGeometryChangeRef.current(geometry, summary);

    freehandPointsRef.current = [];
    isFreehandDrawingRef.current = false;
  }, [toGeoJSON, computeSummary]);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;

    const fg = L.featureGroup().addTo(map);
    featureGroupRef.current = fg;

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer as L.Polygon;
      fg.clearLayers();
      fg.addLayer(layer);
      setHasPolygon(true);
      setIsDrawing(false);
      setActiveMode('pan');

      const latlngs = (layer.getLatLngs()[0] as L.LatLng[]);
      const geometry = toGeoJSON(latlngs);
      const summary = computeSummary(latlngs);
      onGeometryChangeRef.current(geometry, summary);
    });

    map.on(L.Draw.Event.DRAWSTART, () => {
      setIsDrawing(true);
    });

    map.on(L.Draw.Event.DRAWSTOP, () => {
      setIsDrawing(false);
    });

    map.on(L.Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: L.Polygon) => {
        const latlngs = (layer.getLatLngs()[0] as L.LatLng[]);
        const geometry = toGeoJSON(latlngs);
        const summary = computeSummary(latlngs);
        onGeometryChangeRef.current(geometry, summary);
      });
    });

    // Freehand drawing mouse/touch events
    map.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (activeMode !== 'freehand' && !isFreehandDrawingRef.current) return;
      // Only handled if we're in freehand mode via ref check below
    });
  }, [toGeoJSON, computeSummary]);

  // Set up / tear down freehand listeners when mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeMode !== 'freehand') return;

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      isFreehandDrawingRef.current = true;
      freehandPointsRef.current = [e.latlng];
      map.dragging.disable();
      setIsDrawing(true);

      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
      setHasPolygon(false);
      onGeometryChangeRef.current(null, null);

      freehandPolylineRef.current = L.polyline([e.latlng], {
        color: '#2563eb',
        weight: 2,
        dashArray: '5, 5',
      }).addTo(map);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isFreehandDrawingRef.current) return;
      freehandPointsRef.current.push(e.latlng);
      freehandPolylineRef.current?.addLatLng(e.latlng);
    };

    const onMouseUp = () => {
      if (!isFreehandDrawingRef.current) return;
      finishFreehandDrawing();
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.dragging.enable();
    };
  }, [activeMode, finishFreehandDrawing]);

  const startPolygonDrawing = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
    }

    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setHasPolygon(false);
    onGeometryChangeRef.current(null, null);

    const handler = new (L.Draw as any).Polygon(map, {
      allowIntersection: false,
      showArea: false,
      metric: false,
      shapeOptions: {
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.2,
        weight: 2,
      },
    });

    handler.enable();
    drawHandlerRef.current = handler;
    setActiveMode('polygon');
  }, []);

  const startFreehandDrawing = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }

    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setHasPolygon(false);
    onGeometryChangeRef.current(null, null);
    setActiveMode('freehand');
  }, []);

  const switchToPan = useCallback(() => {
    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }
    const map = mapRef.current;
    if (map) {
      map.dragging.enable();
    }
    isFreehandDrawingRef.current = false;
    setIsDrawing(false);
    setActiveMode('pan');
  }, []);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleFocusLock = useCallback(() => {
    const map = mapRef.current;
    const fg = featureGroupRef.current;
    if (!map || !fg) return;

    if (isLocked) {
      // Unlock — re-enable dragging
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      setIsLocked(false);
      return;
    }

    if (hasPolygon) {
      const bounds = fg.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2), { animate: false });
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        setIsLocked(true);
      }
    }
  }, [hasPolygon, isLocked]);

  const handleResetView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Cancel any active draw mode
    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }
    isFreehandDrawingRef.current = false;

    // Re-enable all interactions
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();

    setIsLocked(false);
    setIsDrawing(false);
    setActiveMode('pan');

    map.invalidateSize();
    // Force reset by going to a slightly different zoom first, then snapping back
    map.setZoom(MAP_CONFIG.defaultZoom + 1, { animate: false });
    map.setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom, { animate: false });
  }, []);

  const clearPolygon = useCallback(() => {
    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    const map = mapRef.current;
    if (map) {
      map.dragging.enable();
    }
    isFreehandDrawingRef.current = false;
    setHasPolygon(false);
    setIsDrawing(false);
    setIsLocked(false);
    setActiveMode('pan');
    onGeometryChangeRef.current(null, null);
  }, []);

  // Search handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setSearchResults(results);
      setShowResults(results.length > 0);
      setIsSearching(false);
    }, 300);
  }, []);

  const handleSelectPlace = useCallback((place: GeoapifyPlace) => {
    const map = mapRef.current;
    if (!map) return;

    map.setView([place.lat, place.lon], 12, { animate: false });
    setSearchQuery(place.formatted);
    setShowResults(false);
    setSearchResults([]);
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update cursor class on the Leaflet container based on active mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    container.classList.remove('cursor-grab', 'cursor-crosshair', 'cursor-pencil');
    if (activeMode === 'pan') {
      container.classList.add('cursor-grab');
    } else if (activeMode === 'polygon') {
      container.classList.add('cursor-crosshair');
    } else if (activeMode === 'freehand') {
      container.classList.add('cursor-pencil');
    }
  }, [activeMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (drawHandlerRef.current) {
        drawHandlerRef.current.disable();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full">
        <div className="relative flex-1 min-h-[400px]">
          {/* Hide default Leaflet zoom control + set cursor per mode */}
          <style>{`
            .leaflet-control-zoom { display: none !important; }
            .leaflet-container.cursor-grab { cursor: grab !important; }
            .leaflet-container.cursor-grab:active { cursor: grabbing !important; }
            .leaflet-container.cursor-crosshair { cursor: crosshair !important; }
            .leaflet-container.cursor-pencil { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/%3E%3C/svg%3E") 2 18, crosshair !important; }
          `}</style>

          {/* Search bar at top */}
          <div
            ref={searchContainerRef}
            className="absolute top-3 left-3 right-3 z-[1000]"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="h-8 pl-8 pr-8 text-sm bg-background shadow-sm border rounded-md"
              />
              {isSearching && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
              )}
            </div>
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-[200px] overflow-y-auto">
                {searchResults.map((place, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
                    onClick={() => handleSelectPlace(place)}
                  >
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <span className="block font-medium line-clamp-1 text-xs">
                        {place.address_line1 || place.formatted.split(',')[0]}
                      </span>
                      <span className="block text-xs text-muted-foreground line-clamp-1">
                        {place.city && place.state
                          ? `${place.city}, ${place.state}`
                          : place.formatted}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map controls ribbon - vertically centered on left */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-[1000]">
            <div className="flex flex-col items-center gap-0.5 bg-background border rounded-lg shadow-sm p-1">
              {/* Pan */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={activeMode === 'pan' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={switchToPan}
                  >
                    <Hand className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Pan</TooltipContent>
              </Tooltip>

              {/* Freehand draw */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={activeMode === 'freehand' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={startFreehandDrawing}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Freehand draw</TooltipContent>
              </Tooltip>

              {/* Polygon draw */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={activeMode === 'polygon' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={startPolygonDrawing}
                  >
                    <Pentagon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Draw polygon</TooltipContent>
              </Tooltip>

              <Separator className="my-1 w-5" />

              {/* Focus / Lock */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isLocked ? 'default' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleFocusLock}
                    disabled={!hasPolygon}
                  >
                    {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Locate className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isLocked ? 'Unlock view' : 'Focus on zone'}
                </TooltipContent>
              </Tooltip>

              {/* Reset view */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleResetView}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Reset view</TooltipContent>
              </Tooltip>

              <Separator className="my-1 w-5" />

              {/* Zoom controls */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleZoomIn}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Zoom in</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleZoomOut}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Zoom out</TooltipContent>
              </Tooltip>

              {/* Trash - only when polygon exists */}
              {hasPolygon && (
                <>
                  <Separator className="my-1 w-5" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={clearPolygon}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Delete zone</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </div>

          <LeafletMapCore
            center={MAP_CONFIG.defaultCenter}
            zoom={MAP_CONFIG.defaultZoom}
            tileProvider="standard"
            onReady={handleMapReady}
            showLayerSwitcher={false}
            showScaleControl={false}
            showResetControl={false}
            className="h-full w-full rounded-lg"
          />
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {isDrawing
            ? activeMode === 'freehand'
              ? 'Drawing freehand \u00b7 Release to close shape'
              : 'Click to draw zone \u00b7 Double-click to close shape'
            : hasPolygon
              ? 'Zone boundary drawn. Use delete to redraw.'
              : 'Select a drawing tool to start defining a zone boundary'}
        </p>
      </div>
    </TooltipProvider>
  );
}

/**
 * Fallback geodesic area calculation using the Shoelace formula
 * on projected coordinates (good enough for display purposes)
 */
function computeGeodesicArea(latlngs: L.LatLng[]): number {
  const d2r = Math.PI / 180;
  let area = 0;
  const len = latlngs.length;

  for (let i = 0; i < len; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % len];

    area += (p2.lng - p1.lng) * d2r *
      (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
  }

  area = (area * 6378137 * 6378137) / 2;
  return Math.abs(area);
}
