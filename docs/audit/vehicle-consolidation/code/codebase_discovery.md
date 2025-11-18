# BIKO Vehicle Data Structures - Comprehensive Duplication Audit

## Executive Summary

This audit reveals a critical architectural conflict between **two parallel vehicle management systems**:

- **System A (Production)**: `/fleetops/vehicles` - Uses `plate_number` field
- **System B (VLMS)**: `/fleetops/vlms` - Expects `license_plate`, `make`, `year`, `vin`, `acquisition_date`

**Critical Finding**: VLMS onboarding wizard creates form data with 17 fields that **do not exist** in the production `vehicles` table schema.

**Impact**: Vehicle onboarding is BROKEN. All insertions fail silently.

---

## Critical Issues Summary

### Issue #1: Naming Conflict - `plate_number` vs `license_plate`
**Locations Affected**: 5 files
- `/src/stores/vlms/vehiclesStore.ts` (Line 86)
- `/src/stores/vlms/maintenanceStore.ts` (Lines 75, 138)
- `/src/stores/vlms/assignmentsStore.ts` (Line 40)

### Issue #2: Missing Required Fields
**VLMS Expects but Missing from Schema**:
- `make`, `year`, `vin` (Basic vehicle info)
- `acquisition_date`, `acquisition_type` (Financial tracking)
- `color`, `transmission`, `seating_capacity`, `engine_capacity` (Specifications)
- Insurance fields (4 columns)
- `notes` field

### Issue #3: Duplicate Component Implementations
**52 files** interact with vehicle data across two systems

---

## Component Duplication Matrix

| Feature | Production System | VLMS System | Status |
|---------|------------------|-------------|---------|
| Vehicle List View | `VehicleManagement.tsx` | `VehiclesPage.tsx` | ✅ DUPLICATE |
| Quick Add Form | Dialog in VehicleManagement | `VehicleForm.tsx` | ✅ DUPLICATE |
| Advanced Onboarding | ❌ Not implemented | 5-step wizard | VLMS only |
| Capacity Model | Single number | Tiered + dimensions | DIFFERENT |
| Database Table | `vehicles` | `vehicles` (different schema) | ⚠️ CONFLICT |

---

## Quick Wins

1. **Add Missing Columns** - Migration already prepared (`ADD_MISSING_VEHICLE_COLUMNS.sql`)
2. **Fix Naming Conflict** - Add `license_plate` column, sync with `plate_number`
3. **Update VLMS Queries** - Use `plate_number` temporarily until column renamed

---

See full report for complete file inventory, query patterns, and migration strategy.
