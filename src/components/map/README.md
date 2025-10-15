# Map System Architecture

## Overview

The map system is built on a unified, modular architecture that eliminates code duplication and ensures consistency across all map views. All maps in the application use the same base components, shared utilities, and layer rendering logic.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (MapView, TacticalMap, CommandCenter)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├──► Modular Layer Components
                      │    ├─ FacilitiesLayer
                      │    ├─ WarehousesLayer
                      │    ├─ DriversLayer
                      │    ├─ RoutesLayer
                      │    └─ BatchesLayer
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    LeafletMapCore                            │
│  (Base map initialization & lifecycle management)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├──► Map Configuration (mapConfig.ts)
                      │    ├─ Tile providers
                      │    ├─ Default settings
                      │    └─ Leaflet options
                      │
                      ├──► Map Icons (mapIcons.ts)
                      │    ├─ Facility icons
                      │    ├─ Warehouse icons
                      │    ├─ Driver icons
                      │    └─ Waypoint icons
                      │
                      └──► Map Utilities (mapUtils.ts)
                           ├─ Bounds fitting
                           ├─ Safe invalidation
                           └─ Control factories
```

## Core Components

### LeafletMapCore (`src/components/map/LeafletMapCore.tsx`)

The foundational map component that handles:
- Leaflet map initialization and cleanup
- Tile layer management (Standard OSM, Humanitarian, CARTO Light/Dark)
- Optional controls (layer switcher, scale, zoom)
- Lifecycle callbacks (`onReady`, `onDestroy`)

**Props:**
```typescript
interface LeafletMapCoreProps {
  center?: [number, number];           // Default: [12.0, 8.5]
  zoom?: number;                       // Default: 6
  className?: string;
  tileProvider?: TileProvider;         // 'standard' | 'humanitarian' | 'cartoLight' | 'cartoDark'
  showLayerSwitcher?: boolean;         // Default: false
  showScaleControl?: boolean;          // Default: false
  showResetControl?: boolean;          // Default: false
  onReady: (map: L.Map) => void;
  onDestroy?: () => void;
}
```

**Usage:**
```tsx
<LeafletMapCore
  center={[12.0, 8.5]}
  zoom={6}
  tileProvider="standard"
  showLayerSwitcher={true}
  showScaleControl={true}
  onReady={(map) => setMapInstance(map)}
/>
```

## Modular Layer Components

All layer components follow a consistent pattern:
- Accept a `map` instance and data props
- Manage their own Leaflet layer groups
- Handle rendering, updates, and cleanup automatically
- Support optional click handlers

### FacilitiesLayer

Renders facility markers with popups.

**Props:**
```typescript
interface FacilitiesLayerProps {
  map: L.Map | null;
  facilities: Facility[];
  selectedIds?: string[];
  onFacilityClick?: (id: string) => void;
}
```

### WarehousesLayer

Renders warehouse markers with capacity information.

**Props:**
```typescript
interface WarehousesLayerProps {
  map: L.Map | null;
  warehouses: Warehouse[];
  selectedIds?: string[];
  onWarehouseClick?: (id: string) => void;
}
```

### DriversLayer

Renders driver position markers with status indicators and active delivery lines.

**Props:**
```typescript
interface DriversLayerProps {
  map: L.Map | null;
  drivers: Driver[];
  batches?: DeliveryBatch[];
  onDriverClick?: (id: string) => void;
}
```

### RoutesLayer

Renders route polylines between warehouses and facilities.

**Props:**
```typescript
interface RoutesLayerProps {
  map: L.Map | null;
  routes: RouteOptimization[];
  warehouses: Warehouse[];
}
```

### BatchesLayer

Renders delivery batch routes with status-based styling and selection support.

**Props:**
```typescript
interface BatchesLayerProps {
  map: L.Map | null;
  batches: DeliveryBatch[];
  warehouses: Warehouse[];
  selectedBatchId?: string | null;
  onBatchClick?: (id: string) => void;
}
```

## Shared Modules

### Map Configuration (`src/lib/mapConfig.ts`)

Centralized configuration for all maps:

```typescript
export const MAP_CONFIG = {
  defaultCenter: [12.0, 8.5],
  defaultZoom: 6,
  maxZoom: 19,
  tileProviders: { ... },
  leafletOptions: { ... }
}
```

### Map Icons (`src/lib/mapIcons.ts`)

Factory functions for creating consistent map markers:

```typescript
MapIcons.facility(selected?: boolean): L.Icon
MapIcons.warehouse(selected?: boolean): L.DivIcon
MapIcons.driver(status, initials, isActive?): L.DivIcon
MapIcons.waypoint(number): L.DivIcon
```

### Map Utilities (`src/lib/mapUtils.ts`)

Common map operations:

```typescript
MapUtils.fitBoundsToMarkers(map, markers, padding?)
MapUtils.safeInvalidateSize(map)
MapUtils.createResetControl(map, getMarkers, defaultView)
```

## Usage Examples

### Simple Map with Facilities

```tsx
import { useState } from 'react';
import { LeafletMapCore } from '@/components/map/LeafletMapCore';
import { FacilitiesLayer } from '@/components/map/layers/FacilitiesLayer';

function MyMap({ facilities }) {
  const [map, setMap] = useState(null);
  
  return (
    <div className="h-[600px] w-full">
      <LeafletMapCore onReady={setMap} />
      <FacilitiesLayer map={map} facilities={facilities} />
    </div>
  );
}
```

### Complex Map with Multiple Layers

```tsx
import { useState } from 'react';
import { LeafletMapCore } from '@/components/map/LeafletMapCore';
import { FacilitiesLayer } from '@/components/map/layers/FacilitiesLayer';
import { WarehousesLayer } from '@/components/map/layers/WarehousesLayer';
import { DriversLayer } from '@/components/map/layers/DriversLayer';
import { BatchesLayer } from '@/components/map/layers/BatchesLayer';

function AdvancedMap({ facilities, warehouses, drivers, batches }) {
  const [map, setMap] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  
  return (
    <div className="h-[600px] w-full">
      <LeafletMapCore
        tileProvider="standard"
        showLayerSwitcher={true}
        showScaleControl={true}
        onReady={setMap}
      />
      
      {/* Layers render in order */}
      <WarehousesLayer map={map} warehouses={warehouses} />
      <DriversLayer map={map} drivers={drivers} batches={batches} />
      <FacilitiesLayer map={map} facilities={facilities} />
      <BatchesLayer
        map={map}
        batches={batches}
        warehouses={warehouses}
        selectedBatchId={selectedBatchId}
        onBatchClick={setSelectedBatchId}
      />
    </div>
  );
}
```

## Adding New Layer Types

To add a new layer type:

1. **Create the layer component** in `src/components/map/layers/`:

```tsx
// NewFeatureLayer.tsx
import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface NewFeatureLayerProps {
  map: L.Map | null;
  features: Feature[];
}

export function NewFeatureLayer({ map, features }: NewFeatureLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;
    
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }
    
    layerRef.current.clearLayers();
    
    // Add your markers/shapes here
    features.forEach(feature => {
      // ... render logic
    });
    
    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, features]);
  
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
        layerRef.current.remove();
      }
    };
  }, []);
  
  return null;
}
```

2. **Use the layer** in your map component:

```tsx
<LeafletMapCore onReady={setMap} />
<NewFeatureLayer map={map} features={myFeatures} />
```

## Best Practices

### ✅ DO

- Use `LeafletMapCore` for all new maps
- Use layer components for rendering map data
- Import icons from `MapIcons` factory
- Use `MapUtils` for common operations
- Pass `map` instance to all layer components
- Clean up layers in `useEffect` cleanup functions

### ❌ DON'T

- Initialize maps directly with `L.map()`
- Create custom icon definitions in components
- Duplicate map utilities or helper functions
- Access Leaflet directly in parent components
- Forget to handle `null` map instances
- Create markers without proper cleanup

## Migration Guide

### From Old Pattern (Direct Leaflet)

**Before:**
```tsx
const mapRef = useRef();
const mapInstance = useRef();

useEffect(() => {
  const map = L.map(mapRef.current).setView([12, 8], 6);
  L.tileLayer('...').addTo(map);
  mapInstance.current = map;
  
  // Add markers manually
  facilities.forEach(f => {
    L.marker([f.lat, f.lng]).addTo(map);
  });
}, []);

return <div ref={mapRef} />;
```

**After:**
```tsx
const [map, setMap] = useState(null);

return (
  <>
    <LeafletMapCore onReady={setMap} />
    <FacilitiesLayer map={map} facilities={facilities} />
  </>
);
```

## Performance Considerations

- **Layer Components**: Each layer manages its own cleanup, preventing memory leaks
- **Selective Updates**: Layers only re-render when their specific data changes
- **Canvas Rendering**: `preferCanvas: true` in config improves performance with many markers
- **Bounds Fitting**: `MapUtils.fitBoundsToMarkers()` uses `requestAnimationFrame` for smooth animations

## Troubleshooting

### Map not displaying

- Ensure `leaflet/dist/leaflet.css` is imported
- Check that container has explicit height
- Verify `onReady` callback is setting map state

### Layers not appearing

- Confirm `map` prop is not `null`
- Check data arrays are not empty
- Verify coordinates are valid (lat: -90 to 90, lng: -180 to 180)

### Memory leaks

- Ensure layer components have cleanup in `useEffect`
- Verify `layerRef.current?.remove()` is called on unmount
- Check that markers are cleared before re-rendering

## Future Enhancements

- [ ] Add layer visibility toggle controls
- [ ] Implement marker clustering for large datasets
- [ ] Add drawing/editing tools for zones
- [ ] Create animation utilities for route progress
- [ ] Add heatmap layer support
- [ ] Implement geofencing visualization
