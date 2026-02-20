# Supabase Linter - Quick Reference Card

**Keep this handy when reviewing linter warnings** 📋

---

## ✅ Expected Warnings (Safe to Ignore)

### SECURITY DEFINER Views (14 warnings) - SAFE ✅
These are **intentional and necessary** for dashboards and analytics:

```
✓ vlms_vehicles_with_taxonomy
✓ vehicle_slot_availability
✓ vlms_available_vehicles
✓ vlms_active_assignments
✓ vehicles_with_taxonomy
✓ vehicles_with_tier_stats
✓ slot_assignment_details
✓ vlms_overdue_maintenance
✓ vehicle_tier_stats
✓ batch_slot_utilization
✓ scheduler_overview_stats
✓ workspace_readiness_details
✓ vlms_upcoming_maintenance
✓ pending_invitations_view
```

**Why safe:** Read-only, aggregated data, authenticated access only

### PostGIS System Table (1 warning) - SAFE ✅
```
✓ spatial_ref_sys (RLS not enabled)
```

**Why safe:** PostGIS system table, public coordinate data, cannot modify

---

## ❌ Warnings That Need Action

**If you see these, investigate immediately:**
- RLS disabled on NEW user tables (not spatial_ref_sys)
- Missing RLS policies on user data
- NEW SECURITY DEFINER views not in the list above
- Authentication bypasses

---

## Quick Decision Tree

```
See a linter warning?
│
├─ Is it one of the 14 SECURITY DEFINER views listed above?
│  └─ YES → ✅ IGNORE (safe and intentional)
│
├─ Is it spatial_ref_sys RLS warning?
│  └─ YES → ✅ IGNORE (PostGIS system table)
│
└─ Is it something else?
   └─ YES → ⚠️ INVESTIGATE (unexpected warning)
```

---

## Total Expected Warnings

**Count:** 15 warnings total
- 14 SECURITY DEFINER views
- 1 spatial_ref_sys table

**All are documented and safe** ✅

---

**Full Details:** See [LINTER_WARNINGS_EXPLAINED.md](./LINTER_WARNINGS_EXPLAINED.md)
