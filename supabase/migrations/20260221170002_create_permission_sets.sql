-- =====================================================
-- RBAC System - Part 3: Permission Sets
-- =====================================================
-- Creates Permission Sets system (Salesforce-style)
-- Allows admins to grant additional permissions without
-- changing roles. Additive layer for flexibility.
--
-- Example use cases:
--   - Temporary dispatch authority
--   - Audit access for external auditors
--   - Stock override capability
-- =====================================================

-- =====================================================
-- 1. CREATE PERMISSION_SETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.permission_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- slug format, e.g., 'emergency_dispatch'
  description TEXT,
  organization_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Index for fast lookups
CREATE INDEX idx_permission_sets_code ON public.permission_sets(code);
CREATE INDEX idx_permission_sets_organization ON public.permission_sets(organization_id);
CREATE INDEX idx_permission_sets_active ON public.permission_sets(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.permission_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view permission sets in their organization"
  ON public.permission_sets FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can manage permission sets"
  ON public.permission_sets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

-- =====================================================
-- 2. CREATE PERMISSION_SET_PERMISSIONS JUNCTION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.permission_set_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_set_id UUID NOT NULL REFERENCES public.permission_sets(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(permission_set_id, permission_id)
);

-- Index for fast permission lookups
CREATE INDEX idx_permission_set_permissions_set ON public.permission_set_permissions(permission_set_id);
CREATE INDEX idx_permission_set_permissions_permission ON public.permission_set_permissions(permission_id);

-- Enable RLS
ALTER TABLE public.permission_set_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view permission set permissions in their organization"
  ON public.permission_set_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.permission_sets ps
      JOIN public.workspace_members wm ON ps.organization_id = wm.workspace_id
      WHERE ps.id = permission_set_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can manage permission set permissions"
  ON public.permission_set_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

-- =====================================================
-- 3. CREATE USER_PERMISSION_SETS ASSIGNMENT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_permission_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_set_id UUID NOT NULL REFERENCES public.permission_sets(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- nullable, for temporary grants
  UNIQUE(user_id, permission_set_id)
);

-- Indexes
CREATE INDEX idx_user_permission_sets_user ON public.user_permission_sets(user_id);
CREATE INDEX idx_user_permission_sets_set ON public.user_permission_sets(permission_set_id);
CREATE INDEX idx_user_permission_sets_expires ON public.user_permission_sets(expires_at)
  WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.user_permission_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own permission set assignments"
  ON public.user_permission_sets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System admins can view all permission set assignments"
  ON public.user_permission_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

CREATE POLICY "System admins can manage permission set assignments"
  ON public.user_permission_sets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

-- =====================================================
-- 4. SEED EXAMPLE PERMISSION SETS
-- =====================================================
-- Create a few common permission sets as examples

DO $$
DECLARE
  ps_emergency_dispatch UUID;
  ps_audit_access UUID;
  ps_inventory_override UUID;
BEGIN
  -- Example 1: Emergency Dispatch Override
  -- Grants dispatch authority temporarily
  INSERT INTO public.permission_sets (name, code, description, is_active)
  VALUES (
    'Emergency Dispatch Override',
    'emergency_dispatch',
    'Temporary authority to dispatch batches (for operations users during emergencies)',
    true
  ) RETURNING id INTO ps_emergency_dispatch;

  -- Assign batch.dispatch permission
  INSERT INTO public.permission_set_permissions (permission_set_id, permission_id)
  SELECT ps_emergency_dispatch, id FROM public.permissions
  WHERE code = 'batch.dispatch';

  RAISE NOTICE 'Created permission set: Emergency Dispatch Override';

  -- Example 2: Audit Access
  -- Read-only access for external auditors
  INSERT INTO public.permission_sets (name, code, description, is_active)
  VALUES (
    'Audit Access',
    'audit_access',
    'Read-only access to all data for auditing purposes',
    true
  ) RETURNING id INTO ps_audit_access;

  -- Assign view permissions
  INSERT INTO public.permission_set_permissions (permission_set_id, permission_id)
  SELECT ps_audit_access, id FROM public.permissions
  WHERE code IN ('inventory.view', 'report.view', 'report.export');

  RAISE NOTICE 'Created permission set: Audit Access';

  -- Example 3: Inventory Override
  -- Allow stock limit overrides
  INSERT INTO public.permission_sets (name, code, description, is_active)
  VALUES (
    'Inventory Override Authority',
    'inventory_override',
    'Authority to override stock limits and adjust inventory outside normal bounds',
    true
  ) RETURNING id INTO ps_inventory_override;

  -- Assign inventory.adjust permission
  INSERT INTO public.permission_set_permissions (permission_set_id, permission_id)
  SELECT ps_inventory_override, id FROM public.permissions
  WHERE code IN ('inventory.adjust', 'inventory.transfer');

  RAISE NOTICE 'Created permission set: Inventory Override Authority';

END $$;

-- =====================================================
-- 5. CREATE UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER update_permission_sets_updated_at
  BEFORE UPDATE ON public.permission_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. CREATE VIEW: USER EFFECTIVE PERMISSIONS
-- =====================================================
-- Combines role permissions + permission set permissions

CREATE OR REPLACE VIEW public.user_effective_permissions AS
SELECT DISTINCT
  ur.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  'role' AS source
FROM public.user_roles ur
JOIN public.role_permissions rp ON ur.role_id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id

UNION

SELECT DISTINCT
  ups.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  'permission_set' AS source
FROM public.user_permission_sets ups
JOIN public.permission_set_permissions psp ON ups.permission_set_id = psp.permission_set_id
JOIN public.permissions p ON psp.permission_id = p.id
WHERE ups.expires_at IS NULL OR ups.expires_at > now();

-- Index for fast user permission lookups
CREATE INDEX idx_user_effective_permissions_user_code
ON public.user_roles(user_id); -- Will help with JOIN performance

COMMENT ON VIEW public.user_effective_permissions IS
  'Materialized view showing all effective permissions for each user (from roles + permission sets)';

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
DECLARE
  ps_count INTEGER;
  total_ps_permissions INTEGER;
BEGIN
  SELECT COUNT(*) INTO ps_count FROM public.permission_sets WHERE is_active = true;
  SELECT COUNT(*) INTO total_ps_permissions FROM public.permission_set_permissions;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RBAC System - Permission Sets Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Active permission sets: %', ps_count;
  RAISE NOTICE 'Total permission set assignments: %', total_ps_permissions;
  RAISE NOTICE '';
  RAISE NOTICE 'Example Permission Sets:';
  RAISE NOTICE '  1. Emergency Dispatch Override';
  RAISE NOTICE '  2. Audit Access';
  RAISE NOTICE '  3. Inventory Override Authority';
  RAISE NOTICE '';
  RAISE NOTICE 'Created view: user_effective_permissions';
  RAISE NOTICE '  - Combines role permissions + permission set permissions';
  RAISE NOTICE '  - Handles expiration logic automatically';
  RAISE NOTICE '=================================================================';
END $$;
