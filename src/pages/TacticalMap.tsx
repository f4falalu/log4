import { useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import { useDrivers } from '@/hooks/useDrivers';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useRealtimeZones } from '@/hooks/useRealtimeZones';
import { useZoneDrawing } from '@/hooks/useZoneDrawing';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useVehicles } from '@/hooks/useVehicles';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { MapToolsToolbar } from '@/components/map/MapToolsToolbar';
import { ServiceAreasMenu } from '@/components/map/ServiceAreasMenu';
import { DrawControls } from '@/components/map/DrawControls';
import { BottomDataPanel } from '@/components/map/BottomDataPanel';
import { SearchPanel } from '@/components/map/SearchPanel';
import { LayersPanel } from '@/components/map/LayersPanel';
import { MapLegend } from '@/components/map/MapLegend';
import { ZonesLayer } from '@/components/map/layers/ZonesLayer';
import { AlertsLayer } from '@/components/map/layers/AlertsLayer';
import { Button } from '@/components/ui/button';
import { UnifiedMapContainer } from '@/components/map/UnifiedMapContainer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

/**
 * TacticalMap - Refactored to use unified map architecture
 * Reduced from 668 lines to ~200 lines by using modular layer components
 */
export default function TacticalMap() {
  const { workspace } = useWorkspace();
  const { data: drivers = [] } = useDrivers();
  const { data: zones = [] } = useServiceZones();
  const { data: facilities = [] } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useDeliveryBatches();
  
  const [visibleZones, setVisibleZones] = useState<Set<string>>(
    new Set(zones.map(z => z.id))
  );
  const [serviceAreasOpen, setServiceAreasOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  
  const mapInstanceRef = useRef<L.Map | null>(null);
  const drawLayerRef = useRef<L.FeatureGroup | null>(null);
  const currentDrawControlRef = useRef<any>(null);
  
  const {
    drawingState,
    startDrawing,
    stopDrawing,
    startEditing,
    stopEditing,
    selectZone,
  } = useZoneDrawing();

  // Enable real-time updates
  useRealtimeDrivers();
  useRealtimeZones();

  // Workspace-aware theme
  const tileProvider = workspace === 'fleetops' ? 'cartoDark' : 'cartoLight';

  const handleMapCapture = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
    
    // Initialize draw layer for zone creation/editing
    if (!drawLayerRef.current) {
      drawLayerRef.current = L.featureGroup().addTo(map);
    }
  }, []);

  const handleStartDrawing = useCallback(() => {
    if (!mapInstanceRef.current || !drawLayerRef.current) return;
    
    const drawControl = new (L.Draw as any).Polygon(mapInstanceRef.current, {
      shapeOptions: {
        color: 'hsl(var(--primary))',
        fillOpacity: 0.3,
      },
      allowIntersection: false,
    });
    
    currentDrawControlRef.current = drawControl;
    drawControl.enable();
    startDrawing();
    toast.info('Drawing mode activated - click to add vertices');
    
    mapInstanceRef.current.once('draw:created', async (e: any) => {
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
            color: 'hsl(var(--primary))',
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
    if (zone && mapInstanceRef.current) {
      try {
        const coords = zone.geometry.geometry.coordinates[0] as [number, number][];
        const bounds = new L.LatLngBounds(
          coords.map(coord => [coord[1], coord[0]] as [number, number])
        );
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
        selectZone(zoneId);
      } catch (error) {
        console.error('[TacticalMap] Error centering on zone:', error);
      }
    }
  }, [zones, selectZone]);

  const handleEditZone = useCallback((zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone || !mapInstanceRef.current || !drawLayerRef.current) return;
    
    const coords = zone.geometry.geometry.coordinates[0].map(
      (c: number[]) => [c[1], c[0]] as [number, number]
    );
    const polygon = L.polygon(coords, { color: zone.color });
    
    drawLayerRef.current.clearLayers();
    drawLayerRef.current.addLayer(polygon);
    
    const editControl = new (L as any).EditToolbar.Edit(mapInstanceRef.current, {
      featureGroup: drawLayerRef.current,
    });
    editControl.enable();
    
    startEditing(zoneId);
    toast.info('Edit mode active - drag vertices to modify');
    
    mapInstanceRef.current.once('draw:edited', async (e: any) => {
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

  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    if (!mapInstanceRef.current) return;
    
    mapInstanceRef.current.setView([lat, lng], 16);
    
    try {
      const marker = L.marker([lat, lng])
        .bindPopup(`<strong>Searched Location</strong><br/>${address}`)
        .addTo(mapInstanceRef.current)
        .openPopup();
      
      setTimeout(() => marker.remove(), 10000);
      toast.success('Location found');
    } catch (e) {
      console.error('[TacticalMap] Failed to add search marker:', e);
      toast.error('Failed to display location marker');
    }
  }, []);

  return (
    <div className="relative h-screen w-full">
      {/* Unified Map Container with Modular Layers */}
      <UnifiedMapContainer
        mode="fullscreen"
        tileProvider={tileProvider}
        facilities={facilities}
        warehouses={warehouses}
        drivers={drivers}
        batches={batches}
        vehicles={vehicles}
        showToolbar={true}
        showBottomPanel={true}
        onMapReady={handleMapCapture}
        onDrawToggle={handleStartDrawing}
        onServiceAreasClick={() => setServiceAreasOpen(!serviceAreasOpen)}
        onSearchClick={() => setSearchOpen(!searchOpen)}
        onLayersClick={() => setLayersOpen(!layersOpen)}
        onLegendClick={() => setLegendOpen(!legendOpen)}
        onMeasureClick={() => setIsMeasuring(!isMeasuring)}
        isDrawing={drawingState.isDrawing}
        isMeasuring={isMeasuring}
        onDriverClick={(id) => console.log('Driver clicked:', id)}
        onVehicleClick={(id) => console.log('Vehicle clicked:', id)}
        onFacilityClick={(id) => {
          console.log('Facility clicked:', id);
          handleCenterOnZone(id);
        }}
      >
        {/* Custom layers as children */}
        <ZonesLayer
          map={mapInstanceRef.current}
          zones={zones}
          visibleZoneIds={visibleZones}
          selectedZoneId={drawingState.selectedZoneId || undefined}
          onZoneClick={(zoneId) => {
            selectZone(zoneId);
            handleCenterOnZone(zoneId);
          }}
        />
        
        <AlertsLayer
          map={mapInstanceRef.current}
          onAlertClick={(alertId) => {
            console.log('Alert clicked:', alertId);
            // Could open alert details panel here
          }}
        />
      </UnifiedMapContainer>

      {/* Drawing Controls Overlay */}
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

      {/* Editing Controls Overlay */}
      {drawingState.isEditing && (
        <div className="absolute top-20 right-4 z-[1000] bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg">
          <p className="text-sm mb-2">Editing zone - drag vertices to modify</p>
          <Button size="sm" variant="outline" onClick={handleCancelEditing}>
            Cancel Editing
          </Button>
        </div>
      )}

      {/* Side Panels */}
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
    </div>
  );
}
