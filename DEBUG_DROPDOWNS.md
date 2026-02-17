# Debugging Facilities & Warehouses Dropdowns

## Issue
Facilities and warehouses are not loading in the requisition/invoice form dropdowns.

## Root Cause Analysis

### 1. Fixed Hook Issue ✅
- Fixed `useWarehouses()` to return `{ warehouses }` instead of array directly
- This was causing `warehousesData?.warehouses` to be undefined

### 2. Possible Issues to Check

#### A. Browser Cache 🔍
**Problem**: Old JavaScript code might be cached in your browser
**Solution**:
```bash
# Clear browser cache:
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Or rebuild the app:
npm run dev
```

#### B. No Data in Database 🔍
**Problem**: Tables might be empty
**Solution**: Check if you have data
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM facilities;
SELECT COUNT(*) FROM warehouses;

-- If empty, insert test data
INSERT INTO warehouses (name, address, lat, lng, type) VALUES
  ('Central Warehouse', 'Kano, Nigeria', 12.0, 8.5, 'central'),
  ('Zonal Warehouse A', 'Kaduna, Nigeria', 10.5, 7.4, 'zonal');

INSERT INTO facilities (name, address, lat, lng, type, state) VALUES
  ('Test Facility 1', 'Test Address 1', 12.0, 8.5, 'health_center', 'kano'),
  ('Test Facility 2', 'Test Address 2', 12.1, 8.6, 'clinic', 'kano');
```

#### C. Row Level Security (RLS) Blocking Access 🔍
**Problem**: Supabase RLS policies might be blocking SELECT queries
**Solution**: Check RLS policies
```sql
-- Run in Supabase SQL Editor
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('facilities', 'warehouses');

-- If RLS is enabled, check policies
SELECT * FROM pg_policies
WHERE tablename IN ('facilities', 'warehouses');
```

#### D. Network/API Errors 🔍
**Problem**: Supabase queries might be failing silently
**Solution**: Check browser console
```javascript
// Add to ManualEntryForm.tsx temporarily (line 75-80):
const { data: facilitiesData } = useFacilities();
const { data: warehousesData } = useWarehouses();

console.log('Facilities Data:', facilitiesData);
console.log('Warehouses Data:', warehousesData);

const facilities = facilitiesData?.facilities || [];
const warehouses = warehousesData?.warehouses || [];
console.log('Facilities:', facilities);
console.log('Warehouses:', warehouses);
```

## Immediate Actions

### Step 1: Clear Browser Cache
1. Open browser DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. Hard refresh: Cmd+Shift+R

### Step 2: Check Browser Console
1. Open DevTools → Console tab
2. Look for errors related to:
   - Supabase queries
   - React Query errors
   - Network failures

### Step 3: Verify Supabase Connection
1. Go to Supabase Dashboard
2. Navigate to Table Editor
3. Check if `facilities` and `warehouses` tables have data
4. Check if your user has permission to read these tables

### Step 4: Test Query Manually
Open Supabase SQL Editor and run:
```sql
SELECT * FROM facilities LIMIT 5;
SELECT * FROM warehouses LIMIT 5;
```

If these return data, then RLS policies are working.
If they return nothing or error, you need to fix RLS policies or add data.

## Quick Fix: Disable RLS Temporarily (for debugging)

```sql
-- ONLY FOR TESTING - DO NOT USE IN PRODUCTION
ALTER TABLE facilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;

-- If dropdowns work after this, the issue is RLS policies
-- Then properly configure policies instead of disabling RLS:
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_facilities"
ON facilities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_read_warehouses"
ON warehouses FOR SELECT
TO authenticated
USING (true);
```

## Files Modified in This Fix

1. `src/hooks/useWarehouses.tsx` - Fixed return structure
2. All consuming components now expect `{ warehouses }` format

## Next Steps

1. ✅ Clear browser cache
2. ✅ Check console for errors
3. ✅ Verify data exists in Supabase
4. ✅ Check RLS policies
5. ✅ Test the dropdowns again

If issue persists after these steps, check the browser console and share any error messages.
