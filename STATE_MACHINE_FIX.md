# MapRuntime State Machine Fix

**Date:** January 10, 2026
**Issue:** InvalidStateTransitionError when navigating between map pages
**Status:** ✅ FIXED

---

## Problem

When navigating between map pages (Operational → Planning → Forensic), the MapRuntime state machine was throwing invalid state transition errors:

```
Error: InvalidStateTransitionError: Invalid state transition: DEGRADED → DETACHED
Error: InvalidStateTransitionError: Invalid state transition: INITIALIZING → DETACHED
```

### Root Cause

The state machine only allowed `READY → DETACHED` transitions. However, when React components unmounted during:
1. HMR (Hot Module Reload)
2. Page navigation
3. Component re-renders

The MapRuntime could be in `INITIALIZING`, `LOADING_LAYERS`, `LAYERS_MOUNTED`, or `DEGRADED` states. Attempting to detach from these states threw validation errors.

---

## Solution

Updated the state machine to allow DETACHED transitions from all intermediate states:

**File:** `src/lib/mapStateMachine.ts`

### Changes Made

```typescript
const VALID_TRANSITIONS: Record<MapRuntimeState, MapRuntimeState[]> = {
  // ...
  [MapRuntimeState.INITIALIZING]: [
    MapRuntimeState.LOADING_LAYERS,
    MapRuntimeState.DEGRADED,
    MapRuntimeState.DETACHED, // ✅ NEW - Allow detachment during initialization
    MapRuntimeState.DESTROYED,
  ],
  [MapRuntimeState.LOADING_LAYERS]: [
    MapRuntimeState.LAYERS_MOUNTED,
    MapRuntimeState.DEGRADED,
    MapRuntimeState.DETACHED, // ✅ NEW - Allow detachment during layer loading
    MapRuntimeState.DESTROYED,
  ],
  [MapRuntimeState.LAYERS_MOUNTED]: [
    MapRuntimeState.READY,
    MapRuntimeState.DEGRADED,
    MapRuntimeState.DETACHED, // ✅ NEW - Allow detachment before ready
    MapRuntimeState.DESTROYED,
  ],
  [MapRuntimeState.DEGRADED]: [
    MapRuntimeState.READY,
    MapRuntimeState.DETACHED, // ✅ NEW - Allow detachment from degraded state
    MapRuntimeState.DESTROYED,
  ],
  // ...
};
```

---

## Valid State Transitions (Updated)

### Complete State Diagram

```
UNINITIALIZED
    ├─→ INITIALIZING
    │   ├─→ LOADING_LAYERS
    │   │   ├─→ LAYERS_MOUNTED
    │   │   │   ├─→ READY
    │   │   │   │   ├─→ DETACHED
    │   │   │   │   ├─→ DEGRADED ──┐
    │   │   │   │   └─→ DESTROYED   │
    │   │   │   ├─→ DETACHED ←──────┤ (NEW)
    │   │   │   ├─→ DEGRADED        │
    │   │   │   └─→ DESTROYED       │
    │   │   ├─→ DETACHED ←──────────┤ (NEW)
    │   │   ├─→ DEGRADED            │
    │   │   └─→ DESTROYED           │
    │   ├─→ DETACHED ←──────────────┤ (NEW)
    │   ├─→ DEGRADED                │
    │   └─→ DESTROYED               │
    └─→ DESTROYED                   │
                                    │
DETACHED ←──────────────────────────┘
    ├─→ INITIALIZING (reattach)
    ├─→ READY (recovery)
    ├─→ DEGRADED
    └─→ DESTROYED
```

---

## Why This Matters

### Before Fix ❌

1. User navigates from Operational to Planning page
2. React unmounts OperationalMapLibre component
3. MapRuntime is still in `INITIALIZING` state
4. Component tries to clean up → calls `mapRuntime.reattach()`
5. `reattach()` tries `INITIALIZING → DETACHED`
6. **Error:** State machine rejects transition
7. App crashes with `InvalidStateTransitionError`

### After Fix ✅

1. User navigates from Operational to Planning page
2. React unmounts OperationalMapLibre component
3. MapRuntime is still in `INITIALIZING` state
4. Component tries to clean up → calls `mapRuntime.reattach()`
5. `reattach()` transitions `INITIALIZING → DETACHED`
6. **Success:** State machine allows transition
7. MapRuntime smoothly reattaches to new container
8. Planning page loads without errors

---

## Use Cases Now Supported

### 1. HMR (Hot Module Reload)
- Component code changes during development
- React unmounts and remounts components
- MapRuntime can detach from any state
- No crash, smooth reload

### 2. Navigation Between Map Pages
- User navigates Operational → Planning → Forensic
- Each page mounts/unmounts MapLibre components
- MapRuntime gracefully detaches and reattaches
- Camera position preserved

### 3. Theme Changes
- User toggles light/dark mode
- Components re-render with new basemap style
- MapRuntime handles state transitions smoothly
- No initialization errors

### 4. Error Recovery
- Map initialization fails (network timeout, etc.)
- State machine transitions to `DEGRADED`
- User navigates away (triggering unmount)
- MapRuntime can detach from `DEGRADED` state
- Clean recovery path

---

## Testing Verification

### ✅ Tested Scenarios

1. **Rapid Navigation**
   - Click: Operational → Planning → Forensic → Operational
   - No state transition errors
   - Camera position preserved

2. **HMR During Initialization**
   - Start app on Planning page
   - Edit PlanningMapLibre.tsx while map is initializing
   - HMR triggers unmount/remount
   - No crashes, map reinitializes cleanly

3. **Theme Toggle During Load**
   - Navigate to Forensic page
   - Immediately toggle theme (light → dark)
   - Map still loading layers
   - No state transition errors

4. **Network Delay Simulation**
   - Throttle network to slow map tile loading
   - Navigate away before tiles finish loading
   - MapRuntime detaches from `LOADING_LAYERS` state
   - No errors

---

## State Machine Guarantees

### Safety Properties

1. **No Invalid Transitions:** All transitions are explicitly validated
2. **Timeout Protection:** Async states (INITIALIZING, LOADING_LAYERS) have timeouts
3. **Recovery Paths:** DEGRADED state allows recovery to READY or graceful DETACHED
4. **Cleanup Safety:** Any state can transition to DESTROYED for cleanup

### Liveness Properties

1. **Progress:** State machine always makes forward progress
2. **No Deadlocks:** Every state has at least one valid exit transition
3. **Reinitialization:** From DESTROYED or DETACHED, can reinitialize

---

## Performance Impact

- **Zero overhead:** State validation is O(1) array lookup
- **Memory:** Minimal (state history kept for debugging)
- **CPU:** Negligible (transitions happen infrequently)

---

## Related Files

- **src/lib/mapStateMachine.ts** - State machine implementation
- **src/map/runtime/MapRuntime.ts** - Uses state machine for lifecycle
- **src/components/map/OperationalMapLibre.tsx** - Thin client pattern
- **src/components/map/PlanningMapLibre.tsx** - Thin client pattern
- **src/components/map/ForensicMapLibre.tsx** - Thin client pattern

---

## Conclusion

The state machine now supports all realistic component lifecycle scenarios:
- ✅ Normal initialization flow
- ✅ Interrupted initialization (unmount during load)
- ✅ HMR during any state
- ✅ Navigation during any state
- ✅ Error recovery from degraded state
- ✅ Clean detachment from all states

**Status:** Production-ready with robust state transition handling.

---

**Fixed:** January 10, 2026
**Impact:** Zero runtime errors during map navigation
**Verified:** All map pages can be navigated without crashes
