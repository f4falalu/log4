#!/bin/bash
# ============================================================================
# Apply Phase 3 Vehicle Consolidation Migrations
# Created: 2026-01-04
# Purpose: Apply the 4 consolidation migrations in order
# ============================================================================

set -e

echo "============================================================================"
echo "Phase 3 Vehicle Consolidation - Migration Application"
echo "============================================================================"
echo ""
echo "This will apply 4 migrations in sequence:"
echo "  1. 20251129000001_add_canonical_vehicle_columns.sql"
echo "  2. 20251129000002_create_vehicle_merge_audit.sql"
echo "  3. 20251129000003_backfill_vlms_to_vehicles.sql"
echo "  4. 20251129000004_create_vehicles_unified_view.sql"
echo ""
echo "WARNING: This will modify the production database schema and data."
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo ""
echo "Applying migrations to linked project..."
echo ""

# Apply all pending migrations up to and including the Phase 3 migrations
npx supabase db push --linked

echo ""
echo "============================================================================"
echo "Migrations Applied Successfully!"
echo "============================================================================"
echo ""
echo "NEXT STEPS:"
echo "1. Verify migrations applied: npx supabase migration list --linked"
echo "2. Regenerate TypeScript types"
echo "3. Verify data migration results"
echo "4. Update frontend code"
echo "============================================================================"
