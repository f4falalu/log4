# FleetOps Vehicle Capacity System - Deployment Guide

## 📋 Overview

This guide covers deploying the complete Vehicle Capacity & Slot Management system (Phases A-C) to your FleetOps application.

**What Was Implemented:**
- ✅ Phase A: Tier/Slot Validation System
- ✅ Phase B: Batch Planner Slot Integration
- ✅ Phase C: Vehicle Details Capacity Tab Enhancement

---

## 🚀 Quick Start

### 1. Apply Database Migrations

**Option A: Local Supabase (Development)**
```bash
# Start Supabase local instance
npx supabase start

# Apply all pending migrations
npx supabase db reset

# Or apply incrementally
npx supabase migration up
```

**Option B: Production Supabase**
```bash
# Link to your project
npx supabase link --project-ref your-project-ref

# Push migrations to production
npx supabase db push
```

**Manual Application (if CLI fails):**
```bash
# Connect to your Supabase SQL Editor and run:
# 1. supabase/migrations/20251203000000_add_tiered_config_validation.sql
# 2. supabase/migrations/20251203000001_create_slot_assignments.sql
```

### 2. Verify Migrations

```sql
-- Check if total_slots column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicles'
  AND column_name = 'total_slots';

-- Check if slot_assignments table exists
SELECT * FROM slot_assignments LIMIT 1;

-- Check validation functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('validate_slot_count', 'validate_tiered_config', 'compute_total_slots');
```

### 3. Build & Deploy Frontend

```bash
# Build for production
npm run build

# Deploy to your hosting (Vercel, Netlify, etc.)
# Or run locally
npm run dev
```

---

## 🧪 Testing Guide

### Test 1: Tier Validation (Phase A)

**Scenario 1: Invalid Tier Count**
1. Navigate to VLMS → Add Vehicle
2. Select **Motorcycle (L1e/L2e)** category
3. Try to select **2 tiers** using tier count selector
4. **Expected**: Button should be disabled (motorcycles limited to 1 tier)

**Scenario 2: Invalid Slot Count**
1. Select **N2 Truck** category (allows 4 tiers)
2. Configure 4 tiers
3. Try to set a tier to **0 slots** or **13+ slots**
4. Click "Save & Continue"
5. **Expected**: Red error alert appears: "Minimum 1 slot required per tier" or "Maximum 12 slots allowed per tier"

**Scenario 3: Valid Configuration**
1. Select **N1 Van** category (3 tiers)
2. Configure:
   - Lower: 5 slots
   - Middle: 4 slots
   - Upper: 3 slots
3. Fill in required fields (license plate, year, fuel type, date acquired, acquisition mode)
4. Click "Save & Continue"
5. **Expected**: Vehicle saves successfully, `total_slots = 12` stored in database

### Test 2: Slot Assignment Engine (Phase B)

**Test in TypeScript/Console:**
```typescript
import { autoAssignFacilitiesToSlots } from '@/lib/capacity/slotAssignmentEngine';

// Mock data
const facilities = [
  { id: 'FAC001', estimated_weight: 50, estimated_volume: 0.3 },
  { id: 'FAC002', estimated_weight: 30, estimated_volume: 0.2 },
  { id: 'FAC003', estimated_weight: 20, estimated_volume: 0.1 },
];

const vehicle = {
  id: 'VEH123',
  capacity_kg: 1000,
  capacity_m3: 10,
  tiered_config: {
    tiers: [
      { tier_name: 'Lower', tier_order: 1, slot_count: 4 },
      { tier_name: 'Middle', tier_order: 2, slot_count: 4 },
      { tier_name: 'Upper', tier_order: 3, slot_count: 3 },
    ]
  }
};

const result = autoAssignFacilitiesToSlots(facilities, vehicle);

console.log('Assignments:', result.assignments);
// Expected: 3 assignments, heaviest to Lower tier, lightest to Upper
```

**Expected Output:**
```json
{
  "success": true,
  "assignments": [
    { "slot_key": "VEH123-Lower-1", "facility_id": "FAC001", "load_kg": 50, "tier_name": "Lower" },
    { "slot_key": "VEH123-Lower-2", "facility_id": "FAC002", "load_kg": 30, "tier_name": "Lower" },
    { "slot_key": "VEH123-Lower-3", "facility_id": "FAC003", "load_kg": 20, "tier_name": "Lower" }
  ],
  "unassigned": [],
  "errors": [],
  "warnings": []
}
```

### Test 3: Capacity Tab Visualization (Phase C)

1. Create a vehicle with tier configuration (use Test 1 above)
2. Navigate to **Fleet Management → Vehicles**
3. Click on the vehicle you created
4. Switch to **"Capacity"** tab
5. **Expected**:
   - Horizontal slot boxes displayed (matching configurator)
   - Total slots badge in header
   - Each tier shows correct number of slots
   - Slot boxes: h-7 w-9, dashed borders, hover effect

### Test 4: Database Validation

**Test Constraint Violation:**
```sql
-- This should FAIL with validation error
INSERT INTO vehicles (license_plate, make, model, year, tiered_config)
VALUES (
  'TEST-123',
  'Test',
  'Vehicle',
  2024,
  '{"tiers": [{"name": "Lower", "tier_order": 1, "slots": 15}]}'::jsonb
);
-- Expected Error: Slot count must be between 1-12
```

**Test Valid Insert:**
```sql
-- This should SUCCEED
INSERT INTO vehicles (license_plate, make, model, year, tiered_config)
VALUES (
  'TEST-456',
  'Test',
  'Vehicle',
  2024,
  '{"tiers": [
    {"name": "Lower", "tier_order": 1, "slots": 5},
    {"name": "Upper", "tier_order": 2, "slots": 4}
  ]}'::jsonb
);

-- Check total_slots was computed
SELECT license_plate, total_slots FROM vehicles WHERE license_plate = 'TEST-456';
-- Expected: total_slots = 9
```

---

## 📊 Database Schema Reference

### New Columns (vehicles table)
| Column | Type | Description |
|--------|------|-------------|
| `total_slots` | INT | Auto-computed from tiered_config |

### New Tables
| Table | Purpose |
|-------|---------|
| `slot_assignments` | Tracks facility→slot assignments for batches |

### New Views
| View | Purpose |
|------|---------|
| `vehicle_tier_stats` | Statistics on tier configurations |
| `slot_assignment_details` | Slot assignments with vehicle/facility details |
| `batch_slot_utilization` | Capacity utilization per batch |
| `vehicle_slot_availability` | Real-time slot availability |

### New Functions
| Function | Purpose |
|----------|---------|
| `validate_slot_count(INT)` | Validates 1-12 slot range |
| `validate_tiered_config(JSONB)` | Validates tier JSON structure |
| `compute_total_slots(JSONB)` | Calculates total slots |
| `get_batch_slot_assignments(UUID)` | Gets assignments for a batch |
| `is_slot_available(UUID, TEXT)` | Checks if slot is available |

---

## 🔧 Troubleshooting

### Issue: Migration fails with "relation does not exist"

**Cause**: Migrations are out of order or dependencies missing.

**Solution**:
```bash
# Check migration order
npx supabase migration list

# Reset database (WARNING: deletes all data)
npx supabase db reset

# Or apply specific migrations manually via SQL Editor
```

### Issue: "total_slots" column not appearing

**Cause**: Migration 20251203000000 not applied.

**Solution**:
```sql
-- Manually add column
ALTER TABLE vehicles
ADD COLUMN total_slots INT GENERATED ALWAYS AS (compute_total_slots(tiered_config)) STORED;
```

### Issue: Tier validation not working in UI

**Cause**: TypeScript compilation error or missing import.

**Solution**:
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Restart dev server
npm run dev
```

### Issue: Slot assignment returns empty array

**Cause**: Vehicle missing `tiered_config` or incorrect format.

**Solution**:
```typescript
// Ensure vehicle has proper structure
const vehicle = {
  id: 'uuid',
  capacity_kg: 1000,
  capacity_m3: 10,
  tiered_config: {
    tiers: [
      { tier_name: 'Lower', tier_order: 1, slot_count: 4 }
    ]
  }
};
```

---

## 📦 Integration Checklist

### Batch Planner Integration (Phase B Implementation)

To fully integrate slot assignments into your batch planner:

1. **Update CreateBatchDialog.tsx**:
```typescript
import { autoAssignFacilitiesToSlots } from '@/lib/capacity/slotAssignmentEngine';

// When vehicle is selected and facilities are added:
const assignmentResult = autoAssignFacilitiesToSlots(
  selectedFacilities,
  selectedVehicle,
  { fillStrategy: 'lower-first' }
);

if (!assignmentResult.success) {
  // Show error: batch doesn't fit
  alert(assignmentResult.errors.join(', '));
}
```

2. **Save Assignments to Database**:
```typescript
// After batch is created, save slot assignments
const { data: batch } = await supabase
  .from('scheduler_batches')
  .insert(batchData)
  .select()
  .single();

// Save slot assignments
for (const assignment of assignmentResult.assignments) {
  await supabase.from('slot_assignments').insert({
    batch_id: batch.id,
    batch_type: 'scheduler',
    ...assignment
  });
}
```

3. **Display Slot Allocation**:
```typescript
// Query slot assignments for a batch
const { data: assignments } = await supabase
  .from('slot_assignment_details')
  .select('*')
  .eq('batch_id', batchId);

// Group by tier for visualization
const byTier = assignments.reduce((acc, a) => {
  if (!acc[a.tier_name]) acc[a.tier_name] = [];
  acc[a.tier_name].push(a);
  return acc;
}, {});
```

---

## 🎯 Next Steps (Phase D)

To complete the full capacity-aware scheduler:

1. Create `vehicleMatchingEngine.ts` (filter vehicles by capacity)
2. Create `batchCapacityCalculator.ts` (calculate batch requirements)
3. Update Scheduler Wizard to show capacity requirements
4. Add vehicle recommendation in batch creation
5. Implement capacity warnings/alerts

See `/Users/fbarde/.claude/plans/mutable-honking-gray.md` for full Phase D specification.

---

## 📝 API Reference

### Slot Assignment Engine

```typescript
// Auto-assign facilities to slots
autoAssignFacilitiesToSlots(
  facilities: Facility[],
  vehicle: Vehicle,
  options?: {
    rules?: AssignmentRule[];
    fillStrategy?: 'lower-first' | 'upper-first' | 'balanced';
    allowOverflow?: boolean;
  }
): AssignmentResult

// Suggest optimal vehicle
suggestOptimalVehicle(
  facilities: Facility[],
  availableVehicles: Vehicle[]
): { vehicle: Vehicle; score: number; reason: string } | null

// Detect conflicts
detectSlotConflicts(
  assignments: SlotAssignment[]
): Array<{ slot_key: string; facilities: string[]; conflict: string }>
```

### Tier Validation

```typescript
// Validate complete tier config
validateTierConfig(
  tiers: TierConfig[],
  maxCapacityKg?: number,
  maxCapacityM3?: number,
  vehicleClass?: string
): TierValidationResult

// Validate slot count
validateSlotCount(count: number): { valid: boolean; message: string }

// Validate tier count for vehicle class
validateTierCountForClass(
  count: number,
  vehicleClass: string
): { valid: boolean; message: string }

// Compute total slots
computeTotalSlots(tiers: TierConfig[]): number
```

---

## 📞 Support

If you encounter issues:

1. Check TypeScript compilation: `npx tsc --noEmit`
2. Verify migrations applied: `npx supabase migration list`
3. Check console for errors: Browser DevTools → Console
4. Review error logs: Supabase Dashboard → Logs

---

**Implementation Date**: December 3, 2025
**Phases Completed**: A, B, C (Validation, Slot Assignment, Capacity Tab)
**Remaining**: Phase D (Scheduler Integration)
