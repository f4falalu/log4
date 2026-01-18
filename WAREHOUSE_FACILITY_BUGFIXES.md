# Warehouse & Facility Critical Bugfixes

**Date:** January 10, 2026
**Status:** ⚠️ PARTIAL - Critical bugs fixed, sprite images missing

---

## Critical Errors Found

Based on browser console output, three critical errors prevented warehouses and facilities from rendering:

### Error 1: Undefined Layer IDs ❌→✅ FIXED

**Error Message:**
```
Error: Layer "undefined-symbols" already exists on this map.
Error: Layer "undefined-labels" already exists on this map.
```

**Root Cause:**
- `FacilitySymbolLayer` and `WarehouseSymbolLayer` were shadowing the parent class `config` property
- Line 48 (FacilitySymbolLayer): `private config: Required<FacilitySymbolLayerConfig>` shadowed `MapLayer.config`
- Line 72: `this.symbolLayerId = `${this.config.id}-symbols`` used the facility config (which has no `id` field), resulting in `undefined`

**Fix Applied:**

1. **Renamed facility-specific config** (FacilitySymbolLayer.ts):
   ```typescript
   // Before
   private config: Required<FacilitySymbolLayerConfig>;

   // After
   private facilityConfig: Required<FacilitySymbolLayerConfig>;
   ```

2. **Added `id` field to config interface**:
   ```typescript
   export interface FacilitySymbolLayerConfig {
     id?: string; // ← ADDED
     showLabels?: boolean;
     // ... other fields
   }
   ```

3. **Pass ID to parent constructor**:
   ```typescript
   super(map, facilities, handlers, {
     id: config.id || 'facilities-layer', // ← Use provided ID or default
     minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
   });
   ```

4. **Updated all references**:
   - `this.config.minZoom` → `this.facilityConfig.minZoom`
   - `this.config.iconSize` → `this.facilityConfig.iconSize`
   - `this.config.showLabels` → `this.facilityConfig.showLabels`
   - etc.

**Files Modified:**
- `src/map/layers/FacilitySymbolLayer.ts` (lines 18-20, 48, 62-74, 91-262)
- `src/map/layers/WarehouseSymbolLayer.ts` (lines 18-20, 51, 62-77, 93-254)

---

### Error 2: Source Already Exists on Reattachment ❌→✅ FIXED

**Error Message:**
```
Uncaught Error: Source "warehouses-layer-source" already exists.
Uncaught Error: Source "facilities-layer-source" already exists.
```

**Root Cause:**
- MapRuntime correctly calls `layer.remove()` before reattachment (line 252-254 in MapRuntime.ts)
- However, `FacilitySymbolLayer.add()` and `WarehouseSymbolLayer.add()` didn't check if source/layers already existed
- On navigation (Operational → Planning → Forensic), layers were being re-added without cleanup checks

**Fix Applied:**

Added source existence check in `add()` method:

```typescript
// Before
add(): void {
  const geoJson = this.dataToGeoJSON(this.data);
  this.map.addSource(this.geoJsonSourceId, { // ← Would throw if exists
    type: 'geojson',
    data: geoJson,
  });
  // ...
}

// After
add(): void {
  // Check if already added
  if (this.map.getSource(this.geoJsonSourceId)) {
    console.warn(`[FacilitySymbolLayer] Source ${this.geoJsonSourceId} already exists, skipping add`);
    return;
  }

  const geoJson = this.dataToGeoJSON(this.data);
  this.map.addSource(this.geoJsonSourceId, {
    type: 'geojson',
    data: geoJson,
  });
  // ...
}
```

**Files Modified:**
- `src/map/layers/FacilitySymbolLayer.ts` (lines 157-162)
- `src/map/layers/WarehouseSymbolLayer.ts` (lines 149-154)

---

### Error 3: Missing Sprite Images ❌ NOT FIXED

**Error Message:**
```
Image "entity.warehouse" could not be loaded. Please make sure you have added the image with map.addImage() or a "sprite" property in your style.
Image "entity.driver" could not be loaded.
Image "entity.facility" could not be loaded.
```

**Root Cause:**
- Sprite JSON exists: `/public/map/sprites/map-icons.json` ✅
- Sprite PNG missing: `/public/map/sprites/map-icons.png` ❌
- MapLibre style doesn't reference sprite sheet
- Layers try to use `icon-image: 'entity.warehouse'` but images aren't loaded

**Current State:**
- All symbol layers (warehouses, facilities, vehicles, drivers, batches, alerts) are affected
- Layers are mounted and data is being emitted, but icons don't render
- No visible markers on map

**Required Fixes:**

#### Option A: Generate Sprite PNG (Recommended)

1. **Create sprite sheet PNG** matching `map-icons.json`:
   - 182px × 78px image
   - Contains all 14 icons defined in JSON
   - Icons: facility, warehouse, vehicle, batch, alert, driver, waypoint, delayed, over_capacity, under_utilized, offline, completed, locate, layers

2. **Add sprite to MapLibre style**:
   ```typescript
   // In MapRuntime.ts or mapConfig.ts
   const style = {
     version: 8,
     sources: { /* ... */ },
     layers: [ /* ... */ ],
     sprite: '/map/sprites/map-icons', // ← ADD THIS
   };
   ```

3. **OR Load sprites programmatically**:
   ```typescript
   // After map loads
   map.on('load', () => {
     // Load each icon as image
     map.addImage('entity.warehouse', warehouseIconImage);
     map.addImage('entity.facility', facilityIconImage);
     // ... etc
   });
   ```

#### Option B: Use Circle Markers (Temporary Workaround)

Convert symbol layers to use `circle` type instead of `symbol`:

```typescript
// Instead of
{
  type: 'symbol',
  layout: {
    'icon-image': 'entity.warehouse',
    'icon-size': 0.85,
  }
}

// Use
{
  type: 'circle',
  paint: {
    'circle-radius': 8,
    'circle-color': '#14b8a6', // Teal for warehouses
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  }
}
```

**Recommendation:** Option A (generate sprite PNG) is better for production. The sprite JSON is already well-defined, we just need the matching PNG file.

---

## Summary of Fixes Applied

| Issue | Status | Impact |
|-------|--------|--------|
| Undefined layer IDs | ✅ FIXED | Layers now have correct IDs (`facilities-layer`, `warehouses-layer`) |
| Source already exists error | ✅ FIXED | Layers can be remounted on navigation without errors |
| Missing sprite images | ❌ NOT FIXED | **Warehouses and facilities still not visible** |
| State machine timeouts | ⚠️ CONSEQUENCE | LOADING_LAYERS times out because layers can't complete (waiting for sprites) |

---

## Current Behavior

### What Works ✅
- MapRuntime initializes successfully
- Layers are mounted (8 layers: warehouses, facilities, trails, routes, vehicles, drivers, alerts, batches)
- Data is emitted from DemoDataEngine (2 warehouses, 20 facilities)
- Layer sources are created with GeoJSON data
- Click handlers are wired up
- Navigation between map pages works without crashes

### What Doesn't Work ❌
- **No visible warehouse icons** - sprites missing
- **No visible facility icons** - sprites missing
- **No visible vehicle icons** - sprites missing
- **No visible driver icons** - sprites missing
- State machine times out in LOADING_LAYERS (because layers never fully load)

---

## Next Steps

### Priority 1: Fix Sprite Images (BLOCKING)

**Quick Fix (5-10 minutes):**
Generate a simple sprite PNG with colored circles:

```typescript
// Create simple colored markers for each entity type
const colors = {
  'entity.warehouse': '#14b8a6',    // Teal
  'entity.facility': '#f59e0b',     // Amber
  'entity.vehicle': '#3b82f6',      // Blue
  'entity.driver': '#10b981',       // Green
  'entity.batch': '#8b5cf6',        // Purple
  'entity.alert': '#ef4444',        // Red
  'entity.waypoint': '#6b7280',     // Gray
};

// Use canvas to generate 24×24px circles for each icon
// Export as single sprite sheet PNG (182px × 78px)
```

**OR:**

Use existing icon library (Lucide, Heroicons) and generate sprite sheet:

```bash
npm run generate-map-sprites
```

(If script doesn't exist, create it using the sprites generation template)

### Priority 2: Test Visibility

After sprites are added:

1. Navigate to `/fleetops/map/operational`
2. Verify 2 warehouse icons appear (teal markers)
3. Verify 20 facility icons appear (colored by type)
4. Verify vehicle trails connect warehouses → facilities → vehicles
5. Click warehouse/facility → verify console logs entity data

---

## Files Modified in This Fix

### Warehouse & Facility Layers
1. `src/map/layers/FacilitySymbolLayer.ts`
   - Renamed `config` → `facilityConfig` to avoid shadowing
   - Added `id` field to config interface
   - Added source existence check in `add()`
   - Updated all config references

2. `src/map/layers/WarehouseSymbolLayer.ts`
   - Renamed `config` → `warehouseConfig` to avoid shadowing
   - Added `id` field to config interface
   - Added source existence check in `add()`
   - Updated all config references

### Data Flow (Already Fixed in Previous Session)
3. `src/map/runtime/MapRuntime.ts`
   - Added facility/warehouse layer imports
   - Extended LayerHandlers interface
   - Mounted layers in correct order
   - Added data routing in `update()`

4. `src/map/demo/DemoDataEngine.ts`
   - Emitting facility and warehouse data

5. `src/components/map/OperationalMapLibre.tsx`
   - Added click handlers for warehouses/facilities

---

## Verification Commands

### Check Layer Mounting (Browser Console)
```javascript
// Verify layers are mounted
console.log('Mounted layers:', Array.from(mapRuntime.layers.keys()));
// Expected: ['warehouses', 'facilities', 'trails', 'routes', 'vehicles', 'drivers', 'alerts', 'batches']

// Check if sources have data
const warehouseSource = mapRuntime.map.getSource('warehouses-layer-source');
console.log('Warehouse source data:', warehouseSource._data);
// Expected: FeatureCollection with 2 warehouses

const facilitySource = mapRuntime.map.getSource('facilities-layer-source');
console.log('Facility source data:', facilitySource._data);
// Expected: FeatureCollection with 20 facilities
```

### Check Sprite Loading
```javascript
// Check if sprites are loaded
const style = mapRuntime.map.getStyle();
console.log('Sprite URL:', style.sprite);
// Expected: '/map/sprites/map-icons' or similar

// Check specific images
mapRuntime.map.hasImage('entity.warehouse'); // Should be true
mapRuntime.map.hasImage('entity.facility');  // Should be true
```

---

## Conclusion

**Bug Fixes:**
- ✅ Fixed undefined layer ID crash
- ✅ Fixed source already exists crash
- ✅ Improved layer lifecycle handling
- ✅ Navigation between map pages works smoothly

**Remaining Issue:**
- ❌ **Sprite images missing** - This is the ONLY blocker preventing visibility

**Impact:**
- Warehouses and facilities are fully wired up (data flow complete)
- Click handlers ready
- Layer rendering ready
- **Just need sprite PNG file to make icons visible**

**Recommendation:**
Generate sprite PNG file as highest priority. Once sprites are added, all warehouse/facility icons will immediately become visible.

---

**Fixed:** January 10, 2026 (Partial)
**Remaining Work:** Generate sprite PNG file (estimated 10 minutes)
**Impact:** High - Blocks all entity visualization on map
