import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, Polygon } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
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
import 'leaflet-draw/dist/leaflet.draw.css';

// Import leaflet-draw
import 'leaflet-draw';
import L from 'leaflet';

const driverIcons = {
  available: new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" fill="#f0fdf4"/>
        <path d="M12 8v8"/>
        <path d="m8 12 4 4 4-4"/>
      </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  busy: new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" fill="#fffbeb"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  offline: new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" fill="#f1f5f9"/>
        <path d="M15 9l-6 6"/>
        <path d="M9 9l6 6"/>
      </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
};

function DrawingLayer() {
  const map = useMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
      },
    });

    drawControlRef.current = drawControl;

    return () => {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      map.removeLayer(drawnItems);
    };
  }, [map]);

  return null;
}

export default function TacticalMap() {
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: zones = [], isLoading: zonesLoading } = useServiceZones();
  const [visibleZones, setVisibleZones] = useState<Set<string>>(new Set());
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  
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
          mapRef.current?.setView([latitude, longitude], 15);
          toast.success('Location found');
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
      const coords = zone.geometry.geometry.coordinates[0] as [number, number][];
      const bounds = new LatLngBounds(coords.map(coord => [coord[1], coord[0]] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      selectZone(zoneId);
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

  const handleDriverClick = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (driver?.currentLocation && mapRef.current) {
      mapRef.current.setView([driver.currentLocation.lat, driver.currentLocation.lng], 15);
      setSelectedDriverId(driverId);
    }
  }, [drivers]);

  const defaultCenter: [number, number] = [9.0192, 38.7525]; // Addis Ababa
  const defaultZoom = 12;

  return (
    <div className="relative h-screen w-full">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <DrawingLayer />

        {/* Driver Markers */}
        {drivers.map(driver => {
          if (!driver.currentLocation) return null;
          
          const icon = driverIcons[driver.status];
          const initials = driver.name.split(' ').map(n => n[0]).join('').toUpperCase();

          return (
            <Marker
              key={driver.id}
              position={[driver.currentLocation.lat, driver.currentLocation.lng]}
              icon={icon}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <p className="font-semibold text-base mb-1">{driver.name}</p>
                  <p className="text-sm text-muted-foreground capitalize mb-2">
                    Status: {driver.status}
                  </p>
                  {driver.phone && (
                    <p className="text-xs text-muted-foreground mb-1">{driver.phone}</p>
                  )}
                  {driver.locationUpdatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Updated: {new Date(driver.locationUpdatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Zone Polygons */}
        {zones.map(zone => {
          if (!visibleZones.has(zone.id)) return null;

          const coords = zone.geometry.geometry.coordinates[0] as [number, number][];
          const positions = coords.map(coord => [coord[1], coord[0]] as [number, number]);

          return (
            <Polygon
              key={zone.id}
              positions={positions}
              pathOptions={{
                color: zone.color,
                fillColor: zone.color,
                fillOpacity: 0.15,
                weight: 2,
              }}
              eventHandlers={{
                click: () => selectZone(zone.id),
              }}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-semibold">{zone.name}</p>
                  {zone.description && (
                    <p className="text-sm text-muted-foreground mt-1">{zone.description}</p>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}
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
        onDriverClick={handleDriverClick}
      />
    </div>
  );
}
