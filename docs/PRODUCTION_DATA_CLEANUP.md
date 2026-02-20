# Production Database Cleanup Guide

## Overview
Several database migrations contain sample/seed data that should be reviewed before production deployment.

---

## Migrations with Sample Data

### 1. **Default Workspace** (Required - Keep)
**File:** `supabase/migrations/20260218000001_setup_default_workspace.sql`

**What it does:**
- Creates default workspace: `00000000-0000-0000-0000-000000000001`
- Creates Nigeria as default country
- Auto-adds all users to default workspace

**Action:** ✅ **KEEP** - This is required for the platform to function

---

### 2. **Sample Zones & Service Areas** (Development Data - Review)
**File:** `supabase/migrations/20260214000003_sample_zones_service_areas.sql`

**What it creates:**
- **Zones:**
  - Kano Zone (code: KANO)
  - Lagos Zone (code: LAG)
  - Abuja Zone (code: ABJ)

- **Service Areas:**
  - Kano Central Service Area
  - Kano Rural Service Area
  - Lagos Mainland Service Area
  - Lagos Island Service Area
  - Abuja Central Service Area
  - Abuja Suburban Service Area

**Action:** ⚠️ **REVIEW REQUIRED**

**Options:**
1. **Keep if using in Nigeria** - These are real operational zones
2. **Delete if different region** - Create new zones for your region
3. **Modify** - Update zone names/coordinates for your needs

**To delete sample data:**
```sql
-- Run AFTER migration is applied
DELETE FROM service_areas WHERE name LIKE '%Service Area%';
DELETE FROM zones WHERE code IN ('KANO', 'LAG', 'ABJ');
```

---

### 3. **Sample Programs** (Optional Data)
**File:** `supabase/migrations/20260217224343_create_programs_table.sql`

**What it creates:**
- Sample programs (if any INSERT statements exist)

**Action:** Check file for INSERT statements and review

---

### 4. **Email Login OTP System** (System Data - Keep)
**File:** `supabase/migrations/20260219100000_create_email_login_otp_system.sql`

**What it does:**
- Creates OTP tables for driver authentication
- System infrastructure, not sample data

**Action:** ✅ **KEEP**

---

### 5. **Facility Types & Levels of Care** (Reference Data - Keep)
**File:** `supabase/migrations/20260207224515_create_facility_types_and_levels_of_care.sql`

**What it creates:**
- Facility type lookup tables (e.g., "Hospital", "Clinic", "Pharmacy")
- Healthcare levels of care (if applicable)

**Action:** ✅ **KEEP** - This is reference data needed by the system

---

### 6. **VLMS Seed Data** (Vehicle Data - Review)
**File:** `supabase/migrations/20241113000001_vlms_seed.sql`

**What it creates:**
- Sample vehicle categories
- Sample vehicle types
- Sample vehicle tiers

**Action:** ⚠️ **REVIEW REQUIRED**
- Keep if using standard vehicle classifications
- Modify if you need custom vehicle types

---

## Production Cleanup Script

Create and run this after migrations are applied:

```sql
-- =====================================================
-- Production Data Cleanup
-- Run this in production AFTER migrations are applied
-- =====================================================

BEGIN;

-- 1. Check if we should clean sample data (only run if database name contains 'prod')
DO $$
DECLARE
  db_name TEXT;
  is_production BOOLEAN;
BEGIN
  -- Get current database name
  SELECT current_database() INTO db_name;

  -- Check if this is production (database name contains 'prod' or 'production')
  is_production := (db_name LIKE '%prod%' OR db_name LIKE '%production%');

  IF is_production THEN
    RAISE NOTICE 'Production database detected: %. Cleaning sample data...', db_name;

    -- Delete sample service areas (created by migration 20260214000003)
    DELETE FROM service_areas
    WHERE name IN (
      'Kano Central Service Area',
      'Kano Rural Service Area',
      'Lagos Mainland Service Area',
      'Lagos Island Service Area',
      'Abuja Central Service Area',
      'Abuja Suburban Service Area'
    );

    RAISE NOTICE 'Deleted % sample service areas', FOUND;

    -- Delete sample zones (created by migration 20260214000003)
    DELETE FROM zones
    WHERE code IN ('KANO', 'LAG', 'ABJ')
    AND NOT EXISTS (
      -- Keep zones that have actual service areas or routes
      SELECT 1 FROM service_areas WHERE zone_id = zones.id
      UNION
      SELECT 1 FROM routes WHERE zone_id = zones.id
    );

    RAISE NOTICE 'Deleted % sample zones', FOUND;

    -- Keep default workspace (required)
    -- Keep facility types (reference data)
    -- Keep VLMS seed data (vehicle classifications)

    RAISE NOTICE 'Production cleanup complete';
  ELSE
    RAISE NOTICE 'Development database detected: %. Keeping sample data.', db_name;
  END IF;
END $$;

COMMIT;
```

---

## Manual Review Checklist

Before deploying to production, review these tables:

### Check for Test Data
```sql
-- Check for test users
SELECT * FROM profiles WHERE email LIKE '%test%' OR email LIKE '%example%';

-- Check for sample zones
SELECT * FROM zones WHERE description LIKE '%sample%';

-- Check for placeholder facilities
SELECT * FROM facilities WHERE name LIKE '%test%' OR name LIKE '%demo%';

-- Check for test warehouses
SELECT * FROM warehouses WHERE name LIKE '%test%';

-- Check for sample programs
SELECT * FROM programs WHERE description LIKE '%sample%';
```

### Verify Required Data
```sql
-- Verify default workspace exists
SELECT * FROM workspaces WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify facility types exist (reference data)
SELECT * FROM facility_types;

-- Verify vehicle categories exist (VLMS)
SELECT * FROM vehicle_categories;

-- Verify countries table has at least one country
SELECT * FROM countries;
```

---

## Recommended Production Setup

### 1. Clean Database (Option A)
Start with clean database, only essential data:
```bash
# Reset and apply migrations
supabase db reset --linked

# Run production cleanup script
supabase db execute -f scripts/production-cleanup.sql
```

### 2. Conditional Migrations (Option B)
Modify migration files to check environment:

```sql
-- Add to sample data migrations
DO $$
BEGIN
  -- Only insert sample data in development
  IF current_database() LIKE '%dev%' OR current_database() LIKE '%local%' THEN
    INSERT INTO zones (id, name, code, ...) VALUES (...);
    -- ... more sample data
  END IF;
END $$;
```

### 3. Separate Seed Files (Option C - Recommended)
Move sample data to separate seed files:

**Structure:**
```
supabase/
  migrations/          # Schema only, no sample data
  seed/
    development.sql    # Development sample data
    production.sql     # Production starter data (if any)
```

---

## Post-Migration Verification

After running cleanup, verify:

```sql
-- Count records in key tables
SELECT
  'workspaces' as table_name, COUNT(*) as count FROM workspaces
UNION ALL
SELECT 'zones', COUNT(*) FROM zones
UNION ALL
SELECT 'service_areas', COUNT(*) FROM service_areas
UNION ALL
SELECT 'facilities', COUNT(*) FROM facilities
UNION ALL
SELECT 'programs', COUNT(*) FROM programs
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;
```

**Expected for Fresh Production:**
- `workspaces`: 1 (default workspace)
- `zones`: 0 (or your real zones)
- `service_areas`: 0 (or your real service areas)
- `facilities`: 0 (will be added by users)
- `programs`: 0 (will be added by users)
- `profiles`: 0 (users will register)

---

## Summary

**Keep (Required):**
- ✅ Default workspace
- ✅ Facility types (reference data)
- ✅ Vehicle categories (VLMS seed)
- ✅ Email OTP system tables

**Review/Remove (Sample Data):**
- ⚠️ Sample zones (Kano, Lagos, Abuja)
- ⚠️ Sample service areas
- ⚠️ Any test users

**Action:** Run production cleanup script before launch
