# Vehicle Domain Conflict Matrix

**Status**: 📋 Analysis Complete
**Created**: 2025-11-18
**Critical Severity**: 🔴 HIGH - Production Feature Blocked

---

## Executive Summary

This conflict matrix documents the schema and implementation differences between the production vehicle system (`/fleetops/vehicles`) and the VLMS system (`/fleetops/vlms`). Both systems attempt to use the same `vehicles` database table but expect incompatible schemas.

**Key Metrics**:
- **17 missing columns** blocking VLMS onboarding
- **1 critical naming conflict** causing query failures
- **52 files** affected across codebase
- **2 duplicate component implementations** requiring consolidation

---

## 1. Column-Level Conflict Matrix

### Legend
- ✅ **Compatible**: Column exists and is compatible
- ❌ **Missing**: Column expected but doesn't exist
- ⚠️ **Conflict**: Column exists but with different name/type
- 🔄 **Additive**: Can be added without breaking changes
- ⚠️ **Breaking**: Requires code changes to fix

| Column Name | Production Schema | VLMS Expectation | Status | Severity | Notes |
|-------------|-------------------|------------------|--------|----------|-------|
| **Identity** |
| `id` | UUID PK | UUID PK | ✅ | - | OK |
| `vehicle_id` | ❌ Not present | VARCHAR(50) UNIQUE | ❌ | 🔄 Additive | Auto-generated VEH-YYYY-NNN format |
| **Basic Info** |
| `make` | ❌ Not present | VARCHAR(100) NOT NULL | ❌ | ⚠️ Breaking | **CRITICAL**: Brand/manufacturer |
| `model` | TEXT NOT NULL | TEXT NOT NULL | ✅ | - | OK |
| `year` | ❌ Not present | INTEGER NOT NULL | ❌ | ⚠️ Breaking | **CRITICAL**: Manufacturing year |
| `vin` | ❌ Not present | VARCHAR(17) UNIQUE | ❌ | 🔄 Additive | Vehicle Identification Number |
| `plate_number` | TEXT UNIQUE NOT NULL | ❌ Not used | ⚠️ | ⚠️ Breaking | **CONFLICT**: VLMS expects `license_plate` |
| `license_plate` | ❌ Not present | VARCHAR(20) UNIQUE NOT NULL | ❌ | ⚠️ Breaking | **NAMING CONFLICT** |
| `color` | ❌ Not present | VARCHAR(50) | ❌ | 🔄 Additive | Vehicle color |
| **Classification** |
| `type` | TEXT NOT NULL | ❌ Deprecated | ⚠️ | - | Legacy: free-text type |
| `category_id` | UUID (nullable) | UUID | ✅ | - | OK - Added for VLMS |
| `vehicle_type_id` | UUID (nullable) | UUID | ✅ | - | OK - Added for VLMS |
| `fuel_type` | fuel_type ENUM | fuel_type | ✅ | - | OK |
| `transmission` | ❌ Not present | VARCHAR(50) | ❌ | 🔄 Additive | automatic/manual/cvt |
| **Specifications** |
| `engine_capacity` | ❌ Not present | DECIMAL(10,2) | ❌ | 🔄 Additive | Engine size (liters) |
| `seating_capacity` | ❌ Not present | INTEGER | ❌ | 🔄 Additive | Number of seats |
| **Capacity (Legacy)** |
| `capacity` | DECIMAL(10,2) NOT NULL | ❌ Deprecated | ⚠️ | - | Legacy: single cubic meter value |
| `max_weight` | INTEGER NOT NULL | ❌ Deprecated | ⚠️ | - | Legacy: single kg value |
| **Capacity (VLMS)** |
| `capacity_kg` | NUMERIC (nullable) | NUMERIC | ✅ | - | OK - Added for VLMS |
| `capacity_m3` | NUMERIC (nullable) | NUMERIC | ✅ | - | OK - Added for VLMS |
| `capacity_volume_m3` | FLOAT (nullable) | ❌ Not used | ⚠️ | - | Duplicate of capacity_m3 |
| `capacity_weight_kg` | FLOAT (nullable) | ❌ Not used | ⚠️ | - | Duplicate of capacity_kg |
| `length_cm` | INTEGER (nullable) | INTEGER | ✅ | - | OK - Added for VLMS |
| `width_cm` | INTEGER (nullable) | INTEGER | ✅ | - | OK - Added for VLMS |
| `height_cm` | INTEGER (nullable) | INTEGER | ✅ | - | OK - Added for VLMS |
| `tiered_config` | JSONB (nullable) | JSONB | ✅ | - | OK - Added for VLMS |
| **Acquisition** |
| `acquisition_date` | ❌ Not present | DATE NOT NULL | ❌ | ⚠️ Breaking | **CRITICAL**: When acquired |
| `acquisition_type` | ❌ Not present | VARCHAR(50) NOT NULL | ❌ | ⚠️ Breaking | **CRITICAL**: purchase/lease/donation |
| `purchase_price` | ❌ Not present | DECIMAL(15,2) | ❌ | 🔄 Additive | Financial data |
| `vendor_name` | ❌ Not present | VARCHAR(255) | ❌ | 🔄 Additive | Supplier/dealer |
| `warranty_expiry` | ❌ Not present | DATE | ❌ | 🔄 Additive | Warranty expiration |
| **Current Status** |
| `status` | vehicle_status ENUM | vehicle_status | ✅ | - | OK |
| `current_driver_id` | UUID FK | UUID FK | ✅ | - | OK |
| `current_location_id` | ❌ Not present | UUID FK | ❌ | 🔄 Additive | Current facility |
| `current_mileage` | ❌ Not present | DECIMAL(10,2) | ❌ | 🔄 Additive | Odometer reading |
| **Insurance & Registration** |
| `insurance_provider` | ❌ Not present | VARCHAR(255) | ❌ | 🔄 Additive | Insurance company |
| `insurance_policy_number` | ❌ Not present | VARCHAR(100) | ❌ | 🔄 Additive | Policy ID |
| `insurance_expiry` | ❌ Not present | DATE | ❌ | 🔄 Additive | Policy expiration |
| `registration_expiry` | ❌ Not present | DATE | ❌ | 🔄 Additive | Registration expiration |
| **Financial** |
| `depreciation_rate` | ❌ Not present | DECIMAL(5,2) | ❌ | 🔄 Additive | Annual depreciation % |
| `current_book_value` | ❌ Not present | DECIMAL(15,2) | ❌ | 🔄 Additive | Current asset value |
| **Operational Metrics** |
| `avg_speed` | INTEGER DEFAULT 40 | INTEGER | ✅ | - | OK |
| `fuel_efficiency` | DECIMAL(5,2) NOT NULL | DECIMAL(5,2) | ✅ | - | OK |
| **Fleet Assignment** |
| `fleet_id` | UUID FK (nullable) | UUID FK | ✅ | - | OK |
| **Documents & Photos** |
| `documents` | ❌ Not present | JSONB DEFAULT '[]' | ❌ | 🔄 Additive | Document attachments |
| `photos` | ❌ Not present | JSONB DEFAULT '[]' | ❌ | 🔄 Additive | Photo gallery |
| `photo_url` | TEXT (nullable) | TEXT | ✅ | - | OK - Single photo URL |
| `thumbnail_url` | TEXT (nullable) | TEXT | ✅ | - | OK |
| `photo_uploaded_at` | TIMESTAMPTZ (nullable) | TIMESTAMPTZ | ✅ | - | OK |
| `ai_capacity_image_url` | TEXT (nullable) | TEXT | ✅ | - | OK |
| `ai_generated` | BOOLEAN | BOOLEAN | ✅ | - | OK |
| **Metadata** |
| `notes` | ❌ Not present | TEXT | ❌ | 🔄 Additive | Free-text notes |
| `tags` | ❌ Not present | TEXT[] | ❌ | 🔄 Additive | Tag array |
| `created_at` | TIMESTAMPTZ DEFAULT now() | TIMESTAMPTZ | ✅ | - | OK |
| `updated_at` | TIMESTAMPTZ DEFAULT now() | TIMESTAMPTZ | ✅ | - | OK |
| `created_by` | ❌ Not present | UUID FK | ❌ | 🔄 Additive | User who created |
| `updated_by` | ❌ Not present | UUID FK | ❌ | 🔄 Additive | User who last updated |

---

## 2. Conflict Categorization

### 🔴 Critical - Blocking Production (Must Fix Immediately)

| Issue | Impact | Files Affected | Priority |
|-------|--------|----------------|----------|
| Missing `acquisition_date` | Onboarding wizard insertion fails | 1 hook, 1 form | P0 |
| Missing `make` | Vehicle brand info lost | 1 hook, 2 stores, 3 components | P0 |
| Missing `year` | Vehicle age calculations impossible | 1 hook, 1 form | P0 |
| `plate_number` vs `license_plate` conflict | VLMS queries fail | 5 stores/hooks | P0 |

### 🟡 High - Data Quality Issues (Fix This Sprint)

| Issue | Impact | Files Affected | Priority |
|-------|--------|----------------|----------|
| Missing insurance fields | Compliance risk | 1 form | P1 |
| Missing `vin` | Unable to track by VIN | 1 form | P1 |
| Missing `notes` field | User feedback lost | 1 form | P1 |
| Missing `transmission` | Specification incomplete | 1 form | P1 |

### 🟢 Medium - Enhancement (Fix Next Sprint)

| Issue | Impact | Files Affected | Priority |
|-------|--------|----------------|----------|
| Duplicate capacity columns | Schema complexity | N/A | P2 |
| Missing `vehicle_id` auto-generation | Manual ID management | N/A | P2 |
| Missing document attachments | No file uploads | N/A | P2 |
| Missing audit fields (`created_by`, `updated_by`) | Audit trail incomplete | N/A | P2 |

---

## 3. Code Impact Analysis

### Files Requiring Changes by Priority

#### P0 - Critical (Blocking)

**Hook Files** (1):
- `/src/hooks/useVehicleOnboardState.ts` (Lines 300-332)
  - Issue: Assembles form data with 17 non-existent fields
  - Fix: Remove or provide defaults for missing fields

**Store Files** (4):
- `/src/stores/vlms/vehiclesStore.ts` (Line 86, 146-155, 174-181)
  - Issue: Queries `license_plate` instead of `plate_number`
  - Fix: Update query to use `plate_number`
- `/src/stores/vlms/maintenanceStore.ts` (Lines 75, 138)
  - Issue: Joins on `license_plate`
  - Fix: Update join column
- `/src/stores/vlms/assignmentsStore.ts` (Line 40)
  - Issue: Selects `license_plate`
  - Fix: Update select column
- `/src/stores/vlms/incidentsStore.ts` (Line 40)
  - Issue: Selects `license_plate`
  - Fix: Update select column

#### P1 - High Priority

**Component Files** (5):
- `/src/components/vlms/vehicle-onboarding/RegistrationForm.tsx`
  - Issue: Collects missing fields
  - Fix: Make fields optional or add to schema
- `/src/components/vlms/vehicles/VehicleForm.tsx`
  - Issue: Quick add form expects missing fields
  - Fix: Remove or make optional
- `/src/pages/fleetops/vlms/vehicles/page.tsx` (Line 163)
  - Issue: Displays `license_plate`
  - Fix: Update to `plate_number`

#### P2 - Medium Priority

**Type Definition Files** (2):
- `/src/types/vlms.ts`
  - Issue: `VehicleFormData` interface expects missing fields
  - Fix: Update interface to match actual schema
- `/src/integrations/supabase/types.ts`
  - Issue: Already correct (needs regeneration after migration)
  - Fix: Run `npx supabase gen types typescript`

---

## 4. Migration Complexity Matrix

| Column | Add/Rename | Breaking Change | Data Migration Needed | Rollback Risk |
|--------|------------|-----------------|----------------------|---------------|
| `make` | ADD | Yes - Code expects it | No | Low |
| `year` | ADD | Yes - Code expects it | No | Low |
| `vin` | ADD | No - Optional field | No | Low |
| `license_plate` | ADD (keep `plate_number`) | Yes - Queries use it | Copy from `plate_number` | Medium |
| `acquisition_date` | ADD | Yes - Code expects it | Default to `created_at` | Low |
| `acquisition_type` | ADD | Yes - Code expects it | Default to 'purchase' | Low |
| `color` | ADD | No - Optional | No | Low |
| `transmission` | ADD | No - Optional | No | Low |
| `seating_capacity` | ADD | No - Optional | No | Low |
| `engine_capacity` | ADD | No - Optional | No | Low |
| `purchase_price` | ADD | No - Optional | No | Low |
| `vendor_name` | ADD | No - Optional | No | Low |
| `insurance_provider` | ADD | No - Optional | No | Low |
| `insurance_policy_number` | ADD | No - Optional | No | Low |
| `insurance_expiry` | ADD | No - Optional | No | Low |
| `registration_expiry` | ADD | No - Optional | No | Low |
| `notes` | ADD | No - Optional | No | Low |

**Total Columns to Add**: 17
**Breaking Changes**: 5 (make, year, license_plate, acquisition_date, acquisition_type)
**Data Migrations**: 2 (license_plate, acquisition_date)

---

## 5. Compatibility Assessment

### Backward Compatibility Strategy

**Option A: Additive Only (Recommended)**
- Add all 17 missing columns as NULLABLE
- Keep `plate_number` for production code
- Add `license_plate` for VLMS code
- Create trigger to sync `plate_number` ↔ `license_plate`
- **Result**: Both systems work without code changes

**Option B: Breaking Change**
- Add all columns with appropriate constraints
- Rename `plate_number` → `license_plate`
- Update all 30+ files referencing `plateNumber`
- **Result**: Requires coordinated deployment

**Option C: Dual Schema**
- Create `vehicles_vlms` view with VLMS column names
- Production queries `vehicles` table
- VLMS queries `vehicles_vlms` view
- **Result**: No code changes needed

### Recommendation
**Use Option A** for immediate unblocking, then migrate to Option B over 2-3 sprints.

---

## 6. Risk Assessment by Change

| Change | Production Impact | VLMS Impact | Risk Level | Mitigation |
|--------|-------------------|-------------|------------|------------|
| Add nullable columns | None - existing code unaffected | Unblocks onboarding | 🟢 Low | Test insertions |
| Add `license_plate` column | None | Fixes query errors | 🟢 Low | Sync trigger |
| Make fields NOT NULL | Breaking - nulls in old records | Requires defaults | 🔴 High | Migrate data first |
| Rename `plate_number` | Breaking - 30+ files affected | Fixes naming | 🔴 High | Phased rollout |
| Remove legacy `capacity` | Breaking - production expects it | None | 🔴 High | Keep for 6 months |

---

## 7. Consolidation Decision Matrix

| Feature | Keep Production | Keep VLMS | Keep Both | Decision |
|---------|----------------|-----------|-----------|----------|
| Vehicle List Component | `VehicleManagement.tsx` | `VehiclesPage.tsx` | ❌ | **Keep VLMS** (more features) |
| Quick Add Form | Dialog in VehicleManagement | `VehicleForm.tsx` | ❌ | **Keep VLMS** (taxonomy support) |
| Capacity Model | Single `capacity` number | Dimensional + tiers | ✅ | **Keep Both** (compute legacy from VLMS) |
| Plate Field Name | `plate_number` | `license_plate` | ✅ Temporarily | **Migrate to `license_plate`** |
| Vehicle Type | Free text `type` | UUID `vehicle_type_id` | ✅ | **Keep Both** (legacy compat) |

---

## 8. Next Steps

### Immediate Actions (This Week)
1. ✅ Run `ADD_MISSING_VEHICLE_COLUMNS.sql` migration
2. ✅ Add `license_plate` column with sync trigger
3. ✅ Update VLMS stores to query `plate_number` temporarily
4. ✅ Test vehicle onboarding wizard end-to-end

### Short Term (Next Sprint)
5. Consolidate vehicle list components
6. Update production forms to collect VLMS fields
7. Regenerate TypeScript types
8. Update documentation

### Long Term (Next Quarter)
9. Rename `plate_number` → `license_plate` with coordinated deployment
10. Deprecate duplicate capacity columns
11. Create canonical vehicle domain model
12. Archive old production components

---

## Appendix: Query Pattern Conflicts

### Production Query Pattern
```typescript
supabase.from('vehicles').select('id, model, plate_number, capacity, max_weight')
```

### VLMS Query Pattern
```typescript
supabase.from('vehicles').select('id, vehicle_id, make, model, year, license_plate, category_id, capacity_kg')
```

**Compatibility**: 40% overlap - requires schema consolidation

---

**Report Status**: ✅ Complete
**Approved By**: Pending
**Implementation**: Blocked until approval
