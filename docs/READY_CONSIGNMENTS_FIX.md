# Ready Consignments Fix

## Problem
In **fleetops/batches → Create Dispatch Schedule → Ready Consignments**, the interface was loading **all facilities** instead of **facility orders ready for dispatch**.

## Root Cause
The `UnifiedWorkflowDialog` component was transforming all facilities into candidates, setting `requisition_ids: []` as empty for every facility. This resulted in:
1. All facilities being shown instead of only those with ready requisitions
2. No actual requisition data being loaded
3. Empty slot_demand and weight_kg values

## Solution

### 1. Created `useReadyConsignments` Hook
**File:** `src/hooks/useReadyConsignments.ts`

This hook:
- Fetches requisitions with `status='ready_for_dispatch'`
- Joins with `facilities` table to get facility details
- Joins with `requisition_packaging` table to get actual slot demand and weight
- Groups requisitions by `facility_id`
- Returns `FacilityCandidate[]` format with:
  - Actual `requisition_ids` for each facility
  - Aggregated `slot_demand` from packaging data
  - Aggregated `weight_kg` from packaging data
  - Aggregated `volume_m3` from packaging data

### 2. Updated UnifiedWorkflowDialog
**File:** `src/components/unified-workflow/UnifiedWorkflowDialog.tsx`

Changes:
- Added import for `useReadyConsignments` hook
- Replaced the facility transformation logic with the new hook
- Now uses actual ready consignments instead of all facilities

## Expected Behavior After Fix

When users navigate to **Create Dispatch Schedule → Step 2: Schedule**, they should now see:
- **Left column:** Only facilities that have requisitions with status `ready_for_dispatch`
- **Requisition IDs:** Actual requisition IDs associated with each facility
- **Slot Demand:** Calculated from packaging rules (not hardcoded to 1)
- **Weight/Volume:** Actual aggregated values from requisition items

## Related Files
- `src/hooks/useReadyConsignments.ts` (new)
- `src/components/unified-workflow/UnifiedWorkflowDialog.tsx` (updated)
- `src/components/unified-workflow/schedule/SourceOfTruthColumn.tsx` (unchanged, but receives correct data now)
- `src/components/unified-workflow/steps/Step2Schedule.tsx` (unchanged)

## Testing Checklist
- [ ] Navigate to fleetops/batches
- [ ] Click "Create Batch" button
- [ ] Click "Next" on Step 1 (Source)
- [ ] On Step 2 (Schedule), verify left column shows "Available Facility Orders"
- [ ] Verify only facilities with ready_for_dispatch requisitions are shown
- [ ] Verify slot demand displays correct values (not all 1)
- [ ] Verify facilities can be added to working set (middle column)
- [ ] Verify requisition_ids are populated when facilities are selected

## Database Dependencies
The fix relies on these tables:
- `requisitions` (with `status` column)
- `facilities` (with coordinates and metadata)
- `requisition_packaging` (with `rounded_slot_demand`, `total_weight_kg`, `total_volume_m3`)

Make sure these tables have proper RLS policies allowing reads for authenticated users.
