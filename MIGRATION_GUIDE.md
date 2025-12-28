# Migration Guide - Apply Database Changes

## ⚠️ IMPORTANT: You Must Apply Migrations

The facility import fix and country location model require database migrations to be applied. The code is ready, but **the database schema changes are not yet applied**.

---

## 📋 Required Migrations (In Order)

### 1. **Zones & LGAs** (Already Created)
**File**: `supabase/migrations/20251111000001_zones_operational_hierarchy.sql`

**What it does**:
- Creates `zones` table for operational zones
- Creates `lgas` table with 9 seeded Kano LGAs
- Creates indexes and RLS policies

**Seeds**:
- 9 LGAs: Dala, Tarauni, Nassarawa, Gwale, Gaya, Albasu, Ajingi, Kabo, Bunkure
- 3 Zones: Central, Eastern, Western

### 2. **Facility Reference Tables** (Already Created)
**File**: `supabase/migrations/20251116000000_facility_reference_tables.sql`

**What it does**:
- Creates `facility_types` table with 6 seeded types
- Creates `levels_of_care` table with 3 levels
- Adds indexes and RLS policies

**Seeds**:
- Facility Types: Hospital, Clinic, Health Center, Pharmacy, Laboratory, Other
- Levels of Care: Primary, Secondary, Tertiary

### 3. **Enable PostGIS** (NEW - Just Created)
**File**: `supabase/migrations/20251117000000_enable_postgis.sql`

**What it does**:
- Enables PostGIS extension for geographic data
- Enables pg_trgm for fuzzy text matching
- Enables unaccent for accent-insensitive search

**Required for**: Spatial queries, boundary storage, fuzzy LGA matching

### 4. **Country Location Model** (NEW - Just Created)
**File**: `supabase/migrations/20251117000001_country_location_model.sql`

**What it does**:
- Creates `countries` table (seeds Nigeria)
- Creates `workspaces` table for multi-tenancy
- Creates `admin_units` table for hierarchical admin boundaries
- Adds `workspace_id` columns to existing tables
- Creates PostgreSQL functions:
  - `get_admin_unit_descendants()` - Recursive child lookup
  - `find_admin_unit_by_point()` - Reverse geocoding
  - `fuzzy_match_admin_unit()` - PostgreSQL fuzzy search

**Required for**: Country-based location model, OSM boundary import

### 5. **Default Workspace** (NEW - Just Created)
**File**: `supabase/migrations/20251117000002_create_default_workspace.sql`

**What it does**:
- Creates "Kano Pharma" workspace
- Migrates existing LGAs from `lgas` to `admin_units`
- Creates placeholder Kano State admin unit
- Links existing facilities, zones, reference tables to workspace
- Adds `facilities.admin_unit_id` column

**Required for**: Workspace association, LGA migration to admin_units

---

## 🚀 How to Apply Migrations

### Method 1: Supabase CLI (Recommended)

```bash
# Make sure you're in the project directory
cd /Users/fbarde/Documents/log4/log4

# Apply all pending migrations
npx supabase db push --linked
```

**Expected output**:
```
Applying migration 20251111000001_zones_operational_hierarchy.sql...
Applying migration 20251116000000_facility_reference_tables.sql...
Applying migration 20251117000000_enable_postgis.sql...
Applying migration 20251117000001_country_location_model.sql...
Applying migration 20251117000002_create_default_workspace.sql...
Finished supabase db push.
```

### Method 2: Supabase Dashboard (If CLI fails)

1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new

2. Copy and execute each migration file **in order**:
   - Copy entire content of `supabase/migrations/20251111000001_zones_operational_hierarchy.sql`
   - Click "Run" in SQL Editor
   - Wait for success
   - Repeat for each migration in order

**Order is critical!** Each migration depends on the previous ones.

---

## ✅ Verify Migrations Applied

After applying migrations, run the verification script:

```bash
node scripts/check-lgas.js
```

**Expected output**:
```
Checking LGAs table...

✅ Found 9 LGAs in database:

1. Albasu
   ID: lga-albasu-6666-6666-666666666666
   State: kano
   Zone ID: zone-eastern-2222-2222-222222222222
   Warehouse ID: Not assigned

2. Ajingi
   ID: lga-ajingi-7777-7777-777777777777
   State: kano
   Zone ID: zone-eastern-2222-2222-222222222222
   Warehouse ID: Not assigned

... (7 more LGAs)

📊 Reference Tables Status:
✓ facility_types: ✅ 6 records
✓ levels_of_care: ✅ 3 records
```

If you see errors, the migrations were not applied successfully.

---

## 🧪 Test Facility Import

Once migrations are applied:

### 1. Test with Known LGA

1. Navigate to Facility Manager
2. Click "Import Facilities"
3. Upload a CSV with these columns:
   ```csv
   name,address,latitude,longitude,lga
   Test Facility,123 Main St,12.0000,8.5000,Dala
   ```

**Expected result**:
- ✅ Mapping step shows "LGA" field with ✅ **Exact match** badge
- ✅ Import succeeds without errors

### 2. Test with Unknown LGA

Upload a CSV with:
```csv
name,address,latitude,longitude,lga
Test Facility,123 Main St,12.0000,8.5000,Unknown LGA
```

**Expected result**:
- ❌ Mapping step shows "LGA" field with ❌ **Contact admin to add LGA** badge
- ❌ Validation errors with message: "LGA 'Unknown LGA' not found in database. Contact admin to add this LGA."
- ❌ Import blocked until LGA is corrected

---

## 🔧 Troubleshooting

### Error: "relation 'lgas' does not exist"
**Cause**: Migration `20251111000001_zones_operational_hierarchy.sql` not applied

**Fix**: Apply migration via CLI or SQL Editor

### Error: "extension 'postgis' does not exist"
**Cause**: Migration `20251117000000_enable_postgis.sql` not applied

**Fix**: Apply migration. If PostGIS is not available, contact Supabase support (it should be available by default)

### Error: "function 'fuzzy_match_admin_unit' does not exist"
**Cause**: Migration `20251117000001_country_location_model.sql` not applied

**Fix**: Apply migration in correct order

### Error: "column 'workspace_id' does not exist"
**Cause**: Migrations applied out of order

**Fix**:
1. Check which migrations are applied: `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;`
2. Apply missing migrations in order

### TypeScript errors after migrations
**Cause**: Supabase types not regenerated

**Fix**:
```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

---

## 📊 Migration Impact

### Tables Created
- ✅ `countries` (1 row: Nigeria)
- ✅ `workspaces` (1 row: Kano Pharma)
- ✅ `admin_units` (10 rows: 1 State + 9 LGAs)

### Tables Modified
- ✅ `zones` - Added `workspace_id` column
- ✅ `facilities` - Added `workspace_id` and `admin_unit_id` columns
- ✅ `facility_types` - Added `workspace_id` column
- ✅ `levels_of_care` - Added `workspace_id` column
- ✅ `lgas` - Added `workspace_id` column

### Functions Created
- ✅ `get_admin_unit_descendants(unit_id)`
- ✅ `find_admin_unit_by_point(lat, lng, admin_level, country_id)`
- ✅ `fuzzy_match_admin_unit(name, country_id, admin_level, threshold)`
- ✅ `update_updated_at_column()` - Trigger function

### Extensions Enabled
- ✅ `postgis` - Geographic data support
- ✅ `pg_trgm` - Trigram fuzzy matching
- ✅ `unaccent` - Accent-insensitive search

---

## ⏱️ Estimated Time

- **CLI method**: 2-5 minutes
- **Dashboard method**: 10-15 minutes (manual copy-paste)

---

## 🆘 Need Help?

If migrations fail or you encounter issues:

1. Check Supabase logs: Dashboard → Database → Logs
2. Check which migrations are applied:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
   ```
3. Share error messages for debugging

---

**Ready?** Run the migrations now to unlock:
- ✅ Facility import with LGA validation
- ✅ OSM boundary import capability
- ✅ Multi-country support foundation
- ✅ Fuzzy LGA matching (65% threshold)
- ✅ Admin-only LGA creation
