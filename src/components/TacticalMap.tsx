import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
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
import { DriverLayer } from './map/DriverLayer';
import { ZoneLayer } from './map/ZoneLayer';
import { MapInstanceCapture } from './map/MapInstanceCapture';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Drawing layer removed - will be implemented with proper leaflet-draw integration later

export default function TacticalMap() {
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: zones = [], isLoading: zonesLoading } = useServiceZones();
  const [visibleZones, setVisibleZones] = useState<Set<string>>(new Set());
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
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
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
      setMapReady(true);
    }
  }, []);

  return (
    <div className="relative h-screen w-full">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        preferCanvas={true}
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        inertia={false}
      >
        <>
          <MapInstanceCapture onMapReady={handleMapReady} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mapReady && (
            <>
              <ZoneLayer
                zones={zones}
                visibleZones={visibleZones}
                selectedZoneId={drawingState.selectedZoneId}
                onZoneClick={selectZone}
              />
              
              <DriverLayer
                drivers={drivers}
                onDriverClick={handleDriverClick}
                selectedDriverId={selectedDriverId}
              />
            </>
          )}
        </>
      </MapContainer>

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
