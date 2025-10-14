import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useDrivers } from '@/hooks/useDrivers';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useRealtimeZones } from '@/hooks/useRealtimeZones';
import { useZoneDrawing } from '@/hooks/useZoneDrawing';
import { MapToolsToolbar } from './map/MapToolsToolbar';
import { ServiceAreasMenu } from './map/ServiceAreasMenu';
import { DrawControls } from './map/DrawControls';
import { BottomDataPanel } from './map/BottomDataPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import { LeafletMapCore } from './map/LeafletMapCore';

// Drawing layer removed - will be implemented with proper leaflet-draw integration later

export default function TacticalMap() {
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: zones = [], isLoading: zonesLoading } = useServiceZones();
  const [visibleZones, setVisibleZones] = useState<Set<string>>(new Set());
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Layer groups for imperative rendering
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const driversLayerRef = useRef<L.LayerGroup | null>(null);

  // Driver marker icon factory (same colors as previous component)
  const createDriverIcon = (status: string) => {
    const colors: Record<string, string> = {
      available: '#10b981',
      busy: '#f59e0b',
      offline: '#6b7280',
    };
    const color = colors[status] ?? colors.offline;
    return new L.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>`
      )}`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };
  
  const {
    drawingState,
    startDrawing,
    stopDrawing,
    startEditing,
    stopEditing,
    selectZone,
  } = useZoneDrawing();

  useRealtimeDrivers();
  useRealtimeZones();

  // Initialize all zones as visible
  useEffect(() => {
    if (zones.length > 0) {
      setVisibleZones(new Set(zones.map(z => z.id)));
    }
  }, [zones]);

  const handleLocateMe = useCallback(() => {
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          try {
            mapRef.current?.setView([latitude, longitude], 15);
            toast.success('Location found');
          } catch (error) {
            console.error('[TacticalMap] Error setting view:', error);
          }
        },
        () => {
          toast.error('Could not get your location');
        }
      );
    }
  }, []);

  const handleToggleVisibility = useCallback((zoneId: string) => {
    setVisibleZones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(zoneId)) {
        newSet.delete(zoneId);
      } else {
        newSet.add(zoneId);
      }
      return newSet;
    });
  }, []);

  const handleCenterOnZone = useCallback((zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone && mapRef.current) {
      try {
        const coords = zone.geometry.geometry.coordinates[0] as [number, number][];
        const bounds = new L.LatLngBounds(coords.map(coord => [coord[1], coord[0]] as [number, number]));
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
        selectZone(zoneId);
      } catch (error) {
        console.error('[TacticalMap] Error centering on zone:', error);
      }
    }
  }, [zones, selectZone]);

  const handleEditZone = useCallback((zoneId: string) => {
    startEditing(zoneId);
    toast.info('Edit mode activated');
  }, [startEditing]);

  const handleDeleteZone = useCallback(async (zoneId: string) => {
    try {
      const { error } = await supabase
        .from('service_zones')
        .delete()
        .eq('id', zoneId);

      if (error) throw error;
      toast.success('Service area deleted');
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('Failed to delete service area');
    }
  }, []);

  const handleDriverClick = useCallback((driver: any) => {
    if (driver?.currentLocation && mapRef.current) {
      try {
        console.info('[TacticalMap] Centering on driver:', driver.id);
        mapRef.current.setView([driver.currentLocation.lat, driver.currentLocation.lng], 15);
        setSelectedDriverId(driver.id);
      } catch (error) {
        console.error('[TacticalMap] Error centering on driver:', error);
      }
    }
  }, []);

  const defaultCenter: [number, number] = [9.0192, 38.7525]; // Addis Ababa
  const defaultZoom = 12;

  const handleMapReady = useCallback((map: L.Map) => {
    if (!mapRef.current) {
      mapRef.current = map;
      // Initialize overlay layer groups
      zonesLayerRef.current = L.layerGroup().addTo(map);
      driversLayerRef.current = L.layerGroup().addTo(map);
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
      setMapReady(true);
    }
  }, []);

  // Sync drivers layer
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!driversLayerRef.current) {
      driversLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }
    const layer = driversLayerRef.current;
    layer.clearLayers();

    drivers.forEach((driver) => {
      if (!driver?.currentLocation) return;
      const marker = L.marker([driver.currentLocation.lat, driver.currentLocation.lng], {
        icon: createDriverIcon(driver.status),
      }).on('click', () => handleDriverClick(driver));

      marker.bindPopup(
        `<div style="padding:8px;">
           <h3 style="font-weight:600;margin:0 0 4px 0;">${driver.name ?? 'Driver'}</h3>
           <p style="margin:0;font-size:12px;color:#6b7280;text-transform:capitalize;">${driver.status ?? ''}</p>
         </div>`
      );

      marker.addTo(layer);
    });

    return () => {
      layer.clearLayers();
    };
  }, [drivers, mapReady, handleDriverClick]);

  // Sync zones layer
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!zonesLayerRef.current) {
      zonesLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }
    const layer = zonesLayerRef.current;
    layer.clearLayers();

    zones.forEach((zone) => {
      if (!visibleZones.has(zone.id)) return;

      const coords = (zone.geometry.geometry.coordinates[0] as [number, number][]) 
        .map((coord) => [coord[1], coord[0]] as [number, number]);

      const polygon = L.polygon(coords, {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: drawingState.selectedZoneId === zone.id ? 0.4 : 0.2,
        weight: drawingState.selectedZoneId === zone.id ? 3 : 2,
      }).on('click', () => selectZone(zone.id));

      const description = zone.description
        ? `<p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">${zone.description}</p>`
        : '';

      polygon.bindPopup(
        `<div style="padding:8px;">
           <h3 style="font-weight:600;margin:0 0 4px 0;">${zone.name}</h3>
           ${description}
         </div>`
      );

      polygon.addTo(layer);
    });

    return () => {
      layer.clearLayers();
    };
  }, [zones, visibleZones, drawingState.selectedZoneId, mapReady, selectZone]);

  return (
    <div className="relative h-screen w-full">
      <LeafletMapCore
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        onReady={handleMapReady}
      />

      <MapToolsToolbar
        onLocateMe={handleLocateMe}
        onServiceAreasClick={() => {}}
        onSearchClick={() => toast.info('Search feature coming soon')}
        onDrawToggle={() => {
          if (drawingState.isDrawing) {
            stopDrawing();
          } else {
            startDrawing();
            toast.info('Click on map to start drawing');
          }
        }}
        onLayersClick={() => toast.info('Layer controls coming soon')}
        isDrawing={drawingState.isDrawing}
      />

      <ServiceAreasMenu
        zones={zones}
        visibleZones={visibleZones}
        selectedZoneId={drawingState.selectedZoneId}
        onToggleVisibility={handleToggleVisibility}
        onCenterOnZone={handleCenterOnZone}
        onEditZone={handleEditZone}
        onDeleteZone={handleDeleteZone}
        onCreateNew={startDrawing}
      >
        <div />
      </ServiceAreasMenu>

      <DrawControls
        isVisible={drawingState.isDrawing}
        onFinish={() => {
          stopDrawing();
          toast.success('Drawing saved');
        }}
        onCancel={stopDrawing}
        onDeleteLastPoint={() => toast.info('Last point deleted')}
      />

      <BottomDataPanel
        drivers={drivers}
        onDriverClick={(driverId) => {
          const driver = drivers.find(d => d.id === driverId);
          if (driver) handleDriverClick(driver);
        }}
      />
    </div>
  );
}
