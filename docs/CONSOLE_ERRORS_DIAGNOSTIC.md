# Console Errors Diagnostic Report
**Date:** 2026-02-18
**Status:** Multiple critical issues identified

## Summary of Issues

Your console shows 6 critical problems:

1. ✅ **FIXED** - Missing `Constants` export in supabase.ts (Vite cache issue)
2. ❌ **CRITICAL** - Local Supabase database not properly initialized
3. ❌ **CRITICAL** - Storage migration error preventing database reset
4. ❌ **BLOCKING** - user_roles table doesn't exist locally
5. ⚠️ **WARNING** - Missing DialogDescription in React components
6. ⚠️ **WARNING** - Missing RPC functions (get_zone_summary, get_dashboard_summary)

---

## Issue 1: Missing Constants Export ✅ FIXED

### Error
```
[vite] SyntaxError: The requested module '/src/types/supabase.ts' does not provide an export named 'Constants'
```

### Root Cause
- The `Constants` export exists in [supabase.ts:10514-10605](../src/types/supabase.ts#L10514-L10605)
- Vite had a stale cached version of the file

### Fix Applied
```bash
rm -rf node_modules/.vite
```

### Next Step
Restart your Vite dev server to apply the fix.

---

## Issue 2: Local Database Not Initialized ❌ CRITICAL

### Symptoms
```
500 Internal Server Error on /rest/v1/user_roles
403 Forbidden on /rest/v1/delivery_batches
404 Not Found on /rest/v1/rpc/get_zone_summary
```

### Root Cause
The local Supabase database has not been properly initialized. Key findings:

1. **user_roles table doesn't exist**
   ```sql
   -- Query returned 0 rows
   SELECT * FROM pg_tables WHERE tablename = 'user_roles';
   ```

2. **No migration schema**
   ```sql
   -- Error: relation does not exist
   SELECT * FROM supabase_migrations.schema_migrations;
   ```

3. **Database state**: Empty/corrupted

### Required Fix
The local database needs to be reset and all migrations applied.

---

## Issue 3: Storage Migration Error ❌ CRITICAL

### Error
```
StorageBackendError: Migration buckets-objects-grants-postgres not found
```

### Root Cause
The Supabase storage container has a corrupted volume or is missing required migration files. This is preventing `supabase db reset` from working.

### Attempted Fixes
- Removed `supabase_storage_cenugzabuzglswikoewy` volume
- Containers still failing health checks

### Solution Required
Complete clean slate initialization:

```bash
# 1. Stop all Supabase services
supabase stop

# 2. Remove all containers
docker ps -a --filter name=supabase --format "{{.Names}}" | xargs docker rm -f

# 3. Remove all volumes
docker volume ls --filter label=com.supabase.cli.project=cenugzabuzglswikoewy --format "{{.Name}}" | xargs docker volume rm

# 4. Fresh start
supabase start
```

**IMPORTANT**: This will destroy all local database data. If you have local-only test data, it will be lost.

---

## Issue 4: Missing RLS Policies ❌ BLOCKING

### Background
Migration [20260218143000_fix_security_vulnerabilities.sql](../supabase/migrations/20260218143000_fix_security_vulnerabilities.sql) enables RLS on `user_roles` table.

Migration [20260201000001_fix_user_roles_rls.sql](../supabase/migrations/20260201000001_fix_user_roles_rls.sql) creates the necessary policies:
- Users can view own roles
- Admins can view all user roles
- Admins can manage user roles

### Problem
Since the database isn't initialized, these policies aren't applied, causing all queries to fail.

### Verification After Fix
Run this after database reset:

```sql
-- Check if RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'user_roles' AND relnamespace = 'public'::regnamespace;

-- Check policies exist
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'user_roles';
```

Expected output:
- RLS enabled: `relrowsecurity = true`
- 3 policies: "Users can view own roles", "Admins can view all user roles", "Admins can manage user roles"

---

## Issue 5: Missing DialogDescription ⚠️ WARNING

### Error
```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
```

### Files Affected
Multiple dialog components throughout the app (Radix UI Dialog requirement).

### Impact
- Accessibility issue (screen readers)
- Not blocking functionality
- Can be fixed later

### Fix Template
```tsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>Title</DialogTitle>
    <DialogDescription>
      Brief description for screen readers
    </DialogDescription>
  </DialogHeader>
  {/* ... */}
</DialogContent>
```

---

## Issue 6: Missing RPC Functions ⚠️ WARNING

### Errors
```
404 Not Found: /rest/v1/rpc/get_zone_summary
400 Bad Request: /rest/v1/rpc/get_dashboard_summary
```

### Likely Cause
- Functions might not exist in migrations
- Or functions exist but have parameter mismatches

### Verification After Fix
```sql
-- List all RPC functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_zone_summary', 'get_dashboard_summary');
```

---

## Step-by-Step Recovery Plan

### 1. Clean Reset Local Supabase
```bash
# Stop everything
supabase stop

# Nuclear option - remove all containers and volumes
docker ps -a --filter name=supabase | awk 'NR>1 {print $1}' | xargs -r docker rm -f
docker volume ls --filter label=com.supabase.cli.project=cenugzabuzglswikoewy | awk 'NR>1 {print $2}' | xargs -r docker volume rm

# Fresh start
supabase start
```

**Expected output**: All services healthy, no migration errors.

### 2. Verify Database Initialization
```bash
docker exec supabase_db_cenugzabuzglswikoewy psql -U postgres -c "
SELECT COUNT(*) as migration_count
FROM supabase_migrations.schema_migrations;
"
```

**Expected**: Should show ~50+ migrations applied.

### 3. Verify Critical Tables Exist
```bash
docker exec supabase_db_cenugzabuzglswikoewy psql -U postgres -c "
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_roles', 'delivery_batches', 'facilities', 'warehouses')
ORDER BY tablename;
"
```

**Expected**: All 4 tables listed.

### 4. Verify RLS Policies
```bash
docker exec supabase_db_cenugzabuzglswikoewy psql -U postgres -c "
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('user_roles', 'profiles', 'vehicle_merge_audit')
GROUP BY tablename;
"
```

**Expected**:
- user_roles: 3 policies
- profiles: 1+ policies
- vehicle_merge_audit: 2 policies

### 5. Clear Vite Cache and Restart Dev Server
```bash
# Kill any running dev server (Ctrl+C or:)
pkill -f "vite.*8080"

# Clear Vite cache (already done)
rm -rf node_modules/.vite

# Restart
npm run dev
# or
bun dev
```

### 6. Test in Browser
1. Open [http://localhost:8080](http://localhost:8080)
2. Login with test user
3. Check console - should see:
   - ✅ No Constants import errors
   - ✅ No 500 errors on user_roles
   - ✅ Successful API calls to delivery_batches
   - ⚠️ DialogDescription warnings (low priority)

---

## Additional Notes

### Supabase CLI Version
Your CLI is outdated:
- **Current**: v2.51.0
- **Latest**: v2.75.0

Update recommended:
```bash
brew upgrade supabase
# or
scoop update supabase
```

### Remote vs Local
- **Remote (Production)**: appbiko.netlify.app → Supabase hosted DB (working)
- **Local (Dev)**: localhost:8080 → Local Docker DB (broken)

The production environment is NOT affected by these local issues.

### Logs to Monitor
```bash
# All Supabase logs
docker compose -f supabase/docker-compose.yml logs -f

# Specific service
docker logs -f supabase_db_cenugzabuzglswikoewy
docker logs -f supabase_storage_cenugzabuzglswikoewy
```

---

## Related Files

### Migrations
- [20260218143000_fix_security_vulnerabilities.sql](../supabase/migrations/20260218143000_fix_security_vulnerabilities.sql) - Enables RLS
- [20260218150000_performance_and_security_optimization.sql](../supabase/migrations/20260218150000_performance_and_security_optimization.sql) - Performance fixes
- [20260201000001_fix_user_roles_rls.sql](../supabase/migrations/20260201000001_fix_user_roles_rls.sql) - RLS policies

### Type Files
- [src/types/supabase.ts](../src/types/supabase.ts) - Contains Constants export

### Validation Files (affected by Constants import)
- [src/lib/validations/vendor.ts](../src/lib/validations/vendor.ts)
- [src/components/vendors/VendorRegistrationForm.tsx](../src/components/vendors/VendorRegistrationForm.tsx)

---

## Status Summary

| Issue | Status | Blocker | Action Required |
|-------|--------|---------|----------------|
| Constants export | ✅ Fixed | No | Restart dev server |
| Database not initialized | ❌ Critical | Yes | Clean reset Supabase |
| Storage migration error | ❌ Critical | Yes | Remove volumes, fresh start |
| RLS policies missing | ❌ Critical | Yes | Will be fixed by reset |
| DialogDescription warnings | ⚠️ Warning | No | Fix later (accessibility) |
| Missing RPC functions | ⚠️ Warning | Partial | Verify after reset |

**Next Action**: Execute the Step-by-Step Recovery Plan above.
