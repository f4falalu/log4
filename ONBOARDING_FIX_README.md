# Vehicle Onboarding System - Fix Instructions

## Current Status

✅ **Completed:**
- `vehicle_categories` table created with 11 categories (7 EU + 4 BIKO)
- Application code updated to use `vehicles` table instead of `vlms_vehicles`
- TypeScript types synchronized

❌ **Remaining:**
- `vehicles` table needs onboarding columns
- `vehicle_types` need to be linked to categories
- `vehicle_tiers` table needs to be created
- Helper functions and triggers need to be added

---

## 🚀 Quick Fix Instructions

### Step 1: Run the Migration

1. Open Supabase SQL Editor:
   - URL: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new

2. Copy the contents of `FIX_VEHICLES_TABLE_FOR_ONBOARDING.sql`

3. Paste into SQL Editor and click **Run**

4. Verify success - you should see:
   ```
   ✅ Migration completed successfully! The vehicles table is now ready for the onboarding wizard.
   ```

### Step 2: Refresh the Browser

1. Open your application: http://localhost:8080/
2. Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. Navigate to: http://localhost:8080/fleetops/vlms/vehicles/onboard

### Step 3: Test the Onboarding Wizard

You should now see the category selection screen with:
- **EU Standards Tab**: L1 - Moped, L2 - Tricycle, M1 - Car, M2 - Minibus, N1 - Van, N2 - Medium Truck, N3 - Heavy Truck
- **BIKO Shortcuts Tab**: Mini Van, Keke, Delivery Moped, Cold Chain Van

**Test Flow:**
1. Select a category (e.g., "N1 - Van")
2. Select a vehicle type
3. Configure capacity:
   - Try dimensional mode: 400cm × 200cm × 180cm (should auto-calculate 14.4 m³)
   - Enter weight: 1000 kg
4. Fill registration details:
   - Make: Toyota
   - Model: Test
   - Year: 2024
   - License Plate: TEST-001
5. Review and submit
6. Verify redirect to vehicle detail page

---

## 📋 What the Migration Does

### 1. Adds Columns to `vehicles` Table
- `category_id` (uuid) - Links to vehicle_categories
- `vehicle_type_id` (uuid) - Links to vehicle_types
- `capacity_m3` (numeric) - Volume capacity
- `capacity_kg` (numeric) - Weight capacity
- `length_cm` (int) - Cargo length
- `width_cm` (int) - Cargo width
- `height_cm` (int) - Cargo height
- `tiered_config` (jsonb) - Tier configuration array

### 2. Links Existing Vehicle Types to Categories
- car → M1 (Passenger Car)
- pickup → N1 (Light Commercial Vehicle)
- truck → N2 (Medium Commercial Vehicle)
- van → N1 (Light Commercial Vehicle)

### 3. Creates `vehicle_tiers` Table
- Normalized storage for tier configurations
- Auto-synced from `tiered_config` JSONB column

### 4. Adds Helper Functions
- `calculate_cargo_volume(length, width, height)` - Converts cm³ to m³
- `sync_vehicle_tiers_from_config(vehicle_id, config)` - Syncs tiers
- `validate_tier_config(config)` - Validates tier order

### 5. Creates Triggers
- `trigger_auto_calculate_vehicle_volume` - Auto-calculates volume from dimensions
- `trigger_auto_sync_vehicle_tiers` - Auto-syncs tiers when tiered_config changes

### 6. Sets Up Security
- RLS policies for `vehicle_tiers` table
- Read access for all authenticated users

### 7. Creates Helper Views
- `vehicles_with_taxonomy` - Vehicles with category and type details
- `vehicles_with_tier_stats` - Vehicles with tier statistics

---

## 🔍 Verification Queries

After running the migration, you can verify everything worked by running these queries in Supabase SQL Editor:

### Check New Columns
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicles'
AND column_name IN ('category_id', 'vehicle_type_id', 'capacity_m3', 'capacity_kg', 'length_cm', 'width_cm', 'height_cm', 'tiered_config')
ORDER BY column_name;
```

Expected: 8 rows

### Check Vehicle Types Linked to Categories
```sql
SELECT vt.name, vc.display_name AS category
FROM vehicle_types vt
LEFT JOIN vehicle_categories vc ON vt.category_id = vc.id
ORDER BY vt.name;
```

Expected: All 4 types should have categories (no NULL values)

### Check All Tables Exist
```sql
SELECT
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_categories') AS has_categories,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_types') AS has_types,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_tiers') AS has_tiers,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicles') AS has_vehicles;
```

Expected: All columns should be `true`

---

## 🐛 Troubleshooting

### Categories Still Not Showing

**Problem:** After running migration, categories still show "No categories found"

**Solutions:**
1. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console for errors (F12 → Console tab)
4. Verify `vehicle_categories` table has data:
   ```sql
   SELECT COUNT(*) FROM vehicle_categories;
   -- Should return 11
   ```

### Migration Fails

**Problem:** SQL error when running migration

**Solutions:**
1. Check error message - it will tell you which step failed
2. The migration uses transactions (BEGIN/COMMIT), so partial failures will rollback
3. Safe to run multiple times - all operations are idempotent (IF NOT EXISTS checks)

### Onboarding Wizard Errors

**Problem:** Wizard crashes or shows errors

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify all tables were created successfully
3. Check that RLS policies allow read access
4. Ensure you're logged in as an authenticated user

---

## 📁 File Reference

- **`FIX_VEHICLES_TABLE_FOR_ONBOARDING.sql`** - Run this migration (for `vehicles` table)
- **`APPLY_VEHICLE_ONBOARDING_MIGRATIONS.sql`** - Original migration (for `vlms_vehicles` table - NOT used)
- **`test-categories.sql`** - Verification queries
- **Application code** - Already updated to use `vehicles` table:
  - `src/types/vlms.ts`
  - `src/stores/vlms/*.ts`
  - `src/hooks/useVehicleCategories.ts`
  - `src/components/vlms/vehicle-onboarding/*.tsx`

---

## 🎯 Next Steps After Migration

1. ✅ Run `FIX_VEHICLES_TABLE_FOR_ONBOARDING.sql`
2. ✅ Refresh browser
3. ✅ Test onboarding wizard
4. 📝 Create first test vehicle
5. 🧪 Verify data in database
6. 🚀 Ready for production use!

---

**Questions or Issues?**
Check the troubleshooting section above, or review the implementation documentation in `docs/VLMS_VEHICLE_ONBOARDING.md`.
