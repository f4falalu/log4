# Local Supabase Environment Issues

**Date**: 2026-02-18
**Status**: Local development environment has persistent crashes

## Summary of Console Errors

### 1. Network Connectivity Errors (ROOT CAUSE: Local Supabase not running)
```
ERR_ADDRESS_UNREACHABLE
ERR_INTERNET_DISCONNECTED
ERR_NAME_NOT_RESOLVED
ERR_QUIC_PROTOCOL_ERROR
```

**Impact**: All Supabase API calls fail, app cannot load data

### 2. User Roles Table - 500 Internal Server Error
```
cenugzabuzglswikoewy.supabase.co/rest/v1/user_roles?select=role&user_id=eq.xxx
Failed to load resource: the server responded with a status of 500 ()
```

**Root Cause**:
- RLS is enabled on `user_roles` table (migration `20260218143000_fix_security_vulnerabilities.sql`)
- RLS policies exist (migration `20260201000001_fix_user_roles_rls.sql`)
- The 500 error suggests either:
  - Infinite recursion in policies (admin policy checks user_roles which triggers RLS)
  - Missing function dependencies
  - Database schema not properly initialized

**Required Policies**:
- Users can view own roles (SELECT where user_id = auth.uid())
- System admins can view all roles
- System admins can manage all roles

### 3. Delivery Batches - 400/403 Errors
```
cenugzabuzglswikoewy.supabase.co/rest/v1/delivery_batches?select=*
Failed to load resource: the server responded with a status of 400/403 ()
```

**Root Cause**:
- 400 errors indicate malformed request or missing required fields
- 403 errors indicate RLS permission denial
- Triggers on delivery_batches try to refresh materialized views
- Refresh functions lacked SECURITY DEFINER (fixed in `20260218160000_fix_analytics_permissions.sql`)

### 4. Missing RPC Functions - 404 Errors
```
cenugzabuzglswikoewy.supabase.co/rest/v1/rpc/get_zone_summary
Failed to load resource: the server responded with a status of 404 ()

cenugzabuzglswikoewy.supabase.co/rest/v1/rpc/get_dashboard_summary
Failed to load resource: the server responded with a status of 400 ()
```

**Root Cause**:
- Functions don't exist in the database
- Need to find and verify these RPC function definitions

### 5. Vite Module Import Error (FIXED)
```
SyntaxError: The requested module '/src/types/supabase.ts' does not provide an export named 'Constants'
```

**Root Cause**: Vite cache issue
**Fix**: The Constants export exists in [supabase.ts:10514-10605](../src/types/supabase.ts#L10514-L10605). Clear Vite cache with `rm -rf node_modules/.vite`

### 6. React Warnings
```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
Warning: validateDOMNesting(...): <div> cannot appear as a descendant of <p>.
```

**Root Cause**: Accessibility and HTML nesting issues in dialogs
**Impact**: Non-critical, but should be fixed for a11y compliance

## Local Supabase Startup Issues

### Storage Migration Error (CLI v2.51.0)
```
StorageBackendError: Migration buckets-objects-grants-postgres not found
```

**Fix**: Upgrade to Supabase CLI v2.75.0 ✅ COMPLETED

### Realtime Container Crash (CLI v2.75.0)
```
error running container: exit 139
```

**Root Cause**: Segmentation fault in Erlang/Realtime container
**Possible Causes**:
- Docker Desktop resource constraints (7.6GB RAM available)
- macOS/Docker compatibility issue with Erlang VM
- Corrupted Docker images or volumes

**Attempted Fixes**:
- ✅ Upgraded Supabase CLI to v2.75.0
- ✅ Removed all project volumes
- ✅ Pulled fresh container images
- ❌ Still crashes on startup

## Recommended Solutions

### Option 1: Use Remote Production Database (RECOMMENDED)
Since local Supabase is unstable, develop against the remote production database:

1. Your `.env` already points to production: `cenugzabuzglswikoewy.supabase.co`
2. The app will work once the RLS policies are fixed on production
3. Use Supabase Studio to manage the remote database: https://supabase.com/dashboard/project/cenugzabuzglswikoewy

**Pros**:
- No local Docker issues
- Always in sync with production schema
- Faster development (no local setup time)

**Cons**:
- Requires internet connection
- Shares data with production (use test workspace)
- Can't test migrations locally before applying

### Option 2: Fix User Roles RLS Recursion
The 500 errors on `user_roles` suggest the policies have infinite recursion:

```sql
-- Admin policy checks user_roles to see if user is admin
-- But checking user_roles triggers RLS, which checks if user is admin
-- Which checks user_roles again... infinite loop!

CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur  -- ⚠️ RECURSION HERE
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'system_admin'
    )
  );
```

**Fix**: Use SECURITY DEFINER function or bypass RLS:
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'system_admin'
  );
$$ LANGUAGE SQL;

-- Then use in policy:
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (is_admin());
```

### Option 3: Increase Docker Resources
If you want to persist with local development:

1. Open Docker Desktop → Settings → Resources
2. Increase Memory to 12GB+
3. Increase CPUs to 6+
4. Restart Docker Desktop
5. Try `supabase start` again

### Option 4: Use Supabase CLI with Remote Database
Run migrations against remote database directly:

```bash
# Link to remote project (already done)
supabase link --project-ref cenugzabuzglswikoewy

# Apply migrations to remote
supabase db push

# Generate types from remote
supabase gen types typescript --project-id cenugzabuzglswikoewy > src/types/supabase.ts
```

## Next Steps

I recommend **Option 1** (use remote database) combined with **Option 2** (fix RLS recursion):

1. Fix the user_roles RLS policies on production
2. Apply pending migrations to production
3. Verify all RPC functions exist
4. Restart your Vite dev server
5. Test the app against production

Would you like me to proceed with this approach?
