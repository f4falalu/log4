# Admin User Setup Guide

This guide explains how to create the super admin user for the BIKO Platform.

## Quick Setup (Recommended Method)

### Option 1: Automated Script via Node.js

The fastest way to create the admin user is using our automated script:

```bash
node scripts/create-admin.js
```

This script will:
1. Create the user in Supabase Auth automatically
2. Assign all system roles
3. Create the user profile
4. Confirm the user (no email verification needed)

**Credentials:**
- Email: `admin@biko.local`
- Password: `admin123456`

**After successful setup:**
1. Navigate to http://localhost:8080
2. Log in with the credentials above
3. **IMPORTANT:** Change your password immediately after first login!

---

## Option 2: Manual Setup via SQL (Fallback)

If the automated script fails, use this manual method:

### Step 1: Access Supabase SQL Editor

1. Open your browser and navigate to:
   ```
   https://supabase.com/dashboard/project/fgkjhpytntgmbuxegntr/sql
   ```

2. Log in to your Supabase account

3. You should see the SQL Editor interface

### Step 2: Run the Admin Creation Script

1. Open the file: `scripts/create-admin.sql`

2. Copy the **entire contents** of the file

3. Paste into the Supabase SQL Editor

4. Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)

5. Check the output for success messages

### Step 3: Create Auth User Manually

Since Supabase Auth users can't be created directly via SQL, you need to:

1. Go to: **Authentication → Users** in Supabase Dashboard

2. Click **"Invite user"** or **"Add user"**

3. Fill in the form:
   - **Email:** `admin@biko.local`
   - **Password:** `admin123456`
   - **Auto Confirm User:** ✅ **YES** (important!)

4. Click **"Create user"**

5. Verify the user appears in the users list

### Step 4: Re-run the SQL Script

Now that the auth user exists, run the SQL script again to assign roles:

1. Go back to: SQL Editor
2. Run the `create-admin.sql` script again
3. This will assign all 5 roles to the admin user

---

## Verification

### Check 1: Profile Exists

Run this query in SQL Editor:

```sql
SELECT id, email, full_name, phone, created_at
FROM public.profiles
WHERE email = 'admin@biko.local';
```

**Expected result:**
- 1 row returned
- Email: `admin@biko.local`
- Full name: `Super Admin`

### Check 2: Roles Assigned

Run this query:

```sql
SELECT ur.role, ur.assigned_at
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE p.email = 'admin@biko.local'
ORDER BY ur.role;
```

**Expected result:** 5 rows showing all roles:
- `driver`
- `system_admin`
- `viewer`
- `warehouse_officer`
- `zonal_manager`

### Check 3: Auth User Exists

1. Go to: **Authentication → Users** in Supabase Dashboard
2. Search for: `admin@biko.local`
3. Should see 1 user with:
   - Email confirmed: ✅
   - Last sign in: (empty until first login)

---

## Login to BIKO Platform

1. Open your browser to: http://localhost:8080

2. Click **"Login"** tab if not already selected

3. Enter credentials:
   - **Email:** `admin@biko.local`
   - **Password:** `admin123456`

4. Click **"Log In"**

5. You should be redirected to the dashboard

---

## Troubleshooting

### Problem: "Invalid login credentials"

**Possible causes:**

1. **Auth user not created yet**
   - Solution: Follow Step 3 above to manually create the auth user
   - Verify in Authentication → Users dashboard

2. **Email not confirmed**
   - Solution: Go to Authentication → Users
   - Find `admin@biko.local`
   - Click on the user
   - Click "Confirm Email" if not already confirmed

3. **Wrong password**
   - Solution: Reset password in Supabase Dashboard:
     - Authentication → Users → admin@biko.local
     - Click "Reset Password"
     - Set new password: `admin123456`

4. **UUID mismatch**
   - Check that auth.users.id matches profiles.id
   - Both should be: `594fe632-90cf-48ba-b83d-8f4c39d2e400`
   - If not, delete the profile and re-run the SQL script

### Problem: "No roles assigned"

**Solution:**
1. Re-run the `create-admin.sql` script
2. Verify with the "Check 2: Roles Assigned" query above
3. If still failing, manually insert roles:

```sql
INSERT INTO public.user_roles (user_id, role, assigned_at) VALUES
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'system_admin', NOW()),
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'warehouse_officer', NOW()),
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'driver', NOW()),
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'zonal_manager', NOW()),
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'viewer', NOW())
ON CONFLICT (user_id, role) DO NOTHING;
```

### Problem: Can't access Supabase Dashboard

**Solution:**
1. Make sure you're logged into the correct Supabase organization
2. Project URL should be: `fgkjhpytntgmbuxegntr`
3. If you don't have access, contact your Supabase admin

### Problem: RLS preventing access

**Check RLS policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'user_roles')
ORDER BY tablename, policyname;
```

**Temporary fix (DEVELOPMENT ONLY):**
```sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
```

⚠️ **WARNING:** Never disable RLS in production!

---

## Default Credentials

**DO NOT share these credentials publicly!**

```
Email:    admin@biko.local
Password: admin123456
User ID:  594fe632-90cf-48ba-b83d-8f4c39d2e400
```

**Assigned Roles:**
- `system_admin` - Full system access
- `warehouse_officer` - Warehouse management
- `driver` - Driver operations
- `zonal_manager` - Zone management
- `viewer` - Read-only access

---

## Security Recommendations

After first login:

1. **Change the default password immediately:**
   - Go to Settings → Profile → Change Password
   - Use a strong password (min 12 characters, mixed case, numbers, symbols)

2. **Enable Two-Factor Authentication (if available)**

3. **Review and update RLS policies:**
   - Ensure proper row-level security is enabled
   - Test that users can only access data they're authorized for

4. **Rotate passwords regularly:**
   - Set a reminder to change password every 90 days

5. **Remove unnecessary roles:**
   - The admin has all 5 roles for testing
   - In production, only assign the minimum required roles

---

## Next Steps

After logging in successfully:

1. ✅ Change default password
2. ✅ Verify all VLMS features work
3. ✅ Test creating new users
4. ✅ Test assigning roles to other users
5. ✅ Review and enable RLS policies for production
6. ✅ Create additional admin users if needed
7. ✅ Document any custom setup for your team

---

## Support

If you continue having issues:

1. Check the browser console for JavaScript errors (F12 → Console)
2. Check the Network tab for failed API calls (F12 → Network)
3. Review Supabase logs: Dashboard → Logs → API
4. Contact your development team with:
   - Error messages
   - Screenshots
   - Browser console output
   - Steps to reproduce

---

**Last Updated:** November 13, 2025
**Script Version:** 1.0
**Tested On:** Supabase PostgreSQL 15.x
