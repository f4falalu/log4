-- =====================================================
-- RBAC System - Part 2: Roles & Role Permissions
-- =====================================================
-- Creates roles table, role_permissions junction, and
-- migrates existing user_roles to new structure.
--
-- Defines 5 default roles:
--   1. System Admin (all permissions)
--   2. Operations User (planning & inventory)
--   3. FleetOps User (dispatch & execution)
--   4. Driver (mobile execution only)
--   5. Viewer (read-only access)
-- =====================================================

-- =====================================================
-- 1. CREATE ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- slug format, e.g., 'system_admin'
  description TEXT,
  organization_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_system_role BOOLEAN DEFAULT FALSE, -- true for default roles
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_roles_code ON public.roles(code);
CREATE INDEX idx_roles_organization ON public.roles(organization_id);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (
    is_system_role = true
    OR organization_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

-- =====================================================
-- 2. CREATE ROLE_PERMISSIONS JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Index for fast permission lookups
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON public.role_permissions(permission_id);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

-- =====================================================
-- 3. SEED DEFAULT ROLES (5 Roles)
-- =====================================================

DO $$
DECLARE
  role_system_admin UUID;
  role_operations UUID;
  role_fleetops UUID;
  role_driver UUID;
  role_viewer UUID;
  perm_id UUID;
BEGIN
  -- Create System Admin role
  INSERT INTO public.roles (name, code, description, is_system_role)
  VALUES (
    'System Administrator',
    'system_admin',
    'Full system access with all permissions',
    true
  ) RETURNING id INTO role_system_admin;

  -- Create Operations User role
  INSERT INTO public.roles (name, code, description, is_system_role)
  VALUES (
    'Operations User',
    'operations_user',
    'Handles planning, inventory, requisitions, and invoices (cannot dispatch)',
    true
  ) RETURNING id INTO role_operations;

  -- Create FleetOps User role
  INSERT INTO public.roles (name, code, description, is_system_role)
  VALUES (
    'FleetOps User',
    'fleetops_user',
    'Handles batch creation, assignment, and dispatch (cannot modify requisitions/invoices)',
    true
  ) RETURNING id INTO role_fleetops;

  -- Create Driver role
  INSERT INTO public.roles (name, code, description, is_system_role)
  VALUES (
    'Driver',
    'driver',
    'Mobile execution: view assigned routes and confirm deliveries',
    true
  ) RETURNING id INTO role_driver;

  -- Create Viewer role (read-only)
  INSERT INTO public.roles (name, code, description, is_system_role)
  VALUES (
    'Viewer',
    'viewer',
    'Read-only access to reports and data',
    true
  ) RETURNING id INTO role_viewer;

  RAISE NOTICE 'Created 5 default roles';

  -- =====================================================
  -- 4. ASSIGN PERMISSIONS TO ROLES
  -- =====================================================

  -- SYSTEM ADMIN: All permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_system_admin, id FROM public.permissions;

  RAISE NOTICE 'System Admin: assigned % permissions', (SELECT COUNT(*) FROM public.permissions);

  -- OPERATIONS USER: Planning & inventory permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_operations, id FROM public.permissions
  WHERE code IN (
    -- Master Data
    'item.manage',
    'program.manage',
    -- Inventory
    'inventory.view',
    'inventory.adjust',
    -- Requisition
    'requisition.create',
    'requisition.approve',
    -- Invoice
    'invoice.process',
    -- Scheduler
    'schedule.create',
    'schedule.review',
    -- Reporting
    'report.view'
  );

  RAISE NOTICE 'Operations User: assigned 10 permissions';

  -- FLEETOPS USER: Dispatch & execution permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_fleetops, id FROM public.permissions
  WHERE code IN (
    -- Inventory (read-only)
    'inventory.view',
    -- Batch / FleetOps
    'batch.create',
    'batch.assign',
    'batch.dispatch',
    'batch.complete',
    'batch.cancel',
    -- Reporting
    'report.view'
  );

  RAISE NOTICE 'FleetOps User: assigned 7 permissions';

  -- DRIVER: Mobile execution only
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_driver, id FROM public.permissions
  WHERE code IN (
    'driver.view_assigned',
    'driver.confirm_delivery',
    'driver.record_discrepancy',
    'driver.record_return'
  );

  RAISE NOTICE 'Driver: assigned 4 permissions';

  -- VIEWER: Read-only access
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_viewer, id FROM public.permissions
  WHERE code IN (
    'inventory.view',
    'report.view'
  );

  RAISE NOTICE 'Viewer: assigned 2 permissions';

END $$;

-- =====================================================
-- 5. ALTER USER_ROLES TABLE
-- =====================================================
-- Migrate from old app_role enum to new roles table FK

-- Add new column for role_id (nullable during migration)
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- =====================================================
-- 6. MIGRATE EXISTING DATA
-- =====================================================
-- Map old app_role enum values to new roles

DO $$
DECLARE
  role_mapping RECORD;
BEGIN
  -- Update user_roles to point to new roles table
  FOR role_mapping IN
    SELECT
      ur.id as user_role_id,
      ur.role as old_role,
      r.id as new_role_id
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON (
      (ur.role::text = 'system_admin' AND r.code = 'system_admin')
      OR (ur.role::text = 'warehouse_officer' AND r.code = 'operations_user')
      OR (ur.role::text = 'zonal_manager' AND r.code = 'fleetops_user')
      OR (ur.role::text = 'driver' AND r.code = 'driver')
      OR (ur.role::text = 'viewer' AND r.code = 'viewer')
    )
    WHERE ur.role_id IS NULL
  LOOP
    IF role_mapping.new_role_id IS NOT NULL THEN
      UPDATE public.user_roles
      SET role_id = role_mapping.new_role_id
      WHERE id = role_mapping.user_role_id;

      RAISE NOTICE 'Migrated user_role % from % to role_id %',
        role_mapping.user_role_id,
        role_mapping.old_role,
        role_mapping.new_role_id;
    ELSE
      RAISE WARNING 'No mapping found for role: %', role_mapping.old_role;
    END IF;
  END LOOP;

  RAISE NOTICE 'User roles migration complete';
END $$;

-- =====================================================
-- 7. MAKE role_id REQUIRED (after migration)
-- =====================================================

-- Set NOT NULL constraint (all records should now have role_id)
ALTER TABLE public.user_roles
ALTER COLUMN role_id SET NOT NULL;

-- Add unique constraint (user can have each role only once)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role_unique
ON public.user_roles(user_id, role_id);

-- =====================================================
-- 8. DEPRECATION NOTICE FOR OLD ROLE COLUMN
-- =====================================================
-- Keep the old 'role' column for backward compatibility
-- Will be removed in future migration after all code updated

COMMENT ON COLUMN public.user_roles.role IS
  'DEPRECATED: Use role_id instead. Will be removed in future migration.';

-- =====================================================
-- 9. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 10. VERIFICATION
-- =====================================================

DO $$
DECLARE
  role_count INTEGER;
  total_permissions INTEGER;
  migrated_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM public.roles WHERE is_system_role = true;
  SELECT COUNT(*) INTO total_permissions FROM public.role_permissions;
  SELECT COUNT(*) INTO migrated_users FROM public.user_roles WHERE role_id IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RBAC System - Roles & Permissions Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'System roles created: %', role_count;
  RAISE NOTICE 'Total role-permission assignments: %', total_permissions;
  RAISE NOTICE 'Users migrated to new role system: %', migrated_users;
  RAISE NOTICE '';
  RAISE NOTICE 'Role Permission Summary:';
  RAISE NOTICE '  - System Admin: % permissions', (
    SELECT COUNT(*) FROM public.role_permissions rp
    JOIN public.roles r ON rp.role_id = r.id
    WHERE r.code = 'system_admin'
  );
  RAISE NOTICE '  - Operations User: % permissions', (
    SELECT COUNT(*) FROM public.role_permissions rp
    JOIN public.roles r ON rp.role_id = r.id
    WHERE r.code = 'operations_user'
  );
  RAISE NOTICE '  - FleetOps User: % permissions', (
    SELECT COUNT(*) FROM public.role_permissions rp
    JOIN public.roles r ON rp.role_id = r.id
    WHERE r.code = 'fleetops_user'
  );
  RAISE NOTICE '  - Driver: % permissions', (
    SELECT COUNT(*) FROM public.role_permissions rp
    JOIN public.roles r ON rp.role_id = r.id
    WHERE r.code = 'driver'
  );
  RAISE NOTICE '  - Viewer: % permissions', (
    SELECT COUNT(*) FROM public.role_permissions rp
    JOIN public.roles r ON rp.role_id = r.id
    WHERE r.code = 'viewer'
  );
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Old app_role column kept for backward compatibility.';
  RAISE NOTICE 'Will be removed after all code migrated to use role_id.';
  RAISE NOTICE '=================================================================';
END $$;
