/**
 * ZoneEditor Component
 *
 * Allows planners to create and edit service zones
 * Draft by default (active=false) - must be activated explicitly
 *
 * Features:
 * - Draw new zones (polygon)
 * - Edit existing zone boundaries
 * - Assign facilities to zones
 * - Save as draft (active=false)
 * - Version control
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, X, Save, AlertTriangle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet-draw';

interface ZoneEditorProps {
  map: L.Map | null;
  active: boolean;
  onClose: () => void;
  onSaveDraft?: (zone: any) => void;
}

export function ZoneEditor({ map, active, onClose, onSaveDraft }: ZoneEditorProps) {
  const [zoneName, setZoneName] = useState('');
  const [drawnZone, setDrawnZone] = useState<L.Polygon | null>(null);
  const [drawControl, setDrawControl] = useState<L.Control.Draw | null>(null);
  const [featureGroup, setFeatureGroup] = useState<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!map || !active) {
      // Clean up
      if (drawControl && map) {
        map.removeControl(drawControl);
      }
      if (featureGroup) {
        featureGroup.clearLayers();
        featureGroup.remove();
      }
      setDrawControl(null);
      setFeatureGroup(null);
      setDrawnZone(null);
      setZoneName('');
      return;
    }

    // Create feature group for drawn items
    const fg = L.featureGroup().addTo(map);
    setFeatureGroup(fg);

    // Create draw control
    const dc = new L.Control.Draw({
      edit: {
        featureGroup: fg,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          metric: true,
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
    });

    map.addControl(dc);
    setDrawControl(dc);

    // Handle draw events
    const handleDrawCreated = (e: any) => {
      const layer = e.layer as L.Polygon;
      fg.addLayer(layer);
      setDrawnZone(layer);
    };

    const handleDrawEdited = (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: L.Polygon) => {
        setDrawnZone(layer);
      });
    };

    map.on(L.Draw.Event.CREATED, handleDrawCreated);
    map.on(L.Draw.Event.EDITED, handleDrawEdited);

    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated);
      map.off(L.Draw.Event.EDITED, handleDrawEdited);
      if (dc) {
        map.removeControl(dc);
      }
      fg.clearLayers();
      fg.remove();
    };
  }, [map, active]);

  const handleSaveDraft = () => {
    if (!drawnZone || !zoneName) return;

    const coordinates = (drawnZone.getLatLngs()[0] as L.LatLng[]).map((ll) => [
      ll.lng,
      ll.lat,
    ]);

    const zoneData = {
      name: zoneName,
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
      active: false, // DRAFT by default
      version: 1,
      created_at: new Date().toISOString(),
    };

    if (onSaveDraft) {
      onSaveDraft(zoneData);
    }

    // Reset form
    setZoneName('');
    setDrawnZone(null);
    if (featureGroup) {
      featureGroup.clearLayers();
    }
  };

  if (!active) return null;

  return (
    <Card className="absolute top-24 right-4 z-[1000] p-4 w-80 bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-green-600" />
          <h3 className="font-semibold text-sm">Zone Editor</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-yellow-600">Draft Mode</p>
              <p className="text-xs text-muted-foreground mt-1">
                Changes are saved as drafts (inactive) and require activation
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Zone Name</label>
          <Input
            placeholder="Enter zone name..."
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="mt-1"
          />
        </div>

        {drawnZone && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Zone Drawn
              </Badge>
            </div>

            <Button
              onClick={handleSaveDraft}
              disabled={!zoneName}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Use the polygon tool to draw a zone on the map. Drafts must be reviewed and activated
            before they take effect.
          </p>
        </div>
      </div>
    </Card>
  );
}
