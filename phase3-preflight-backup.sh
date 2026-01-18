#!/bin/bash
# ============================================================================
# Phase 3 Vehicle Consolidation - Pre-Flight Backup
# Created: 2026-01-04
# Purpose: Backup database before applying consolidation migrations
# ============================================================================

set -e

BACKUP_DIR="backups/phase3-consolidation"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROJECT_ID="cenugzabuzglswikoewy"

echo "============================================================================"
echo "Phase 3 Vehicle Consolidation - Pre-Flight Backup"
echo "Timestamp: $TIMESTAMP"
echo "============================================================================"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo ""
echo "Step 1: Creating database dump..."
npx supabase db dump -f "$BACKUP_DIR/backup_phase3_${TIMESTAMP}.sql" --linked

echo ""
echo "Step 2: Documenting baseline metrics..."

# Note: Since we can't directly query the database, we'll document what needs to be verified
cat > "$BACKUP_DIR/baseline_metrics_${TIMESTAMP}.md" << 'EOF'
# Phase 3 Consolidation - Baseline Metrics
Created: $(date +"%Y-%m-%d %H:%M:%S")

## Pre-Migration Verification Checklist

### Database State
- [ ] Total vehicles count: _____
- [ ] Total vlms_vehicles count: _____
- [ ] Vehicles with plate_number: _____
- [ ] Vehicles missing acquisition_date: _____
- [ ] Vehicles missing vehicle_id: _____

### Schema State
- [ ] vehicles table columns count: _____ (expected: ~17 before migration)
- [ ] vehicle_merge_audit table exists: NO (will be created)
- [ ] vehicles_unified_v view exists: NO (will be created)

### Queries to Run Manually (via Supabase Dashboard)

```sql
-- Baseline counts
SELECT COUNT(*) as total_vehicles FROM vehicles;
SELECT COUNT(*) as total_vlms_vehicles FROM vlms_vehicles;

-- Missing data check
SELECT COUNT(*) as vehicles_no_acquisition_date
FROM vehicles
WHERE acquisition_date IS NULL;

SELECT COUNT(*) as vehicles_no_vehicle_id
FROM vehicles
WHERE vehicle_id IS NULL;

-- Column count
SELECT COUNT(*) as vehicles_table_columns
FROM information_schema.columns
WHERE table_name = 'vehicles' AND table_schema = 'public';

-- Check for existing columns that will be added
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'vehicles'
  AND table_schema = 'public'
  AND column_name IN (
    'width_cm', 'capacity_m3', 'gross_vehicle_weight_kg',
    'tiered_config', 'telematics_provider', 'telematics_id',
    'number_of_axles', 'number_of_wheels', 'acquisition_mode',
    'date_acquired', 'legacy_metadata'
  );
-- Expected: 0 rows (these columns don't exist yet)
```

## Rollback Plan

If migration fails, restore from backup:

```bash
# Stop all connections
# Restore from backup
psql [connection-string] < backup_phase3_${TIMESTAMP}.sql

# Verify restoration
psql [connection-string] -c "SELECT COUNT(*) FROM vehicles;"
```

## Success Criteria

After migration:
- [ ] All 11 new columns added to vehicles table
- [ ] vehicle_merge_audit table created
- [ ] vehicles_unified_v view created
- [ ] Data backfilled from vlms_vehicles
- [ ] No data loss (row counts match pre-migration)
- [ ] TypeScript types regenerated successfully

EOF

echo ""
echo "Step 3: Creating restore script..."

cat > "$BACKUP_DIR/restore_from_backup.sh" << 'RESTORE_EOF'
#!/bin/bash
# Restore from Phase 3 backup
# Usage: ./restore_from_backup.sh backup_phase3_TIMESTAMP.sql

if [ -z "$1" ]; then
  echo "Error: No backup file specified"
  echo "Usage: ./restore_from_backup.sh backup_phase3_TIMESTAMP.sql"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will restore the database to the state in $BACKUP_FILE"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "Restoring from $BACKUP_FILE..."
# Note: Actual restore would be done via Supabase dashboard or CLI
echo "Please restore manually via Supabase dashboard:"
echo "1. Go to https://supabase.com/dashboard/project/cenugzabuzglswikoewy"
echo "2. Navigate to Database > Migrations"
echo "3. Use the restore functionality with file: $BACKUP_FILE"

RESTORE_EOF

chmod +x "$BACKUP_DIR/restore_from_backup.sh"

echo ""
echo "============================================================================"
echo "Backup Complete!"
echo "============================================================================"
echo "Backup location: $BACKUP_DIR/backup_phase3_${TIMESTAMP}.sql"
echo "Metrics template: $BACKUP_DIR/baseline_metrics_${TIMESTAMP}.md"
echo "Restore script: $BACKUP_DIR/restore_from_backup.sh"
echo ""
echo "NEXT STEPS:"
echo "1. Run baseline metric queries manually in Supabase Dashboard"
echo "2. Document results in baseline_metrics_${TIMESTAMP}.md"
echo "3. Verify backup file was created successfully"
echo "4. Proceed with Phase 1 migration"
echo "============================================================================"
