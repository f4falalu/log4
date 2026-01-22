# Map System Contract

> **This document is authoritative.**
> All map-related code must comply with this contract.
> Future PRs that violate this contract must be rejected.

---

## A. Map Ownership

### Single Owner Principle

- **One map instance per page** - never multiple
- **Owned by MapShell** (or MapRuntime equivalent)
- **React never calls MapLibre APIs directly**
- React components send commands to the runtime; runtime owns execution

### Lifecycle Rules

1. Map initializes **once** per page load
2. Map **never reinitializes** on mode change
3. Style loads **once** at initialization
4. `setStyle()` is **forbidden** after initialization
5. Theme changes require **recreating MapShell**, not mutating it

---

## B. Supported Modes

The map system supports exactly three modes:

| Mode        | Purpose                              |
|-------------|--------------------------------------|
| Planning    | Create, edit, and tag zones          |
| Operational | Live monitoring and geofencing       |
| Forensic    | Time-based replay and audit          |

---

## C. Mode Capabilities Table

| Capability         | Planning | Operational | Forensic |
|--------------------|----------|-------------|----------|
| Create zones       | ✅       | ❌          | ❌       |
| Edit zones         | ✅       | ❌          | ❌       |
| Tag zones          | ✅       | ❌          | ❌       |
| Delete zones       | ✅       | ❌          | ❌       |
| Live entities      | ❌       | ✅          | ❌       |
| Playback           | ❌       | ❌          | ✅       |
| Inspect            | ✅       | ✅          | ✅       |
| Geofencing events  | ❌       | ✅          | ✅ (replay) |

---

## D. Interaction States (Explicit)

All user interactions are governed by an explicit state machine.

### Valid States

```typescript
type InteractionState =
  | 'inspect'    // Read-only viewing
  | 'select'     // Select existing zones/entities
  | 'draw_zone'  // Create new zone geometry
  | 'tag_zone';  // Apply tags to selected zone
```

### State Rules

- Default state is always `inspect`
- Only **Planning mode** may enter mutating states (`draw_zone`, `tag_zone`)
- Operational and Forensic modes are **locked to `inspect`**
- All mutations must check `canMutate()` before proceeding

---

## E. Forbidden Actions (Global)

These actions are **never allowed**, regardless of mode:

### 1. Zoom-Driven Resolution
- ❌ H3 resolution must **never** change based on zoom level
- ✅ Resolution is fixed at domain level (e.g., `H3_RESOLUTION = 7`)

### 2. Viewport-Derived Truth
- ❌ Spatial truth must **never** be computed from viewport bounds
- ✅ All spatial truth is pre-computed and stored

### 3. Runtime Style Mutation
- ❌ `setStyle()` is **never** called after map initialization
- ❌ `setPaintProperty()` for semantic changes is forbidden
- ✅ Paint expressions are data-driven from source properties

### 4. Map-Driven Business Logic
- ❌ The map must **never** compute zone membership
- ❌ The map must **never** determine risk levels
- ❌ The map must **never** make geofencing decisions
- ✅ All logic lives in the spatial core; map only projects results

### 5. Geometry as Truth
- ❌ Zones must **never** be stored as polygons
- ✅ Zones are stored as **H3 cell sets**
- ✅ Polygons are derived for visualization only

---

## F. Data Flow (Authoritative)

```
┌─────────────────────────────────────────────────────────────┐
│                      SPATIAL CORE                           │
│  (h3.ts, zones.ts, cellState.ts, geofencing.ts)            │
│                                                             │
│  - Owns all spatial truth                                   │
│  - Computes H3 indexes                                      │
│  - Manages zone definitions                                 │
│  - Derives cell states                                      │
│  - Detects geofencing events                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    RENDER PIPELINE                          │
│  (MapShell, LayerRegistry, RenderContext)                  │
│                                                             │
│  - Owns map instance                                        │
│  - Manages layer lifecycle                                  │
│  - Converts domain state to GeoJSON                         │
│  - Projects H3CellState[] to visual representation          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      MODE POLICY                            │
│  (planning.policy.ts, operational.policy.ts, etc.)         │
│                                                             │
│  - Defines allowed interaction states per mode              │
│  - Gates mutation paths                                     │
│  - Enforces read-only constraints                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTERACTION FSM                          │
│  (InteractionFSM.ts)                                       │
│                                                             │
│  - Manages current interaction state                        │
│  - Validates state transitions                              │
│  - Provides canMutate() guard                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                          UI                                 │
│  (PlanningMap, OperationalMap, ForensicMap)                │
│                                                             │
│  - Configures mode                                          │
│  - Displays toolbars                                        │
│  - Routes user intent to FSM                                │
│  - Never touches MapLibre directly                          │
└─────────────────────────────────────────────────────────────┘
```

---

## G. Layer Governance

### Layer Types by Mode

| Layer Type          | Planning | Operational | Forensic |
|---------------------|----------|-------------|----------|
| Base (roads/labels) | ✅       | ✅          | ✅       |
| H3 Hexagons         | ✅       | ✅          | ✅       |
| Zone Selection      | ✅       | ❌          | ❌       |
| Entities (live)     | ❌       | ✅          | ❌       |
| Entities (replay)   | ❌       | ❌          | ✅       |
| Events/Alerts       | ❌       | ✅          | ✅       |
| Drawing Tools       | ✅       | ❌          | ❌       |

### Layer Lifecycle Rules

1. Layers are **added once** via `LayerRegistry.register()`
2. Layers are **removed safely** via `LayerRegistry.remove()`
3. Updates **never recreate layers** - only update source data
4. Visibility is toggled, not add/remove cycles

---

## H. Audit Requirements

All mutations must be auditable:

| Mutation Type    | Audit Fields                                    |
|------------------|------------------------------------------------|
| Zone created     | zone_id, h3_cells, created_by, timestamp       |
| Zone updated     | zone_id, old_cells, new_cells, updated_by, ts  |
| Zone tagged      | zone_id, tags_added, tags_removed, updated_by  |
| Zone deactivated | zone_id, deactivated_by, timestamp             |

### Forensic Reconstruction

Zone state at time T = apply all audit events where `timestamp <= T`

---

## I. Performance Constraints

| Metric                | Target          |
|-----------------------|-----------------|
| Initial render        | < 500ms         |
| Data update cycle     | < 16ms (60fps)  |
| H3 cell lookup        | O(1)            |
| Zone membership check | O(1)            |
| Max visible hexes     | 10,000+         |

---

## J. Compliance Checklist

Before merging any map-related PR, verify:

- [ ] No MapLibre calls outside MapShell/layers
- [ ] No `setStyle()` after initialization
- [ ] No zoom-driven resolution changes
- [ ] No viewport-derived spatial truth
- [ ] No geometry stored as zone definition
- [ ] Interaction state explicit via FSM
- [ ] Mutations gated by `canMutate()`
- [ ] Audit log written for all mutations
- [ ] Unit tests for spatial core functions

---

## K. Sign-Off

This contract is effective immediately.

All engineers working on the map system must acknowledge:

> "The map is a projection layer. All spatial truth lives outside the map."

---

*Document version: 1.0*
*Created: 2026-01-22*
