# 🔐 Credential Rotation Guide

## 🚨 CRITICAL: Rotate Immediately

The following credentials were exposed in Git commits and **MUST** be rotated immediately:

### Exposed Credentials Summary

| Credential Type | Location Exposed | First Exposed | Status |
|----------------|------------------|---------------|---------|
| Supabase Anon Key (Old Project) | `.env`, `DEPLOYMENT_VERIFICATION.md` | Commit a48a579 (Nov 14) | ⚠️ ROTATE NOW |
| Supabase Anon Key (New Project) | `DEPLOYMENT_VERIFICATION.md` | Dec 26 | ⚠️ ROTATE NOW |
| PostgreSQL Connection String | `supabase/.temp/pooler-url` | Commit a48a579 (Nov 14) | ✅ Placeholder only |
| Service Role Key | `.env` (inferred) | Commit a48a579 (Nov 14) | ⚠️ ROTATE NOW |

---

## Step 1: Rotate Supabase API Keys

### A. Access Supabase Dashboard

**Old Project (fgkjhpytntgmbuxegntr):**
1. Go to: https://supabase.com/dashboard/project/fgkjhpytntgmbuxegntr/settings/api
2. This project was referenced in the leaked `.env` file

**New Project (cenugzabuzglswikoewy):**
1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/settings/api
2. This is your current active project

### B. Generate New API Keys

**For BOTH projects**, you need to rotate:

#### 1. Anon (Public) Key

```bash
# Current keys are exposed and must be rotated
# Old project exposed key starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZna2pocHl0...
# New project exposed key starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbnVnemFi...
```

**How to rotate:**
1. In Supabase dashboard → Settings → API
2. Click "Generate new anon key" or "Reset API keys"
3. Copy the new `anon` key
4. Update immediately in all locations (see Step 3)

#### 2. Service Role Key

```bash
# This key has admin privileges and was likely exposed
```

**How to rotate:**
1. In Supabase dashboard → Settings → API
2. Click "Generate new service role key" or "Reset API keys"
3. Copy the new `service_role` key
4. Update in all Edge Functions secrets (see Step 2)

---

## Step 2: Update Supabase Edge Functions Secrets

After rotating keys, update the secrets used by your Edge Functions:

### Using Supabase CLI

```bash
# Set the new service role key for all Edge Functions
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-new-service-role-key"

# Verify it was set
npx supabase secrets list
```

### Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/settings/functions
2. Update the `SUPABASE_SERVICE_ROLE_KEY` environment variable
3. Redeploy all affected Edge Functions

### Edge Functions Using Service Role Key

These functions need the updated key:
- `check-geofencing`
- `ai-capacity-estimation`
- `send-notification`
- `create-handoff`
- `create-service-zone`
- `update-service-zone`
- `update-driver-location`
- `process-alerts`
- `update-stop-status`
- `generate-vehicle-image`
- `calculate-payload`
- `confirm-handoff`

---

## Step 3: Update Local Environment

### A. Update Local `.env` File

```bash
# Create or update your .env file with NEW rotated keys
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="cenugzabuzglswikoewy"
VITE_SUPABASE_URL="https://cenugzabuzglswikoewy.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<YOUR_NEW_ANON_KEY_HERE>"
EOF
```

**CRITICAL:** Never commit this file! It's now in `.gitignore`.

### B. Verify `.gitignore` Protection

```bash
# Verify .env is ignored
git check-ignore -v .env

# Should output:
# .gitignore:16:.env    .env
```

---

## Step 4: Update Netlify Deployment

Your Netlify site needs the new credentials:

### A. Update Environment Variables

1. Go to: https://app.netlify.com/sites/zesty-lokum-5d0fe1/settings/env

2. Update these variables with NEW keys:
   ```
   VITE_SUPABASE_URL=https://cenugzabuzglswikoewy.supabase.co
   VITE_SUPABASE_PROJECT_ID=cenugzabuzglswikoewy
   VITE_SUPABASE_PUBLISHABLE_KEY=<YOUR_NEW_ANON_KEY_HERE>
   ```

### B. Trigger New Deployment

```bash
# Option 1: Via CLI (if you have Netlify CLI installed)
netlify deploy --prod

# Option 2: Via dashboard
# Go to: https://app.netlify.com/sites/zesty-lokum-5d0fe1/deploys
# Click: "Trigger deploy" → "Deploy site"
```

**Important:** Vite embeds environment variables at BUILD time, so you MUST trigger a new build after updating env vars.

---

## Step 5: Reset Database Password (Optional but Recommended)

If the database connection string was exposed with an actual password:

### A. Reset via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/settings/database
2. Click "Reset database password"
3. Copy the new password
4. Update in any applications using direct database connections

### B. Update Pooler Connection String

If you use the pooler for direct connections:

```bash
# The new connection string will be:
postgresql://postgres.cenugzabuzglswikoewy:[NEW-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

**Note:** Most apps use the Supabase client SDK (not direct connections), so this may not be necessary.

---

## Step 6: Verify Rotation

### A. Test Local Development

```bash
# Clear cache and restart dev server
rm -rf node_modules/.vite
npm run dev

# Open http://localhost:5173
# Login should work with new credentials
```

### B. Test Production Deployment

```bash
# Visit your Netlify site
open https://zesty-lokum-5d0fe1.netlify.app

# Test login functionality
# Check browser console for errors
```

### C. Verify Edge Functions

```bash
# Test an Edge Function
curl -X POST https://cenugzabuzglswikoewy.supabase.co/functions/v1/check-geofencing \
  -H "Authorization: Bearer YOUR_NEW_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return 200 OK (or expected response)
```

---

## Step 7: Revoke Old Keys (After Verification)

**CRITICAL:** Only do this AFTER confirming everything works with new keys!

1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/settings/api
2. Click "Revoke" on old keys
3. Old keys will immediately stop working

**Warning:** If you revoke before updating all systems, you'll cause downtime!

---

## Step 8: Monitor for Unauthorized Access

### A. Check Supabase Logs

1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/logs/postgres-logs
2. Filter date range: Nov 14, 2025 - Dec 26, 2025 (exposure period)
3. Look for:
   - Unusual query patterns
   - Unauthorized data access
   - Unexpected INSERT/UPDATE/DELETE operations

### B. Check Authentication Logs

1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/auth/users
2. Review recent sign-ins
3. Look for unknown users or suspicious activity

### C. Audit Database for Tampering

```sql
-- Check for recent user creations
SELECT * FROM auth.users
WHERE created_at > '2025-11-14'
ORDER BY created_at DESC;

-- Check for recent data modifications
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_upd DESC, n_tup_del DESC;
```

---

## Rotation Checklist

Use this checklist to ensure you've rotated everything:

- [ ] Generated new anon key for project cenugzabuzglswikoewy
- [ ] Generated new service role key for project cenugzabuzglswikoewy
- [ ] Updated `SUPABASE_SERVICE_ROLE_KEY` in Edge Functions secrets
- [ ] Updated local `.env` file with new anon key
- [ ] Updated Netlify environment variables with new anon key
- [ ] Triggered new Netlify deployment
- [ ] Tested local development with new keys
- [ ] Tested production deployment with new keys
- [ ] Tested Edge Functions with new keys
- [ ] Revoked old keys in Supabase dashboard
- [ ] Checked Supabase logs for unauthorized access (Nov 14 - Dec 26)
- [ ] Reviewed auth logs for suspicious activity
- [ ] Audited database for tampering

---

## Additional Security Measures

### 1. Enable Row-Level Security (RLS)

Ensure all tables have RLS enabled:

```sql
-- Check which tables don't have RLS enabled
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename
    FROM pg_policies
  );
```

### 2. Enable IP Allowlisting (Optional)

If you have static IPs:
1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/settings/database
2. Enable "Restrict database access to specific IP addresses"
3. Add your allowed IPs

### 3. Set Up Secret Scanning

```bash
# Install git-secrets
brew install git-secrets

# Configure for this repo
cd /Users/fbarde/Documents/log4/log4
git secrets --install
git secrets --register-aws

# Add custom patterns for Supabase
git secrets --add 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'
git secrets --add 'postgresql://[^:]+:[^@]+@[^/]+'
```

### 4. Enable GitHub Secret Scanning

1. Go to: https://github.com/f4falalu/log4/settings/security_analysis
2. Enable "Secret scanning"
3. Enable "Push protection"

---

## Timeline Reference

| Date | Event |
|------|-------|
| Nov 14, 2025 | Initial credentials leaked in commit a48a579 |
| Nov 20, 2025 | Additional leaks in commit 4199d8f |
| Dec 26, 2025 | Git history cleaned with git-filter-repo |
| Dec 26, 2025 | Documentation credentials sanitized |
| **TBD** | **Credentials rotated (DO THIS NOW!)** |

---

## Support

If you encounter issues during rotation:

1. **Supabase Support**: https://supabase.com/support
2. **GitHub Repository**: https://github.com/f4falalu/log4/issues
3. **Netlify Support**: https://answers.netlify.com/

---

## Final Notes

- **Do NOT skip credential rotation** - cleaned Git history doesn't revoke the old keys
- **Do NOT reuse old credentials** - always generate fresh keys
- **Do NOT commit new credentials** - use environment variables
- **Monitor your logs** for the next 30 days for any suspicious activity

The old credentials are still valid until you rotate them. **Rotate now!**
