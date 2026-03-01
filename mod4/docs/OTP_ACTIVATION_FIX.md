# MOD4 OTP Activation Fix (2026-02-19)

## Problem
Driver activation via OTP was failing with "Invalid API key" error (401 status).

### Console Errors
```
Failed to load resource: the server responded with a status of 401 ()
cenugzabuzglswikoewy_c/verify_mod4_otp:1
```

## Root Cause
The `/Users/fbarde/Documents/log4/mod4/.env` file contained an **invalid Supabase anon key**:

**Before (WRONG):**
```bash
VITE_SUPABASE_ANON_KEY="sb_publishable_zwRuS1uLQT-7rN7jxY__oA_i10wkS2D"
```

**After (CORRECT):**
```bash
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbnVnemFidXpnbHN3aWtvZXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NTM0ODQsImV4cCI6MjA1MjUyOTQ4NH0.8BWXDwcj86OQbmvhsFJ01G0vkDGQ0TpCB61IbMQMn9A"
```

The placeholder key was never a valid JWT token, causing all Supabase API calls to be rejected with 401.

## Solution Applied

1. ✅ Fixed the `.env` file with the correct anon key (matches `.env.local`)
2. ✅ Verified all OTP migrations are applied to remote database
3. ✅ Restarted MOD4 dev server to pick up new environment variables

## Migration Status
All OTP-related migrations are synced to remote:
- `20260204000001` - MOD4 driver integration (initial `verify_mod4_otp` function)
- `20260208075830` - Fix driver OTP anon access
- `20260208082438` - OTP phone support
- `20260208103040` - **Fix OTP to return email** (critical for login)
- `20260208111731` - OTP auto provision user
- `20260208112545` - Revert OTP auto provision
- `20260219100000` - Email login OTP system (`verify_email_login_otp` function)

## How OTP Activation Works

### BIKO Platform Side (Admin)
1. Admin creates driver account in Supabase Auth
2. Admin calls `generate_mod4_otp(email, workspace_id)` RPC
3. System generates 6-digit code (e.g., "123456")
4. OTP stored in `mod4_otp_codes` table with 15-minute expiry
5. Admin shares email + OTP with driver (via SMS, WhatsApp, etc.)

### MOD4 Driver Side
1. Driver visits `/activate` page
2. Enters email and 6-digit OTP code
3. Frontend calls `verify_mod4_otp(email, otp)` RPC (anon-callable)
4. Backend:
   - Validates OTP is pending, not expired, under attempt limit
   - Marks OTP as used
   - **Sets user's password to the OTP value** (temporary)
   - Creates `mod4_driver_links` entry
   - Adds `driver` role to `user_roles`
   - **Returns resolved email** (important for phone number support)
5. Frontend calls `supabase.auth.signInWithPassword(email, otp)`
6. User is now authenticated
7. Driver sets 4-digit PIN via `complete_driver_activation()` RPC
8. PIN becomes new password, OTP is invalidated

## Testing
1. Open http://localhost:3002/activate
2. Enter the driver's email (e.g., `emailfalalu@gmail.com`)
3. Enter the 6-digit OTP from BIKO platform
4. Should now successfully verify and proceed to PIN setup

## Files Changed
- `/Users/fbarde/Documents/log4/mod4/.env` - Fixed `VITE_SUPABASE_ANON_KEY`

## Related Documentation
- [SIMPLE_AUTH_SETUP.md](./SIMPLE_AUTH_SETUP.md) - MOD4 authentication overview
- Migration: `supabase/migrations/20260208103040_fix_otp_return_email.sql`
- Component: `mod4/src/pages/ActivateAccount.tsx`
- Store: `mod4/src/stores/authStore.ts` (see `activateWithOTP()` method)
