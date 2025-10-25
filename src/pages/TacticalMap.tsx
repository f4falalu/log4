import { useState, useRef, useCallback } from 'react';
import { useDrivers } from '@/hooks/useDrivers';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useVehicles } from '@/hooks/useVehicles';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { useRealtimeZones } from '@/hooks/useRealtimeZones';
import { useMapLayers } from '@/hooks/useMapLayers';
import { UnifiedMapContainer } from '@/components/map/UnifiedMapContainer';
import { MapInstanceCapture } from '@/components/map/MapInstanceCapture';
import { MapToolbar } from '@/components/map/ui/MapToolbar';
import { CommandSidebar } from '@/components/map/ui/CommandSidebar';
import { InsightBar } from '@/components/map/ui/InsightBar';
import { PanelDrawer } from '@/components/map/ui/PanelDrawer';
import { ServiceAreasMenu } from '@/components/map/ServiceAreasMenu';
import { DrawControls } from '@/components/map/DrawControls';
import type { ServiceZone } from '@/types/zones';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet-draw';

export default function TacticalMap() {
  const { data: drivers = [] } = useDrivers();
  const { data: zones = [], refetch: refetchZones } = useServiceZones();
  const { data: facilities = [] } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useDeliveryBatches();
  const { layers } = useMapLayers();
  
  useRealtimeDrivers();
  useRealtimeZones();
  
  const [serviceAreasOpen, setServiceAreasOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [visibleZones, setVisibleZones] = useState<Set<string>>(new Set());
  const [editingZone, setEditingZone] = useState<string | null>(null);
  
  const mapInstanceRef = useRef<L.Map | null>(null);
  const drawingLayerRef = useRef<L.FeatureGroup | null>(null);

  const handleMapCapture = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
    
    if (!drawingLayerRef.current) {
      drawingLayerRef.current = L.featureGroup().addTo(map);
    }
  }, []);

  const handleStartDrawing = useCallback(async () => {
    const name = prompt('Enter zone name:');
    if (!name) return;
    
    setIsDrawing(true);
    toast.info('Click on the map to draw the zone boundary');
  }, []);

  const handleCancelDrawing = useCallback(() => {
    setIsDrawing(false);
    toast.info('Drawing cancelled');
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
    if (zone && mapInstanceRef.current) {
      try {
        const coords = zone.geometry.geometry.coordinates[0] as [number, number][];
        const bounds = new L.LatLngBounds(
          coords.map(coord => [coord[1], coord[0]] as [number, number])
        );
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.error('Error centering on zone:', error);
      }
    }
  }, [zones]);

  const handleEditZone = useCallback((zoneId: string, coordinates: L.LatLng[]) => {
    console.log('Edit zone:', zoneId, coordinates);
    setEditingZone(null);
    toast.success('Zone updated');
  }, []);

  const handleCancelEditing = useCallback(() => {
    setEditingZone(null);
    toast.info('Editing cancelled');
  }, []);

  const handleDeleteZone = useCallback(async (zoneId: string) => {
    if (!confirm('Delete this zone?')) return;
    
    try {
      const { error } = await supabase
        .from('service_zones')
        .delete()
        .eq('id', zoneId);

      if (error) throw error;
      toast.success('Zone deleted');
      refetchZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('Failed to delete zone');
    }
  }, [refetchZones]);

  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    if (!mapInstanceRef.current) return;
    
    mapInstanceRef.current.setView([lat, lng], 16);
    toast.success('Location found');
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Toolbar */}
      <MapToolbar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative">
          <UnifiedMapContainer
            mode="fullscreen"
            facilities={layers.facilities ? facilities : []}
            warehouses={layers.warehouses ? warehouses : []}
            drivers={layers.drivers ? drivers : []}
            batches={layers.batches ? batches : []}
            vehicles={layers.vehicles ? vehicles : []}
            showToolbar={false}
            showBottomPanel={false}
            onMapReady={handleMapCapture}
          >            
            {isDrawing && (
              <DrawControls
                isVisible={isDrawing}
                onFinish={() => setIsDrawing(false)}
                onCancel={handleCancelDrawing}
                onDeleteLastPoint={() => {}}
              />
            )}
            
            {editingZone && drawingLayerRef.current && (
              <div className="absolute top-4 right-4 z-[1000] bg-background border border-border rounded-lg shadow-lg p-4 space-y-2">
                <p className="text-sm font-medium">Edit Zone: {zones.find(z => z.id === editingZone)?.name}</p>
                <p className="text-xs text-muted-foreground">Drag vertices to reshape the zone</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEditing}
                    className="flex-1 px-3 py-1.5 text-xs border border-input rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editingZone && drawingLayerRef.current) {
                        const layers = drawingLayerRef.current.getLayers();
                        const layer = layers.find((l: any) => l.options?.zoneId === editingZone);
                        if (layer && 'getLatLngs' in layer) {
                          const coordinates = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
                          handleEditZone(editingZone, coordinates);
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </UnifiedMapContainer>

          {/* Floating Service Areas Menu */}
          <div className="absolute top-20 right-4 z-[1000]">
            <ServiceAreasMenu
              zones={zones}
              visibleZones={visibleZones}
              selectedZoneId={editingZone}
              onToggleVisibility={handleToggleVisibility}
              onCenterOnZone={handleCenterOnZone}
              onEditZone={(zoneId) => {
                const zone = zones.find(z => z.id === zoneId);
                if (zone) {
                  setEditingZone(zoneId);
                  if (drawingLayerRef.current) {
                    const layers = drawingLayerRef.current.getLayers();
                    const layer = layers.find((l: any) => l.options?.zoneId === zoneId);
                    if (layer && 'editing' in layer) {
                      (layer as any).editing.enable();
                    }
                  }
                }
              }}
              onDeleteZone={handleDeleteZone}
              onCreateNew={handleStartDrawing}
            >
              <div />
            </ServiceAreasMenu>
          </div>
        </div>
        
        {/* Right Command Sidebar */}
        <CommandSidebar />
      </div>
      
      {/* Bottom Insight Bar */}
      <InsightBar />
      
      {/* Detail Drawer */}
      <PanelDrawer />
    </div>
  );
}
