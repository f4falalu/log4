# Apply VLMS Database Migration

## Quick Start (5 minutes)

### Step 1: Open Supabase SQL Editor
Click this link or paste in browser:
```
https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new
```

### Step 2: Copy Migration SQL
1. Open file: `supabase/migrations/20241113000000_vlms_schema.sql`
2. Select All (Cmd/Ctrl + A)
3. Copy (Cmd/Ctrl + C)

### Step 3: Run Migration
1. Paste into Supabase SQL Editor
2. Click "Run" button (bottom right)
3. Wait ~10 seconds for completion
4. You should see "Success. No rows returned"

### Step 4: Verify Installation
Run this query to verify tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'vlms_%'
ORDER BY table_name;
```

You should see 7 tables:
- vlms_assignments
- vlms_disposal_records
- vlms_fuel_logs
- vlms_incidents
- vlms_inspections
- vlms_maintenance_records
- vlms_vehicles

### Step 5: Optional - Add Sample Data
If you want to test with sample data:
1. Open file: `supabase/migrations/20241113000001_vlms_seed.sql`
2. Copy and paste into SQL Editor
3. Click "Run"

### Step 6: Access VLMS
Navigate to in your browser:
```
http://localhost:8080/fleetops/vlms
```

## Troubleshooting

### Error: "relation already exists"
The tables are already created. You can skip the migration or drop them first:
```sql
DROP TABLE IF EXISTS vlms_disposal_records CASCADE;
DROP TABLE IF EXISTS vlms_inspections CASCADE;
DROP TABLE IF EXISTS vlms_incidents CASCADE;
DROP TABLE IF EXISTS vlms_assignments CASCADE;
DROP TABLE IF EXISTS vlms_fuel_logs CASCADE;
DROP TABLE IF EXISTS vlms_maintenance_records CASCADE;
DROP TABLE IF EXISTS vlms_vehicles CASCADE;
-- Then run the migration again
```

### Error: "permission denied"
Make sure you're logged into Supabase dashboard with the correct account.

### Error: "foreign key violation"
Make sure the `profiles` and `facilities` tables exist first.

## What Gets Created

- ✅ 7 database tables
- ✅ 6 sequences for auto-generated IDs
- ✅ 40+ indexes for performance
- ✅ 25+ RLS policies for security
- ✅ 6 triggers for automation
- ✅ 4 views for common queries
- ✅ 2 business logic functions

## Next Steps After Migration

1. Navigate to `/fleetops/vlms` - See the dashboard
2. Click "Vehicle Management" - Add your first vehicle
3. Explore other modules (Maintenance, Fuel, Assignments, Incidents)

## Storage Buckets (Optional)

To enable document/photo uploads, create storage buckets:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('vlms-documents', 'vlms-documents', false),
  ('vlms-photos', 'vlms-photos', false);
```

Then add storage policies - see migration file for details.

## Need Help?

- Check: VLMS_PHASE_0-4_COMPLETE.md for full documentation
- Check: VLMS_IMPLEMENTATION_PLAN.md for detailed specs
- Tables documentation in migration file has comments
