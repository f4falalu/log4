-- =====================================================
-- RBAC System - Part 4: Scope Bindings
-- =====================================================
-- Creates scope bindings system for contextual data access.
-- Users can be restricted to specific:
--   - Warehouses
--   - Programs
--   - Zones
--   - Facilities
--
-- If no scopes defined, user has org-wide access.
-- =====================================================

-- =====================================================
-- 1. CREATE USER_SCOPE_BINDINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_scope_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (
    scope_type IN ('warehouse', 'program', 'zone', 'facility')
  ),
  scope_id UUID NOT NULL, -- References different tables based on scope_type
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- nullable, for temporary access
  metadata JSONB DEFAULT '{}', -- flexible storage for scope-specific data
  UNIQUE(user_id, scope_type, scope_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_user_scope_bindings_user ON public.user_scope_bindings(user_id);
CREATE INDEX idx_user_scope_bindings_scope_type ON public.user_scope_bindings(scope_type);
CREATE INDEX idx_user_scope_bindings_user_type ON public.user_scope_bindings(user_id, scope_type);
CREATE INDEX idx_user_scope_bindings_expires ON public.user_scope_bindings(expires_at)
  WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.user_scope_bindings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scope bindings"
  ON public.user_scope_bindings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System admins can view all scope bindings"
  ON public.user_scope_bindings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

CREATE POLICY "System admins can manage scope bindings"
  ON public.user_scope_bindings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

-- =====================================================
-- 2. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function: Check if user has access to a warehouse
CREATE OR REPLACE FUNCTION public.user_has_warehouse_access(
  _user_id UUID,
  _warehouse_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- If user has no warehouse scopes, they have org-wide access
  IF NOT EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'warehouse'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has specific warehouse access
  RETURN EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'warehouse'
      AND scope_id = _warehouse_id
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Check if user has access to a program
CREATE OR REPLACE FUNCTION public.user_has_program_access(
  _user_id UUID,
  _program_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- If user has no program scopes, they have org-wide access
  IF NOT EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'program'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has specific program access
  RETURN EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'program'
      AND scope_id = _program_id
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Check if user has access to a zone
CREATE OR REPLACE FUNCTION public.user_has_zone_access(
  _user_id UUID,
  _zone_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- If user has no zone scopes, they have org-wide access
  IF NOT EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'zone'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has specific zone access
  RETURN EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'zone'
      AND scope_id = _zone_id
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Check if user has access to a facility
CREATE OR REPLACE FUNCTION public.user_has_facility_access(
  _user_id UUID,
  _facility_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- If user has no facility scopes, they have org-wide access
  IF NOT EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'facility'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has specific facility access
  RETURN EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'facility'
      AND scope_id = _facility_id
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Get all warehouse IDs accessible to user
CREATE OR REPLACE FUNCTION public.get_user_warehouse_scopes(_user_id UUID)
RETURNS TABLE(warehouse_id UUID) AS $$
BEGIN
  -- If user has no warehouse scopes, return all warehouses
  IF NOT EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'warehouse'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN QUERY SELECT id FROM public.warehouses;
  END IF;

  -- Return user's specific warehouse scopes
  RETURN QUERY
    SELECT scope_id
    FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'warehouse'
      AND (expires_at IS NULL OR expires_at > now());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Get all program IDs accessible to user
CREATE OR REPLACE FUNCTION public.get_user_program_scopes(_user_id UUID)
RETURNS TABLE(program_id UUID) AS $$
BEGIN
  -- If user has no program scopes, return all programs
  IF NOT EXISTS (
    SELECT 1 FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'program'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN QUERY SELECT id FROM public.programs;
  END IF;

  -- Return user's specific program scopes
  RETURN QUERY
    SELECT scope_id
    FROM public.user_scope_bindings
    WHERE user_id = _user_id
      AND scope_type = 'program'
      AND (expires_at IS NULL OR expires_at > now());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- 3. CREATE SCOPE RESOLUTION VIEW
-- =====================================================
-- Shows all active scopes for each user with readable names

CREATE OR REPLACE VIEW public.user_scopes_detailed AS
SELECT
  usb.id,
  usb.user_id,
  u.email AS user_email,
  p.full_name AS user_name,
  usb.scope_type,
  usb.scope_id,
  CASE usb.scope_type
    WHEN 'warehouse' THEN w.name
    WHEN 'program' THEN prog.name
    WHEN 'zone' THEN z.name
    WHEN 'facility' THEN f.name
    ELSE NULL
  END AS scope_name,
  usb.assigned_at,
  usb.expires_at,
  usb.assigned_by,
  assigner_u.email AS assigned_by_email
FROM public.user_scope_bindings usb
LEFT JOIN auth.users u ON usb.user_id = u.id
LEFT JOIN public.profiles p ON usb.user_id = p.id
LEFT JOIN public.warehouses w ON usb.scope_type = 'warehouse' AND usb.scope_id = w.id
LEFT JOIN public.programs prog ON usb.scope_type = 'program' AND usb.scope_id = prog.id
LEFT JOIN public.zones z ON usb.scope_type = 'zone' AND usb.scope_id = z.id
LEFT JOIN public.facilities f ON usb.scope_type = 'facility' AND usb.scope_id = f.id
LEFT JOIN auth.users assigner_u ON usb.assigned_by = assigner_u.id
WHERE usb.expires_at IS NULL OR usb.expires_at > now();

COMMENT ON VIEW public.user_scopes_detailed IS
  'Shows all active user scope bindings with human-readable names';

-- =====================================================
-- 4. CREATE EXPIRATION CLEANUP FUNCTION
-- =====================================================
-- Automatically remove expired scope bindings

CREATE OR REPLACE FUNCTION public.cleanup_expired_scopes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.user_scope_bindings
    WHERE expires_at IS NOT NULL
      AND expires_at <= now()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_scopes IS
  'Removes expired scope bindings. Can be called via cron job.';

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RBAC System - Scope Bindings Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Table created: user_scope_bindings';
  RAISE NOTICE '';
  RAISE NOTICE 'Scope types supported:';
  RAISE NOTICE '  - warehouse (restrict to specific warehouses)';
  RAISE NOTICE '  - program (restrict to specific programs)';
  RAISE NOTICE '  - zone (restrict to specific zones)';
  RAISE NOTICE '  - facility (restrict to specific facilities)';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper functions created:';
  RAISE NOTICE '  - user_has_warehouse_access(user_id, warehouse_id)';
  RAISE NOTICE '  - user_has_program_access(user_id, program_id)';
  RAISE NOTICE '  - user_has_zone_access(user_id, zone_id)';
  RAISE NOTICE '  - user_has_facility_access(user_id, facility_id)';
  RAISE NOTICE '  - get_user_warehouse_scopes(user_id)';
  RAISE NOTICE '  - get_user_program_scopes(user_id)';
  RAISE NOTICE '  - cleanup_expired_scopes()';
  RAISE NOTICE '';
  RAISE NOTICE 'View created: user_scopes_detailed';
  RAISE NOTICE '';
  RAISE NOTICE 'Access Logic:';
  RAISE NOTICE '  - If user has NO scopes defined → org-wide access';
  RAISE NOTICE '  - If user has scopes → access limited to those scopes';
  RAISE NOTICE '  - Scopes can expire (expires_at field)';
  RAISE NOTICE '=================================================================';
END $$;
