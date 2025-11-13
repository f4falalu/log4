# Apply Scheduler Migration to Supabase

## Error
```
Could not find the table 'public.scheduler_batches' in the schema cache
```

## Root Cause
The scheduler migration file exists but hasn't been applied to the database yet.

## Solution - Apply Migration via Supabase Dashboard (Simplest Method)

### Step 1: Open Supabase SQL Editor
1. Go to **https://supabase.com/dashboard/project/fgkjhpytntgmbuxegntr**
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New query"**

### Step 2: Copy the Migration SQL
Open this file in your code editor:
```
supabase/migrations/20251027000000_scheduler_feature_schema.sql
```

**Or** you can copy it from here: [View file in VS Code](../supabase/migrations/20251027000000_scheduler_feature_schema.sql)

### Step 3: Paste and Execute
1. Copy ALL 453 lines from the migration file
2. Paste into the SQL Editor
3. Click **"Run"** (or press Cmd/Ctrl + Enter)
4. Wait for success message (should take 2-5 seconds)

### Step 4: Verify Tables Were Created (Optional)
Run this query in a new SQL Editor tab:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'scheduler_batches',
  'schedule_templates',
  'optimization_runs',
  'scheduler_settings'
)
ORDER BY table_name;
```

You should see 4 tables listed.

### Step 5: Test in Your App
1. Go back to your app at `http://localhost:8081`
2. Click **"New Schedule"** button
3. Go through the wizard:
   - Step 1: Select "Ready Facilities" → Next
   - Step 2: Select "Manual Scheduling" → Next
   - Step 3: Fill in the form:
     * Schedule Title: "Test Delivery"
     * Warehouse: Select any warehouse
     * Planned Date: Pick a date
     * Facilities: Select 2+ facilities
   - Step 4: Review and click **"Create Schedule"**
4. Should see success message! ✅

## What This Migration Creates

The migration creates:

✅ **4 Tables:**
- `scheduler_batches` - Schedule batches
- `schedule_templates` - Reusable templates
- `optimization_runs` - AI optimization history
- `scheduler_settings` - User preferences

✅ **3 Enums:**
- `scheduler_batch_status`
- `scheduling_mode`
- `optimization_status`

✅ **Triggers & Functions:**
- Auto-generate batch codes
- Auto-update timestamps
- Track status transitions

✅ **RLS Policies:**
- Row-level security for all tables

✅ **Indexes:**
- 13 indexes for performance

✅ **Views:**
- `scheduler_overview_stats` for dashboard

## Troubleshooting

### If you get permission errors:
Make sure you're logged into the correct Supabase account that owns the project `fgkjhpytntgmbuxegntr`

### If the SQL Editor times out:
The migration is large. Try splitting it into chunks:
1. Run lines 1-90 (enums and tables)
2. Run lines 91-230 (indexes)
3. Run lines 231-318 (functions and triggers)
4. Run lines 319-453 (RLS and views)

### Alternative: Use psql command line
If you have PostgreSQL client installed:

```bash
# Get your database URL from Supabase Dashboard → Settings → Database → Connection string
psql "postgresql://postgres:[YOUR-PASSWORD]@db.fgkjhpytntgmbuxegntr.supabase.co:5432/postgres" \
  -f supabase/migrations/20251027000000_scheduler_feature_schema.sql
```

## Questions?
If you encounter any issues, let me know and I'll help debug!
