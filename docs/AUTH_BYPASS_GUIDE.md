# Authentication Bypass Guide (Development Only)

## ⚠️ CRITICAL WARNING
This bypass mechanism is **FOR DEVELOPMENT/TESTING ONLY**. It must be removed before production deployment as it creates a severe security vulnerability.

---

## 🔍 How the Bypass Works

### Current Implementation

The auth bypass is implemented in `src/components/auth/ProtectedRoute.tsx`:

```typescript
// TEMPORARY: Auth bypass for development (remove before production)
const AUTH_BYPASS = localStorage.getItem('biko_dev_access') === 'granted';

if (AUTH_BYPASS) {
  return <>{children}</>;
}
```

**Mechanism:**
- Checks for a localStorage key `biko_dev_access` with value `'granted'`
- If present, all protected routes render without authentication
- Bypasses both Supabase auth checks and user role validation

---

## 🚀 End-to-End Process

### Step 1: Enable Auth Bypass

**Option A: Browser Console**
```javascript
// Open browser console (F12) and run:
localStorage.setItem('biko_dev_access', 'granted');

// Refresh the page
location.reload();
```

**Option B: Browser DevTools**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Expand **Local Storage** → Select your domain
4. Click **+** to add new key
5. Set Key: `biko_dev_access`
6. Set Value: `granted`
7. Refresh the page

**Option C: Create a Dev Login Page (Recommended)**
```typescript
// Example: src/pages/DevAccess.tsx
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function DevAccess() {
  const navigate = useNavigate();
  
  const enableBypass = () => {
    localStorage.setItem('biko_dev_access', 'granted');
    navigate('/');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Button onClick={enableBypass}>
        Enable Dev Access
      </Button>
    </div>
  );
}
```

### Step 2: Verify Bypass is Active

```javascript
// Check in browser console:
console.log(localStorage.getItem('biko_dev_access')); 
// Should output: "granted"
```

**Visual Confirmation:**
- Navigate to any protected route (e.g., `/fleetops/vehicles/registry`)
- You should access the page without login redirect
- Auth loading states are skipped

### Step 3: Disable Auth Bypass

```javascript
// Browser console:
localStorage.removeItem('biko_dev_access');
location.reload();
```

---

## 🎯 What Gets Bypassed

### ✅ Bypassed Components
- `<ProtectedRoute>` wrapper (all child routes)
- Auth loading states
- Login redirect logic
- User session checks

### ⚠️ NOT Bypassed (Still Required)
- **Supabase RLS policies** - Database-level security remains active
- **Edge function JWT verification** - Backend functions still validate tokens
- **Role-based permissions** - `usePermissions()` hook still checks roles
- **User-specific queries** - Queries using `auth.uid()` will fail

### Impact on Key Features

| Feature | Status | Notes |
|---------|--------|-------|
| Frontend routing | ✅ Full access | All pages accessible |
| Database reads (public) | ✅ Works | Tables without RLS |
| Database writes | ❌ Fails | RLS policies block unauthenticated writes |
| Edge functions | ❌ Fails | JWT verification blocks requests |
| User-specific data | ❌ No data | `auth.uid()` returns null |
| Role switching | ⚠️ Partial | UI renders but DB queries fail |

---

## 🛠️ Working with Database During Bypass

### Problem: RLS Policies Block Unauthenticated Access

Most tables have RLS policies like:
```sql
CREATE POLICY "Users can view their own data"
ON public.vehicles
FOR SELECT
USING (auth.uid() = user_id);
```

During bypass, `auth.uid()` returns `null`, blocking access.

### Solution Options

**Option 1: Temporary Public Access Policy (Development Only)**
```sql
-- Add temporary policy for development
CREATE POLICY "dev_public_read"
ON public.vehicles
FOR SELECT
USING (true); -- WARNING: Makes table publicly readable

-- Remove before production:
DROP POLICY "dev_public_read" ON public.vehicles;
```

**Option 2: Use Service Role Key (Not Recommended)**
Modify Supabase client to use service role key - **dangerous** as it bypasses all RLS.

**Option 3: Keep Auth Enabled (Recommended)**
Use the actual auth system during development:
1. Enable auto-confirm email in Supabase settings
2. Sign up with a test account
3. Work with real authentication flow

---

## 🔧 Edge Functions During Bypass

### Problem
Edge functions in `supabase/config.toml` have `verify_jwt = true`:

```toml
[functions.calculate-payload]
verify_jwt = true
```

This blocks requests without valid JWT tokens.

### Solution: Disable JWT Verification

**Edit `supabase/config.toml`:**
```toml
[functions.calculate-payload]
verify_jwt = false  # ⚠️ Development only!

[functions.update-driver-location]
verify_jwt = false  # ⚠️ Development only!

# Add for all functions you need to test
```

**Security Risk:**
- Functions become publicly accessible
- No authentication or authorization checks
- Anyone can call these endpoints

**Reverting for Production:**
```toml
[functions.calculate-payload]
verify_jwt = true  # ✅ Production setting
```

---

## 📋 Pre-Production Checklist

### Before Deploying to Production

- [ ] **Remove bypass code from `ProtectedRoute.tsx`**
  ```typescript
  // DELETE these lines:
  const AUTH_BYPASS = localStorage.getItem('biko_dev_access') === 'granted';
  if (AUTH_BYPASS) {
    return <>{children}</>;
  }
  ```

- [ ] **Clear localStorage in dev environment**
  ```javascript
  localStorage.removeItem('biko_dev_access');
  ```

- [ ] **Verify all edge functions have `verify_jwt = true`**

- [ ] **Remove any temporary RLS policies**
  ```sql
  -- Check for development policies:
  SELECT * FROM pg_policies WHERE policyname LIKE '%dev%';
  ```

- [ ] **Test authentication flow end-to-end**
  - Sign up new user
  - Log in
  - Access protected routes
  - Log out
  - Verify redirect to /auth

- [ ] **Security audit**
  - Run Supabase linter
  - Check for exposed secrets
  - Verify RLS policies are restrictive

---

## 🔒 Security Best Practices

### Development Environment
1. **Only enable bypass on local development**
2. **Never commit bypass flags to version control**
3. **Use environment-based feature flags if needed**:
   ```typescript
   const DEV_MODE = import.meta.env.DEV;
   const AUTH_BYPASS = DEV_MODE && localStorage.getItem('biko_dev_access') === 'granted';
   ```

### Team Development
```typescript
// Safe development bypass:
const AUTH_BYPASS = 
  import.meta.env.DEV && // Only in dev mode
  window.location.hostname === 'localhost' && // Only on localhost
  localStorage.getItem('biko_dev_access') === 'granted';
```

### Production Safeguards
```typescript
// Add runtime check:
if (import.meta.env.PROD && localStorage.getItem('biko_dev_access')) {
  console.warn('⚠️ Dev bypass detected in production!');
  localStorage.removeItem('biko_dev_access');
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Frontend-Only Testing
**Use Case:** Testing UI components and routing
- ✅ Enable auth bypass
- ✅ Mock data in components
- ❌ Avoid database queries

### Scenario 2: Full-Stack Testing
**Use Case:** Testing database integration
- ❌ Don't use bypass
- ✅ Use real auth with test account
- ✅ Enable auto-confirm email

### Scenario 3: Edge Function Testing
**Use Case:** Testing serverless functions
- ⚠️ Temporarily disable JWT verification
- ✅ Use Postman/curl with manual testing
- ✅ Re-enable JWT before commit

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `src/components/auth/ProtectedRoute.tsx` | Bypass implementation |
| `src/contexts/AuthContext.tsx` | Auth state management |
| `supabase/config.toml` | Edge function JWT settings |
| `src/integrations/supabase/client.ts` | Supabase client config |

---

## 🆘 Troubleshooting

### Issue: Bypass enabled but still redirected to /auth
**Cause:** Browser cache or localStorage not set correctly  
**Fix:**
```javascript
localStorage.clear();
localStorage.setItem('biko_dev_access', 'granted');
location.reload();
```

### Issue: Database queries failing with bypass enabled
**Cause:** RLS policies require authenticated user  
**Fix:** Use real auth instead of bypass, or add temporary public policy

### Issue: Edge functions return 401 Unauthorized
**Cause:** JWT verification still enabled  
**Fix:** Set `verify_jwt = false` in `supabase/config.toml`

### Issue: Bypass not working after deployment
**Cause:** Code may have been removed or environment check failing  
**Fix:** Verify bypass code exists and check environment variables

---

## 🎓 Recommended Approach

**For Day-to-Day Development:**
1. Use real authentication with auto-confirm enabled
2. Create test accounts: `admin@test.local`, `driver@test.local`
3. Keep bypass as emergency fallback only

**Why?**
- Tests real user flows
- Catches auth bugs early
- No production cleanup needed
- Database queries work normally
- Edge functions work normally

**Auth bypass should be used sparingly for:**
- UI/UX rapid prototyping
- Component library development
- Demo/presentation modes
- Emergency debugging

---

## 📞 Support

If you encounter issues with the auth system:
1. Check browser console for errors
2. Verify Supabase connection status
3. Review RLS policies in database
4. Test with real auth first before using bypass

**Remember:** The bypass is a development tool, not a production feature.
