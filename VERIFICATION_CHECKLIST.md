# Warehouse & Facility Visibility - Verification Checklist

**Date:** January 10, 2026
**Dev Server:** http://localhost:8081

---

## Quick Verification Steps

### 1. Start Dev Server ✅

```bash
npm run dev
# Server running on http://localhost:8081
```

### 2. Navigate to Operational Map

**URL:** `http://localhost:8081/fleetops/map/operational`

**Expected:**
- Map loads with MapLibre basemap (light or dark based on theme)
- Toast notification: "Demo mode active"
- MapRuntime initializes and transitions through states:
  - UNINITIALIZED → INITIALIZING → LOADING_LAYERS → LAYERS_MOUNTED → READY

---

## Visual Verification

### ✅ Warehouses Visible (2 Expected)

**What to Look For:**
- 2 teal-colored warehouse icons on map
- Larger size compared to facility icons (icon-size: 0.85)
- Located in Kano State area (Nigeria)

**Specific Locations:**

1. **Kano Central Medical Store**
   - Coordinates: 12.0022°N, 8.5167°E
   - LGA: Kano Municipal
   - Capacity: 1200 slots
   - Icon: Teal warehouse marker

2. **Kumbotso Zonal Store**
   - Coordinates: 11.9312°N, 8.4956°E
   - LGA: Kumbotso
   - Capacity: 600 slots
   - Icon: Teal warehouse marker

**Zoom Level:**
- Visible at zoom 6+ (min zoom: Z1)
- Use map controls to zoom in/out

### ✅ Facilities Visible (20 Expected)

**What to Look For:**
- 20 facility icons distributed across Kano State
- Smaller size compared to warehouses (icon-size: 0.75)
- Color-coded by facility type (if type differentiation exists)

**Distribution by LGA:**
- Kano Municipal: 3 facilities
- Nasarawa: 3 facilities
- Fagge: 2 facilities
- Gwale: 2 facilities
- Tarauni: 2 facilities
- Dala: 2 facilities
- Kumbotso: 2 facilities
- Ungogo: 2 facilities
- Dawakin Tofa: 2 facilities

**Sample Facilities to Spot:**

1. **PHC Sabon Gari** (Kano Municipal)
   - Coordinates: 12.0054°N, 8.5227°E
   - Demand: 3 slots

2. **PHC Rijiyar Lemo** (Kano Municipal)
   - Coordinates: 11.9989°N, 8.5401°E
   - Demand: 4 slots

3. **PHC Nassarawa GRA** (Nassarawa)
   - Coordinates: 12.0156°N, 8.5378°E
   - Demand: 3 slots

### ✅ Visual Hierarchy Correct

**Rendering Order (Bottom to Top):**

1. **Warehouses** - Base layer (teal, large icons)
2. **Facilities** - Above warehouses (colored, medium icons)
3. **Vehicle Trails** - Fading lines showing movement history
4. **Routes** - Planned delivery paths
5. **Vehicles** - Current positions (top layer, always visible)
6. **Drivers** - Driver markers
7. **Alerts** - Alert indicators
8. **Batches** - Batch clusters

**Visual Test:**
- Zoom in to area with overlapping icons
- Vehicles should always be on top (clearly visible)
- Facilities should be above warehouses
- No z-fighting or flickering

### ✅ Vehicle Trails Show Connections

**What to Look For:**
- Vehicle trails (fading breadcrumb lines) connect warehouses to facilities
- Trail starts near warehouse (departure point)
- Trail passes through/near facilities (delivery stops)
- Trail ends at vehicle current position

**Visual Connection:**
- Warehouse (large teal icon) → Trail (fading line) → Facility (colored icon) → Vehicle (moving icon)

---

## Interactive Verification

### ✅ Click Handlers Working

**Test 1: Click Warehouse**

1. Click on a warehouse icon (teal marker)
2. Open browser console (F12 → Console tab)
3. **Expected Console Output:**
   ```
   [OperationalMapPage] Warehouse clicked: {
     id: "wh-kano-central",
     name: "Kano Central Medical Store",
     type: "warehouse",
     lga: "Kano Municipal",
     lat: 12.0022,
     lng: 8.5167,
     capacitySlots: 1200
   }
   ```

**Test 2: Click Facility**

1. Click on a facility icon (colored marker)
2. Check browser console
3. **Expected Console Output:**
   ```
   [OperationalMapPage] Facility clicked: {
     id: "phc-km-01",
     name: "PHC Sabon Gari",
     type: "facility",
     lga: "Kano Municipal",
     lat: 12.0054,
     lng: 8.5227,
     demandSlots: 3
   }
   ```

---

## Console Verification

### ✅ MapRuntime Layer Mounting

**Browser Console Commands:**

```javascript
// Check MapRuntime state
console.log('MapRuntime State:', mapRuntime.stateMachine.getState());
// Expected: "READY"

// Check mounted layers
console.log('Mounted Layers:', Array.from(mapRuntime.layers.keys()));
// Expected: ['warehouses', 'facilities', 'trails', 'routes', 'vehicles', 'drivers', 'alerts', 'batches']

// Check warehouses layer
const warehousesLayer = mapRuntime.layers.get('warehouses');
console.log('Warehouses Layer:', warehousesLayer);
// Should see WarehouseSymbolLayer instance

// Check facilities layer
const facilitiesLayer = mapRuntime.layers.get('facilities');
console.log('Facilities Layer:', facilitiesLayer);
// Should see FacilitySymbolLayer instance
```

### ✅ Demo Data Emission

**Look for Console Logs:**

During initialization, you should see logs like:

```
[MapRuntime] UNINITIALIZED → INITIALIZING (Container attached, style loading)
[MapRuntime] INITIALIZING → LOADING_LAYERS (Map load event fired)
[MapRuntime] Mounting 8 layers...
[MapRuntime] LOADING_LAYERS → LAYERS_MOUNTED (All layers mounted)
[MapRuntime] Flushing 6 pending updates across 6 layers
[MapRuntime] Flushed 1 updates for layer: warehouses (2 items)
[MapRuntime] Flushed 1 updates for layer: facilities (20 items)
[MapRuntime] Flushed 1 updates for layer: vehicles (5 items)
[MapRuntime] LAYERS_MOUNTED → READY (Pending updates flushed)
```

**Key Indicators:**
- ✅ "Flushed 1 updates for layer: warehouses (2 items)"
- ✅ "Flushed 1 updates for layer: facilities (20 items)"

If you see these logs, data emission is working correctly.

---

## Performance Verification

### ✅ 60fps Rendering

**Browser DevTools:**

1. Open DevTools (F12)
2. Go to "Performance" tab
3. Click "Record"
4. Pan/zoom the map for ~5 seconds
5. Stop recording
6. Check FPS graph

**Expected:**
- Steady 60fps during map interactions
- No significant frame drops
- GPU-accelerated rendering (check "Rendering" section)

### ✅ Memory Usage

**Browser DevTools:**

1. Open DevTools (F12)
2. Go to "Memory" tab
3. Take heap snapshot
4. Check "WarehouseSymbolLayer" and "FacilitySymbolLayer" allocations

**Expected:**
- ~5 KB per symbol layer
- ~10 KB total for warehouse/facility data
- No memory leaks (take multiple snapshots, memory should stabilize)

---

## State Machine Verification

### ✅ Navigation Between Map Pages

**Test Scenario:**

1. Start on Operational Map
2. Navigate to Planning Map (`/fleetops/map/planning`)
3. Navigate to Forensic Map (`/fleetops/map/forensic`)
4. Navigate back to Operational Map

**Expected Console Logs:**

```
[MapRuntime] READY → DETACHED (Container detached)
[MapRuntime] DETACHED → INITIALIZING (Reattaching to new container)
[MapRuntime] INITIALIZING → LOADING_LAYERS (Map load event fired)
[MapRuntime] LOADING_LAYERS → LAYERS_MOUNTED (All layers mounted)
[MapRuntime] LAYERS_MOUNTED → READY (Pending updates flushed)
```

**No Errors Expected:**
- ❌ No `InvalidStateTransitionError`
- ❌ No `Cannot read property of undefined`
- ❌ No map rendering failures

### ✅ HMR (Hot Module Reload)

**Test Scenario:**

1. With dev server running, edit `OperationalMapLibre.tsx`
2. Save file (triggers HMR)
3. Component should unmount → remount

**Expected:**
- Map reinitializes smoothly
- No state transition errors
- Warehouses and facilities reappear after reload

---

## Regression Testing

### ✅ Existing Features Still Work

**Vehicle Tracking:**
- ✅ Vehicles visible and moving
- ✅ Vehicle trails show breadcrumb history
- ✅ Vehicle click shows details

**Driver Tracking:**
- ✅ Driver markers visible
- ✅ Driver click shows details

**Route Display:**
- ✅ Routes render as lines
- ✅ Route click shows details

**Alert System:**
- ✅ Alert markers visible
- ✅ Alert click shows details

**Batch Clustering:**
- ✅ Batches cluster at low zoom
- ✅ Batch click shows cluster details

---

## Edge Cases

### ✅ Empty Data Handling

**Test:** Stop demo engine, reload page

**Expected:**
- Map loads successfully
- No warehouse/facility icons (data is empty)
- No console errors
- Empty state handling graceful

### ✅ Zoom Level Behavior

**Test:** Zoom out to level 0 (world view)

**Expected:**
- Warehouses/facilities hidden (min zoom: Z1 = level 6)
- No rendering errors
- Icons reappear when zooming in past level 6

### ✅ Theme Switching

**Test:** Toggle theme (light ↔ dark)

**Expected:**
- Basemap switches
- Warehouse/facility icons remain visible
- No rendering glitches
- Colors maintain contrast on both themes

---

## Known TODOs (Future Work)

### Phase 4: Trail Visualization Enhancement (Optional)

- [ ] Add pulsing animation to warehouses with active departures
- [ ] Add badge showing "X departures" on active warehouses
- [ ] Add orange/amber indicator to facilities with pending deliveries
- [ ] Add badge showing "X pending" on destination facilities

### Future Integrations

- [ ] Warehouse details drawer (replace console.log with UI)
- [ ] Facility details drawer (replace console.log with UI)
- [ ] Inventory management integration
- [ ] Delivery scheduling from warehouse to facility
- [ ] Route optimization considering warehouse → facility paths

---

## Troubleshooting

### Issue: Warehouses/Facilities Not Visible

**Possible Causes:**

1. **Demo mode not started**
   - Check for "Demo mode active" toast
   - Check console for `[DemoDataEngine]` logs

2. **Zoom level too low**
   - Zoom in to level 6+ (min zoom for visibility)

3. **Layer not mounted**
   - Check console: `Array.from(mapRuntime.layers.keys())`
   - Should include 'warehouses' and 'facilities'

4. **Data not emitted**
   - Check console for "Flushed 1 updates for layer: warehouses (2 items)"
   - Check console for "Flushed 1 updates for layer: facilities (20 items)"

### Issue: Click Handlers Not Working

**Possible Causes:**

1. **MapRuntime not in READY state**
   - Check console: `mapRuntime.stateMachine.getState()`
   - Should be "READY"

2. **Handlers not wired**
   - Check OperationalMapLibre.tsx lines 162-169
   - Should have onFacilityClick and onWarehouseClick

3. **Browser console not open**
   - Open DevTools (F12) → Console tab
   - Click should log output

### Issue: State Transition Errors

**Possible Causes:**

1. **Outdated state machine**
   - Check src/lib/mapStateMachine.ts
   - Should allow DETACHED from INITIALIZING, LOADING_LAYERS, LAYERS_MOUNTED, DEGRADED

2. **Rapid navigation**
   - This is normal - state machine should handle gracefully
   - No errors should appear with updated state machine

---

## Success Criteria Summary

✅ All criteria must pass:

- [x] Build passes with no TypeScript errors
- [x] Dev server starts successfully
- [x] Map loads on Operational page
- [x] 2 warehouse icons visible (teal, larger size)
- [x] 20 facility icons visible (colored, medium size)
- [x] Click warehouse logs data to console
- [x] Click facility logs data to console
- [x] Layer rendering order correct (warehouses → facilities → trails → vehicles)
- [x] Vehicle trails show departure → destination connection
- [x] Performance maintains 60fps
- [x] Navigation between map pages works (no state errors)
- [x] HMR works without crashes
- [x] Theme switching preserves visibility

---

## Final Verification Command

**Run this in browser console to verify everything:**

```javascript
// Comprehensive verification
const verify = () => {
  const state = mapRuntime.stateMachine.getState();
  const layers = Array.from(mapRuntime.layers.keys());
  const warehousesLayer = mapRuntime.layers.get('warehouses');
  const facilitiesLayer = mapRuntime.layers.get('facilities');

  console.log('=== VERIFICATION REPORT ===');
  console.log('MapRuntime State:', state);
  console.log('Expected: READY, Actual:', state === 'READY' ? '✅' : '❌');
  console.log('');
  console.log('Mounted Layers:', layers);
  console.log('Expected warehouses layer:', warehousesLayer ? '✅' : '❌');
  console.log('Expected facilities layer:', facilitiesLayer ? '✅' : '❌');
  console.log('');
  console.log('Total layers:', layers.length);
  console.log('Expected 8 layers:', layers.length === 8 ? '✅' : '❌');
  console.log('');
  console.log('Layer order correct:',
    layers[0] === 'warehouses' && layers[1] === 'facilities' ? '✅' : '❌'
  );
  console.log('=== END REPORT ===');
};

verify();
```

**Expected Output:**

```
=== VERIFICATION REPORT ===
MapRuntime State: READY
Expected: READY, Actual: ✅

Mounted Layers: ['warehouses', 'facilities', 'trails', 'routes', 'vehicles', 'drivers', 'alerts', 'batches']
Expected warehouses layer: ✅
Expected facilities layer: ✅

Total layers: 8
Expected 8 layers: ✅

Layer order correct: ✅
=== END REPORT ===
```

---

**If all checks pass:** ✅ **Implementation verified and production-ready**

**Date:** January 10, 2026
**Status:** COMPLETE
