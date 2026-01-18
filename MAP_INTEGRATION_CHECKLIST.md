# Map Integration Checklist

**MANDATORY FOR MERGE** - Engineers must tick every box before PR approval.

---

## 🧱 Container & Layout

- [ ] Map container has explicit width & height
- [ ] `min-height: 0` applied in flex parents
- [ ] `map.resize()` called after reattach
- [ ] No conditional rendering of map container

### Example (Required Structure)
```tsx
<div className="relative h-screen w-full">  {/* map-shell */}
  <div ref={containerRef} className="absolute inset-0 z-0" />  {/* map-canvas */}
</div>
```

---

## 🧠 Runtime & Lifecycle

- [ ] Map initialized **once only**
- [ ] No React cleanup removes layers
- [ ] All map mutations go through `MapRuntime`
- [ ] No direct MapLibre calls from React components

### Anti-Pattern (❌ FORBIDDEN)
```tsx
// ❌ Never do this
useEffect(() => {
  map.addLayer({ id: 'vehicles', ... });
  return () => map.removeLayer('vehicles');
}, [vehicles]);
```

### Correct Pattern (✅ REQUIRED)
```tsx
// ✅ Always do this
useEffect(() => {
  mapRuntime.update({ vehicles });
}, [vehicles]);
```

---

## 📦 Data Contracts

- [ ] Demo data matches production schema
- [ ] `capacity` object always present
- [ ] `location.lat/lng/heading` always defined
- [ ] Layer code defensive to partial data

### Required Vehicle Schema
```ts
{
  id: string;
  type: 'truck' | 'van' | 'bike';
  status: 'active' | 'delayed' | 'idle';
  location: {
    lat: number;
    lng: number;
    heading: number;
    speedKph: number;
  };
  capacity: {
    total: number;
    used: number;
    available: number;
    utilization: number;  // 0-1
  };
  meta: {
    driverId: string;
    batchId?: string;
  };
}
```

### Defensive Normalization (Required in Layers)
```ts
private normalizeCapacity(vehicle: any) {
  if (vehicle?.capacity && typeof vehicle.capacity === 'object') {
    const total = vehicle.capacity.total ?? 100;
    const used = vehicle.capacity.used ?? 0;
    return {
      total,
      used,
      available: vehicle.capacity.available ?? total - used,
      utilization: vehicle.capacity.utilization ?? (total > 0 ? used / total : 0),
    };
  }
  // Fallback for legacy/demo data
  const total = vehicle?.capacity ?? 100;
  const used = vehicle?.current_load ?? 0;
  return { total, used, available: total - used, utilization: used / total };
}
```

---

## 🧩 Layer Behavior

- [ ] Layers mounted once, never recreated
- [ ] Mode changes update styles only
- [ ] No `addLayer/removeLayer` on toggles
- [ ] Layer update is idempotent

### Correct Layer Pattern
```ts
class VehicleLayer {
  add(): void {
    // Mount once
    this.map.addLayer(this.layerConfig);
  }

  update(vehicles: Vehicle[]): void {
    // Update data without recreation
    const source = this.map.getSource(this.sourceId);
    if (source && source.type === 'geojson') {
      source.setData(this.dataToGeoJSON(vehicles));
    }
  }

  applyModeConfig(mode: RepresentationMode): void {
    // Change styles without recreation
    if (mode === 'minimal') {
      this.map.setLayoutProperty(this.layerId, 'icon-size', 0.4);
    } else {
      this.map.setLayoutProperty(this.layerId, 'icon-size', 1.0);
    }
  }
}
```

---

## 🧪 Demo Mode

- [ ] DemoEngine owned by MapRuntime
- [ ] Demo starts AFTER `READY`
- [ ] Demo survives tab switches
- [ ] Demo stops cleanly on disable

### Correct Demo Initialization
```ts
// ✅ MapRuntime owns demo
useEffect(() => {
  mapRuntime.onReady(() => {
    mapRuntime.enableDemoMode({ mode: 'operational', seed: 42 });
  });

  return () => {
    mapRuntime.disableDemoMode();
  };
}, []);
```

### Anti-Pattern (❌ FORBIDDEN)
```ts
// ❌ Page owns demo
useEffect(() => {
  const engine = new DemoEngine();
  engine.start();
  return () => engine.stop();
}, []);
```

---

## 🚨 Error Handling

- [ ] No uncaught exceptions in layers
- [ ] Invalid data logged, not crashed
- [ ] ErrorBoundary never triggered by map

### Defensive Layer Code
```ts
protected dataToGeoJSON(vehicles: Vehicle[]): FeatureCollection {
  const features = vehicles
    .filter((vehicle) => {
      // Filter invalid coordinates
      const lat = vehicle?.location?.lat ?? vehicle?.lat;
      const lng = vehicle?.location?.lng ?? vehicle?.lng;
      return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
    })
    .map((vehicle) => {
      // Safe transformation
      try {
        return this.vehicleToFeature(vehicle);
      } catch (error) {
        console.warn('[Layer] Invalid vehicle:', vehicle.id, error);
        return null;
      }
    })
    .filter(Boolean);

  return { type: 'FeatureCollection', features };
}
```

---

## 🚀 Performance

- [ ] 1,000 vehicles render without lag
- [ ] No layer recreation on mode toggle
- [ ] Console free of repeated warnings

### Performance Targets
- **Initial Load**: < 3 seconds to first render
- **Data Update**: < 100ms for 1,000 entities
- **Mode Switch**: < 50ms (no recreation)
- **Memory**: No leaks over 10 minutes
- **FPS**: 60fps maintained during updates

---

## 📋 Pre-Merge Verification

Run these commands before requesting review:

```bash
# 1. Type check
npm run type-check

# 2. Lint
npm run lint

# 3. Build
npm run build

# 4. Start dev server
npm run dev
```

Then verify:

1. Navigate to FleetOps → Operational Map
2. Wait for "Demo mode active" toast
3. Verify 7 vehicles visible over Kano State
4. Toggle representation mode (entity-rich ↔ minimal)
5. Navigate to Planning Map → back to Operational
6. Check console - should be error-free
7. Check Network tab - no repeated failed requests

---

## 🎯 Definition of Done

A map integration is **DONE** when:

1. ✅ All checkboxes above are ticked
2. ✅ Demo renders reliably on first load
3. ✅ Map survives mode switches without truncation
4. ✅ Map survives page navigation without recreation
5. ✅ Console is free of errors/warnings
6. ✅ Type check passes
7. ✅ Build succeeds
8. ✅ Performance targets met

---

## 🆘 Troubleshooting

### Issue: Vehicles not rendering

**Checklist**:
- [ ] Check console for `[MapRuntime] READY` message
- [ ] Check console for `[Demo] Demo engine started` message
- [ ] Verify `mapRuntime.getDemoState()` shows vehicles > 0
- [ ] Check Network tab for failed requests
- [ ] Verify vehicle data has `capacity` object
- [ ] Check layer update logs: `[VehicleSymbolLayer] Updated N vehicles`

### Issue: Map truncated/blank on toggle

**Checklist**:
- [ ] Container has explicit height: `h-screen` or `h-full`
- [ ] Parent has `min-height: 0` if using flex
- [ ] Container is absolutely positioned: `absolute inset-0`
- [ ] `map.resize()` called after reattach

### Issue: Demo stops after page change

**Checklist**:
- [ ] Demo owned by MapRuntime (not page component)
- [ ] Demo enabled via `mapRuntime.enableDemoMode()`
- [ ] Demo disabled via `mapRuntime.disableDemoMode()` in cleanup
- [ ] MapRuntime is singleton (not recreated)

---

## 📚 Reference

- [MapRuntime Source](src/map/runtime/MapRuntime.ts)
- [VehicleSymbolLayer Source](src/map/layers/VehicleSymbolLayer.ts)
- [Demo Generator](src/demo/generateDemoVehicles.ts)
- [Operational Map Page](src/pages/fleetops/map/operational/page.tsx)
- [Fix Summary](DEMO_RENDERING_FIX_SUMMARY.md)

---

**Last Updated**: 2026-01-10
**Approved By**: Engineering Team
**Status**: Production-Ready ✅
