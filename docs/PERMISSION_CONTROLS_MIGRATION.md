# Permission-Based Controls Migration

**Date:** February 22, 2026
**Status:** ✅ Complete (Phase 1)

## Overview

This document tracks the migration of existing pages from hardcoded role checks and direct status mutations to permission-based workflow controls using the new RBAC system.

---

## ✅ Completed Migrations

### 1. **Requisitions Page** (`src/pages/storefront/requisitions/`)

**Files Modified:**
- [RequisitionDetailPanel.tsx](../src/pages/storefront/requisitions/components/RequisitionDetailPanel.tsx)
- [page.tsx](../src/pages/storefront/requisitions/page.tsx)

**Changes:**
- ✅ Removed hardcoded `Approve`, `Reject`, and `Mark Ready` buttons
- ✅ Replaced with `RequisitionStatusActions` component
- ✅ Removed manual status mutation calls (`updateStatus.mutate`)
- ✅ Removed rejection dialog (now handled by RequisitionStatusActions)
- ✅ Status transitions now enforce permission checks via database triggers

**Before:**
```tsx
{requisition.status === 'pending' && (
  <div className="flex gap-2">
    <Button onClick={handleApprove}>Approve</Button>
    <Button onClick={onReject}>Reject</Button>
  </div>
)}
```

**After:**
```tsx
<RequisitionStatusActions
  requisitionId={requisition.id}
  currentStatus={requisition.status}
  requisitionNumber={requisition.sriv_number || requisition.requisition_number}
/>
```

**Benefits:**
- Permission checks happen at database level (cannot be bypassed)
- Dynamic status dropdown shows only permitted transitions
- Confirmation dialog with notes field for audit trail
- Terminal state warnings
- Error messages surface permission denied errors

---

### 2. **Invoice Page** (`src/pages/storefront/invoice/`)

**Files Created:**
- [InvoiceStatusActions.tsx](../src/components/storefront/invoice/InvoiceStatusActions.tsx)

**Files Modified:**
- [InvoiceDetailPanel.tsx](../src/pages/storefront/invoice/components/InvoiceDetailPanel.tsx)
- [useWorkflowGuards.tsx](../src/hooks/rbac/useWorkflowGuards.tsx)

**Changes:**
- ✅ Created `InvoiceStatusActions` component for invoice workflow
- ✅ Updated `INVOICE_STATUS_META` to match actual app statuses (draft, ready, packaging_pending, packaged, dispatched, completed, cancelled)
- ✅ Removed hardcoded `Mark as Ready` and `Start Packaging` buttons
- ✅ Replaced with `InvoiceStatusActions` component
- ✅ Status transitions now follow permission-based workflow

**Invoice Status Flow:**
```
draft
  → ready (requires: invoice.create)
  → cancelled

ready
  → packaging_pending (requires: invoice.package)
  → packaged (skip packaging)
  → cancelled

packaging_pending
  → packaged (requires: invoice.package)
  → cancelled

packaged
  → dispatched (requires: invoice.dispatch)
  → cancelled

dispatched
  → completed (requires: invoice.complete)
  → cancelled

Terminal States:
  - completed (requires system.admin to modify)
  - cancelled (requires system.admin to modify)
```

---

### 3. **Batch Management Pages** (`src/components/batches/`)

**Files Created:**
- [BatchStatusActions.tsx](../src/components/batches/BatchStatusActions.tsx)

**Files Modified:**
- [BatchDetailsPanel.tsx](../src/components/batches/BatchDetailsPanel.tsx)

**Changes:**
- ✅ Created `BatchStatusActions` component for batch workflow
- ✅ Removed hardcoded `Start Delivery`, `Mark Complete`, and `Cancel` buttons
- ✅ Replaced with `BatchStatusActions` component
- ✅ Status transitions now follow permission-based workflow
- ✅ Added rollback warning for `assigned → planned` transition

**Batch Status Flow:**
```
planned
  → assigned (requires: batch.assign)
  → cancelled

assigned
  → in-progress (requires: batch.dispatch)
  → planned [rollback]
  → cancelled

in-progress
  → completed (requires: batch.complete)
  → cancelled

Terminal States:
  - completed
  - cancelled
```

**Note:** The FleetOps dispatch page (`src/pages/fleetops/dispatch/page.tsx`) has specialized workflows for driver/vehicle assignment and remains separate from the BatchStatusActions component. These operations have specific UX requirements (assignment dropdowns) that differ from simple status transitions.

---

### 4. **Scheduler Pages** (`src/pages/storefront/scheduler/`)

**Files Created:**
- [SchedulerBatchStatusActions.tsx](../src/components/storefront/scheduler/SchedulerBatchStatusActions.tsx)

**Files Modified:**
- [SchedulePreviewPanel.tsx](../src/pages/storefront/scheduler/components/SchedulePreviewPanel.tsx)

**Changes:**
- ✅ Created `SchedulerBatchStatusActions` component for scheduler workflow
- ✅ Removed hardcoded `Publish to FleetOps` button
- ✅ Replaced with `SchedulerBatchStatusActions` component
- ✅ Status transitions now follow permission-based workflow
- ✅ Added rollback warnings for draft/ready transitions
- ✅ Added publish confirmation with special messaging

**Scheduler Status Flow:**
```
draft
  → ready (requires: scheduler.plan)
  → cancelled

ready
  → scheduled (requires: scheduler.optimize)
  → draft [rollback]
  → cancelled

scheduled
  → published (requires: scheduler.publish)
  → ready [rollback]
  → cancelled

Terminal States:
  - published
  - cancelled
```

---

## ✅ Phase 2 Evaluation Complete

### 5. **Secondary Pages Assessment**

**Evaluation Date:** February 22, 2026

**Pages Evaluated:**
- ✅ Warehouse management pages
- ✅ Facility management pages
- ✅ Program management pages
- ✅ Zone/Route management pages

**Result:** ❌ **No workflow migrations required**

**Findings:**
- None of these pages have sequential workflow states
- Programs have a `status` field, but it's a configuration setting (active/paused/closed), not a workflow state
- All operations are standard CRUD without approval processes
- No StatusActions components needed

**Recommendation:**
- Implement basic CRUD permission checks instead of workflow controls
- Use `useHasPermission()` hook for action button visibility
- Rely on database RLS for data access control

**Full Analysis:** See [PHASE_2_EVALUATION.md](./PHASE_2_EVALUATION.md)

---

## 🎯 Migration Checklist

### For Each Page/Component:

1. **Identify Status Mutations**
   - [ ] Find all `updateStatus.mutate()` calls
   - [ ] Find hardcoded status-specific buttons
   - [ ] Find role-based visibility checks (e.g., `useHasRole('system_admin')`)

2. **Replace with Permission-Based Controls**
   - [ ] Import appropriate StatusActions component
   - [ ] Replace buttons with `<StatusActions />` component
   - [ ] Remove manual mutation calls
   - [ ] Remove hardcoded role checks

3. **Test Permission Enforcement**
   - [ ] Test with user without permissions (should see read-only badge)
   - [ ] Test with user with partial permissions (should see subset of states)
   - [ ] Test with user with full permissions (should see all valid transitions)
   - [ ] Test terminal state protection (cannot modify completed/cancelled)

4. **Verify Audit Trail**
   - [ ] Check audit logs after status change
   - [ ] Verify state_diff captures before/after
   - [ ] Verify user_id and timestamp recorded

---

## 🔑 Permission Mapping

### Requisition Workflow
| Action | Required Permission |
|--------|---------------------|
| Approve/Reject | `requisition.approve` |
| Mark Ready for Dispatch | `requisition.dispatch` |
| Cancel (creator) | `requisition.cancel` OR is creator |
| Assign to Batch | `scheduler.plan` |
| Mark In Transit | `batch.dispatch` |
| Mark Fulfilled/Failed | `batch.complete` |

### Invoice Workflow
| Action | Required Permission |
|--------|---------------------|
| Submit Draft | `invoice.create` |
| Start/Complete Packaging | `invoice.package` |
| Dispatch to FleetOps | `invoice.dispatch` |
| Mark Completed | `invoice.complete` |
| Cancel | `invoice.cancel` |

### Batch Workflow
| Action | Required Permission |
|--------|---------------------|
| Assign Driver | `batch.assign` |
| Start Delivery | `batch.dispatch` |
| Complete Delivery | `batch.complete` |
| Cancel Batch | `batch.cancel` |

### Scheduler Workflow
| Action | Required Permission |
|--------|---------------------|
| Create/Edit Draft | `scheduler.plan` |
| Run Optimization | `scheduler.optimize` |
| Publish to Drivers | `scheduler.publish` |
| Cancel Schedule | `scheduler.plan` |

---

## 📋 Testing Strategy

### 1. **Permission Enforcement Tests**
```bash
# Test user without permissions
- Login as viewer role
- Navigate to requisition detail
- Should see status badge (not dropdown)
- Should NOT see any action buttons

# Test user with partial permissions
- Login as warehouse officer (has requisition.approve)
- Navigate to pending requisition
- Should see dropdown with: approved, rejected, cancelled
- Should NOT see transitions requiring other permissions

# Test user with full permissions
- Login as system admin
- Navigate to any requisition
- Should see all valid next states
- Should be able to transition successfully
```

### 2. **Database-Level Enforcement Tests**
```sql
-- Attempt direct status update without permission
UPDATE requisitions
SET status = 'approved'
WHERE id = 'some-id';
-- Should fail with: "Permission denied: requisition.approve required"

-- Attempt invalid state transition
UPDATE requisitions
SET status = 'fulfilled'
WHERE id = 'some-pending-id';
-- Should fail with: "Invalid state transition: pending can only transition to..."
```

### 3. **Audit Trail Tests**
```sql
-- Check audit log after status change
SELECT * FROM audit_logs
WHERE resource_type = 'requisitions'
  AND resource_id = 'some-id'
  AND action = 'status_changed'
ORDER BY created_at DESC
LIMIT 1;

-- Should include state_diff showing before/after status
```

---

## 🚀 Rollout Plan

### Phase 1: Core Workflows ✅ COMPLETE
- ✅ Requisitions
- ✅ Invoices
- ✅ Batches
- ✅ Scheduler

### Phase 2: Secondary Pages ✅ EVALUATED
- ✅ Warehouse management - No workflow migration needed (CRUD only)
- ✅ Facility management - No workflow migration needed (CRUD only)
- ✅ Program management - No workflow migration needed (config state, not workflow)
- ✅ Zone/Route management - No workflow migration needed (CRUD only)
- 📝 Recommendation: Implement basic CRUD permissions via `useHasPermission` hooks

### Phase 3: Admin Pages
- ✅ Already complete (uses permission hooks throughout)

---

## 📚 Related Documentation
- [RBAC Architecture](./RBAC_ARCHITECTURE.md)
- [Workflow State Guards](./WORKFLOW_STATE_GUARDS.md)
- [Admin UI Implementation](./RBAC_ADMIN_UI_IMPLEMENTATION.md)
- [Permission Catalog](./RBAC_ARCHITECTURE.md#permission-catalog)

---

## ✅ Sign-off

**Phase 1 Migration Status: ✅ COMPLETE**
- [x] Requisitions workflow
- [x] Invoice workflow
- [x] Batch workflow
- [x] Scheduler workflow

**Components Created:**
1. ✅ `RequisitionStatusActions` - Handles requisition workflow transitions
2. ✅ `InvoiceStatusActions` - Handles invoice workflow transitions
3. ✅ `BatchStatusActions` - Handles batch workflow transitions
4. ✅ `SchedulerBatchStatusActions` - Handles scheduler workflow transitions

**Phase 2 Evaluation: ✅ COMPLETE**
- [x] Warehouse management - No migration needed
- [x] Facility management - No migration needed
- [x] Program management - No migration needed
- [x] Zone/Route management - No migration needed

**Key Finding:**
Secondary pages use **configuration state** (simple CRUD), not **workflow state** (sequential transitions).
No StatusActions components required.

**Next Steps (Optional Enhancements):**
1. ⏳ Implement basic CRUD permission checks using `useHasPermission` hooks
2. ⏳ Test permission enforcement across all Phase 1 workflows with different user roles
3. ⏳ Update user documentation with permission requirements
4. ⏳ Conduct end-to-end testing of complete permission-based workflows
