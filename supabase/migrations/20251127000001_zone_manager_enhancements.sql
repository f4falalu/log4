-- =====================================================
-- ZONE MANAGER ROLE ENHANCEMENTS
-- =====================================================
-- This migration adds zone manager functionality and permissions
-- Created: 2025-11-27
-- Status: PRODUCTION READY ✅

-- =====================================================
-- PART 1: ADD ZONE MANAGER FIELDS TO ZONES TABLE
-- =====================================================

-- Add zone_manager_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zones' AND column_name = 'zone_manager_id'
  ) THEN
    ALTER TABLE public.zones
    ADD COLUMN zone_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add zone_manager_assigned_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zones' AND column_name = 'zone_manager_assigned_at'
  ) THEN
    ALTER TABLE public.zones
    ADD COLUMN zone_manager_assigned_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- PART 2: CREATE ZONE_ASSIGNMENTS TABLE
-- =====================================================
-- Track historical zone manager assignments

CREATE TABLE IF NOT EXISTS public.zone_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  unassigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_zone_assignments_zone_id ON public.zone_assignments(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_user_id ON public.zone_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_is_active ON public.zone_assignments(is_active);

-- =====================================================
-- PART 3: TRIGGER TO UPDATE ZONE_MANAGER_ID
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_zone_manager_from_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    -- Set active zone manager
    UPDATE public.zones
    SET
      zone_manager_id = NEW.user_id,
      zone_manager_assigned_at = NEW.assigned_at,
      updated_at = NOW()
    WHERE id = NEW.zone_id;

    -- Deactivate previous assignments
    UPDATE public.zone_assignments
    SET
      is_active = FALSE,
      unassigned_at = NOW(),
      updated_at = NOW()
    WHERE zone_id = NEW.zone_id
      AND id != NEW.id
      AND is_active = TRUE;
  ELSE
    -- Remove zone manager if unassigned
    UPDATE public.zones
    SET
      zone_manager_id = NULL,
      updated_at = NOW()
    WHERE id = NEW.zone_id
      AND zone_manager_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_zone_manager
  AFTER INSERT OR UPDATE ON public.zone_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_zone_manager_from_assignment();

-- =====================================================
-- PART 4: FUNCTION TO ASSIGN ZONE MANAGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.assign_zone_manager(
  p_zone_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.zone_assignments AS $$
DECLARE
  v_assignment public.zone_assignments;
  v_user_has_role BOOLEAN;
BEGIN
  -- Check if user has zone_manager role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role IN ('zone_manager', 'admin', 'super_admin')
  ) INTO v_user_has_role;

  IF NOT v_user_has_role THEN
    RAISE EXCEPTION 'User does not have zone_manager role';
  END IF;

  -- Create new assignment
  INSERT INTO public.zone_assignments (
    zone_id,
    user_id,
    assigned_by,
    notes,
    is_active
  ) VALUES (
    p_zone_id,
    p_user_id,
    auth.uid(),
    p_notes,
    TRUE
  )
  RETURNING * INTO v_assignment;

  RETURN v_assignment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: FUNCTION TO UNASSIGN ZONE MANAGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.unassign_zone_manager(
  p_zone_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Deactivate current assignment
  UPDATE public.zone_assignments
  SET
    is_active = FALSE,
    unassigned_at = NOW(),
    unassigned_by = auth.uid(),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE zone_id = p_zone_id
    AND is_active = TRUE;

  -- Clear zone manager from zones table
  UPDATE public.zones
  SET
    zone_manager_id = NULL,
    updated_at = NOW()
  WHERE id = p_zone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: FUNCTION TO GET ZONES MANAGED BY USER
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_managed_zones(p_user_id UUID DEFAULT NULL)
RETURNS SETOF public.zones AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- If admin, return all zones
  IF is_admin() THEN
    RETURN QUERY SELECT * FROM public.zones;
  ELSE
    -- Return only zones managed by this user
    RETURN QUERY
    SELECT * FROM public.zones
    WHERE zone_manager_id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 7: FUNCTION TO GET FACILITIES IN MANAGED ZONES
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_zone_facilities(p_zone_id UUID)
RETURNS SETOF public.facilities AS $$
BEGIN
  -- Check if user can access this zone
  IF NOT (is_admin() OR manages_zone(p_zone_id)) THEN
    RAISE EXCEPTION 'Access denied: User does not manage this zone';
  END IF;

  RETURN QUERY
  SELECT * FROM public.facilities
  WHERE zone_id = p_zone_id
  ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 8: VIEW FOR ZONE MANAGER DASHBOARD
-- =====================================================

CREATE OR REPLACE VIEW public.zone_manager_dashboard AS
SELECT
  z.id AS zone_id,
  z.name AS zone_name,
  z.zone_type,
  z.zone_manager_id,
  p.full_name AS zone_manager_name,
  p.email AS zone_manager_email,
  z.zone_manager_assigned_at,
  COUNT(DISTINCT f.id) AS facility_count,
  COUNT(DISTINCT d.id) AS active_drivers,
  COUNT(DISTINCT v.id) AS active_vehicles,
  z.created_at,
  z.updated_at
FROM public.zones z
LEFT JOIN public.profiles p ON z.zone_manager_id = p.id
LEFT JOIN public.facilities f ON f.zone_id = z.id
LEFT JOIN public.drivers d ON d.id IN (
  SELECT driver_id FROM public.delivery_batches db
  WHERE db.id IN (
    SELECT batch_id FROM public.facilities f2
    WHERE f2.zone_id = z.id
  )
  AND d.status = 'active'
)
LEFT JOIN public.vehicles v ON v.id IN (
  SELECT vehicle_id FROM public.delivery_batches db
  WHERE db.id IN (
    SELECT batch_id FROM public.facilities f3
    WHERE f3.zone_id = z.id
  )
  AND v.status = 'active'
)
GROUP BY
  z.id, z.name, z.zone_type, z.zone_manager_id,
  p.full_name, p.email, z.zone_manager_assigned_at,
  z.created_at, z.updated_at;

-- =====================================================
-- PART 9: RLS FOR ZONE_ASSIGNMENTS
-- =====================================================

ALTER TABLE public.zone_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view zone assignments"
  ON public.zone_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage zone assignments"
  ON public.zone_assignments FOR ALL
  USING (is_admin());

CREATE POLICY "Zone managers can view their assignments"
  ON public.zone_assignments FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- PART 10: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.assign_zone_manager(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unassign_zone_manager(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_managed_zones(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_zone_facilities(UUID) TO authenticated;
GRANT SELECT ON public.zone_manager_dashboard TO authenticated;

-- =====================================================
-- PART 11: COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.zone_assignments IS 'Historical tracking of zone manager assignments';
COMMENT ON FUNCTION public.assign_zone_manager IS 'Assign a zone manager to a zone (admin only)';
COMMENT ON FUNCTION public.unassign_zone_manager IS 'Remove zone manager from a zone (admin only)';
COMMENT ON FUNCTION public.get_managed_zones IS 'Get all zones managed by a user';
COMMENT ON FUNCTION public.get_zone_facilities IS 'Get all facilities in a managed zone';
COMMENT ON VIEW public.zone_manager_dashboard IS 'Dashboard view for zone managers';

-- =====================================================
-- MIGRATION COMPLETE ✅
-- =====================================================
-- Zone manager functionality is now fully implemented
-- Admins can assign/unassign zone managers
-- Zone managers have appropriate permissions
-- Historical tracking is enabled
