# Apply Database Migrations - Step-by-Step Guide

## Quick Summary

You need to apply 13 SQL migration files to your new Supabase database.
This will set up all tables, including the missing `scheduler_batches` table.

**Estimated Time:** 5-10 minutes

---

## Method: Supabase Dashboard SQL Editor (Recommended)

### Step 1: Open Supabase SQL Editor

Click this link to open the SQL Editor in your new project:

**https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new**

### Step 2: Apply Each Migration File

You need to apply these 13 migration files **in order**:

#### Migration 1: Base Schema
**File:** `supabase/migrations/20251003011850_bf516787-461f-47a9-9e3a-573358dd6249.sql`

1. Open the file in VS Code
2. Select All (Cmd/Ctrl + A)
3. Copy (Cmd/Ctrl + C)
4. Go to Supabase SQL Editor
5. Paste (Cmd/Ctrl + V)
6. Click **"Run"** (or Cmd/Ctrl + Enter)
7. Wait for success message (~2-3 seconds)
8. ✅ You should see "Success. No rows returned"

#### Migration 2
**File:** `supabase/migrations/20251009013355_47810809-f085-4843-9008-eb4a22725e5b.sql`
- Repeat the same process

#### Migration 3
**File:** `supabase/migrations/20251009102051_32e1be44-8406-43ac-acf6-637f81da031c.sql`
- Repeat the same process

#### Migration 4
**File:** `supabase/migrations/20251009104316_c674286f-d14d-42e8-b79a-e59fb6912dad.sql`
- Repeat the same process

#### Migration 5
**File:** `supabase/migrations/20251012144156_bf5a4153-60a5-4f60-89be-80c45787afaf.sql`
- Repeat the same process

#### Migration 6
**File:** `supabase/migrations/20251012221652_d77e0561-28c1-4bad-a104-55eec0e91c43.sql`
- Repeat the same process

#### Migration 7
**File:** `supabase/migrations/20251012234134_5966fb8e-8cba-45a1-89d3-c9b3c12810d5.sql`
- Repeat the same process

#### Migration 8
**File:** `supabase/migrations/20251014011930_01833f60-de63-4d21-9470-f63776534e78.sql`
- Repeat the same process

#### Migration 9
**File:** `supabase/migrations/20251020000243_c5e73f14-fb0a-4d60-81ea-b1127431f4e3.sql`
- Repeat the same process

#### Migration 10: Fleet Management
**File:** `supabase/migrations/20251021154000_fleet_management_schema.sql`
- Repeat the same process

#### Migration 11
**File:** `supabase/migrations/20251022221915_e77f3d45-9ef8-4197-a3f8-1554f24d6abd.sql`
- Repeat the same process

#### Migration 12
**File:** `supabase/migrations/20251023015527_ab35d1d2-a9c5-401c-9544-30c87e7f8bf0.sql`
- Repeat the same process

#### Migration 13: **SCHEDULER FEATURE** (The Important One!)
**File:** `supabase/migrations/20251027000000_scheduler_feature_schema.sql`
- Repeat the same process
- This creates the `scheduler_batches` table that was missing!

---

## Quick VS Code Tip

To quickly navigate between files:
1. Press `Cmd/Ctrl + P` (Quick Open)
2. Type the migration number (e.g., `20251003`)
3. Press Enter
4. Select all, copy, paste into SQL Editor, run
5. Repeat for next file

---

## Step 3: Verify Tables Were Created

After applying all 13 migrations, verify they worked:

1. Go to **Table Editor**: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/editor
2. You should see many tables in the left sidebar, including:
   - ✅ `facilities`
   - ✅ `warehouses`
   - ✅ `drivers`
   - ✅ `vehicles`
   - ✅ `delivery_batches`
   - ✅ **`scheduler_batches`** ← This is the one we need!
   - ✅ `schedule_templates`
   - ✅ `optimization_runs`
   - ✅ `scheduler_settings`
   - And many more...

---

## Alternative: Run SQL Query to Verify

In SQL Editor, run this query:

\`\`\`sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
\`\`\`

You should see 30+ tables listed.

**Specifically check for scheduler tables:**

\`\`\`sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'schedul%'
ORDER BY table_name;
\`\`\`

Expected result:
```
scheduler_batches
scheduler_settings
schedule_templates
```

---

## Step 4: Test Your Application

1. Go back to your app: **http://localhost:8081**
2. Navigate to Scheduler page
3. Click **"New Schedule"**
4. Complete the wizard:
   - Step 1: Select "Ready Facilities" → Next
   - Step 2: Select "Manual Scheduling" → Next
   - Step 3: Fill in:
     * Schedule Title: "Test Migration"
     * Warehouse: Select any
     * Planned Date: Tomorrow
     * Facilities: Select 2+
   - Step 4: Click **"Create Schedule"**

**Expected:** ✅ "Schedule created successfully!"
**Previous Error:** ❌ "Could not find the table 'public.scheduler_batches' in the schema cache"

---

## Troubleshooting

### Error: "relation already exists"

This is OK - it means part of the migration was already applied. Click "Run" again or skip to the next migration.

### Error: "permission denied"

Make sure you're logged into the correct Supabase account that owns project `cenugzabuzglswikoewy`.

### SQL Editor Times Out

Large migrations might timeout. Try:
1. Running smaller sections at a time
2. Or refreshing the page and trying again

### Still Getting "Table Not Found" Error

1. Verify the table exists in Table Editor
2. Try refreshing your app (Cmd/Ctrl + Shift + R for hard refresh)
3. Check browser console for errors
4. Restart dev server

---

## Need Help?

If you encounter any errors:
1. Take a screenshot of the error
2. Note which migration file failed
3. Let me know and I'll help debug!

---

## After Successful Migration

Once all migrations are applied and tested:

✅ Your new Supabase database is fully set up
✅ All 30+ tables created
✅ Schedule creation works
✅ You have full control over your Supabase project
✅ No more Lovable dependencies

**Next:** You can start developing new features!
