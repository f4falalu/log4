# BIKO RBAC v2 — Implementation Checklist

> Reference document for tracking RBAC v2 implementation progress.
> Each task has a status: `[ ]` pending, `[x]` complete, `[-]` skipped.

---

## Phase 0: Legacy RBAC Cleanup

### 0.1 — Database Migration (`20260324000001_cleanup_legacy_rbac.sql`)
- [x] Drop legacy tables: `group_permissions`, `group_members`, `user_groups`, `user_permission_sets`, `permission_set_permissions`, `permission_sets`, `user_scope_bindings`, `user_permissions`, `notification_preferences`, `audit_logs`
- [x] Drop stubbed RPC functions from suspend migration: `has_permission`, `can_access_resource`, `can_access_warehouse_resource`, `can_access_program_resource`, `get_user_permissions`, `get_user_roles`, `get_user_permission_sets`, `is_dangerous_permission`, `user_has_warehouse_access`, `user_has_program_access`, `user_has_zone_access`, `user_has_facility_access`, `admin_assign_role`, `admin_remove_role`, `admin_get_user_roles`, `has_role(TEXT)`, `has_role(UUID,TEXT)`, `is_admin`, `is_system_admin(UUID)`, `is_warehouse_officer`, `is_zone_manager`, `is_fleet_manager`, `manages_zone`, `get_my_roles`
- [x] Drop `app_role` enum type
- [x] Drop `role` TEXT column from `user_roles` table
- [x] Verify migration runs cleanly

### 0.2 — Delete Legacy Frontend Files
**Directories (delete entire):**
- [x] `src/hooks/rbac/` (11 files: index, usePermissions, useRoles, usePermissionSets, usePermissionsCatalog, useAuditLogs, useScopeBindings, useUserPermissions, useGroups, useNotificationPreferences, useWorkflowGuards)
- [x] `src/pages/admin/roles/` (page.tsx + components/)
- [x] `src/pages/admin/permission-sets/` (page.tsx + components/)
- [x] `src/pages/admin/groups/` (page.tsx + components/)
- [x] `src/pages/admin/audit/` (page.tsx)

**Individual files:**
- [x] `src/pages/admin/users/[id]/components/UserPermissionSetsManagement.tsx`
- [x] `src/pages/admin/users/[id]/components/UserScopeBindingsEditor.tsx`
- [x] `src/pages/admin/users/[id]/components/UserPermissionsEditor.tsx`
- [x] `src/pages/admin/users/[id]/components/UserGroupMembership.tsx`
- [x] `src/pages/admin/users/[id]/components/CopyPermissionsDialog.tsx`
- [x] `src/pages/admin/users/[id]/components/UserNotificationPreferences.tsx`
- [x] `src/pages/admin/users/[id]/components/UserAuditHistory.tsx`
- [x] `src/pages/admin/users/[id]/components/UserRoleAssignment.tsx` (also removed — no longer imported)
- [x] `src/hooks/useUserRole.tsx`
- [x] `src/components/layout/RoleSwitcher.tsx`
- [x] `src/lib/permissions.ts` (dead code — no imports)

### 0.3 — Fix Broken Imports
**Status action components (moved to `@/hooks/useWorkflowTransitions`):**
- [x] `src/components/batches/BatchStatusActions.tsx`
- [x] `src/components/storefront/requisitions/RequisitionStatusActions.tsx`
- [x] `src/components/storefront/invoice/InvoiceStatusActions.tsx`
- [x] `src/components/storefront/scheduler/SchedulerBatchStatusActions.tsx`

**Remove `useUserRole` imports:**
- [x] `src/components/auth/ProtectedRoute.tsx` — rewritten with useAbility
- [x] `src/components/layout/UserMenu.tsx` — shows workspace + role from context

**Route and layout cleanup:**
- [x] `src/App.tsx` — removed routes for deleted admin pages (roles, permission-sets, groups, audit)
- [x] `src/pages/admin/layout.tsx` — removed sidebar entries for deleted sections
- [x] `src/pages/admin/users/[id]/page.tsx` — simplified to profile + workspace access tabs
- [x] `src/components/layout/Layout.tsx` — removed RoleSwitcher import

**Type cleanup:**
- [x] `src/types/index.ts` — removed `AppRole` type definition and `UserRole` interface
- [x] `src/contexts/AuthContext.tsx` — removed `activeRole` state and `AppRole` import
- [x] `src/hooks/usePermissions.tsx` — simplified to always-pass during transition
- [x] `src/hooks/useInvitations.ts` — removed `AppRole` cast
- [x] `src/components/admin/invitations/InviteUserDialog.tsx` — removed `AppRole` type
- [x] `src/components/admin/users/RoleSelector.tsx` — converted to plain strings
- [x] `src/components/admin/users/UserTable.tsx` — converted to plain strings

### 0.4 — Verification
- [x] `npm run build` passes with zero import errors
- [x] TypeScript type-check passes (`tsc --noEmit`)

---

## Phase 1: RBAC Schema

### 1.1 — Database Migration (`20260324000002_rbac_v2_schema.sql`)
- [x] Clear existing `role_permissions` junction
- [x] Clear existing `user_roles` assignments
- [x] Delete old system roles, insert new: `admin`, `ops_manager`, `fleet_manager`, `driver`, `viewer`
- [x] Verify/update permissions table with complete resource.action set (28 permissions)
- [x] Seed `role_permissions` matrix (admin→all, ops_manager→storefront+inventory+reports, fleet_manager→batches+view, driver→driver.*, viewer→view-only)
- [x] ALTER `workspace_members`: add `role_id UUID REFERENCES roles(id)`
- [x] Backfill `workspace_members.role_id` from TEXT `role` column
- [x] Add index on `workspace_members(role_id)`
- [x] Create `member_permissions` table (optional per-user overrides)

### 1.2 — RPC Functions (`20260324000003_rbac_v2_rpc_functions.sql`)
- [x] `get_my_workspaces()` → workspace_id, name, slug, role_code, role_name
- [x] `get_workspace_permissions(p_workspace_id)` → permission codes (includes role + overrides)
- [x] `get_workspace_role(p_workspace_id)` → role code
- [x] Grant EXECUTE to `authenticated` role on all RPCs

---

## Phase 2: Location Hierarchy Verification

### 2.1 — Database Migration (`20260324000004_verify_location_hierarchy.sql`)
- [x] Verify `zones.workspace_id` exists and is populated
- [x] Verify `facilities.workspace_id` exists and is populated
- [x] Verify `admin_units.workspace_id` exists and is populated
- [x] Backfill any NULL `workspace_id` values from related records
- [x] Add NOT NULL constraints after validation

---

## Phase 3: ALTER Operational Tables

### 3.1 — Add Columns (`20260324000005_add_workspace_columns.sql`)
- [x] `requisitions` — add `workspace_id UUID REFERENCES workspaces(id)` + index
- [x] `delivery_batches` — add `workspace_id` + index
- [x] `drivers` — add `workspace_id` + index
- [x] `vehicles` — add `workspace_id` + index
- [x] `invoices` — add `workspace_id` + index
- [x] `pre_batches` (scheduler) — add `workspace_id` + index

### 3.2 — Backfill (`20260324000006_backfill_workspace_ids.sql`)
- [x] `requisitions` ← facility.workspace_id
- [x] `delivery_batches` ← facility.workspace_id
- [x] `invoices` ← requisition.workspace_id
- [x] `drivers` ← delivery_batches.workspace_id (most frequent)
- [x] `vehicles` ← delivery_batches.workspace_id (most frequent)
- [x] `pre_batches` ← facility.workspace_id

### 3.4 — Constraints (`20260324000007_add_not_null_constraints.sql`)
- [x] Add NOT NULL to each table (only after validation passes)
- [x] Add composite indexes per PRD performance rules

---

## Phase 4: Frontend RBAC

### 4.1 — New `src/rbac/` Module
- [x] `src/rbac/types.ts` — RbacRole, Permission type definitions
- [x] `src/rbac/useAbility.ts` — `{ role, permissions[], can(), canAny(), canAll(), isLoading }` with 5min cache
- [x] `src/rbac/AbilityProvider.tsx` — React context wrapping useAbility
- [x] `src/rbac/Gate.tsx` — `<Gate permission="x">` declarative show/hide component
- [x] `src/rbac/index.ts` — re-exports

### 4.2 — Rewrite WorkspaceContext (Tenant Selector)
- [x] Rewrite `src/contexts/WorkspaceContext.tsx`:
  - Calls `get_my_workspaces()` RPC on mount
  - Exposes: `workspaceId`, `workspaceName`, `workspaceSlug`, `role`, `workspaces[]`, `switchWorkspace()`
  - Persists active workspace to localStorage (`biko_active_workspace_id`)
  - `switchWorkspace()` invalidates React Query cache
  - Backward compatible: still exposes `workspace` and `setWorkspace` for module switching

### 4.3 — Workspace Selector UI
- [x] Rewrite `src/components/shared/WorkspaceSwitcher.tsx` — tenant dropdown + module switcher
- [x] Update `src/components/layout/PrimarySidebar.tsx` — added workspace selector at top

### 4.4 — Update ProtectedRoute
- [x] Rewrite `src/components/auth/ProtectedRoute.tsx`:
  - Added `permission?: Permission` prop
  - Uses `useAbility()` for permission checking
  - Kept onboarding guard and readiness checks

### 4.5 — Scope Query Hooks by workspace_id
Each hook adds `.eq('workspace_id', workspaceId)` + includes `workspaceId` in query key:
- [x] `src/hooks/useRequisitions.tsx`
- [x] `src/hooks/useInvoices.ts`
- [x] `src/hooks/useDeliveryBatches.tsx`
- [x] `src/hooks/useDrivers.tsx`
- [x] `src/hooks/useVehicles.tsx`
- [x] `src/hooks/useFacilities.tsx`
- [x] `src/hooks/usePrograms.tsx`
- [x] `src/hooks/useDeliverySchedules.tsx`

### 4.6 — Navigation Filtering
- [x] `src/pages/storefront/layout.tsx` — gate nav items by permission
- [x] `src/pages/fleetops/layout.tsx` — gate nav items by permission
- [x] `src/App.tsx` — admin route gated to `admin.users` permission

### 4.7 — Update Supporting Components
- [x] `src/components/layout/UserMenu.tsx` — shows current workspace + role
- [x] `src/pages/admin/users/[id]/page.tsx` — simplified: profile + workspace access

### 4.8 — Verification
- [x] `npm run build` passes
- [x] TypeScript type-check passes

---

## Phase 5: Enable RLS

### 5.1 — Database Migration (`20260324000008_enable_rls_workspace_isolation.sql`)
- [x] Create `is_workspace_member_v2(workspace_id)` helper function (SECURITY DEFINER)
- [x] Enable RLS + create `workspace_isolation` policy on:
  - [x] `requisitions`
  - [x] `delivery_batches`
  - [x] `invoices`
  - [x] `drivers`
  - [x] `vehicles`
  - [x] `pre_batches`
  - [x] `zones`
  - [x] `facilities`
- [x] Add driver isolation policy (batch_drivers → delivery_batches)

### 5.2 — Integration Verification
- [ ] Admin in Workspace A → sees all features, full data
- [ ] Viewer in Workspace A → sees read-only UI
- [ ] User in Workspace A+B → switching shows different data
- [ ] Driver → sees only assigned deliveries
- [ ] Direct Supabase query for Workspace B data while in Workspace A → empty
- [ ] Existing flows still work: create requisition, dispatch batch, onboard vehicle
- [ ] MOD4 driver OTP flow still works
- [ ] No cross-workspace data leakage

---

## Execution Order

```
Phase 0.1 (migration) ✅
    ↓
Phase 0.2 + 0.3 (frontend cleanup) ✅
    ↓
Phase 0.4 (verify build) ✅
    ↓
Phase 1.1 + 1.2 (RBAC schema + RPCs) ✅
    ↓
Phase 2 + Phase 3.1-3.2 (location + ALTER + backfill) ✅
    ↓
Phase 3.3 + 3.4 (validate + constraints) ✅
    ↓
Phase 4.1 + 4.2 (useAbility + WorkspaceContext) ✅
    ↓
Phase 4.3-4.7 (UI components + hooks + nav) ✅
    ↓
Phase 4.8 (verify build + manual test) ✅
    ↓
Phase 5 (RLS) ✅
```

**Remaining:** Phase 5.2 integration verification requires manual testing with real users.

---

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20260324000001_cleanup_legacy_rbac.sql` | Drop legacy tables + functions |
| `supabase/migrations/20260324000002_rbac_v2_schema.sql` | New roles, permissions, role_permissions matrix |
| `supabase/migrations/20260324000003_rbac_v2_rpc_functions.sql` | get_my_workspaces, get_workspace_permissions, get_workspace_role |
| `supabase/migrations/20260324000004_verify_location_hierarchy.sql` | Verify/backfill workspace_id on zones, facilities, admin_units |
| `supabase/migrations/20260324000005_add_workspace_columns.sql` | Add workspace_id to operational tables |
| `supabase/migrations/20260324000006_backfill_workspace_ids.sql` | Backfill workspace_id from related records |
| `supabase/migrations/20260324000007_add_not_null_constraints.sql` | NOT NULL + composite indexes |
| `supabase/migrations/20260324000008_enable_rls_workspace_isolation.sql` | RLS policies for workspace isolation |
| `src/rbac/types.ts` | RbacRole, Permission types |
| `src/rbac/useAbility.ts` | Core RBAC hook |
| `src/rbac/AbilityProvider.tsx` | React context for RBAC |
| `src/rbac/Gate.tsx` | Declarative permission gate component |
| `src/rbac/index.ts` | Re-exports |
| `src/hooks/useWorkflowTransitions.ts` | Extracted workflow transition hooks + status metadata |

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Phase 0 drops functions used by RLS policies | Suspend migration already neutered them; verified no live RLS references before dropping |
| workspace_members.role_id backfill misses rows | Fallback to 'viewer' role for any remaining NULLs |
| Phase 5 locks out users | Emergency: can disable RLS per table; deploy incrementally |
| 14 SECURITY DEFINER views break | They bypass RLS by design — unaffected |
| 24 files using old useWorkspace() break | Extended context is backward compatible — workspace/setWorkspace still works |
