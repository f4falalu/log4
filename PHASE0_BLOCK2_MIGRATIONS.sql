-- Create workspace_members table for multi-tenancy RLS policies
-- This table is required by planning system RLS policies

-- ============================================================================
-- 1. CREATE WORKSPACE_MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON public.workspace_members(role);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Users can view their own workspace memberships
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON public.workspace_members;
CREATE POLICY "Users can view their own workspace memberships"
  ON public.workspace_members FOR SELECT
  USING (auth.uid() = user_id);

-- Workspace admins can view all members in their workspaces
DROP POLICY IF EXISTS "Admins can view workspace members" ON public.workspace_members;
CREATE POLICY "Admins can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Workspace owners can insert new members
DROP POLICY IF EXISTS "Owners can add workspace members" ON public.workspace_members;
CREATE POLICY "Owners can add workspace members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Workspace owners can update member roles
DROP POLICY IF EXISTS "Owners can update member roles" ON public.workspace_members;
CREATE POLICY "Owners can update member roles"
  ON public.workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Workspace owners can remove members (except themselves)
DROP POLICY IF EXISTS "Owners can remove members" ON public.workspace_members;
CREATE POLICY "Owners can remove members"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    AND user_id != auth.uid() -- Cannot remove yourself
  );

-- ============================================================================
-- 5. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_workspace_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_members_updated_at ON public.workspace_members;
CREATE TRIGGER workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_members_updated_at();

-- ============================================================================
-- 6. BOOTSTRAP EXISTING USER INTO DEFAULT WORKSPACE
-- ============================================================================

-- Get the authenticated user (if running in a session context)
-- Otherwise this will be run manually after deployment

DO $$
DECLARE
  v_default_workspace_id UUID;
  v_admin_email TEXT := 'frankbarde@gmail.com'; -- Default admin email
  v_admin_user_id UUID;
BEGIN
  -- Find the default workspace by slug
  SELECT id INTO v_default_workspace_id
  FROM public.workspaces
  WHERE slug = 'kano-pharma'
  LIMIT 1;

  -- Only proceed if workspace exists
  IF v_default_workspace_id IS NULL THEN
    RAISE NOTICE 'Default workspace not found - skipping user bootstrap';
    RETURN;
  END IF;

  -- Try to find the admin user by email
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = v_admin_email
  LIMIT 1;

  -- If admin user exists, add them as owner of default workspace
  IF v_admin_user_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_default_workspace_id, v_admin_user_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = 'owner', updated_at = NOW();

    RAISE NOTICE 'Admin user % added as owner of default workspace', v_admin_email;
  ELSE
    RAISE NOTICE 'Admin user % not found - workspace membership must be created manually', v_admin_email;
  END IF;
END $$;

-- ============================================================================
-- 7. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_members_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_members_count FROM public.workspace_members;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Workspace Members Table Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Total workspace members: %', v_members_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify admin user is added to default workspace';
  RAISE NOTICE '2. Add additional users via admin interface';
  RAISE NOTICE '3. Deploy planning system migration (depends on this table)';
  RAISE NOTICE '=================================================================';
END $$;
-- Planning System Migration
-- This migration creates tables for the Planning mode features
-- Planning mode: Draft → Review → Activate workflow for spatial configurations
--
-- Critical: All configurations are draft (active=false) by default
-- Requires explicit activation to take effect

-- ============================================================================
-- 1. ZONE_CONFIGURATIONS TABLE (Service Zone Drafts & Versions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.zone_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Zone geometry
  boundary GEOMETRY(Polygon, 4326) NOT NULL,
  centroid GEOMETRY(Point, 4326),

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES public.zone_configurations(id) ON DELETE SET NULL,

  -- Activation workflow
  active BOOLEAN NOT NULL DEFAULT false, -- DRAFT by default
  draft_created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  draft_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Review tracking
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Activation tracking
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,

  -- Deactivation tracking
  deactivated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,

  -- Associated facilities
  assigned_facility_ids UUID[] DEFAULT '{}',

  -- Zone properties
  zone_type TEXT DEFAULT 'service', -- service, restricted, priority
  priority INTEGER DEFAULT 0, -- Higher = higher priority
  capacity_limit INTEGER, -- Max concurrent deliveries

  -- Performance targets
  target_delivery_time INTEGER, -- minutes
  target_success_rate INTEGER, -- percentage

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zone_configurations_workspace ON public.zone_configurations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_zone_configurations_active ON public.zone_configurations(active);
CREATE INDEX IF NOT EXISTS idx_zone_configurations_version ON public.zone_configurations(version);
CREATE INDEX IF NOT EXISTS idx_zone_configurations_boundary ON public.zone_configurations USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_zone_configurations_centroid ON public.zone_configurations USING GIST(centroid);

-- RLS
ALTER TABLE public.zone_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view zone configurations in their workspace" ON public.zone_configurations;
CREATE POLICY "Users can view zone configurations in their workspace"
  ON public.zone_configurations FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create zone configurations in their workspace" ON public.zone_configurations;
CREATE POLICY "Users can create zone configurations in their workspace"
  ON public.zone_configurations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update zone configurations in their workspace" ON public.zone_configurations;
CREATE POLICY "Users can update zone configurations in their workspace"
  ON public.zone_configurations FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.zone_configurations IS 'Service zone configurations with versioning and draft workflow';

-- ============================================================================
-- 2. ROUTE_SKETCHES TABLE (Non-binding Route Previews)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.route_sketches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Route geometry
  route_geometry GEOMETRY(LineString, 4326) NOT NULL,
  waypoints JSONB DEFAULT '[]'::jsonb, -- [{lat, lng, type, notes}]

  -- Route properties
  start_facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  end_facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  estimated_distance NUMERIC(10, 2), -- km
  estimated_duration INTEGER, -- minutes
  route_type TEXT DEFAULT 'delivery', -- delivery, pickup, transfer

  -- Draft workflow
  active BOOLEAN NOT NULL DEFAULT false, -- NON-BINDING by default
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Review tracking
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_route_sketches_workspace ON public.route_sketches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_route_sketches_active ON public.route_sketches(active);
CREATE INDEX IF NOT EXISTS idx_route_sketches_geometry ON public.route_sketches USING GIST(route_geometry);
CREATE INDEX IF NOT EXISTS idx_route_sketches_start_facility ON public.route_sketches(start_facility_id);
CREATE INDEX IF NOT EXISTS idx_route_sketches_end_facility ON public.route_sketches(end_facility_id);

-- RLS
ALTER TABLE public.route_sketches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view route sketches in their workspace" ON public.route_sketches;
CREATE POLICY "Users can view route sketches in their workspace"
  ON public.route_sketches FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage route sketches in their workspace" ON public.route_sketches;
CREATE POLICY "Users can manage route sketches in their workspace"
  ON public.route_sketches FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.route_sketches IS 'Non-binding route sketches for planning mode';

-- ============================================================================
-- 3. FACILITY_ASSIGNMENTS TABLE (Facility-to-Zone Assignments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.facility_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  zone_configuration_id UUID NOT NULL REFERENCES public.zone_configurations(id) ON DELETE CASCADE,

  -- Assignment properties
  assignment_type TEXT DEFAULT 'primary', -- primary, secondary, backup
  priority INTEGER DEFAULT 0, -- Assignment priority

  -- Draft workflow
  active BOOLEAN NOT NULL DEFAULT false, -- DRAFT by default
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Activation tracking
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure one primary assignment per facility
  UNIQUE(facility_id, zone_configuration_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facility_assignments_workspace ON public.facility_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_facility_assignments_facility ON public.facility_assignments(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_assignments_zone ON public.facility_assignments(zone_configuration_id);
CREATE INDEX IF NOT EXISTS idx_facility_assignments_active ON public.facility_assignments(active);

-- RLS
ALTER TABLE public.facility_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view facility assignments in their workspace" ON public.facility_assignments;
CREATE POLICY "Users can view facility assignments in their workspace"
  ON public.facility_assignments FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage facility assignments in their workspace" ON public.facility_assignments;
CREATE POLICY "Users can manage facility assignments in their workspace"
  ON public.facility_assignments FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.facility_assignments IS 'Facility-to-zone assignments with draft workflow';

-- ============================================================================
-- 4. MAP_ACTION_AUDIT TABLE (Audit Log for All Map Actions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.map_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action details
  action_type TEXT NOT NULL, -- create_zone, edit_zone, activate_zone, create_tradeoff, etc.
  capability TEXT NOT NULL, -- operational, planning, forensics

  -- Target entity
  entity_type TEXT, -- zone, route, tradeoff, etc.
  entity_id UUID,

  -- Changes
  old_data JSONB,
  new_data JSONB,

  -- Location (where action was initiated)
  action_location GEOMETRY(Point, 4326),

  -- Result
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_map_action_audit_workspace ON public.map_action_audit(workspace_id);
CREATE INDEX IF NOT EXISTS idx_map_action_audit_user ON public.map_action_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_map_action_audit_action_type ON public.map_action_audit(action_type);
CREATE INDEX IF NOT EXISTS idx_map_action_audit_capability ON public.map_action_audit(capability);
CREATE INDEX IF NOT EXISTS idx_map_action_audit_created_at ON public.map_action_audit(created_at DESC);

-- RLS
ALTER TABLE public.map_action_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audit logs in their workspace" ON public.map_action_audit;
CREATE POLICY "Users can view audit logs in their workspace"
  ON public.map_action_audit FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON public.map_action_audit;
CREATE POLICY "System can insert audit logs"
  ON public.map_action_audit FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.map_action_audit IS 'Audit log for all map system actions';

-- ============================================================================
-- 5. FORENSICS_QUERY_LOG TABLE (Track Forensics Queries)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forensics_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Query details
  query_type TEXT NOT NULL, -- route_comparison, heatmap, tradeoff_history
  time_range_start TIMESTAMPTZ,
  time_range_end TIMESTAMPTZ,

  -- Filters
  filters JSONB DEFAULT '{}'::jsonb,

  -- Results summary
  results_count INTEGER,
  execution_time_ms INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forensics_query_log_workspace ON public.forensics_query_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_forensics_query_log_user ON public.forensics_query_log(user_id);
CREATE INDEX IF NOT EXISTS idx_forensics_query_log_query_type ON public.forensics_query_log(query_type);
CREATE INDEX IF NOT EXISTS idx_forensics_query_log_created_at ON public.forensics_query_log(created_at DESC);

-- RLS
ALTER TABLE public.forensics_query_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view query logs in their workspace" ON public.forensics_query_log;
CREATE POLICY "Users can view query logs in their workspace"
  ON public.forensics_query_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert query logs" ON public.forensics_query_log;
CREATE POLICY "System can insert query logs"
  ON public.forensics_query_log FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.forensics_query_log IS 'Query log for forensics mode usage tracking';

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Auto-calculate centroid for zone configurations
CREATE OR REPLACE FUNCTION calculate_zone_centroid()
RETURNS TRIGGER AS $$
BEGIN
  NEW.centroid = ST_Centroid(NEW.boundary);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_zone_centroid_trigger ON public.zone_configurations;
CREATE TRIGGER calculate_zone_centroid_trigger
  BEFORE INSERT OR UPDATE OF boundary ON public.zone_configurations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_zone_centroid();

-- Update updated_at timestamp
DROP TRIGGER IF EXISTS update_zone_configurations_updated_at ON public.zone_configurations;
CREATE TRIGGER update_zone_configurations_updated_at
  BEFORE UPDATE ON public.zone_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_route_sketches_updated_at ON public.route_sketches;
CREATE TRIGGER update_route_sketches_updated_at
  BEFORE UPDATE ON public.route_sketches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_facility_assignments_updated_at ON public.facility_assignments;
CREATE TRIGGER update_facility_assignments_updated_at
  BEFORE UPDATE ON public.facility_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. FUNCTIONS
-- ============================================================================

-- Function to activate a zone configuration (version management)
CREATE OR REPLACE FUNCTION activate_zone_configuration(
  p_zone_id UUID,
  p_activated_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Get workspace_id
  SELECT workspace_id INTO v_workspace_id
  FROM public.zone_configurations
  WHERE id = p_zone_id;

  -- Deactivate all other versions in the same workspace with the same name
  UPDATE public.zone_configurations
  SET
    active = false,
    deactivated_by = p_activated_by,
    deactivated_at = now(),
    deactivation_reason = 'Replaced by newer version'
  WHERE workspace_id = v_workspace_id
    AND name = (SELECT name FROM public.zone_configurations WHERE id = p_zone_id)
    AND id != p_zone_id
    AND active = true;

  -- Activate the new version
  UPDATE public.zone_configurations
  SET
    active = true,
    activated_by = p_activated_by,
    activated_at = now()
  WHERE id = p_zone_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION activate_zone_configuration(UUID, UUID) TO authenticated;

-- Function to get active zones for a workspace
CREATE OR REPLACE FUNCTION get_active_zones(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  boundary GEOMETRY,
  centroid GEOMETRY,
  version INTEGER,
  activated_at TIMESTAMPTZ,
  zone_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    zc.id,
    zc.name,
    zc.boundary,
    zc.centroid,
    zc.version,
    zc.activated_at,
    zc.zone_type
  FROM public.zone_configurations zc
  WHERE zc.workspace_id = p_workspace_id
    AND zc.active = true
  ORDER BY zc.priority DESC, zc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_zones(UUID) TO authenticated;
-- Create storage buckets for VLMS and driver documents
-- Required for file upload/download functionality

-- ============================================================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================================================

-- VLMS Documents Bucket (maintenance records, inspection reports, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vlms-documents',
  'vlms-documents',
  false, -- Not public, requires authentication
  10485760, -- 10MB max file size
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- VLMS Photos Bucket (vehicle photos, incident photos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vlms-photos',
  'vlms-photos',
  false, -- Not public, requires authentication
  5242880, -- 5MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- General Documents Bucket (driver documents, certificates, licenses, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Not public, requires authentication
  10485760, -- 10MB max file size
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. CREATE RLS POLICIES FOR VLMS-DOCUMENTS
-- ============================================================================

-- Allow authenticated users to upload documents
DROP POLICY IF EXISTS "Authenticated users can upload VLMS documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload VLMS documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vlms-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view documents
DROP POLICY IF EXISTS "Authenticated users can view VLMS documents" ON storage.objects;
CREATE POLICY "Authenticated users can view VLMS documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vlms-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their own documents
DROP POLICY IF EXISTS "Authenticated users can update VLMS documents" ON storage.objects;
CREATE POLICY "Authenticated users can update VLMS documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vlms-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete documents
DROP POLICY IF EXISTS "Authenticated users can delete VLMS documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete VLMS documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vlms-documents' AND
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- 3. CREATE RLS POLICIES FOR VLMS-PHOTOS
-- ============================================================================

-- Allow authenticated users to upload photos
DROP POLICY IF EXISTS "Authenticated users can upload VLMS photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload VLMS photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vlms-photos' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view photos
DROP POLICY IF EXISTS "Authenticated users can view VLMS photos" ON storage.objects;
CREATE POLICY "Authenticated users can view VLMS photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vlms-photos' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their own photos
DROP POLICY IF EXISTS "Authenticated users can update VLMS photos" ON storage.objects;
CREATE POLICY "Authenticated users can update VLMS photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vlms-photos' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete photos
DROP POLICY IF EXISTS "Authenticated users can delete VLMS photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete VLMS photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vlms-photos' AND
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR DOCUMENTS
-- ============================================================================

-- Allow authenticated users to upload documents
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view documents
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update documents
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete documents
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_buckets_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_buckets_count
  FROM storage.buckets
  WHERE id IN ('vlms-documents', 'vlms-photos', 'documents');

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Storage Buckets Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Buckets created: %', v_buckets_count;
  RAISE NOTICE 'Expected: 3 (vlms-documents, vlms-photos, documents)';
  RAISE NOTICE '';
  RAISE NOTICE 'Bucket Details:';
  RAISE NOTICE '- vlms-documents: 10MB limit, office documents + PDFs';
  RAISE NOTICE '- vlms-photos: 5MB limit, images only';
  RAISE NOTICE '- documents: 10MB limit, mixed documents + images';
  RAISE NOTICE '';
  RAISE NOTICE 'All buckets have RLS enabled with authenticated user access';
  RAISE NOTICE '=================================================================';
END $$;
