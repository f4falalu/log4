# Phase 2 Evaluation: Secondary Pages

**Date:** February 22, 2026
**Status:** ✅ Complete

## Overview

This document summarizes the evaluation of secondary pages (warehouses, facilities, programs, zones/routes) to determine if they require permission-based workflow controls similar to Phase 1 core workflows.

---

## Evaluation Results

### 1. **Programs Page** (`src/pages/storefront/programs/`)

**Current Implementation:**
- **Has status field:** `status: 'active' | 'paused' | 'closed'`
- **Update mechanism:** Form-based editing via `ProgramFormDialog`
- **Status transitions:** Manual selection in edit form, not workflow-driven
- **Permission checks:** None currently implemented

**Analysis:**
- Programs have a status field, but it represents **configuration state** rather than **workflow state**
- Status changes are administrative decisions (e.g., "pause this program for funding reasons")
- No sequential workflow or approval process
- No audit trail requirements for status changes

**Recommendation:** ❌ **No workflow migration needed**
- Status is a simple configuration field, not a workflow state
- **Consider adding:** Basic permission check for editing programs (e.g., `program.edit` permission)
- Status selection can remain in the edit form

---

### 2. **Facilities Page** (`src/pages/storefront/facilities/`)

**Current Implementation:**
- **No status field:** Facilities are either active (exists) or deleted
- **CRUD operations:** Create, Read, Update, Delete via hooks
- **Permission checks:** None currently implemented

**Analysis:**
- Facilities don't have workflow states
- Operations are standard CRUD without approval flows
- Deletion uses soft-delete pattern

**Recommendation:** ❌ **No workflow migration needed**
- **Consider adding:** Basic CRUD permission checks:
  - `facility.create` - Create new facilities
  - `facility.update` - Edit facility details
  - `facility.delete` - Delete facilities
  - `facility.import` - Import from CSV
- No StatusActions component needed

---

### 3. **Warehouse Page** (`src/pages/storefront/warehouse/`)

**Current Implementation:**
- **No explicit status field** in the UI components reviewed
- **CRUD operations:** Create, Read, Update, Delete
- **Permission checks:** None currently implemented

**Analysis:**
- Warehouses don't have workflow states
- Operations are standard CRUD
- Capacity tracking is informational, not workflow-driven

**Recommendation:** ❌ **No workflow migration needed**
- **Consider adding:** Basic CRUD permission checks:
  - `warehouse.create` - Create new warehouses
  - `warehouse.update` - Edit warehouse details
  - `warehouse.delete` - Delete warehouses
- No StatusActions component needed

---

### 4. **Zones & Routes Pages** (`src/pages/storefront/zones/`)

**Current Implementation:**
- **Multiple entities:** Zones, Service Areas, Routes
- **No status fields** in the reviewed components
- **CRUD operations:** Create, Read, Update, Delete
- **Permission checks:** None currently implemented

**Analysis:**
- These entities don't have workflow states
- Operations are standard CRUD and geographic configuration
- Route optimization is a computational task, not a workflow state

**Recommendation:** ❌ **No workflow migration needed**
- **Consider adding:** Basic CRUD permission checks:
  - `zone.create`, `zone.update`, `zone.delete`
  - `route.create`, `route.update`, `route.delete`
  - `service_area.create`, `service_area.update`, `service_area.delete`
- No StatusActions components needed

---

## Summary: No Workflow Migrations Required

### Key Findings

**None of the Phase 2 pages require workflow migration** because:

1. **No workflow states** - These entities don't go through sequential approval/processing workflows
2. **Configuration vs Workflow** - Status fields (where they exist) represent configuration state, not workflow progression
3. **CRUD operations** - All operations are standard Create/Read/Update/Delete without state transitions

### Recommended Actions Instead

While these pages don't need StatusActions components, they **do need basic permission controls**:

#### Option 1: Basic CRUD Permissions (Recommended)

Implement simple permission checks using existing RBAC hooks:

```tsx
// Example for Programs page
import { useHasPermission } from '@/hooks/rbac';

const canEdit = useHasPermission('program.edit');
const canDelete = useHasPermission('program.delete');

// Conditionally render action buttons
{canEdit && <Button onClick={handleEdit}>Edit</Button>}
{canDelete && <Button onClick={handleDelete}>Delete</Button>}
```

#### Option 2: Row-Level Security (RLS) Only

For simpler access control, rely solely on database-level RLS:
- Users can only see/edit entities in their workspace
- Role-based RLS policies control CRUD access
- No UI-level permission checks needed

---

## Comparison: Workflow vs Configuration State

### Workflow State (Phase 1 - Requires StatusActions)
- **Requisitions:** `pending → approved → ready → in_transit → fulfilled`
- **Invoices:** `draft → ready → packaged → dispatched → completed`
- **Batches:** `planned → assigned → in-progress → completed`
- **Scheduler:** `draft → ready → scheduled → published`

**Characteristics:**
- ✅ Sequential progression
- ✅ Permission-gated transitions
- ✅ Audit trail required
- ✅ Terminal states
- ✅ Rollback scenarios

### Configuration State (Phase 2 - Simple CRUD)
- **Programs:** `active | paused | closed` - Administrative toggle
- **Facilities:** No status - Just exists or deleted
- **Warehouses:** No status - Just capacity metrics
- **Zones/Routes:** No status - Geographic configuration

**Characteristics:**
- ❌ No sequential workflow
- ❌ Direct edit via form
- ❌ Simple administrative decision
- ❌ No approval process
- ❌ No state dependencies

---

## Implementation Recommendations

### For Secondary Pages (This Phase)

**Priority: Low-Medium**

1. **Add basic permission checks** for sensitive operations:
   ```tsx
   // Programs
   const canEditPrograms = useHasPermission('program.edit');
   const canDeletePrograms = useHasPermission('program.delete');

   // Facilities
   const canImportFacilities = useHasPermission('facility.import');
   const canDeleteFacilities = useHasPermission('facility.delete');

   // Warehouses
   const canManageWarehouses = useHasPermission('warehouse.manage');

   // Zones/Routes
   const canManageZones = useHasPermission('zone.manage');
   const canManageRoutes = useHasPermission('route.manage');
   ```

2. **Update permission catalog** in RBAC system:
   - Define permissions for each entity type
   - Assign to appropriate roles
   - Document in [RBAC_ARCHITECTURE.md](./RBAC_ARCHITECTURE.md)

3. **Database RLS policies** (if not already implemented):
   - Ensure all secondary tables have RLS enabled
   - Verify workspace scoping
   - Test with different user roles

### Not Recommended

- ❌ Creating StatusActions components for these entities
- ❌ Adding workflow state machines
- ❌ Database triggers for state validation
- ❌ Complex audit trails (standard audit logs sufficient)

---

## Conclusion

**Phase 2 Complete:** ✅

- **0 pages** require workflow migration (StatusActions components)
- **4 page groups** could benefit from basic permission checks
- **No breaking changes** required
- **Recommended:** Implement basic CRUD permissions as needed

The Phase 1 workflow migrations successfully covered all entities with sequential state transitions. The remaining pages are configuration-focused and work well with simple permission-based access control.

---

## Related Documentation
- [Phase 1 Migration Status](./PERMISSION_CONTROLS_MIGRATION.md)
- [RBAC Architecture](./RBAC_ARCHITECTURE.md)
- [Permission Catalog](./RBAC_ARCHITECTURE.md#permission-catalog)
