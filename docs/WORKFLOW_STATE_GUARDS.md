# Workflow State Guards - RBAC Implementation

**Date:** February 22, 2026
**Status:** ✅ Complete

## Overview

Permission-based workflow state guards for requisitions, invoices, batches, and scheduler batches. These guards enforce state machine transitions with RBAC validation, ensuring users can only perform actions they have permission for.

## 🎯 What Was Built

### 1. **Database Migrations**

**File:** `supabase/migrations/20260222000001_add_permission_based_workflow_guards.sql`

**Components:**
1. Enhanced requisition state machine with permission checks
2. Invoice state machine with permission guards
3. Delivery batch state guards
4. Scheduler batch state guards
5. Helper functions for client-side validation

---

## 📊 State Machines

### **Requisition Workflow**

```
pending
  → approved (requires: requisition.approve)
  → rejected (requires: requisition.approve)
  → cancelled (requires: requisition.cancel OR is creator)

approved
  → packaged (system-only, requires: system.admin)
  → rejected (requires: requisition.approve)
  → cancelled (requires: requisition.cancel)

packaged
  → ready_for_dispatch (requires: requisition.dispatch)
  → cancelled (requires: requisition.cancel)

ready_for_dispatch
  → assigned_to_batch (requires: scheduler.plan)
  → cancelled (requires: requisition.cancel)

assigned_to_batch
  → in_transit (requires: batch.dispatch)
  → ready_for_dispatch [rollback] (requires: scheduler.plan)
  → cancelled (requires: requisition.cancel)

in_transit
  → fulfilled (requires: batch.complete)
  → partially_delivered (requires: batch.complete)
  → failed (requires: batch.complete)

Terminal States (require system.admin to modify):
  - fulfilled
  - partially_delivered
  - failed
  - rejected
  - cancelled
```

### **Invoice Workflow**

```
draft
  → submitted (requires: invoice.create)
  → cancelled (requires: invoice.approve OR is creator)

submitted
  → approved (requires: invoice.approve)
  → rejected (requires: invoice.approve)
  → cancelled (requires: invoice.approve)

approved
  → paid (requires: invoice.approve)
  → cancelled (requires: invoice.approve)

Terminal States (require system.admin to modify):
  - paid
  - rejected
  - cancelled
```

### **Delivery Batch Workflow**

```
planned
  → assigned (requires: batch.assign)
  → cancelled (requires: batch.cancel)

assigned
  → in-progress (requires: batch.dispatch)
  → planned [rollback] (requires: batch.assign)
  → cancelled (requires: batch.cancel)

in-progress
  → completed (requires: batch.complete)
  → cancelled (requires: batch.cancel)

Terminal States (require system.admin to modify):
  - completed
  - cancelled
```

### **Scheduler Batch Workflow**

```
draft
  → ready (requires: scheduler.plan)
  → cancelled (requires: scheduler.plan)

ready
  → scheduled (requires: scheduler.optimize)
  → draft [rollback] (requires: scheduler.plan)
  → cancelled (requires: scheduler.plan)

scheduled
  → published (requires: scheduler.publish)
  → ready [rollback] (requires: scheduler.optimize)
  → cancelled (requires: scheduler.plan)

Terminal States (require system.admin to modify):
  - published
  - cancelled
```

---

## 🔑 Permission Requirements

| Action | Required Permission | Notes |
|--------|---------------------|-------|
| Approve requisition | `requisition.approve` | Also used for rejection |
| Dispatch requisition | `requisition.dispatch` | Mark as ready for FleetOps |
| Cancel requisition | `requisition.cancel` | OR be the creator |
| Plan batch | `scheduler.plan` | Assign requisitions to batches |
| Optimize schedule | `scheduler.optimize` | Run optimization algorithms |
| Publish schedule | `scheduler.publish` | Publish to drivers |
| Assign driver | `batch.assign` | Assign driver to batch |
| Dispatch batch | `batch.dispatch` | Start delivery |
| Complete batch | `batch.complete` | Mark as fulfilled/failed |
| Cancel batch | `batch.cancel` | Emergency cancellation |
| Create invoice | `invoice.create` | Submit for approval |
| Approve invoice | `invoice.approve` | Approve/reject/pay invoices |
| Admin override | `system.admin` | Modify terminal states |

---

## 🪝 React Hooks

**File:** `src/hooks/rbac/useWorkflowGuards.tsx`

### Requisition Hooks

```tsx
// Check if a transition is valid
const { data: canTransition } = useCanTransitionRequisition(
  requisitionId,
  'approved'
);

// Get all available next states for current user
const { data: availableStates } = useAvailableRequisitionStates(requisitionId);
// Returns: ['approved', 'rejected', 'cancelled']

// Transition requisition status
const transitionStatus = useTransitionRequisitionStatus();
await transitionStatus.mutateAsync({
  requisitionId,
  newStatus: 'approved',
  notes: 'Approved by warehouse manager'
});
```

### Invoice Hooks

```tsx
const transitionInvoice = useTransitionInvoiceStatus();
await transitionInvoice.mutateAsync({
  invoiceId,
  newStatus: 'approved',
  notes: 'Approved for payment'
});
```

### Batch Hooks

```tsx
const transitionBatch = useTransitionBatchStatus();
await transitionBatch.mutateAsync({
  batchId,
  newStatus: 'in-progress'
});
```

### Scheduler Batch Hooks

```tsx
const transitionScheduler = useTransitionSchedulerBatchStatus();
await transitionScheduler.mutateAsync({
  schedulerId,
  newStatus: 'published'
});
```

---

## 🎨 UI Component Example

**File:** `src/components/storefront/requisitions/RequisitionStatusActions.tsx`

### Features
- **Dynamic Status Dropdown** - Shows only permitted next states
- **Confirmation Dialog** - Requires user confirmation before transition
- **Notes Field** - Optional notes for audit trail
- **Terminal State Warning** - Visual warning for irreversible actions
- **Real-time Validation** - Uses `useAvailableRequisitionStates()` hook
- **Error Handling** - Displays permission denied errors from database

### Usage

```tsx
import { RequisitionStatusActions } from '@/components/storefront/requisitions/RequisitionStatusActions';

<RequisitionStatusActions
  requisitionId={requisition.id}
  currentStatus={requisition.status}
  requisitionNumber={requisition.requisition_number}
/>
```

### Visual Flow

1. User clicks status button → Dropdown appears
2. Dropdown shows only permitted next states (filtered by permissions)
3. User selects new status → Confirmation dialog opens
4. Dialog shows: Current Status → New Status transition
5. User can add optional notes
6. Warning appears for terminal states (cancelled, rejected, failed)
7. User confirms → Database trigger validates permission + transition
8. Success → Status updated + Audit log created
9. Error → User sees permission/validation error message

---

## 🛡️ Security Features

### 1. **Database-Level Enforcement**
- All state transitions validated by PostgreSQL triggers
- Cannot be bypassed by direct SQL updates
- Runs with SECURITY DEFINER to ensure has_permission() check works

### 2. **Permission Checks**
- Every transition requires specific permission
- Calls `has_permission(_user_id, 'permission.code')`
- Permission checks happen at row level (not table level)

### 3. **Audit Trail Integration**
- All status changes automatically logged via existing audit triggers
- Includes state_diff (before/after status)
- Records user_id, timestamp, action

### 4. **Terminal State Protection**
- Terminal states (fulfilled, cancelled, paid, etc.) cannot be changed
- Only system.admin permission can modify (for corrections)
- Prevents accidental status rollbacks

### 5. **Rollback Support**
- Some states allow rollback to previous state
- Example: assigned_to_batch → ready_for_dispatch (un-assign from batch)
- Requires appropriate permission for rollback

---

## 📋 Error Messages

The system provides clear, actionable error messages:

```
Permission Errors:
- "Permission denied: requisition.approve required to approve requisitions"
- "Permission denied: batch.dispatch required to mark as in transit"
- "Permission denied: invoice.approve required to approve/reject invoices"

State Transition Errors:
- "Invalid state transition: pending can only transition to approved, rejected, or cancelled"
- "Invalid state transition: terminal states cannot be changed"
- "Invalid transition: packaged state is system-managed"

Creator Privileges:
- "Permission denied: requisition.cancel required or must be the creator"
- "Permission denied: invoice.approve required or must be the creator"
```

---

## 🧪 Testing Checklist

### Requisition Workflow
- [ ] Warehouse officer can approve pending requisition
- [ ] Non-approved user cannot approve requisition
- [ ] Creator can cancel their own requisition
- [ ] Non-creator without permission cannot cancel
- [ ] System auto-packages after approval
- [ ] FleetOps user can assign to batch
- [ ] Driver cannot modify requisition status
- [ ] Terminal states cannot be changed (except by admin)

### Invoice Workflow
- [ ] User with invoice.create can submit draft
- [ ] User with invoice.approve can approve/reject
- [ ] Non-approver cannot approve invoice
- [ ] Terminal states (paid, rejected) cannot be changed

### Batch Workflow
- [ ] User with batch.assign can assign driver
- [ ] User with batch.dispatch can start delivery
- [ ] User with batch.complete can mark as completed
- [ ] Completed batches cannot be reopened

### Scheduler Workflow
- [ ] Planner can draft and make ready
- [ ] Optimizer can schedule
- [ ] Publisher can publish
- [ ] Published schedules cannot be modified

---

## 🔄 Migration Deployment

```bash
# Test migration locally
supabase db reset

# Push to production
supabase db push

# Regenerate TypeScript types
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

---

## 📚 Status Metadata Constants

Use these for consistent UI rendering:

```tsx
import {
  REQUISITION_STATUS_META,
  INVOICE_STATUS_META,
  BATCH_STATUS_META,
  SCHEDULER_STATUS_META
} from '@/hooks/rbac';

// Example: Get color for status badge
const meta = REQUISITION_STATUS_META['in_transit'];
// { label: 'In Transit', color: 'indigo', description: 'Delivery in progress' }
```

---

## 🚀 Usage Patterns

### Pattern 1: Status Badge Component

```tsx
function RequisitionStatusBadge({ status }: { status: string }) {
  const meta = REQUISITION_STATUS_META[status];
  return (
    <Badge variant={meta?.color === 'green' ? 'default' : 'secondary'}>
      {meta?.label || status}
    </Badge>
  );
}
```

### Pattern 2: Protected Status Button

```tsx
function ApproveRequisitionButton({ requisitionId }: Props) {
  const canApprove = useHasPermission('requisition.approve');
  const transition = useTransitionRequisitionStatus();

  if (!canApprove) return null;

  return (
    <Button onClick={() => transition.mutateAsync({
      requisitionId,
      newStatus: 'approved'
    })}>
      Approve
    </Button>
  );
}
```

### Pattern 3: Status History Timeline

```tsx
function RequisitionTimeline({ requisitionId }: Props) {
  const { data: auditLogs } = useResourceAuditLogs('requisitions', requisitionId);

  return (
    <div className="space-y-2">
      {auditLogs?.map(log => (
        <div key={log.id}>
          <Badge>{log.new_state.status}</Badge>
          <span className="text-muted-foreground">{log.user_email}</span>
          <span className="text-xs">{formatDate(log.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## ⚠️ Known Limitations

1. **No Bulk Transitions** - Currently only supports single-record status changes. For bulk operations, consider creating a dedicated RPC function.

2. **No Conditional Transitions** - Transitions are permission-only. For business logic conditions (e.g., "can only approve if all items are in stock"), add additional checks in application layer.

3. **No Scheduled Transitions** - No support for time-based auto-transitions (e.g., auto-cancel after 24 hours). Implement via cron job if needed.

4. **Creator Check Uses String Comparison** - `requested_by = _user_id::text` assumes requested_by stores UUID as text. Ensure consistency.

---

## 🔮 Future Enhancements

1. **Workflow Notifications**
   - Send notifications when status changes
   - Alert next actor in workflow
   - Example: Notify warehouse when requisition submitted

2. **SLA Tracking**
   - Track time in each status
   - Alert if status not transitioned within SLA
   - Example: "Requisition pending approval for >24 hours"

3. **Batch Status Operations**
   - Approve multiple requisitions at once
   - RPC function with permission check
   - Transactional consistency

4. **Visual Workflow Builder**
   - Admin UI to configure state machines
   - Define custom workflows per program
   - No-code state machine editor

5. **Conditional Transitions**
   - Business logic conditions
   - Example: "Can only approve if total_value < $10,000"
   - Configurable per organization

---

## ✅ Implementation Complete

All workflow state guards are fully implemented and ready to use. Next step: Update existing pages to use these permission-based controls instead of hardcoded role checks.

**Related Documentation:**
- [RBAC Architecture](./RBAC_ARCHITECTURE.md)
- [Admin UI Implementation](./RBAC_ADMIN_UI_IMPLEMENTATION.md)
- [Permission Catalog](./RBAC_ARCHITECTURE.md#permission-catalog)
