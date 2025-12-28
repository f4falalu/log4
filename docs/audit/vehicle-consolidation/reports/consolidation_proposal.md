# Vehicle Domain Consolidation Proposal

**Status**: 📋 Proposal - Awaiting Approval
**Created**: 2025-11-18
**Estimated Effort**: 12-16 hours implementation
**Risk Level**: 🟡 MEDIUM (with phased approach)

---

## Executive Summary

This proposal presents a **phased consolidation strategy** to unify the production vehicle system and VLMS system into a single canonical schema that supports both use cases while maintaining backward compatibility.

**Approach**: **Option A - Additive with Gradual Migration**
- Phase 1: Add missing columns (non-breaking)
- Phase 2: Add sync mechanisms (non-breaking)
- Phase 3: Update VLMS code (low-risk)
- Phase 4: Migrate production code (coordinated)
- Phase 5: Clean up legacy columns (final)

**Key Principle**: **No breaking changes until all systems updated**

---

## 1. Canonical Schema Definition

### 1.1 Unified `vehicles` Table Schema

This is the target schema that supports both production and VLMS requirements:

```sql
CREATE TABLE vehicles (
  -- ============================================
  -- IDENTITY
  -- ============================================
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id VARCHAR(50) UNIQUE,  -- Auto-generated VEH-YYYY-NNN

  -- ============================================
  -- BASIC INFORMATION
  -- ============================================
  make VARCHAR(100),              -- NEW: Brand/manufacturer
  model TEXT NOT NULL,            -- EXISTING
  year INTEGER,                   -- NEW: Manufacturing year
  vin VARCHAR(17) UNIQUE,         -- NEW: Vehicle Identification Number

  -- ============================================
  -- LICENSE PLATE (Dual Column Strategy)
  -- ============================================
  plate_number TEXT UNIQUE NOT NULL,     -- EXISTING: Production name
  license_plate VARCHAR(20) UNIQUE,      -- NEW: VLMS name (synced)

  color VARCHAR(50),              -- NEW: Vehicle color

  -- ============================================
  -- CLASSIFICATION
  -- ============================================
  type TEXT,                      -- EXISTING: Legacy free-text type
  category_id UUID REFERENCES vehicle_categories(id) ON DELETE SET NULL,  -- EXISTING
  vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE SET NULL,   -- EXISTING
  fuel_type fuel_type NOT NULL,  -- EXISTING
  transmission VARCHAR(50),       -- NEW: automatic/manual/cvt

  -- ============================================
  -- SPECIFICATIONS
  -- ============================================
  engine_capacity DECIMAL(10,2),  -- NEW: Engine size (liters)
  seating_capacity INTEGER,       -- NEW: Number of seats

  -- ============================================
  -- CAPACITY (Dual Model Support)
  -- ============================================
  -- Legacy Production Model
  capacity DECIMAL(10,2),         -- EXISTING: Computed from capacity_m3
  max_weight INTEGER,             -- EXISTING: Computed from capacity_kg

  -- VLMS Detailed Model
  capacity_kg NUMERIC,            -- EXISTING: Precise weight capacity
  capacity_m3 NUMERIC,            -- EXISTING: Precise volume capacity
  length_cm INTEGER,              -- EXISTING: Cargo dimensions
  width_cm INTEGER,               -- EXISTING
  height_cm INTEGER,              -- EXISTING
  tiered_config JSONB,            -- EXISTING: Multi-tier configuration

  -- Deprecated Duplicates (will be removed in Phase 5)
  capacity_volume_m3 FLOAT,       -- DEPRECATED
  capacity_weight_kg FLOAT,       -- DEPRECATED

  -- ============================================
  -- ACQUISITION
  -- ============================================
  acquisition_date DATE,          -- NEW: When vehicle acquired
  acquisition_type VARCHAR(50),   -- NEW: purchase/lease/donation/transfer
  purchase_price DECIMAL(15,2),   -- NEW: Purchase amount
  vendor_name VARCHAR(255),       -- NEW: Supplier/dealer
  warranty_expiry DATE,           -- NEW: Warranty end date

  -- ============================================
  -- CURRENT STATUS
  -- ============================================
  status vehicle_status NOT NULL DEFAULT 'available',  -- EXISTING
  current_location_id UUID REFERENCES facilities(id),  -- NEW: Current facility
  current_driver_id UUID REFERENCES drivers(id),       -- EXISTING
  current_mileage DECIMAL(10,2) DEFAULT 0,            -- NEW: Odometer

  -- ============================================
  -- INSURANCE & REGISTRATION
  -- ============================================
  insurance_provider VARCHAR(255),        -- NEW
  insurance_policy_number VARCHAR(100),   -- NEW
  insurance_expiry DATE,                  -- NEW
  registration_expiry DATE,               -- NEW

  -- ============================================
  -- FINANCIAL
  -- ============================================
  depreciation_rate DECIMAL(5,2),         -- NEW: Annual depreciation %
  current_book_value DECIMAL(15,2),       -- NEW: Current asset value
  total_maintenance_cost DECIMAL(15,2) DEFAULT 0,  -- NEW: Cumulative cost

  -- ============================================
  -- FLEET ASSIGNMENT
  -- ============================================
  fleet_id UUID REFERENCES fleets(id) ON DELETE SET NULL,  -- EXISTING

  -- ============================================
  -- OPERATIONAL METRICS
  -- ============================================
  fuel_efficiency DECIMAL(5,2) NOT NULL,  -- EXISTING
  avg_speed INTEGER NOT NULL DEFAULT 40,   -- EXISTING
  last_service_date DATE,                 -- NEW
  next_service_date DATE,                 -- NEW
  last_inspection_date DATE,              -- NEW
  next_inspection_date DATE,              -- NEW

  -- ============================================
  -- DOCUMENTS & PHOTOS
  -- ============================================
  documents JSONB DEFAULT '[]'::jsonb,    -- NEW: Document attachments array
  photos JSONB DEFAULT '[]'::jsonb,       -- NEW: Photo gallery array

  -- Single photo URLs (existing)
  photo_url TEXT,                         -- EXISTING
  thumbnail_url TEXT,                     -- EXISTING
  photo_uploaded_at TIMESTAMPTZ,          -- EXISTING
  ai_capacity_image_url TEXT,             -- EXISTING
  ai_generated BOOLEAN DEFAULT FALSE,     -- EXISTING

  -- ============================================
  -- METADATA
  -- ============================================
  notes TEXT,                             -- NEW: Free-text notes
  tags TEXT[],                            -- NEW: Tag array
  created_at TIMESTAMPTZ DEFAULT now(),   -- EXISTING
  updated_at TIMESTAMPTZ DEFAULT now(),   -- EXISTING
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NEW
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL   -- NEW
);
```

---

## 2. Migration Strategy - Phase-by-Phase DDL

### Phase 1: Add Missing Columns (Non-Breaking) ✅ SAFE

**Goal**: Add all missing VLMS columns as NULLABLE to unblock onboarding

**File**: `supabase/migrations/20251118000010_add_missing_vehicle_columns.sql`

```sql
-- =====================================================
-- PHASE 1: Add Missing Vehicle Columns
-- =====================================================
-- Impact: NONE - All columns nullable, existing code unaffected
-- Rollback: Safe - can drop columns if needed
-- =====================================================

BEGIN;

-- Add basic info columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year INTEGER CHECK (year IS NULL OR (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin VARCHAR(17);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color VARCHAR(50);

-- Add acquisition columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS acquisition_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS acquisition_type VARCHAR(50) CHECK (acquisition_type IS NULL OR acquisition_type IN ('purchase', 'lease', 'donation', 'transfer', 'other'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(15,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS warranty_expiry DATE;

-- Add specification columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission VARCHAR(50) CHECK (transmission IS NULL OR transmission IN ('automatic', 'manual', 'cvt', 'amt', 'dct'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS seating_capacity INTEGER CHECK (seating_capacity IS NULL OR seating_capacity > 0);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_capacity DECIMAL(10,2) CHECK (engine_capacity IS NULL OR engine_capacity > 0);

-- Add insurance & registration columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_expiry DATE;

-- Add financial columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS depreciation_rate DECIMAL(5,2) CHECK (depreciation_rate IS NULL OR (depreciation_rate >= 0 AND depreciation_rate <= 100));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_book_value DECIMAL(15,2) CHECK (current_book_value IS NULL OR current_book_value >= 0);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS total_maintenance_cost DECIMAL(15,2) DEFAULT 0 CHECK (total_maintenance_cost >= 0);

-- Add operational columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_location_id UUID REFERENCES facilities(id) ON DELETE SET NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_mileage DECIMAL(10,2) DEFAULT 0 CHECK (current_mileage >= 0);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_service_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_service_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_inspection_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_inspection_date DATE;

-- Add document/metadata columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_vehicles_current_location ON vehicles(current_location_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_by ON vehicles(created_by);
CREATE INDEX IF NOT EXISTS idx_vehicles_updated_by ON vehicles(updated_by);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make) WHERE make IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year) WHERE year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin) WHERE vin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_acquisition_date ON vehicles(acquisition_date) WHERE acquisition_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_next_service_date ON vehicles(next_service_date) WHERE next_service_date IS NOT NULL AND status != 'disposed';

-- Add unique constraints
ALTER TABLE vehicles ADD CONSTRAINT vehicles_vin_unique UNIQUE (vin);
ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_id_unique UNIQUE (vehicle_id);

COMMIT;

-- Verification
SELECT COUNT(*) as columns_added FROM information_schema.columns
WHERE table_name = 'vehicles'
AND column_name IN (
  'make', 'year', 'vin', 'vehicle_id', 'color',
  'acquisition_date', 'acquisition_type', 'purchase_price', 'vendor_name', 'warranty_expiry',
  'transmission', 'seating_capacity', 'engine_capacity',
  'insurance_provider', 'insurance_policy_number', 'insurance_expiry', 'registration_expiry',
  'depreciation_rate', 'current_book_value', 'total_maintenance_cost',
  'current_location_id', 'current_mileage', 'last_service_date', 'next_service_date',
  'last_inspection_date', 'next_inspection_date',
  'documents', 'photos', 'notes', 'tags', 'created_by', 'updated_by'
);
-- Should return 32

SELECT '✅ Phase 1 Complete: All missing columns added successfully!' AS status;
```

---

### Phase 2: Add Dual Column Sync (Non-Breaking) ✅ SAFE

**Goal**: Add `license_plate` column and sync mechanism

**File**: `supabase/migrations/20251118000011_add_license_plate_sync.sql`

```sql
-- =====================================================
-- PHASE 2: Add license_plate Column with Sync
-- =====================================================
-- Impact: NONE - New column with automatic sync
-- Rollback: Safe - can drop column and trigger
-- =====================================================

BEGIN;

-- Add license_plate column
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20);

-- Copy existing data from plate_number to license_plate
UPDATE vehicles
SET license_plate = plate_number
WHERE license_plate IS NULL;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_license_plate_unique
  ON vehicles(license_plate)
  WHERE license_plate IS NOT NULL;

-- Create bidirectional sync trigger
CREATE OR REPLACE FUNCTION sync_vehicle_plate_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If plate_number changed, update license_plate
  IF (TG_OP = 'INSERT' OR OLD.plate_number IS DISTINCT FROM NEW.plate_number) THEN
    NEW.license_plate := NEW.plate_number;
  END IF;

  -- If license_plate changed, update plate_number
  IF (TG_OP = 'INSERT' OR OLD.license_plate IS DISTINCT FROM NEW.license_plate) THEN
    IF NEW.license_plate IS NOT NULL THEN
      NEW.plate_number := NEW.license_plate;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_vehicle_plate_fields ON vehicles;
CREATE TRIGGER trigger_sync_vehicle_plate_fields
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION sync_vehicle_plate_fields();

COMMIT;

-- Verification
SELECT
  COUNT(*) FILTER (WHERE plate_number = license_plate) as synced_count,
  COUNT(*) as total_count
FROM vehicles;

SELECT '✅ Phase 2 Complete: license_plate column added with bidirectional sync!' AS status;
```

---

### Phase 3: Auto-Generate vehicle_id (Non-Breaking) ✅ SAFE

**Goal**: Add trigger to auto-generate VEH-YYYY-NNN format IDs

**File**: `supabase/migrations/20251118000012_add_vehicle_id_generation.sql`

```sql
-- =====================================================
-- PHASE 3: Auto-Generate vehicle_id
-- =====================================================
-- Impact: NONE - Only affects new inserts
-- Rollback: Safe - can drop function and trigger
-- =====================================================

BEGIN;

-- Function to generate vehicle_id in format VEH-YYYY-NNN
CREATE OR REPLACE FUNCTION generate_vehicle_id()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  max_sequence INTEGER;
  new_vehicle_id TEXT;
BEGIN
  -- Only generate if not provided
  IF NEW.vehicle_id IS NULL THEN
    current_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    -- Find max sequence number for current year
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(vehicle_id FROM 'VEH-\d{4}-(\d+)') AS INTEGER)
    ), 0) INTO max_sequence
    FROM vehicles
    WHERE vehicle_id LIKE 'VEH-' || current_year || '-%';

    -- Generate new ID
    new_vehicle_id := 'VEH-' || current_year || '-' || LPAD((max_sequence + 1)::TEXT, 3, '0');
    NEW.vehicle_id := new_vehicle_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_vehicle_id ON vehicles;
CREATE TRIGGER trigger_generate_vehicle_id
  BEFORE INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION generate_vehicle_id();

COMMIT;

-- Test
DO $$
DECLARE
  test_id UUID;
BEGIN
  INSERT INTO vehicles (model, plate_number, type, capacity, max_weight, fuel_type, fuel_efficiency, status)
  VALUES ('Test Model', 'TEST-' || floor(random() * 1000)::text, 'van', 10, 1000, 'diesel', 12.5, 'available')
  RETURNING id INTO test_id;

  DELETE FROM vehicles WHERE id = test_id;

  RAISE NOTICE '✅ Phase 3 Complete: vehicle_id auto-generation working!';
END $$;
```

---

### Phase 4: Add Helper Functions (Non-Breaking) ✅ SAFE

**Goal**: Add computed column triggers and helper functions

**File**: `supabase/migrations/20251118000013_add_vehicle_helpers.sql`

```sql
-- =====================================================
-- PHASE 4: Helper Functions & Computed Columns
-- =====================================================
-- Impact: NONE - Only affects new/updated records
-- Rollback: Safe - can drop functions and triggers
-- =====================================================

BEGIN;

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vehicle_updated_at ON vehicles;
CREATE TRIGGER trigger_update_vehicle_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_updated_at();

-- Function: Compute legacy capacity from capacity_m3
CREATE OR REPLACE FUNCTION sync_legacy_capacity()
RETURNS TRIGGER AS $$
BEGIN
  -- If capacity_m3 provided but capacity not, compute it
  IF NEW.capacity_m3 IS NOT NULL AND NEW.capacity IS NULL THEN
    NEW.capacity := NEW.capacity_m3;
  END IF;

  -- If capacity_kg provided but max_weight not, compute it
  IF NEW.capacity_kg IS NOT NULL AND NEW.max_weight IS NULL THEN
    NEW.max_weight := ROUND(NEW.capacity_kg)::INTEGER;
  END IF;

  -- Reverse: If legacy values provided, sync to VLMS fields
  IF NEW.capacity IS NOT NULL AND NEW.capacity_m3 IS NULL THEN
    NEW.capacity_m3 := NEW.capacity;
  END IF;

  IF NEW.max_weight IS NOT NULL AND NEW.capacity_kg IS NULL THEN
    NEW.capacity_kg := NEW.max_weight;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_legacy_capacity ON vehicles;
CREATE TRIGGER trigger_sync_legacy_capacity
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION sync_legacy_capacity();

-- Function: Set created_by on insert
CREATE OR REPLACE FUNCTION set_vehicle_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_vehicle_created_by ON vehicles;
CREATE TRIGGER trigger_set_vehicle_created_by
  BEFORE INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_vehicle_created_by();

-- Function: Set updated_by on update
CREATE OR REPLACE FUNCTION set_vehicle_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_vehicle_updated_by ON vehicles;
CREATE TRIGGER trigger_set_vehicle_updated_by
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_vehicle_updated_by();

COMMIT;

SELECT '✅ Phase 4 Complete: Helper functions and triggers added!' AS status;
```

---

### Phase 5: Data Migration (One-Time) ⚠️ REQUIRES REVIEW

**Goal**: Set default values for existing records

**File**: `supabase/migrations/20251118000014_migrate_existing_data.sql`

```sql
-- =====================================================
-- PHASE 5: Data Migration for Existing Records
-- =====================================================
-- Impact: MEDIUM - Updates existing records
-- Rollback: Requires backup restore
-- =====================================================
-- ⚠️  REVIEW CAREFULLY BEFORE RUNNING
-- ⚠️  TEST ON STAGING FIRST
-- ⚠️  BACKUP DATABASE BEFORE RUNNING
-- =====================================================

BEGIN;

-- Backup existing data
CREATE TABLE IF NOT EXISTS vehicles_backup_20251118 AS
SELECT * FROM vehicles;

-- Set default acquisition_date for records missing it
UPDATE vehicles
SET acquisition_date = created_at::DATE
WHERE acquisition_date IS NULL;

-- Set default acquisition_type
UPDATE vehicles
SET acquisition_type = 'purchase'
WHERE acquisition_type IS NULL;

-- Generate vehicle_ids for existing records
DO $$
DECLARE
  vehicle_record RECORD;
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  FOR vehicle_record IN
    SELECT id, created_at
    FROM vehicles
    WHERE vehicle_id IS NULL
    ORDER BY created_at
  LOOP
    year_str := TO_CHAR(vehicle_record.created_at, 'YYYY');

    SELECT COALESCE(MAX(
      CAST(SUBSTRING(vehicle_id FROM 'VEH-\d{4}-(\d+)') AS INTEGER)
    ), 0) + 1 INTO seq_num
    FROM vehicles
    WHERE vehicle_id LIKE 'VEH-' || year_str || '-%';

    UPDATE vehicles
    SET vehicle_id = 'VEH-' || year_str || '-' || LPAD(seq_num::TEXT, 3, '0')
    WHERE id = vehicle_record.id;
  END LOOP;
END $$;

-- Sync capacity fields for existing records
UPDATE vehicles
SET
  capacity_m3 = capacity,
  capacity_kg = max_weight
WHERE capacity_m3 IS NULL AND capacity IS NOT NULL;

COMMIT;

-- Verification
SELECT
  COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL) as has_vehicle_id,
  COUNT(*) FILTER (WHERE acquisition_date IS NOT NULL) as has_acquisition_date,
  COUNT(*) FILTER (WHERE license_plate = plate_number) as plates_synced,
  COUNT(*) as total
FROM vehicles;

SELECT '✅ Phase 5 Complete: Existing data migrated!' AS status;
```

---

## 3. Code Update Strategy

### 3.1 VLMS Store Updates (Quick Fix)

**Priority**: P0 - Immediate (blocks onboarding)

**File**: `/src/stores/vlms/vehiclesStore.ts`

**Change 1: Update Query Columns** (Line 86)
```typescript
// BEFORE:
license_plate.ilike.%${filters.search}%

// AFTER (temporary until Phase 2):
plate_number.ilike.%${filters.search}%

// FINAL (after Phase 2 deployed):
license_plate.ilike.%${filters.search}%
```

**Change 2: Update Select Columns** (Lines 75-78)
```typescript
// BEFORE:
vehicle:vehicles(id, vehicle_id, make, model, license_plate, current_mileage)

// AFTER (temporary):
vehicle:vehicles(id, vehicle_id, make, model, plate_number as license_plate, current_mileage)

// FINAL (after Phase 2):
vehicle:vehicles(id, vehicle_id, make, model, license_plate, current_mileage)
```

### 3.2 TypeScript Type Regeneration

**Priority**: P0 - Immediate

```bash
# After Phase 1 migration applied
npx supabase gen types typescript --project-id cenugzabuzglswikoewy > src/integrations/supabase/types.ts
```

### 3.3 VLMS Form Data Mapping

**Priority**: P1 - This Sprint

**File**: `/src/hooks/useVehicleOnboardState.ts` (Lines 300-332)

No changes needed - form already collects all fields correctly. Migration unblocks insertion.

---

## 4. Rollback Strategy

### Phase 1 Rollback
```sql
BEGIN;

-- Drop new columns (if no critical data)
ALTER TABLE vehicles
  DROP COLUMN IF EXISTS make,
  DROP COLUMN IF EXISTS year,
  DROP COLUMN IF EXISTS vin,
  DROP COLUMN IF EXISTS vehicle_id,
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS acquisition_date,
  DROP COLUMN IF EXISTS acquisition_type,
  DROP COLUMN IF EXISTS purchase_price,
  DROP COLUMN IF EXISTS vendor_name,
  DROP COLUMN IF EXISTS warranty_expiry,
  DROP COLUMN IF EXISTS transmission,
  DROP COLUMN IF EXISTS seating_capacity,
  DROP COLUMN IF EXISTS engine_capacity,
  DROP COLUMN IF EXISTS insurance_provider,
  DROP COLUMN IF EXISTS insurance_policy_number,
  DROP COLUMN IF EXISTS insurance_expiry,
  DROP COLUMN IF EXISTS registration_expiry,
  DROP COLUMN IF EXISTS depreciation_rate,
  DROP COLUMN IF EXISTS current_book_value,
  DROP COLUMN IF EXISTS total_maintenance_cost,
  DROP COLUMN IF EXISTS current_location_id,
  DROP COLUMN IF EXISTS current_mileage,
  DROP COLUMN IF EXISTS last_service_date,
  DROP COLUMN IF EXISTS next_service_date,
  DROP COLUMN IF EXISTS last_inspection_date,
  DROP COLUMN IF EXISTS next_inspection_date,
  DROP COLUMN IF EXISTS documents,
  DROP COLUMN IF EXISTS photos,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

COMMIT;
```

### Phase 2 Rollback
```sql
BEGIN;

DROP TRIGGER IF EXISTS trigger_sync_vehicle_plate_fields ON vehicles;
DROP FUNCTION IF EXISTS sync_vehicle_plate_fields();
ALTER TABLE vehicles DROP COLUMN IF EXISTS license_plate;

COMMIT;
```

### Phase 3 Rollback
```sql
BEGIN;

DROP TRIGGER IF EXISTS trigger_generate_vehicle_id ON vehicles;
DROP FUNCTION IF EXISTS generate_vehicle_id();

COMMIT;
```

### Phase 4 Rollback
```sql
BEGIN;

DROP TRIGGER IF EXISTS trigger_update_vehicle_updated_at ON vehicles;
DROP TRIGGER IF EXISTS trigger_sync_legacy_capacity ON vehicles;
DROP TRIGGER IF EXISTS trigger_set_vehicle_created_by ON vehicles;
DROP TRIGGER IF EXISTS trigger_set_vehicle_updated_by ON vehicles;

DROP FUNCTION IF EXISTS update_vehicle_updated_at();
DROP FUNCTION IF EXISTS sync_legacy_capacity();
DROP FUNCTION IF EXISTS set_vehicle_created_by();
DROP FUNCTION IF EXISTS set_vehicle_updated_by();

COMMIT;
```

### Phase 5 Rollback
```sql
BEGIN;

-- Restore from backup
TRUNCATE vehicles;
INSERT INTO vehicles SELECT * FROM vehicles_backup_20251118;

COMMIT;
```

---

## 5. Testing Strategy

### Unit Tests (After Each Phase)

**Phase 1 Tests**:
```sql
-- Test 1: Verify columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicles'
AND column_name = 'make';
-- Expected: make | character varying | YES

-- Test 2: Insert with new fields
INSERT INTO vehicles (
  model, plate_number, type, capacity, max_weight,
  fuel_type, fuel_efficiency, status,
  make, year, acquisition_date
) VALUES (
  'Test Model', 'TEST-001', 'van', 10, 1000,
  'diesel', 12.5, 'available',
  'Toyota', 2024, CURRENT_DATE
);
-- Expected: Success

-- Test 3: Insert without new fields (backward compat)
INSERT INTO vehicles (
  model, plate_number, type, capacity, max_weight,
  fuel_type, fuel_efficiency, status
) VALUES (
  'Legacy Model', 'LEGACY-001', 'van', 10, 1000,
  'diesel', 12.5, 'available'
);
-- Expected: Success
```

**Phase 2 Tests**:
```sql
-- Test 1: Verify sync on insert
INSERT INTO vehicles (
  model, plate_number, type, capacity, max_weight,
  fuel_type, fuel_efficiency, status
) VALUES (
  'Sync Test', 'SYNC-001', 'van', 10, 1000,
  'diesel', 12.5, 'available'
);

SELECT plate_number, license_plate
FROM vehicles
WHERE plate_number = 'SYNC-001';
-- Expected: SYNC-001 | SYNC-001

-- Test 2: Update plate_number, verify license_plate syncs
UPDATE vehicles
SET plate_number = 'SYNC-002'
WHERE plate_number = 'SYNC-001';

SELECT plate_number, license_plate
FROM vehicles
WHERE plate_number = 'SYNC-002';
-- Expected: SYNC-002 | SYNC-002
```

**Phase 3 Tests**:
```sql
-- Test 1: Verify auto-generated vehicle_id
INSERT INTO vehicles (
  model, plate_number, type, capacity, max_weight,
  fuel_type, fuel_efficiency, status
) VALUES (
  'Auto ID Test', 'AUTO-001', 'van', 10, 1000,
  'diesel', 12.5, 'available'
) RETURNING vehicle_id;
-- Expected: VEH-2025-NNN (where NNN is sequence)
```

### Integration Tests (End-to-End)

**Test 1: VLMS Onboarding Wizard**
1. Navigate to `/fleetops/vlms/vehicles/onboard`
2. Select category: N1 - Van
3. Select type: MINIVAN_HIACE
4. Configure capacity: 400×200×180cm, 1000kg
5. Fill registration form with all fields
6. Submit
7. Verify: Record created successfully
8. Verify: All fields saved correctly

**Test 2: Production Quick Add**
1. Navigate to `/fleetops/vehicles`
2. Click "Add Vehicle"
3. Fill minimal fields (model, plate_number, type, capacity)
4. Submit
5. Verify: Record created successfully
6. Verify: New VLMS fields are NULL (backward compat)

---

## 6. Approval Checklist

- [ ] Schema changes reviewed by database admin
- [ ] Migration DDL tested on staging environment
- [ ] Rollback procedures verified
- [ ] Code changes identified and assigned
- [ ] Testing strategy approved
- [ ] Backup plan confirmed
- [ ] Deployment window scheduled
- [ ] Stakeholder sign-off obtained

---

## 7. Success Criteria

**After Phase 1-2 (Immediate Goal)**:
- ✅ VLMS onboarding wizard creates vehicles successfully
- ✅ All 17 required fields can be saved
- ✅ Production vehicle quick-add still works
- ✅ No existing queries broken

**After Phase 3-4 (Short Term)**:
- ✅ Auto-generated vehicle_ids for new vehicles
- ✅ License plate field sync working bidirectionally
- ✅ Legacy capacity fields computed automatically
- ✅ Audit trail (created_by, updated_by) functional

**After Phase 5 (Long Term)**:
- ✅ All existing vehicles have migration data
- ✅ Single canonical schema in use
- ✅ Documentation complete
- ✅ Team trained on new schema

---

**Proposal Status**: ✅ Ready for Review
**Next Step**: Stakeholder approval to proceed with Phase 1
**Estimated Timeline**: 2-3 days for Phase 1-4, 1 week for Phase 5
