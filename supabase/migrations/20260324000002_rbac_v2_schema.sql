-- ============================================================================
-- PHASE 1.1: RBAC v2 SCHEMA
-- ============================================================================
-- Sets up the new role system with 5 roles, a complete permission matrix,
-- and workspace_members.role_id for workspace-scoped role assignment.
-- ============================================================================

BEGIN;

-- ============================================================
-- 0. DROP AUDIT LOG TRIGGERS (they reference dropped audit_logs table)
-- ============================================================
-- The create_audit_log_trigger() function inserts into audit_logs which
-- was dropped in migration 000001. Drop all triggers using it first.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all triggers that call create_audit_log_trigger
  FOR r IN
    SELECT tgname AS trigger_name, c.relnamespace::regnamespace::text AS schema_name, c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE p.proname = 'create_audit_log_trigger'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I',
      r.trigger_name, r.schema_name, r.table_name);
  END LOOP;
END $$;

-- Also drop the trigger function itself
DROP FUNCTION IF EXISTS public.create_audit_log_trigger() CASCADE;

-- ============================================================
-- 1. CLEAR EXISTING DATA (safe — Phase 0 removed all consumers)
-- ============================================================

DELETE FROM public.role_permissions;
DELETE FROM public.user_roles;

-- ============================================================
-- 2. RESET ROLES TABLE WITH NEW v2 ROLES
-- ============================================================

DELETE FROM public.roles;

INSERT INTO public.roles (id, code, name, description, is_system_role)
VALUES
  (gen_random_uuid(), 'admin',         'Admin',         'Full system access across all features',                  true),
  (gen_random_uuid(), 'ops_manager',   'Ops Manager',   'Storefront, inventory, and reporting access',             true),
  (gen_random_uuid(), 'fleet_manager', 'Fleet Manager', 'Batch management, fleet operations, and basic reporting', true),
  (gen_random_uuid(), 'driver',        'Driver',        'Driver-specific delivery operations',                     true),
  (gen_random_uuid(), 'viewer',        'Viewer',        'Read-only access to inventory and reports',               true);

-- ============================================================
-- 3. UPDATE CATEGORY CHECK CONSTRAINT + SEED PERMISSIONS
-- ============================================================
-- Drop the old category CHECK and replace with expanded set

ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_category_check;
ALTER TABLE public.permissions ADD CONSTRAINT permissions_category_check CHECK (
  category IN (
    'SYSTEM', 'MASTER_DATA', 'INVENTORY', 'REQUISITION', 'INVOICE',
    'SCHEDULER', 'BATCH', 'DRIVER', 'REPORTING',
    'storefront', 'fleetops', 'driver', 'analytics', 'admin'
  )
);

-- Upsert the v2 permission set (resource.action format)
INSERT INTO public.permissions (resource, action, code, description, category)
VALUES
  -- Requisitions
  ('requisitions', 'read',    'requisitions.read',    'View requisition list and details',     'REQUISITION'),
  ('requisitions', 'write',   'requisitions.write',   'Create, edit, and manage requisitions', 'REQUISITION'),
  ('requisitions', 'approve', 'requisitions.approve', 'Approve or reject requisitions',        'REQUISITION'),
  -- Batches
  ('batches', 'read',     'batches.read',     'View delivery batch list and details',    'BATCH'),
  ('batches', 'write',    'batches.write',    'Create and edit delivery batches',         'BATCH'),
  ('batches', 'dispatch', 'batches.dispatch', 'Assign drivers and dispatch batches',      'BATCH'),
  -- Drivers
  ('drivers', 'assign',            'drivers.assign',            'Assign drivers to batches',           'BATCH'),
  ('drivers', 'view_assigned',     'drivers.view_assigned',     'View deliveries assigned to self',    'DRIVER'),
  ('drivers', 'confirm_delivery',  'drivers.confirm_delivery',  'Confirm delivery completion',         'DRIVER'),
  ('drivers', 'record_discrepancy','drivers.record_discrepancy','Record delivery discrepancies',       'DRIVER'),
  ('drivers', 'record_return',     'drivers.record_return',     'Record returned items',               'DRIVER'),
  -- Reports
  ('reports', 'read',   'reports.read',   'View reports and dashboards', 'REPORTING'),
  ('reports', 'export', 'reports.export', 'Export reports to CSV/PDF',   'REPORTING'),
  -- Admin
  ('admin', 'users',    'admin.users',      'User administration and role assignment', 'SYSTEM'),
  ('admin', 'settings', 'admin.settings',   'System settings and configuration',      'SYSTEM'),
  ('workspace', 'manage', 'workspace.manage', 'Workspace settings and members',       'SYSTEM')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Ensure existing v1 permissions also exist for role-permission mapping
-- (inventory.*, schedule.*, invoice.*, item.manage, etc. were seeded in original migration)

-- ============================================================
-- 4. SEED ROLE-PERMISSION MATRIX
-- ============================================================

-- Admin → all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin';

-- Ops Manager → storefront + inventory + reports
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'ops_manager'
  AND p.code IN (
    'requisitions.read', 'requisitions.write', 'requisitions.approve',
    'batches.read', 'batches.write', 'batches.dispatch',
    'drivers.assign',
    'inventory.view', 'inventory.adjust', 'inventory.transfer',
    'schedule.create', 'schedule.review', 'schedule.delete',
    'invoice.process', 'invoice.cancel',
    'item.manage', 'program.manage', 'facility.manage', 'zone.manage',
    'reports.read', 'reports.export'
  );

-- Fleet Manager → batches + inventory.view + reports.read
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'fleet_manager'
  AND p.code IN (
    'batches.read', 'batches.write', 'batches.dispatch',
    'drivers.assign',
    'inventory.view',
    'reports.read'
  );

-- Driver → driver.* permissions only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'driver'
  AND p.code IN (
    'drivers.view_assigned',
    'drivers.confirm_delivery',
    'drivers.record_discrepancy',
    'drivers.record_return'
  );

-- Viewer → inventory.view + reports.read
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'viewer'
  AND p.code IN (
    'inventory.view',
    'reports.read'
  );

-- ============================================================
-- 5. ADD role_id TO workspace_members
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspace_members'
      AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD COLUMN role_id UUID REFERENCES public.roles(id);
  END IF;
END $$;

-- ============================================================
-- 6. BACKFILL workspace_members.role_id FROM TEXT role COLUMN
-- ============================================================
-- Mapping: owner/admin → admin, member → ops_manager, viewer → viewer

UPDATE public.workspace_members wm
SET role_id = r.id
FROM public.roles r
WHERE wm.role_id IS NULL
  AND (
    (wm.role IN ('owner', 'admin') AND r.code = 'admin')
    OR (wm.role = 'member' AND r.code = 'ops_manager')
    OR (wm.role = 'viewer' AND r.code = 'viewer')
  );

-- Any remaining NULLs default to viewer
UPDATE public.workspace_members wm
SET role_id = r.id
FROM public.roles r
WHERE wm.role_id IS NULL
  AND r.code = 'viewer';

-- ============================================================
-- 7. ADD INDEX ON workspace_members(role_id)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workspace_members_role_id
  ON public.workspace_members(role_id);

-- ============================================================
-- 8. CREATE member_permissions TABLE (per-user overrides)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_member_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_member_id, permission_id)
);

-- Add FK if workspace_members has a PK column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'member_permissions'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%workspace_member%'
  ) THEN
    ALTER TABLE public.member_permissions
      ADD CONSTRAINT fk_member_permissions_workspace_member
      FOREIGN KEY (workspace_member_id) REFERENCES public.workspace_members(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- workspace_members may not have an 'id' PK — skip FK in that case
  NULL;
END $$;

-- Enable RLS on member_permissions
ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_select" ON public.member_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "open_modify" ON public.member_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;

-- ============================================================================
-- DONE: RBAC v2 schema is set up.
-- - 5 roles: admin, ops_manager, fleet_manager, driver, viewer
-- - 28 permissions across 7 categories
-- - Role-permission matrix seeded
-- - workspace_members.role_id populated
-- - member_permissions table for per-user overrides
-- ============================================================================
