# Implementation Plan: 5 Pending Work Items

## 1. Programs Metrics (Real Data)
**Current state**: `usePrograms.tsx` generates random metrics (lines 42-51, 75-84).
**DB relationship**: `requisitions.program` is a VARCHAR column (not FK to `programs.id`). No program column on batches/schedules tables.

**Approach**:
- Create a Supabase database function `get_program_metrics(program_code)` that queries:
  - `requisitions` COUNT where `program = code` (active, by status)
  - facility_count from distinct `facility_id` in matching requisitions
  - fulfillment_rate from completed vs total requisitions
  - avg_delivery_time from batch completion timestamps
- Replace Math.random() in `usePrograms.tsx` with RPC calls to this function
- If no matching requisitions exist, return zeros (not random data)

**Files changed**:
- New migration: `supabase/migrations/YYYYMMDDHHMMSS_create_program_metrics_function.sql`
- Edit: `src/hooks/usePrograms.tsx` (replace hardcoded metrics with RPC)

---

## 2. Trade-Off API Integration
**Current state**: `useTradeOff.ts` is a Zustand store with state machine but `executeTradeOff()` is a TODO stub. No dedicated DB tables exist.

**Approach**:
- Create migration with `trade_offs`, `trade_off_items`, `trade_off_confirmations` tables
- Implement `executeTradeOff()` to insert records via Supabase
- Add query hooks to fetch trade-off history
- Wire up `cancelTradeOff()` to update DB status

**Files changed**:
- New migration: `supabase/migrations/YYYYMMDDHHMMSS_create_tradeoff_tables.sql`
- Edit: `src/hooks/useTradeOff.ts` (add Supabase calls)

---

## 3. Map Layers Real Data
**Current state**: maps-v3 layers accept GeoJSON data via `update()` methods. The layers themselves are well-built renderers. The data-feeding layer (connecting Supabase queries to map layers) needs implementation.

**Approach**:
- Create React hooks that fetch real data from Supabase and transform to GeoJSON:
  - `useMapVehicles()` - query `vehicles` table with lat/lng
  - `useMapDrivers()` - query drivers with active sessions
  - `useMapFacilities()` - query facilities with coordinates
  - `useMapWarehouses()` - query warehouses with coordinates
  - `useMapRoutes()` - query active batch routes
- These hooks return GeoJSON FeatureCollections that feed into existing layer `update()` methods

**Files changed**:
- New: `src/hooks/map/useMapVehicles.ts`, `useMapDrivers.ts`, `useMapFacilities.ts`, `useMapWarehouses.ts`, `useMapRoutes.ts`
- New: `src/hooks/map/index.ts` (barrel export)

---

## 4. Migrate has_role → useHasPermission
**Current state**: Two parallel permission systems exist:
- **Old**: `useUserRole()` → `hasRole()`, `isAdmin` (hardcoded role-permission mapping in `src/hooks/usePermissions.tsx` and `src/lib/permissions.ts`)
- **New**: `useHasPermission()` from `src/hooks/rbac/usePermissions.tsx` (database-driven via `get_user_permissions` RPC)

**Files to migrate**:
- `src/components/auth/ProtectedRoute.tsx` - uses `useUserRole().hasRole()`
- `src/components/layout/Layout.tsx` - uses old `usePermissions`
- `src/components/layout/RoleSwitcher.tsx` - uses `useUserRole()` (keep - role switching is distinct from permissions)
- `src/components/layout/UserMenu.tsx` - uses `useUserRole().activeRole`
- `src/pages/VehicleManagement.tsx` - uses old `usePermissions().hasPermission()`

**Approach**:
- Replace old permission checks with new RBAC hooks where applicable
- Keep `useUserRole()` for role display/switching (it's still valid for UI)
- Replace permission checks (e.g., `hasPermission('manage_vehicles')`) with `useHasPermission('vehicles.manage')`
- Map old permission strings to new permission catalog codes
- Eventually deprecate `src/hooks/usePermissions.tsx` and `src/lib/permissions.ts`

---

## 5. Hardcoded Colors → Design Tokens
**Current state**: 243 hex color occurrences across 30 files. Design system already has CSS variables in `index.css` + tailwind tokens.

**Color categories**:
- **Map layers** (~100 occurrences): MapLibre paint properties require string values, can't use CSS vars
- **Popup HTML strings** (~50 occurrences): Inline styles in template literals
- **Chart components** (~15 occurrences): Recharts props
- **Other components** (~30 occurrences): Inline styles

**Approach**:
- Create `src/lib/colors.ts` - centralized color constants module:
  ```ts
  export const colors = {
    status: { active: '#3b82f6', completed: '#10b981', delayed: '#ef4444', ... },
    semantic: { blue: '#3b82f6', green: '#22c55e', red: '#ef4444', amber: '#f59e0b', ... },
    map: { warehouse: '#8b5cf6', facility: '#10b981', vehicle: '#8b5cf6', ... },
    text: { primary: '#374151', secondary: '#6b7280', muted: '#9ca3af', ... },
  }
  ```
- Replace hardcoded hex values with imports from `colors.ts` across all files
- Map layers and popup strings reference these constants
- Chart components use `colors.chart[...]`

**Files changed**:
- New: `src/lib/colors.ts`
- Edit: All 30 files with hardcoded colors (map layers, components, pages)

---

## Execution Order
1. **Colors** (foundational - other changes can use the new tokens)
2. **Programs metrics** (self-contained, quick win)
3. **has_role migration** (reduces tech debt)
4. **Map data hooks** (builds on colors)
5. **Trade-Off API** (largest, most complex)

## Notes
- Each item gets its own commit
- TypeScript check + Vite build after each item
- Supabase migrations pushed to remote DB after verification
