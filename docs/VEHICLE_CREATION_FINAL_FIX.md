# Vehicle Creation Final Fix

**Date**: December 13, 2025
**Status**: SQL migration required - Manual execution needed

---

## Problem Identified ✅

The vehicle creation was failing with error:
```
PGRST204: Could not find the 'vehicle_type' column of 'vehicles' in the schema cache
```

###Root Cause

The `vehicles` table is missing VLMS-specific columns that the `VehicleConfiguratorDialog` is trying to insert:

**Missing columns**:
- `vehicle_type` (table has `type` instead)
- `license_plate` (table has `plate_number` instead)
- `make`, `year`, `acquisition_type`, `acquisition_date`
- `transmission`, `current_mileage`, `category_id`, `vehicle_type_id`
- `capacity_m3`, `tiered_config`, `vehicle_id`
- And many more VLMS-specific fields

**Why this happened**:
- There are two vehicles tables in the database history:
  1. `public.vehicles` - older table with minimal columns (`type`, `plate_number`, etc.)
  2. `vlms_vehicles` - newer VLMS table with full columns (`vehicle_type`, `license_plate`, etc.)
- The code is correctly trying to insert into `vehicles` (the consolidated table)
- But the `vehicles` table doesn't have all the VLMS columns yet
- Migrations were created but not applied to the remote database

---

## Solution: SQL Migration

Run the following SQL in **Supabase SQL Editor**:

```sql
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type varchar(50),
  ADD COLUMN IF NOT EXISTS license_plate varchar(20),
  ADD COLUMN IF NOT EXISTS make varchar(100),
  ADD COLUMN IF NOT EXISTS year int,
  ADD COLUMN IF NOT EXISTS acquisition_type varchar(50),
  ADD COLUMN IF NOT EXISTS acquisition_date date,
  ADD COLUMN IF NOT EXISTS vendor_name varchar(255),
  ADD COLUMN IF NOT EXISTS registration_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS transmission varchar(50),
  ADD COLUMN IF NOT EXISTS interior_length_cm int,
  ADD COLUMN IF NOT EXISTS interior_width_cm int,
  ADD COLUMN IF NOT EXISTS interior_height_cm int,
  ADD COLUMN IF NOT EXISTS seating_capacity int,
  ADD COLUMN IF NOT EXISTS current_mileage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_type_id uuid,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS vehicle_id varchar(50),
  ADD COLUMN IF NOT EXISTS capacity_m3 numeric,
  ADD COLUMN IF NOT EXISTS tiered_config jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;
```

---

## How to Apply

### Method 1: Supabase Dashboard (Recommended)

1. Open https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new
2. Paste the SQL above
3. Click "Run" button
4. Verify success message

### Method 2: Using Supabase CLI

```bash
# Create a new migration
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_add_vlms_columns.sql << 'EOF'
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type varchar(50),
  ADD COLUMN IF NOT EXISTS license_plate varchar(20),
  -- ... (rest of SQL)
EOF

# Push to database
npx supabase db push
```

---

## After Running SQL

1. **Refresh the browser** - Clear Supabase schema cache
2. **Test vehicle creation**:
   - Navigate to http://localhost:8082/fleetops/vlms/vehicles
   - Click "Add Vehicle"
   - Fill in the form (minimal data is fine)
   - Click "Save & Continue"
   - Check browser console for success

3. **Expected console output**:
```
=== VehicleConfiguratorDialog ===
Raw formData from configurator: { ... }
Transformed vehicleData to send: { ... }
=================================
✅ Vehicle created successfully
```

---

## Verification Steps

After applying the SQL:

1. **Check columns exist**:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicles'
  AND column_name IN ('vehicle_type', 'license_plate', 'make', 'category_id')
ORDER BY column_name;
```

Expected result: 4 rows showing the new columns

2. **Test insert**:
```sql
INSERT INTO vehicles (
  vehicle_type,
  license_plate,
  make,
  model,
  year,
  fuel_type,
  acquisition_type,
  acquisition_date,
  status,
  current_mileage
) VALUES (
  'truck',
  'TEST-123',
  'Toyota',
  'Hiace',
  2010,
  'diesel',
  'purchase',
  CURRENT_DATE,
  'available',
  0
) RETURNING id, vehicle_type, license_plate;
```

Should return the new vehicle row.

3. **Clean up test**:
```sql
DELETE FROM vehicles WHERE license_plate = 'TEST-123';
```

---

## Files Modified/Created

### Created:
- [supabase/migrations/20251214000000_add_vlms_compat_columns.sql](../supabase/migrations/20251214000000_add_vlms_compat_columns.sql) - Full migration file
- [scripts/apply-vehicle-columns.sql](../scripts/apply-vehicle-columns.sql) - Direct SQL
- [scripts/add-vehicle-columns.js](../scripts/add-vehicle-columns.js) - Automated script (needs exec_sql function)

### Previously Created:
- [src/components/vlms/vehicles/VehicleConfiguratorDialog.tsx](../src/components/vlms/vehicles/VehicleConfiguratorDialog.tsx) - Enhanced with defaults & debug logging
- [src/stores/vlms/vehiclesStore.ts](../src/stores/vlms/vehiclesStore.ts) - Enhanced error logging

---

## Why Manual Execution is Needed

The migration file exists, but:
1. Remote database has migrations applied out of order
2. `supabase db push` requires `--include-all` which tries to re-apply old migrations
3. Old migrations have `CREATE TYPE` statements that already exist, causing conflicts
4. Safer to apply just this specific ALTER TABLE statement manually

---

## Related Documentation

- [VEHICLE_CREATION_FIX.md](./VEHICLE_CREATION_FIX.md) - Initial fix attempt with field defaults
- [VEHICLE_CREATION_DEBUG_GUIDE.md](./VEHICLE_CREATION_DEBUG_GUIDE.md) - Debugging guide
- [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md) - Performance optimizations

---

## Browser Console Debug Output

The console correctly shows what's being sent:

```json
{
  "category_id": "f0ce5813-d5e0-4334-9ef3-cd0924a81dc6",
  "model": "Toyota Hiace",
  "make": "Toyota",
  "length_cm": 180,
  "width_cm": 70,
  "height_cm": 110,
  "capacity_m3": 1.39,
  "gross_weight_kg": 250,
  "capacity_kg": 100,
  "vehicle_type": "truck",  ← This column doesn't exist in DB
  "year": 2010,
  "fuel_type": "diesel",
  "transmission": "manual",
  "acquisition_date": "2025-12-14",
  "acquisition_type": "purchase",
  "license_plate": "ABJ-123-BT",  ← This column doesn't exist in DB
  "status": "available",
  "current_mileage": 0
}
```

The error confirms:
```
PGRST204: Could not find the 'vehicle_type' column of 'vehicles' in the schema cache
```

---

## Next Steps

1. ✅ **Apply SQL** in Supabase SQL Editor
2. ⏳ **Refresh browser** to clear PostgREST schema cache
3. ⏳ **Test vehicle creation** - Should work immediately
4. ⏳ **Commit migration file** for version control
5. ⏳ **Update documentation** if needed

---

**Last Updated**: December 13, 2025
**Action Required**: Run SQL in Supabase Dashboard
**ETA to Fix**: 2 minutes after SQL execution

---

## Quick Command for Copy-Paste

Open: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new

Paste and Run:
```sql
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type varchar(50),
  ADD COLUMN IF NOT EXISTS license_plate varchar(20),
  ADD COLUMN IF NOT EXISTS make varchar(100),
  ADD COLUMN IF NOT EXISTS year int,
  ADD COLUMN IF NOT EXISTS acquisition_type varchar(50),
  ADD COLUMN IF NOT EXISTS acquisition_date date,
  ADD COLUMN IF NOT EXISTS vendor_name varchar(255),
  ADD COLUMN IF NOT EXISTS registration_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS transmission varchar(50),
  ADD COLUMN IF NOT EXISTS interior_length_cm int,
  ADD COLUMN IF NOT EXISTS interior_width_cm int,
  ADD COLUMN IF NOT EXISTS interior_height_cm int,
  ADD COLUMN IF NOT EXISTS seating_capacity int,
  ADD COLUMN IF NOT EXISTS current_mileage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_type_id uuid,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS vehicle_id varchar(50),
  ADD COLUMN IF NOT EXISTS capacity_m3 numeric,
  ADD COLUMN IF NOT EXISTS tiered_config jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;
```

Done! ✨
