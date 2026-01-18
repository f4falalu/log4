# Phase 3 Vehicle Consolidation - Baseline Metrics
Created: 2026-01-04 19:55:00

## Pre-Migration State

### Migration Status
- **Phase 1 Migration**: NOT APPLIED (20251129000001_add_canonical_vehicle_columns.sql)
- **Phase 2 Migration**: NOT APPLIED (20251129000002_create_vehicle_merge_audit.sql)
- **Phase 3 Migration**: NOT APPLIED (20251129000003_backfill_vlms_to_vehicles.sql)
- **Phase 4 Migration**: NOT APPLIED (20251129000004_create_vehicles_unified_view.sql)

### Current Schema State
Based on TypeScript types file analysis:

**vehicles table** (current schema):
- id: string
- model: string
- plate_number: string (NOT license_plate)
- type: string
- capacity: number
- max_weight: number
- fuel_type: enum
- fuel_efficiency: number
- avg_speed: number
- status: enum
- current_driver_id: string | null
- ai_generated: boolean | null
- photo_url: string | null
- thumbnail_url: string | null
- photo_uploaded_at: string | null
- created_at: string | null
- updated_at: string | null

**Missing columns** (to be added in Phase 1):
- width_cm
- capacity_m3
- gross_vehicle_weight_kg
- tiered_config
- telematics_provider
- telematics_id
- number_of_axles
- number_of_wheels
- acquisition_mode
- date_acquired
- legacy_metadata

**Missing tables** (to be created):
- vehicle_merge_audit (Phase 2)

**Missing views** (to be created):
- vehicles_unified_v (Phase 4)

## Backup Strategy

Since Docker is not available for `supabase db dump`, we rely on:
1. **Supabase Dashboard Automatic Backups**: Point-in-time recovery available
2. **Migration Files**: All migrations are tracked in Git
3. **Rollback Scripts**: Each migration file includes rollback SQL in comments

## Rollback Plan

If migration fails, rollback via Supabase Dashboard:
1. Navigate to https://supabase.com/dashboard/project/cenugzabuzglswikoewy
2. Use Point-in-Time Recovery to restore to pre-migration state
3. Timestamp to restore: 2026-01-04 19:55:00 UTC

Alternatively, run rollback SQL from each migration file.

## Success Criteria

After all migrations applied:
- ✅ vehicles table has 28+ columns (17 existing + 11 new)
- ✅ vehicle_merge_audit table exists
- ✅ vehicles_unified_v view exists
- ✅ Data migrated from vlms_vehicles
- ✅ TypeScript types regenerated
- ✅ No 404 errors on vehicle queries
- ✅ VLMS onboarding still functional

## Migration Order

1. 20251129000001_add_canonical_vehicle_columns.sql
2. 20251129000002_create_vehicle_merge_audit.sql
3. 20251129000003_backfill_vlms_to_vehicles.sql
4. 20251129000004_create_vehicles_unified_view.sql

## Notes

- Current approach differs from original 7-phase roadmap
- Migrations created on 2025-11-29 but never applied to production
- No vehicle_id auto-generation trigger found in migrations
- No license_plate/plate_number bidirectional sync triggers found
