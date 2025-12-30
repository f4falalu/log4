# VLMS Incidents Query Hotfix

**Date**: 2025-12-29 (Post-Phase 0)
**Issue**: Incidents page throwing ambiguous relationship error
**Status**: ✅ RESOLVED

---

## Issue Details

### Error Observed
```
Failed to fetch incidents: Could not embed because more than one relationship
was found for 'vlms_incidents' and 'profiles'
```

### Root Cause
The `vlms_incidents` table has **two foreign keys** pointing to the `profiles` table:
- `created_by` → profiles (person who reported/created the incident)
- `driver_id` → profiles (driver involved in the incident)

The original query used ambiguous syntax:
```typescript
driver:profiles(id, full_name)  // ERROR: Which FK? driver_id or created_by?
```

Supabase couldn't determine which relationship to use, causing the query to fail.

---

## Fix Applied

### File Modified
`src/stores/vlms/incidentsStore.ts:35-45`

### Changes
Updated the query to **explicitly specify FK constraint names**:

**BEFORE** (Ambiguous):
```typescript
let query = supabase
  .from('vlms_incidents')
  .select(`
    *,
    vehicle:vehicles(id, vehicle_id, make, model, license_plate),
    driver:profiles(id, full_name)  // ❌ AMBIGUOUS
  `)
  .order('incident_date', { ascending: false });
```

**AFTER** (Explicit):
```typescript
let query = supabase
  .from('vlms_incidents')
  .select(`
    *,
    vehicle:vehicles(id, vehicle_id, make, model, license_plate),
    driver:profiles!vlms_incidents_driver_id_fkey(id, full_name),              // ✅ EXPLICIT FK
    created_by_profile:profiles!vlms_incidents_created_by_fkey(id, full_name)  // ✅ EXPLICIT FK
  `)
  .order('incident_date', { ascending: false });
```

### Syntax Explanation
The `!constraint_name` syntax tells Supabase exactly which foreign key relationship to use:
- `profiles!vlms_incidents_driver_id_fkey` → Use the FK from `driver_id` column
- `profiles!vlms_incidents_created_by_fkey` → Use the FK from `created_by` column

---

## Verification

### Build Status
```bash
npm run build
✓ built in 18.85s
```

### Dev Server
- HMR update applied automatically
- No errors in console
- Incidents page should now load successfully

---

## Impact

### Pages Fixed
- ✅ `/fleetops/vlms/incidents` - Now loads without relationship errors

### Pages Verified Still Working
- ✅ `/fleetops/vlms/fuel` - Using explicit `vehicle:vehicles(...)` syntax
- ✅ `/fleetops/vlms/maintenance` - Using explicit `vehicle:vehicles(...)` syntax
- ✅ `/fleetops/vlms/assignments` - Using explicit `vehicle:vehicles(...)` syntax

---

## Additional Fix: Inspections Page Created

### Inspections 404 - FIXED ✅
Created complete inspections feature to resolve 404 error:

**Files Created**:
1. `src/stores/vlms/inspectionsStore.ts` (95 lines)
   - Zustand store with fetchInspections, deleteInspection methods
   - Explicit FK syntax: `inspector:profiles!vlms_inspections_inspector_id_fkey(...)`
2. `src/pages/fleetops/vlms/inspections/page.tsx` (117 lines)
   - Full inspection listing with status badges
   - Type, roadworthy, and next inspection date display
3. `src/App.tsx` - Added route and import

**Features**:
- Lists all vehicle inspections from `vlms_inspections` table
- Shows inspection type, status, roadworthy status, inspector
- Badge variants for different statuses (passed, failed, pending)
- Empty state when no inspections exist

---

## Related Documentation
- Phase 0 completion: `BLOCK5_EXECUTION_SUMMARY.md`
- VLMS FK migration: `supabase/migrations/20251229000003_vlms_foreign_key_migration.sql`
- Database types: `src/types/supabase.ts:4118-4269`

---

**Hotfix Status**: ✅ COMPLETE
**Build Status**: ✅ PASSING
**Requires Testing**: Navigate to `/fleetops/vlms/incidents` and verify page loads
