import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useDrivers } from '@/hooks/useDrivers';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useRealtimeZones } from '@/hooks/useRealtimeZones';
import { useZoneDrawing } from '@/hooks/useZoneDrawing';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useMapState } from '@/contexts/MapStateContext';
import { MapToolsToolbar } from '@/components/map/MapToolsToolbar';
import { ServiceAreasMenu } from '@/components/map/ServiceAreasMenu';
import { DrawControls } from '@/components/map/DrawControls';
import { BottomDataPanel } from '@/components/map/BottomDataPanel';
import { SearchPanel } from '@/components/map/SearchPanel';
import { LayersPanel } from '@/components/map/LayersPanel';
import { MapLegend } from '@/components/map/MapLegend';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { LeafletMapCore } from '@/components/map/LeafletMapCore';
import { MapUtils } from '@/lib/mapUtils';

export default function TacticalMap() {
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: zones = [], isLoading: zonesLoading } = useServiceZones();
  const { data: facilities = [] } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  
  const { state: mapState, selectDriver, selectFacility, selectWarehouse } = useMapState();
  
  const [visibleZones, setVisibleZones] = useState<Set<string>>(new Set());
  const [serviceAreasOpen, setServiceAreasOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Layer groups for imperative rendering
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const driversLayerRef = useRef<L.LayerGroup | null>(null);
  const facilitiesLayerRef = useRef<L.LayerGroup | null>(null);
  const warehousesLayerRef = useRef<L.LayerGroup | null>(null);
  const drawLayerRef = useRef<L.FeatureGroup | null>(null);
  const currentDrawControlRef = useRef<any>(null);

  // Driver marker icon factory
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

  const handleMapReady = useCallback((map: L.Map) => {
    if (!mapRef.current && MapUtils.isMapReady(map)) {
      mapRef.current = map;
      
      // Initialize overlay layer groups with error handling
      try {
        zonesLayerRef.current = L.layerGroup().addTo(map);
        driversLayerRef.current = L.layerGroup().addTo(map);
        facilitiesLayerRef.current = L.layerGroup().addTo(map);
        warehousesLayerRef.current = L.layerGroup().addTo(map);
        drawLayerRef.current = L.featureGroup().addTo(map);
      } catch (e) {
        console.error('[TacticalMap] Failed to initialize layers:', e);
        return;
      }
      
      // Ensure proper sizing after mount
      MapUtils.safeInvalidateSize(map);
      setMapReady(true);
    }
  }, []);

  const handleStartDrawing = useCallback(() => {
    if (!mapRef.current || !drawLayerRef.current) return;
    
    const drawControl = new (L.Draw as any).Polygon(mapRef.current, {
      shapeOptions: {
        color: '#1D6AFF',
        fillOpacity: 0.3,
      },
      allowIntersection: false,
    });
    
    currentDrawControlRef.current = drawControl;
    drawControl.enable();
    startDrawing();
    toast.info('Drawing mode activated - click to add vertices');
    
    mapRef.current.once('draw:created', async (e: any) => {
      const layer = e.layer;
      const geoJSON = layer.toGeoJSON();
      
      const name = prompt('Enter service zone name:');
      if (!name) {
        stopDrawing();
        return;
      }
      
      try {
        const { error } = await supabase.functions.invoke('create-service-zone', {
          body: {
            name,
            geometry: geoJSON,
            color: '#1D6AFF',
            description: '',
          }
        });
        
        if (error) throw error;
        toast.success('Service zone created');
        stopDrawing();
      } catch (err) {
        console.error('Error creating zone:', err);
        toast.error('Failed to create zone');
      }
    });
  }, [startDrawing, stopDrawing]);

  const handleCancelDrawing = useCallback(() => {
    if (currentDrawControlRef.current) {
      currentDrawControlRef.current.disable();
      currentDrawControlRef.current = null;
    }
    stopDrawing();
    toast.info('Drawing cancelled');
  }, [stopDrawing]);

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
    const zone = zones.find(z => z.id === zoneId);
    if (!zone || !mapRef.current || !drawLayerRef.current) return;
    
    const coords = zone.geometry.geometry.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
    const polygon = L.polygon(coords, { color: zone.color });
    
    drawLayerRef.current.clearLayers();
    drawLayerRef.current.addLayer(polygon);
    
    const editControl = new (L as any).EditToolbar.Edit(mapRef.current, {
      featureGroup: drawLayerRef.current,
    });
    editControl.enable();
    
    startEditing(zoneId);
    toast.info('Edit mode active - drag vertices to modify');
    
    mapRef.current.once('draw:edited', async (e: any) => {
      const layers = e.layers;
      layers.eachLayer(async (layer: any) => {
        const geoJSON = layer.toGeoJSON();
        
        try {
          const { error } = await supabase.functions.invoke('update-service-zone', {
            body: {
              zone_id: zoneId,
              geometry: geoJSON,
            }
          });
          
          if (error) throw error;
          toast.success('Zone updated');
          stopEditing();
          drawLayerRef.current?.clearLayers();
        } catch (err) {
          console.error('Error updating zone:', err);
          toast.error('Failed to update zone');
        }
      });
    });
  }, [zones, startEditing, stopEditing]);

  const handleCancelEditing = useCallback(() => {
    if (drawLayerRef.current) {
      drawLayerRef.current.clearLayers();
    }
    stopEditing();
    toast.info('Editing cancelled');
  }, [stopEditing]);

  const handleDeleteZone = useCallback(async (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this service zone?')) return;
    
    try {
      const { error } = await supabase
        .from('service_zones')
        .delete()
        .eq('id', zoneId);

      if (error) throw error;
      toast.success('Service area deleted');
      setVisibleZones(prev => {
        const next = new Set(prev);
        next.delete(zoneId);
        return next;
      });
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
        selectDriver(driver.id);
      } catch (error) {
        console.error('[TacticalMap] Error centering on driver:', error);
      }
    }
  }, [selectDriver]);

  // Auto-fit bounds to all data
  const calculateMapBounds = useCallback(() => {
    const bounds = L.latLngBounds([]);
    let hasData = false;

    facilities.forEach(f => {
      if (f.lat && f.lng) {
        bounds.extend([f.lat, f.lng]);
        hasData = true;
      }
    });

    warehouses.forEach(w => {
      if (w.lat && w.lng) {
        bounds.extend([w.lat, w.lng]);
        hasData = true;
      }
    });

    zones.forEach(z => {
      if (visibleZones.has(z.id)) {
        const coords = z.geometry.geometry.coordinates[0];
        coords.forEach((coord: number[]) => bounds.extend([coord[1], coord[0]]));
        hasData = true;
      }
    });

    drivers.forEach(d => {
      if (d.currentLocation) {
        bounds.extend([d.currentLocation.lat, d.currentLocation.lng]);
        hasData = true;
      }
    });

    return hasData ? bounds : null;
  }, [facilities, warehouses, zones, visibleZones, drivers]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const bounds = calculateMapBounds();
    if (bounds && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [mapReady, calculateMapBounds]);

  const handleResetView = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = calculateMapBounds();
    if (bounds && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      toast.success('View reset to show all data');
    }
  }, [calculateMapBounds]);

  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    if (!MapUtils.isMapReady(mapRef.current)) return;
    
    mapRef.current!.setView([lat, lng], 16);
    
    try {
      const marker = L.marker([lat, lng])
        .bindPopup(`<strong>Searched Location</strong><br/>${address}`)
        .addTo(mapRef.current!)
        .openPopup();
      
      setTimeout(() => marker.remove(), 10000);
      toast.success('Location found');
    } catch (e) {
      console.error('[TacticalMap] Failed to add search marker:', e);
      toast.error('Failed to display location marker');
    }
  }, []);

  // Sync facilities layer
  useEffect(() => {
    if (!mapReady || !facilitiesLayerRef.current) return;

    facilitiesLayerRef.current.clearLayers();

    if (!mapState.visibleLayers.facilities) return;

    facilities.forEach((facility) => {
      if (!facility.lat || !facility.lng) return;

      const icon = L.divIcon({
        html: `<div style="background: ${mapState.selectedFacilityId === facility.id ? '#1D6AFF' : '#3B82F6'}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([facility.lat, facility.lng], { icon })
        .bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px;">${facility.name}</h3>
            <p style="margin: 4px 0;"><strong>Type:</strong> ${facility.type || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Address:</strong> ${facility.address || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Phone:</strong> ${facility.phone || 'N/A'}</p>
          </div>
        `)
        .on('click', () => {
          selectFacility(facility.id);
        });

      try {
        facilitiesLayerRef.current?.addLayer(marker);
      } catch (e) {
        console.error('[TacticalMap] Failed to add facility marker:', e);
      }
    });
  }, [mapReady, facilities, mapState.selectedFacilityId, mapState.visibleLayers.facilities, selectFacility]);

  // Sync warehouses layer
  useEffect(() => {
    if (!mapReady || !warehousesLayerRef.current) return;

    warehousesLayerRef.current.clearLayers();

    if (!mapState.visibleLayers.warehouses) return;

    warehouses.forEach((warehouse) => {
      if (!warehouse.lat || !warehouse.lng) return;

      const icon = L.divIcon({
        html: `<div style="background: #EF4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">W</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([warehouse.lat, warehouse.lng], { icon })
        .bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px;">${warehouse.name}</h3>
            <p style="margin: 4px 0;"><strong>Address:</strong> ${warehouse.address || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Capacity:</strong> ${warehouse.capacity || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Hours:</strong> ${warehouse.operatingHours || 'N/A'}</p>
          </div>
        `)
        .on('click', () => {
          if (mapRef.current) {
            mapRef.current.setView([warehouse.lat!, warehouse.lng!], 15);
            selectWarehouse(warehouse.id);
          }
        });

      try {
        warehousesLayerRef.current?.addLayer(marker);
      } catch (e) {
        console.error('[TacticalMap] Failed to add warehouse marker:', e);
      }
    });
  }, [mapReady, warehouses, mapState.visibleLayers.warehouses, selectWarehouse]);

  // Sync drivers layer
  useEffect(() => {
    if (!mapReady || !MapUtils.isMapReady(mapRef.current)) return;
    
    if (!driversLayerRef.current) {
      try {
        driversLayerRef.current = L.layerGroup().addTo(mapRef.current!);
      } catch (e) {
        console.error('[TacticalMap] Failed to initialize drivers layer:', e);
        return;
      }
    }
    
    const layer = driversLayerRef.current;
    layer.clearLayers();

    if (!mapState.visibleLayers.drivers) return;

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

      try {
        marker.addTo(layer);
      } catch (e) {
        console.error('[TacticalMap] Failed to add driver marker:', e);
      }
    });

    return () => {
      layer.clearLayers();
    };
  }, [drivers, mapReady, mapState.visibleLayers.drivers, handleDriverClick]);

  // Sync zones layer
  useEffect(() => {
    if (!mapReady || !MapUtils.isMapReady(mapRef.current)) return;
    
    if (!zonesLayerRef.current) {
      try {
        zonesLayerRef.current = L.layerGroup().addTo(mapRef.current!);
      } catch (e) {
        console.error('[TacticalMap] Failed to initialize zones layer:', e);
        return;
      }
    }
    
    const layer = zonesLayerRef.current;
    layer.clearLayers();

    if (!mapState.visibleLayers.zones) return;

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

      try {
        polygon.addTo(layer);
      } catch (e) {
        console.error('[TacticalMap] Failed to add zone polygon:', e);
      }
    });

    return () => {
      layer.clearLayers();
    };
  }, [zones, visibleZones, drawingState.selectedZoneId, mapReady, mapState.visibleLayers.zones, selectZone]);

  const defaultCenter: [number, number] = [9.0192, 38.7525];
  const defaultZoom = 12;

  return (
    <div className="relative h-screen w-full">
      <LeafletMapCore
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        onReady={handleMapReady}
        onDestroy={() => {
          try {
            // Clear any drawing controls
            if ((currentDrawControlRef.current as any)?.disable) {
              (currentDrawControlRef.current as any).disable();
            }
          } catch (e) {
            console.warn('[TacticalMap] Error disabling draw control on destroy', e);
          }
          currentDrawControlRef.current = null;

          // Clear and null overlay layer groups
          try { zonesLayerRef.current?.clearLayers(); } catch {}
          try { driversLayerRef.current?.clearLayers(); } catch {}
          try { facilitiesLayerRef.current?.clearLayers(); } catch {}
          try { warehousesLayerRef.current?.clearLayers(); } catch {}
          try { drawLayerRef.current?.clearLayers(); } catch {}

          zonesLayerRef.current = null;
          driversLayerRef.current = null;
          facilitiesLayerRef.current = null;
          warehousesLayerRef.current = null;
          drawLayerRef.current = null;

          // Mark map as not ready and drop reference to destroyed map
          mapRef.current = null;
          setMapReady(false);
        }}
      />

      <MapToolsToolbar
        onLocateMe={() => {
          if (navigator.geolocation && mapRef.current) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 15);
                toast.success('Location found');
              },
              () => toast.error('Unable to get location')
            );
          }
        }}
        onServiceAreasClick={() => setServiceAreasOpen(!serviceAreasOpen)}
        onSearchClick={() => setSearchOpen(!searchOpen)}
        onDrawToggle={handleStartDrawing}
        onLayersClick={() => setLayersOpen(!layersOpen)}
        onMeasureClick={() => {
          setIsMeasuring(!isMeasuring);
          toast.info(isMeasuring ? 'Measurement mode disabled' : 'Measurement tool coming soon');
        }}
        onLegendClick={() => setLegendOpen(!legendOpen)}
        isDrawing={drawingState.isDrawing}
        isMeasuring={isMeasuring}
      />

      {drawingState.isDrawing && (
        <DrawControls
          isVisible={drawingState.isDrawing}
          onFinish={() => {
            if (currentDrawControlRef.current) {
              currentDrawControlRef.current.completeShape();
            }
          }}
          onCancel={handleCancelDrawing}
          onDeleteLastPoint={() => {
            if (currentDrawControlRef.current && currentDrawControlRef.current._markers) {
              const markers = currentDrawControlRef.current._markers;
              if (markers.length > 0) {
                markers[markers.length - 1].remove();
                markers.pop();
              }
            }
          }}
        />
      )}

      {drawingState.isEditing && (
        <div className="absolute top-20 right-4 z-[1000] bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg">
          <p className="text-sm mb-2">Editing zone - drag vertices to modify</p>
          <Button size="sm" variant="outline" onClick={handleCancelEditing}>
            Cancel Editing
          </Button>
        </div>
      )}

      <SearchPanel
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onLocationSelect={handleLocationSelect}
      />

      <LayersPanel
        isOpen={layersOpen}
        onClose={() => setLayersOpen(false)}
      />

      <MapLegend
        isOpen={legendOpen}
        onClose={() => setLegendOpen(false)}
      />

      <ServiceAreasMenu
        zones={zones}
        visibleZones={visibleZones}
        selectedZoneId={drawingState.selectedZoneId}
        onToggleVisibility={handleToggleVisibility}
        onCenterOnZone={handleCenterOnZone}
        onEditZone={handleEditZone}
        onDeleteZone={handleDeleteZone}
        onCreateNew={handleStartDrawing}
      >
        <div />
      </ServiceAreasMenu>

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
