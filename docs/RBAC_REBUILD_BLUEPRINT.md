# BIKO RBAC Rebuild Blueprint

> **Date**: 2026-03-10
> **Status**: Planning
> **Scope**: BIKO Platform + MOD4 Driver PWA (shared Supabase backend)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Post-Mortem: What Went Wrong](#2-post-mortem-what-went-wrong)
3. [Code Cleanup Plan](#3-code-cleanup-plan)
4. [Target Architecture](#4-target-architecture)
5. [Database Schema](#5-database-schema)
6. [Backend Implementation](#6-backend-implementation)
7. [Frontend Implementation](#7-frontend-implementation)
8. [Phased Rollout Plan](#8-phased-rollout-plan)
9. [Testing Strategy](#9-testing-strategy)
10. [File Inventory & Action Items](#10-file-inventory--action-items)

---

## 1. Executive Summary

BIKO's first RBAC attempt built a 6-layer enterprise permission system (32 permissions, 5 roles, permission sets, scope bindings, user groups, audit logs, workflow guard triggers) in a single deployment. The system caused platform instability because:

- RLS policies on role tables created infinite recursion (500 errors)
- Frontend denied access to admins while permission data was loading
- Database triggers blocked all status updates during load
- Two parallel role systems (old enum vs new table) conflicted

The system was suspended on 2026-03-02 via a migration that makes every authenticated user a `system_admin`.

**This blueprint replaces the suspended system with a proven Stripe/Shopify/Supabase-style architecture, deployed in 4 incremental phases.**

---

## 2. Post-Mortem: What Went Wrong

### Root Cause 1: RLS Infinite Recursion
```
RLS policy on `roles` table → calls is_system_admin()
  → is_system_admin() queries `user_roles` table
    → `user_roles` has RLS → checks is_system_admin()
      → infinite loop → PostgreSQL ERROR 500
```
**Fix in new design**: Use `SECURITY DEFINER` functions for ALL role lookups. RBAC tables use permissive RLS that delegates to a single `authorize()` function.

### Root Cause 2: Deny-by-Default During Loading
```typescript
// OLD: usePermissions.tsx line 59
if (rbacPermissions.length > 0) {
  return rbacCodesToCheck.some(code => rbacCodes.has(code));
}
return false; // ← BLOCKS ADMIN DURING LOAD
```
**Fix in new design**: Permissions are loaded BEFORE the app renders (gate at `ProtectedRoute`). No conditional denial during loading.

### Root Cause 3: Two Parallel Role Systems
| System | Roles | Source |
|--------|-------|--------|
| Old enum | `system_admin`, `warehouse_officer`, `zonal_manager`, `driver`, `viewer` | `AppRole` type, `user_roles.role` column |
| New table | `system_admin`, `operations_user`, `fleetops_user`, `driver`, `viewer` | `roles` table, `user_roles.role_id` FK |

Frontend hooks (`useUserRole.tsx`) reference old names. Database functions reference new names. Neither system works completely.

**Fix in new design**: Single source of truth — `workspace_members.role` enum column. No join tables for role resolution.

### Root Cause 4: Workflow Guard Triggers Too Aggressive
Database triggers (`enforce_requisition_state_transitions`, etc.) called `has_permission()` which hit RLS-protected tables, causing cascading failures. Any status update was blocked.

**Fix in new design**: Workflow guards are application-level (in hooks), NOT database triggers. The DB enforces data integrity (valid state transitions via CHECK constraints), the app enforces authorization.

### Root Cause 5: Big-Bang Deployment
16 migrations + 11 hooks + 26 components deployed simultaneously with no feature flags or gradual rollout.

**Fix in new design**: 4-phase rollout with each phase independently testable and reversible.

---

## 3. Code Cleanup Plan

### Phase 0: Remove Dead RBAC Code (Do First)

#### Files to DELETE (dead/suspended)

| File | Lines | Reason |
|------|-------|--------|
| `src/lib/permissions.ts` | 59 | Legacy static mapping, not imported anywhere |
| `src/hooks/rbac/usePermissionSets.tsx` | 283 | Phase 2 feature, tables are empty, never enforced |
| `src/hooks/rbac/useGroups.tsx` | 326 | Phase 2 feature, tables are empty, never enforced |
| `src/hooks/rbac/useUserPermissions.tsx` | 177 | Direct user permissions, never used in production |
| `src/hooks/rbac/useScopeBindings.tsx` | 168 | Scope bindings, never enforced |
| `src/hooks/rbac/useAuditLogs.tsx` | 279 | Audit UI works but logs are empty (triggers dropped) |
| `src/hooks/rbac/useNotificationPreferences.tsx` | 83 | Notification prefs, unrelated to RBAC |
| `src/hooks/rbac/usePermissionsCatalog.tsx` | 153 | Permissions catalog browser, only used in admin UI |

#### Files to SIMPLIFY (keep but strip RBAC complexity)

| File | Action |
|------|--------|
| `src/hooks/rbac/usePermissions.tsx` | Replace with new `useAbility()` hook (see §7) |
| `src/hooks/rbac/useRoles.tsx` | Replace with new `useWorkspaceRole()` hook (see §7) |
| `src/hooks/rbac/useWorkflowGuards.tsx` | Keep status metadata. Remove RPC calls to dropped functions. Simplify mutation hooks. |
| `src/hooks/rbac/index.ts` | Rewrite to export only the new hooks |
| `src/hooks/usePermissions.tsx` | Delete — replaced by `useAbility()` |
| `src/hooks/useUserRole.tsx` | Delete — replaced by `useWorkspaceRole()` |

#### Admin Pages to REMOVE (built for suspended RBAC)

| Page | Path |
|------|------|
| Permission Sets management | `src/pages/admin/permission-sets/` |
| Groups management | `src/pages/admin/groups/` |
| User scope bindings editor | `src/pages/admin/users/[id]/components/UserScopeBindingsEditor.tsx` |
| User permission sets editor | `src/pages/admin/users/[id]/components/UserPermissionSetsManagement.tsx` |
| User direct permissions editor | `src/pages/admin/users/[id]/components/UserPermissionsEditor.tsx` |
| User group membership | `src/pages/admin/users/[id]/components/UserGroupMembership.tsx` |
| Copy permissions dialog | `src/pages/admin/users/[id]/components/CopyPermissionsDialog.tsx` |

#### Database Tables to DROP (Phase 2 tables, empty, never used)

```sql
-- These tables are empty and were part of the over-engineered Phase 2
DROP TABLE IF EXISTS group_permissions CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS user_groups CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS permission_set_permissions CASCADE;
DROP TABLE IF EXISTS user_permission_sets CASCADE;
DROP TABLE IF EXISTS permission_sets CASCADE;
DROP TABLE IF EXISTS user_scope_bindings CASCADE;
```

**Estimated cleanup: ~1,500 lines of dead frontend code removed, 8 empty DB tables dropped.**

---

## 4. Target Architecture

### Design Principles (from Stripe/Shopify/Supabase)

| Principle | Implementation |
|-----------|---------------|
| **Check capabilities, not roles** | `can('requisitions.approve')` not `isAdmin()` |
| **Double gate** | Frontend hides UI (UX), backend enforces (security) |
| **Avoid RLS recursion** | Single `SECURITY DEFINER` authorize function |
| **Workspace isolation is non-negotiable** | Every row has `workspace_id`, every policy filters on it |
| **Start with predefined roles** | 5 curated roles, no custom roles (Stripe pattern) |
| **Permission format: `resource.action`** | Maps cleanly to UI, API, and RLS |
| **Load permissions before rendering** | No deny-during-load flicker |
| **Audit at the application layer** | Not via triggers that can block operations |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│                                                      │
│  AuthContext (user, session)                         │
│       │                                              │
│       ▼                                              │
│  WorkspaceContext (workspace_id, role, permissions)  │
│       │                                              │
│       ├──▶ useAbility() hook                        │
│       │      can('requisitions.approve')  → boolean │
│       │      canAny('batches.read', ...)  → boolean │
│       │                                              │
│       ├──▶ <Gate> component                         │
│       │      <Gate permission="orders.write">       │
│       │        <EditButton />                       │
│       │      </Gate>                                │
│       │                                              │
│       └──▶ ProtectedRoute (route-level)             │
│              requiredPermission="admin.users"        │
│                                                      │
├─────────────────────────────────────────────────────┤
│                    SUPABASE (Backend)                 │
│                                                      │
│  workspace_members (user_id, workspace_id, role)    │
│       │                                              │
│       ▼                                              │
│  authorize(permission TEXT) → BOOLEAN               │
│  [SECURITY DEFINER, STABLE, called by RLS]          │
│       │                                              │
│       ├── Checks workspace_members.role             │
│       ├── Joins role_permissions → permissions       │
│       └── Returns TRUE/FALSE (no recursion)         │
│                                                      │
│  RLS Policies:                                       │
│    USING (                                           │
│      workspace_id IN (my_workspace_ids())           │
│      AND authorize('resource.action')               │
│    )                                                 │
└─────────────────────────────────────────────────────┘
```

### Role Model (5 Predefined Roles — Stripe Pattern)

| Role | Code | Who | Access Level |
|------|------|-----|-------------|
| **Admin** | `admin` | Platform owner, workspace creator | Full access to everything |
| **Operations Manager** | `ops_manager` | Warehouse officers, logistics leads | Requisitions, invoices, inventory, facilities, scheduling |
| **Fleet Manager** | `fleet_manager` | Zonal managers, dispatch coordinators | Batches, drivers, vehicles, routes, maps |
| **Driver** | `driver` | Delivery drivers (MOD4 app) | Own assigned batches, delivery PoD, GPS telemetry |
| **Viewer** | `viewer` | Auditors, stakeholders | Read-only across permitted modules |

> **Why rename from old roles?** The old names (`warehouse_officer`, `zonal_manager`) are job titles, not access levels. SaaS platforms name roles by capability scope, not organizational position. A "warehouse officer" and a "logistics coordinator" may need the same access — both map to `ops_manager`.

### Permission Catalog (26 permissions across 7 modules)

```
MODULE: STOREFRONT
  requisitions.read       — View requisitions
  requisitions.write      — Create/edit requisitions
  requisitions.approve    — Approve/reject requisitions
  requisitions.delete     — Cancel requisitions
  invoices.read           — View invoices
  invoices.write          — Create/edit invoices
  invoices.approve        — Approve/finalize invoices
  facilities.read         — View facilities
  facilities.write        — Create/edit facilities
  items.read              — View items catalog
  items.write             — Create/edit items
  programs.read           — View programs
  programs.write          — Create/edit programs

MODULE: FLEETOPS
  batches.read            — View delivery batches
  batches.write           — Create/edit batches
  batches.dispatch        — Dispatch batches to drivers
  vehicles.read           — View vehicles
  vehicles.write          — Manage vehicles (VLMS)
  drivers.read            — View driver list
  drivers.assign          — Assign drivers to batches

MODULE: SCHEDULING
  schedules.read          — View schedules
  schedules.write         — Create/edit schedules
  schedules.publish       — Publish schedules to drivers

MODULE: REPORTING
  reports.read            — View dashboards and analytics

MODULE: ADMIN
  admin.users             — Manage users, assign roles
  admin.settings          — Manage workspace settings
```

### Role → Permission Matrix

| Permission | admin | ops_manager | fleet_manager | driver | viewer |
|-----------|-------|-------------|---------------|--------|--------|
| requisitions.read | ✅ | ✅ | ✅ | — | ✅ |
| requisitions.write | ✅ | ✅ | — | — | — |
| requisitions.approve | ✅ | ✅ | — | — | — |
| requisitions.delete | ✅ | ✅ | — | — | — |
| invoices.read | ✅ | ✅ | ✅ | — | ✅ |
| invoices.write | ✅ | ✅ | — | — | — |
| invoices.approve | ✅ | ✅ | — | — | — |
| facilities.read | ✅ | ✅ | ✅ | — | ✅ |
| facilities.write | ✅ | ✅ | — | — | — |
| items.read | ✅ | ✅ | — | — | ✅ |
| items.write | ✅ | ✅ | — | — | — |
| programs.read | ✅ | ✅ | ✅ | — | ✅ |
| programs.write | ✅ | ✅ | — | — | — |
| batches.read | ✅ | ✅ | ✅ | ✅* | ✅ |
| batches.write | ✅ | — | ✅ | — | — |
| batches.dispatch | ✅ | — | ✅ | — | — |
| vehicles.read | ✅ | — | ✅ | — | ✅ |
| vehicles.write | ✅ | — | ✅ | — | — |
| drivers.read | ✅ | — | ✅ | — | ✅ |
| drivers.assign | ✅ | — | ✅ | — | — |
| schedules.read | ✅ | ✅ | ✅ | ✅* | ✅ |
| schedules.write | ✅ | ✅ | ✅ | — | — |
| schedules.publish | ✅ | — | ✅ | — | — |
| reports.read | ✅ | ✅ | ✅ | — | ✅ |
| admin.users | ✅ | — | — | — | — |
| admin.settings | ✅ | — | — | — | — |

*✅\* = row-level scoped (driver sees only own batches/schedules)*

---

## 5. Database Schema

### Migration: Core RBAC Tables

```sql
-- ============================================================
-- BIKO RBAC v2 — Core Schema
-- Pattern: Stripe-style predefined roles + Supabase authorize()
-- ============================================================

-- 1. Role enum on workspace_members (single source of truth)
-- workspace_members already exists; we add a role column.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
    CREATE TYPE workspace_role AS ENUM (
      'admin',
      'ops_manager',
      'fleet_manager',
      'driver',
      'viewer'
    );
  END IF;
END$$;

-- Add role to workspace_members if not present
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS role workspace_role NOT NULL DEFAULT 'viewer';

-- 2. Permissions catalog (static, seeded once)
CREATE TABLE IF NOT EXISTS permissions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,          -- 'requisitions.approve'
  module TEXT NOT NULL,               -- 'storefront', 'fleetops', 'admin'
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Role-permission mapping (static, seeded once)
CREATE TABLE IF NOT EXISTS role_permissions_v2 (
  role workspace_role NOT NULL,
  permission_code TEXT NOT NULL REFERENCES permissions_v2(code) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_code)
);

-- 4. Indexes for authorize() performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace
  ON workspace_members(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_role
  ON workspace_members(user_id, role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_v2_role
  ON role_permissions_v2(role);
```

### Migration: Seed Permissions & Role Mappings

```sql
-- Seed permissions catalog
INSERT INTO permissions_v2 (code, module, description) VALUES
  -- STOREFRONT
  ('requisitions.read',    'storefront', 'View requisitions'),
  ('requisitions.write',   'storefront', 'Create and edit requisitions'),
  ('requisitions.approve', 'storefront', 'Approve or reject requisitions'),
  ('requisitions.delete',  'storefront', 'Cancel requisitions'),
  ('invoices.read',        'storefront', 'View invoices'),
  ('invoices.write',       'storefront', 'Create and edit invoices'),
  ('invoices.approve',     'storefront', 'Approve and finalize invoices'),
  ('facilities.read',      'storefront', 'View facilities'),
  ('facilities.write',     'storefront', 'Create and edit facilities'),
  ('items.read',           'storefront', 'View items catalog'),
  ('items.write',          'storefront', 'Create and edit items'),
  ('programs.read',        'storefront', 'View programs'),
  ('programs.write',       'storefront', 'Create and edit programs'),
  -- FLEETOPS
  ('batches.read',         'fleetops',   'View delivery batches'),
  ('batches.write',        'fleetops',   'Create and edit batches'),
  ('batches.dispatch',     'fleetops',   'Dispatch batches to drivers'),
  ('vehicles.read',        'fleetops',   'View vehicles'),
  ('vehicles.write',       'fleetops',   'Manage vehicles'),
  ('drivers.read',         'fleetops',   'View driver list'),
  ('drivers.assign',       'fleetops',   'Assign drivers to batches'),
  -- SCHEDULING
  ('schedules.read',       'scheduling', 'View schedules'),
  ('schedules.write',      'scheduling', 'Create and edit schedules'),
  ('schedules.publish',    'scheduling', 'Publish schedules to drivers'),
  -- REPORTING
  ('reports.read',         'reporting',  'View dashboards and analytics'),
  -- ADMIN
  ('admin.users',          'admin',      'Manage users and assign roles'),
  ('admin.settings',       'admin',      'Manage workspace settings')
ON CONFLICT (code) DO NOTHING;

-- Seed role-permission matrix
-- admin: ALL permissions
INSERT INTO role_permissions_v2 (role, permission_code)
SELECT 'admin'::workspace_role, code FROM permissions_v2
ON CONFLICT DO NOTHING;

-- ops_manager
INSERT INTO role_permissions_v2 (role, permission_code) VALUES
  ('ops_manager', 'requisitions.read'),
  ('ops_manager', 'requisitions.write'),
  ('ops_manager', 'requisitions.approve'),
  ('ops_manager', 'requisitions.delete'),
  ('ops_manager', 'invoices.read'),
  ('ops_manager', 'invoices.write'),
  ('ops_manager', 'invoices.approve'),
  ('ops_manager', 'facilities.read'),
  ('ops_manager', 'facilities.write'),
  ('ops_manager', 'items.read'),
  ('ops_manager', 'items.write'),
  ('ops_manager', 'programs.read'),
  ('ops_manager', 'programs.write'),
  ('ops_manager', 'batches.read'),
  ('ops_manager', 'invoices.read'),
  ('ops_manager', 'schedules.read'),
  ('ops_manager', 'schedules.write'),
  ('ops_manager', 'reports.read')
ON CONFLICT DO NOTHING;

-- fleet_manager
INSERT INTO role_permissions_v2 (role, permission_code) VALUES
  ('fleet_manager', 'requisitions.read'),
  ('fleet_manager', 'invoices.read'),
  ('fleet_manager', 'facilities.read'),
  ('fleet_manager', 'programs.read'),
  ('fleet_manager', 'batches.read'),
  ('fleet_manager', 'batches.write'),
  ('fleet_manager', 'batches.dispatch'),
  ('fleet_manager', 'vehicles.read'),
  ('fleet_manager', 'vehicles.write'),
  ('fleet_manager', 'drivers.read'),
  ('fleet_manager', 'drivers.assign'),
  ('fleet_manager', 'schedules.read'),
  ('fleet_manager', 'schedules.write'),
  ('fleet_manager', 'schedules.publish'),
  ('fleet_manager', 'reports.read')
ON CONFLICT DO NOTHING;

-- driver
INSERT INTO role_permissions_v2 (role, permission_code) VALUES
  ('driver', 'batches.read'),
  ('driver', 'schedules.read')
ON CONFLICT DO NOTHING;

-- viewer: all .read permissions
INSERT INTO role_permissions_v2 (role, permission_code)
SELECT 'viewer'::workspace_role, code FROM permissions_v2
WHERE code LIKE '%.read'
ON CONFLICT DO NOTHING;
```

### Migration: Authorization Functions

```sql
-- ============================================================
-- BIKO RBAC v2 — Authorization Functions
-- All SECURITY DEFINER to avoid RLS recursion
-- All STABLE for transaction-level caching
-- ============================================================

-- Get the current user's role in a workspace
CREATE OR REPLACE FUNCTION public.get_workspace_role(
  _workspace_id UUID DEFAULT NULL
)
RETURNS workspace_role
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  _role workspace_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;

  SELECT role INTO _role
  FROM workspace_members
  WHERE user_id = auth.uid()
    AND workspace_id = COALESCE(_workspace_id, workspace_id)
  LIMIT 1;

  RETURN _role;
END;
$$;

-- Core authorization function — called by RLS policies
CREATE OR REPLACE FUNCTION public.authorize(_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  _user_role workspace_role;
BEGIN
  -- No user = no access
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;

  -- Get role (will be cached within the transaction due to STABLE)
  SELECT role INTO _user_role
  FROM workspace_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- No workspace membership = no access
  IF _user_role IS NULL THEN RETURN FALSE; END IF;

  -- Admin bypass (explicit, auditable)
  IF _user_role = 'admin' THEN RETURN TRUE; END IF;

  -- Check role-permission mapping
  RETURN EXISTS (
    SELECT 1 FROM role_permissions_v2
    WHERE role = _user_role
      AND permission_code = _permission
  );
END;
$$;

-- Workspace-scoped authorization (for multi-workspace users)
CREATE OR REPLACE FUNCTION public.authorize_in_workspace(
  _permission TEXT,
  _workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  _user_role workspace_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;

  SELECT role INTO _user_role
  FROM workspace_members
  WHERE user_id = auth.uid()
    AND workspace_id = _workspace_id;

  IF _user_role IS NULL THEN RETURN FALSE; END IF;
  IF _user_role = 'admin' THEN RETURN TRUE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM role_permissions_v2
    WHERE role = _user_role
      AND permission_code = _permission
  );
END;
$$;

-- Get all permissions for the current user (used by frontend)
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(permission_code TEXT, module TEXT)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  _user_role workspace_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  SELECT role INTO _user_role
  FROM workspace_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF _user_role IS NULL THEN RETURN; END IF;

  -- Admin gets all permissions
  IF _user_role = 'admin' THEN
    RETURN QUERY
      SELECT p.code, p.module FROM permissions_v2 p;
  ELSE
    RETURN QUERY
      SELECT rp.permission_code, p.module
      FROM role_permissions_v2 rp
      JOIN permissions_v2 p ON p.code = rp.permission_code
      WHERE rp.role = _user_role;
  END IF;
END;
$$;

-- Backwards-compatible: get_my_roles() returns role as text array
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TEXT[]
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  _role workspace_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN ARRAY[]::TEXT[]; END IF;

  SELECT role INTO _role
  FROM workspace_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF _role IS NULL THEN RETURN ARRAY[]::TEXT[]; END IF;
  RETURN ARRAY[_role::TEXT];
END;
$$;
```

### RLS Policy Pattern

```sql
-- Example: Requisitions table RLS
-- Step 1: Workspace isolation (always)
-- Step 2: Permission check via authorize() (no recursion)

ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_read" ON requisitions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND authorize('requisitions.read')
  );

CREATE POLICY "workspace_write" ON requisitions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND authorize('requisitions.write')
  );

CREATE POLICY "workspace_update" ON requisitions
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND authorize('requisitions.write')
  );

CREATE POLICY "workspace_delete" ON requisitions
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND authorize('requisitions.delete')
  );
```

---

## 6. Backend Implementation

### What Lives in the Database vs. Application

| Concern | Where | Why |
|---------|-------|-----|
| **Workspace isolation** | RLS policies | Non-negotiable security boundary |
| **Permission checks** | `authorize()` SECURITY DEFINER | Prevents RLS recursion |
| **Role assignment** | `workspace_members.role` column | Single source of truth |
| **Valid state transitions** | CHECK constraints or ENUM | Data integrity, not authorization |
| **Authorization for transitions** | Application hooks | Flexible, doesn't block DB operations |
| **Audit logging** | Application-level INSERT | No triggers that can block operations |

### State Transition Enforcement (Application-Level, Not Triggers)

```typescript
// Valid transitions — enforced in hooks, NOT database triggers
const REQUISITION_TRANSITIONS: Record<string, string[]> = {
  pending:            ['approved', 'rejected', 'cancelled'],
  approved:           ['packaged', 'cancelled'],
  packaged:           ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['assigned_to_batch', 'cancelled'],
  assigned_to_batch:  ['in_transit', 'cancelled'],
  in_transit:         ['fulfilled', 'partially_delivered', 'failed'],
  fulfilled:          [],
  partially_delivered:['fulfilled', 'failed'],
  failed:             ['pending'],  // allow retry
  rejected:           ['pending'],  // allow resubmission
  cancelled:          [],
};

// Permission required for each transition
const TRANSITION_PERMISSIONS: Record<string, string> = {
  approved:           'requisitions.approve',
  rejected:           'requisitions.approve',
  packaged:           'requisitions.write',
  ready_for_dispatch: 'requisitions.write',
  assigned_to_batch:  'batches.write',
  in_transit:         'batches.dispatch',
  fulfilled:          'batches.dispatch',
  cancelled:          'requisitions.delete',
};
```

---

## 7. Frontend Implementation

### New Hook: `useAbility()`

The single hook that replaces `usePermissions`, `useUserRole`, and the RBAC bridge.

```typescript
// src/hooks/useAbility.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export type AbilityPermission = string; // 'requisitions.read', etc.

interface AbilityContext {
  /** Check a single permission */
  can: (permission: AbilityPermission) => boolean;
  /** Check if user has ANY of the listed permissions */
  canAny: (...permissions: AbilityPermission[]) => boolean;
  /** Check if user has ALL of the listed permissions */
  canAll: (...permissions: AbilityPermission[]) => boolean;
  /** Current role */
  role: string | null;
  /** Whether permissions have loaded */
  isReady: boolean;
  /** Whether user is admin */
  isAdmin: boolean;
}

export function useAbility(): AbilityContext {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-permissions', user?.id],
    queryFn: async () => {
      const [permResult, roleResult] = await Promise.all([
        supabase.rpc('get_my_permissions'),
        supabase.rpc('get_my_roles'),
      ]);

      if (permResult.error) throw permResult.error;
      if (roleResult.error) throw roleResult.error;

      return {
        permissions: (permResult.data as { permission_code: string }[])
          .map(p => p.permission_code),
        role: (roleResult.data as string[])?.[0] ?? null,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,    // Cache 5 minutes
    gcTime: 10 * 60_000,
  });

  const permissionSet = useMemo(
    () => new Set(data?.permissions ?? []),
    [data?.permissions]
  );

  const role = data?.role ?? null;
  const isAdmin = role === 'admin';

  return {
    can: (p) => isAdmin || permissionSet.has(p),
    canAny: (...ps) => isAdmin || ps.some(p => permissionSet.has(p)),
    canAll: (...ps) => isAdmin || ps.every(p => permissionSet.has(p)),
    role,
    isReady: !isLoading && !!data,
    isAdmin,
  };
}
```

### New Component: `<Gate>`

```tsx
// src/components/auth/Gate.tsx
import { useAbility, AbilityPermission } from '@/hooks/useAbility';

interface GateProps {
  /** Required permission(s). If array, user needs ANY of them. */
  permission: AbilityPermission | AbilityPermission[];
  /** What to render if denied (default: nothing) */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Gate({ permission, fallback = null, children }: GateProps) {
  const { can, canAny, isReady } = useAbility();

  if (!isReady) return null; // Don't render until loaded — no flicker

  const allowed = Array.isArray(permission)
    ? canAny(...permission)
    : can(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
```

### Updated ProtectedRoute

```tsx
// Only changes needed in ProtectedRoute.tsx:
// 1. Replace requiredRole with requiredPermission
// 2. Wait for ability.isReady before rendering

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;  // 'admin.users', 'batches.write', etc.
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { can, isReady } = useAbility();

  if (loading || !isReady) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/fleetops" replace />;
  }

  return <>{children}</>;
}
```

### Navigation Filtering

```tsx
// In workspace layouts (fleetops/layout.tsx, storefront/layout.tsx)
const navItems = [
  { path: '/storefront/requisitions', label: 'Requisitions', permission: 'requisitions.read' },
  { path: '/storefront/facilities',   label: 'Facilities',   permission: 'facilities.read' },
  { path: '/storefront/items',        label: 'Items',         permission: 'items.read' },
  { path: '/fleetops/batches',        label: 'Batches',       permission: 'batches.read' },
  { path: '/fleetops/vehicles',       label: 'Vehicles',      permission: 'vehicles.read' },
  // ...
];

function WorkspaceNav() {
  const { can } = useAbility();
  const visibleItems = navItems.filter(item => can(item.permission));
  return <SidebarNav items={visibleItems} />;
}
```

---

## 8. Phased Rollout Plan

### Phase 1: Cleanup & Foundation (Week 1)
**Goal**: Remove dead code, deploy new DB schema, keep app behavior unchanged.

| Task | Risk | Rollback |
|------|------|----------|
| Delete dead RBAC files (§3) | None — code is unused | Git revert |
| Create `permissions_v2` + `role_permissions_v2` tables | None — new tables, no app reads them yet | DROP TABLE |
| Seed permission catalog + role mappings | None — data only | TRUNCATE |
| Deploy `authorize()` + `get_my_permissions()` functions | None — nothing calls them yet | DROP FUNCTION |
| Map existing `user_roles` to `workspace_members.role` | Medium — data migration | Revert column |
| Keep suspend migration active (everything still open) | None | N/A |

**Verification**: `SELECT * FROM permissions_v2` returns 26 rows. `SELECT get_my_permissions()` returns correct permissions for test users.

### Phase 2: Frontend Permission Hooks (Week 2)
**Goal**: Ship `useAbility()` + `<Gate>` component. Wire up navigation filtering. No backend enforcement yet.

| Task | Risk | Rollback |
|------|------|----------|
| Implement `useAbility()` hook | Low | Revert file |
| Implement `<Gate>` component | Low | Revert file |
| Replace `usePermissions()` imports with `useAbility()` | Low — same behavior while suspended | Git revert |
| Add `permission` field to nav items | Low — cosmetic only while suspended | Git revert |
| Filter navigation by `can()` | Medium — might hide items | Feature flag or revert |
| Update `ProtectedRoute` to use `requiredPermission` | Medium | Git revert |

**Verification**: Log in as each role, verify correct nav items visible. Admin sees everything. Viewer sees only read pages.

### Phase 3: Backend Enforcement (Week 3)
**Goal**: Enable RLS policies that use `authorize()`. This is where access control actually takes effect.

| Task | Risk | Rollback |
|------|------|----------|
| Write RLS policies for each table using `authorize()` | High — could block access | DROP POLICY (instant) |
| Test each role against each table (automated) | N/A | N/A |
| Revert suspend migration's permissive functions | High — enables enforcement | Re-run suspend migration |
| Deploy to staging first, test for 48 hours | N/A | N/A |

**Verification**: Run automated test suite with 5 test users (one per role). Each user can only access their permitted resources. No 500 errors. No infinite recursion.

### Phase 4: Polish & Audit (Week 4)
**Goal**: Add audit logging, admin role management UI, edge cases.

| Task | Risk | Rollback |
|------|------|----------|
| Add application-level audit logging (INSERT on status changes) | Low | Remove INSERT calls |
| Build admin role assignment UI (simplified — just a role dropdown) | Low | Revert |
| Add role indicator to app header | None | Revert |
| Document RBAC for team | None | N/A |

---

## 9. Testing Strategy

### Automated Test Matrix

```typescript
// e2e/rbac.spec.ts
const TEST_USERS = {
  admin:        { email: 'admin@test.com',   expectedRole: 'admin' },
  ops_manager:  { email: 'ops@test.com',     expectedRole: 'ops_manager' },
  fleet_manager:{ email: 'fleet@test.com',   expectedRole: 'fleet_manager' },
  driver:       { email: 'driver@test.com',  expectedRole: 'driver' },
  viewer:       { email: 'viewer@test.com',  expectedRole: 'viewer' },
};

// For each user, verify:
// 1. Can access permitted routes (200)
// 2. Cannot access forbidden routes (redirect or 403)
// 3. Can see permitted nav items
// 4. Cannot see forbidden nav items
// 5. Can perform permitted mutations (Supabase returns data)
// 6. Cannot perform forbidden mutations (Supabase returns error)
```

### Manual Smoke Test Checklist

- [ ] Admin can see all nav items, access all pages, perform all actions
- [ ] Ops manager can manage requisitions but NOT assign drivers
- [ ] Fleet manager can dispatch batches but NOT approve requisitions
- [ ] Driver can see own batches only (via MOD4)
- [ ] Viewer can browse everything but cannot create/edit/delete anything
- [ ] New user with no workspace is redirected to onboarding
- [ ] Role change takes effect on next page load (no stale cache)
- [ ] No 500 errors in Supabase logs after 24 hours

### RLS Recursion Test

```sql
-- Run this BEFORE enabling any RLS policies:
-- It must NOT produce an error
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "test-user-id"}';
SELECT authorize('requisitions.read');
-- Expected: TRUE or FALSE, NOT an error
RESET ROLE;
```

---

## 10. File Inventory & Action Items

### Files to CREATE

| File | Purpose |
|------|---------|
| `src/hooks/useAbility.ts` | New permission hook |
| `src/components/auth/Gate.tsx` | Permission gate component |
| `supabase/migrations/YYYYMMDDHHMMSS_rbac_v2_schema.sql` | New schema |
| `supabase/migrations/YYYYMMDDHHMMSS_rbac_v2_seed.sql` | Permission seeds |
| `supabase/migrations/YYYYMMDDHHMMSS_rbac_v2_functions.sql` | authorize() etc. |
| `e2e/rbac.spec.ts` | RBAC E2E tests |

### Files to DELETE

| File | Lines | Reason |
|------|-------|--------|
| `src/lib/permissions.ts` | 59 | Dead code, not imported |
| `src/hooks/rbac/usePermissionSets.tsx` | 283 | Unused Phase 2 feature |
| `src/hooks/rbac/useGroups.tsx` | 326 | Unused Phase 2 feature |
| `src/hooks/rbac/useUserPermissions.tsx` | 177 | Never used in production |
| `src/hooks/rbac/useScopeBindings.tsx` | 168 | Never enforced |
| `src/hooks/rbac/useAuditLogs.tsx` | 279 | Logs are empty |
| `src/hooks/rbac/useNotificationPreferences.tsx` | 83 | Not RBAC-related |
| `src/hooks/rbac/usePermissionsCatalog.tsx` | 153 | Only used by deleted admin pages |
| `src/hooks/usePermissions.tsx` | 78 | Replaced by useAbility |
| `src/pages/admin/permission-sets/` | ~300 | Admin UI for deleted feature |
| `src/pages/admin/groups/` | ~400 | Admin UI for deleted feature |
| Various user detail components | ~400 | See §3 for list |

### Files to MODIFY

| File | Change |
|------|--------|
| `src/hooks/useUserRole.tsx` | Simplify to call `get_workspace_role()` instead of `get_my_roles()` |
| `src/hooks/rbac/useWorkflowGuards.tsx` | Remove RPC calls to dropped functions, keep status metadata |
| `src/hooks/rbac/usePermissions.tsx` | Replace internals with `get_my_permissions()` call |
| `src/hooks/rbac/useRoles.tsx` | Simplify to use `workspace_members.role` |
| `src/hooks/rbac/index.ts` | Export only: `useAbility`, `useWorkflowGuards`, role metadata |
| `src/components/auth/ProtectedRoute.tsx` | Use `requiredPermission` instead of `requiredRole` |
| `src/pages/fleetops/layout.tsx` | Add permission-based nav filtering |
| `src/pages/storefront/layout.tsx` | Add permission-based nav filtering |
| `src/types/index.ts` | Update `AppRole` type to match new `workspace_role` enum |

---

## Appendix: Why This Architecture Won't Break Again

| Old Problem | New Safeguard |
|-------------|---------------|
| RLS recursion | `authorize()` is SECURITY DEFINER — bypasses RLS on role tables entirely |
| Deny-during-load flicker | `useAbility().isReady` gates rendering — no flash of forbidden content |
| Two role systems | Single `workspace_members.role` column — one source of truth |
| Workflow triggers blocking ops | State transitions enforced in application hooks, not DB triggers |
| 16 migrations at once | 4-phase rollout, each phase independently reversible |
| Permission sprawl | 26 permissions (not 32), 5 roles (not 7), no groups/sets/scopes |
| Stale role cache | 5-minute stale time on React Query, invalidated on role change |
| Admin blocked | Admin role check is `IF _user_role = 'admin' THEN RETURN TRUE` — direct, no joins |

---

*This blueprint follows patterns proven at Stripe (predefined roles, capability checks), Shopify (permission-per-resource matrix), and Supabase's own documentation (SECURITY DEFINER authorize function, RLS without recursion).*
