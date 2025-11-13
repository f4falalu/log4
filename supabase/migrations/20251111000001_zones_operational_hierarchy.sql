-- =====================================================
-- BIKO Zones Operational Hierarchy Implementation
-- =====================================================
-- Creates zones table, lgas table, and adds zone_id foreign keys
-- to existing tables for denormalized zone referencing

-- =====================================================
-- PART 1: Create zones table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  region_center JSONB, -- {lat: number, lng: number}
  zone_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for zones
CREATE INDEX IF NOT EXISTS idx_zones_code ON public.zones(code);
CREATE INDEX IF NOT EXISTS idx_zones_manager ON public.zones(zone_manager_id);
CREATE INDEX IF NOT EXISTS idx_zones_active ON public.zones(is_active);

-- Add comment
COMMENT ON TABLE public.zones IS 'Top-level operational units that group warehouses, LGAs, and facilities';

-- =====================================================
-- PART 2: Create lgas table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lgas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  state TEXT DEFAULT 'kano',
  population INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for lgas
CREATE INDEX IF NOT EXISTS idx_lgas_zone_id ON public.lgas(zone_id);
CREATE INDEX IF NOT EXISTS idx_lgas_warehouse_id ON public.lgas(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_lgas_state ON public.lgas(state);
CREATE INDEX IF NOT EXISTS idx_lgas_name ON public.lgas(name);

-- Add comment
COMMENT ON TABLE public.lgas IS 'Local Government Areas - service areas within zones';

-- =====================================================
-- PART 3: Add zone_id to existing tables (denormalized)
-- =====================================================

-- Add zone_id to warehouses
ALTER TABLE public.warehouses 
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_warehouses_zone_id ON public.warehouses(zone_id);

-- Add zone_id to facilities (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'facilities' 
    AND column_name = 'zone_id'
  ) THEN
    ALTER TABLE public.facilities 
      ADD COLUMN zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_facilities_zone_id ON public.facilities(zone_id);
  END IF;
END $$;

-- Add zone_id to fleets (for zone-based operations)
ALTER TABLE public.fleets 
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fleets_zone_id ON public.fleets(zone_id);

-- =====================================================
-- PART 4: Create zone_metrics view for analytics
-- =====================================================

CREATE OR REPLACE VIEW public.zone_metrics AS
SELECT 
  z.id as zone_id,
  z.name as zone_name,
  z.code as zone_code,
  z.is_active,
  COUNT(DISTINCT w.id) as warehouse_count,
  COUNT(DISTINCT l.id) as lga_count,
  COUNT(DISTINCT f.id) as facility_count,
  COUNT(DISTINCT fl.id) as fleet_count,
  z.created_at,
  z.updated_at
FROM public.zones z
LEFT JOIN public.warehouses w ON w.zone_id = z.id
LEFT JOIN public.lgas l ON l.zone_id = z.id
LEFT JOIN public.facilities f ON f.zone_id = z.id
LEFT JOIN public.fleets fl ON fl.zone_id = z.id
GROUP BY z.id, z.name, z.code, z.is_active, z.created_at, z.updated_at;

COMMENT ON VIEW public.zone_metrics IS 'Aggregated metrics for each zone including counts of warehouses, LGAs, facilities, and fleets';

-- =====================================================
-- PART 5: Create zone_facility_hierarchy view
-- =====================================================

CREATE OR REPLACE VIEW public.zone_facility_hierarchy AS
SELECT 
  z.id as zone_id,
  z.name as zone_name,
  z.code as zone_code,
  w.id as warehouse_id,
  w.name as warehouse_name,
  l.id as lga_id,
  l.name as lga_name,
  f.id as facility_id,
  f.name as facility_name,
  f.type as facility_type,
  f.lat as facility_lat,
  f.lng as facility_lng
FROM public.zones z
LEFT JOIN public.warehouses w ON w.zone_id = z.id
LEFT JOIN public.lgas l ON l.zone_id = z.id
LEFT JOIN public.facilities f ON f.zone_id = z.id
WHERE z.is_active = true;

COMMENT ON VIEW public.zone_facility_hierarchy IS 'Complete hierarchical view of zones → warehouses → LGAs → facilities';

-- =====================================================
-- PART 6: Create triggers for updated_at
-- =====================================================

CREATE TRIGGER zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER lgas_updated_at
  BEFORE UPDATE ON public.lgas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART 7: Enable Row Level Security
-- =====================================================

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgas ENABLE ROW LEVEL SECURITY;

-- Permissive policies for zones
CREATE POLICY "Allow all operations on zones"
  ON public.zones FOR ALL
  USING (true)
  WITH CHECK (true);

-- Permissive policies for lgas
CREATE POLICY "Allow all operations on lgas"
  ON public.lgas FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PART 8: Enable Realtime
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.zones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lgas;

-- =====================================================
-- PART 9: Seed default zones and LGAs
-- =====================================================

-- Insert default zones for Kano State
INSERT INTO public.zones (id, name, code, description, is_active, region_center) VALUES
  ('zone-central-1111-1111-111111111111', 'Central Zone', 'CZ01', 'Central Kano operational zone', true, '{"lat": 12.0022, "lng": 8.5919}'),
  ('zone-eastern-2222-2222-222222222222', 'Eastern Zone', 'EZ02', 'Eastern Kano operational zone', true, '{"lat": 11.8500, "lng": 8.7000}'),
  ('zone-western-3333-3333-333333333333', 'Western Zone', 'WZ03', 'Western Kano operational zone', true, '{"lat": 11.9000, "lng": 8.4000}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample LGAs for Central Zone
INSERT INTO public.lgas (id, name, zone_id, state) VALUES
  ('lga-dala-1111-1111-111111111111', 'Dala', 'zone-central-1111-1111-111111111111', 'kano'),
  ('lga-tarauni-2222-2222-222222222222', 'Tarauni', 'zone-central-1111-1111-111111111111', 'kano'),
  ('lga-nassarawa-3333-3333-333333333333', 'Nassarawa', 'zone-central-1111-1111-111111111111', 'kano'),
  ('lga-gwale-4444-4444-444444444444', 'Gwale', 'zone-central-1111-1111-111111111111', 'kano')
ON CONFLICT (id) DO NOTHING;

-- Insert sample LGAs for Eastern Zone
INSERT INTO public.lgas (id, name, zone_id, state) VALUES
  ('lga-gaya-5555-5555-555555555555', 'Gaya', 'zone-eastern-2222-2222-222222222222', 'kano'),
  ('lga-albasu-6666-6666-666666666666', 'Albasu', 'zone-eastern-2222-2222-222222222222', 'kano'),
  ('lga-ajingi-7777-7777-777777777777', 'Ajingi', 'zone-eastern-2222-2222-222222222222', 'kano')
ON CONFLICT (id) DO NOTHING;

-- Insert sample LGAs for Western Zone
INSERT INTO public.lgas (id, name, zone_id, state) VALUES
  ('lga-kabo-8888-8888-888888888888', 'Kabo', 'zone-western-3333-3333-333333333333', 'kano'),
  ('lga-bunkure-9999-9999-999999999999', 'Bunkure', 'zone-western-3333-3333-333333333333', 'kano')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 10: Assign existing warehouses to zones
-- =====================================================

-- Assign existing warehouses to Central Zone by default
UPDATE public.warehouses
SET zone_id = 'zone-central-1111-1111-111111111111'
WHERE zone_id IS NULL;

-- =====================================================
-- PART 11: Assign existing facilities to zones based on LGA
-- =====================================================

-- Update facilities to assign zone_id based on their lga field
UPDATE public.facilities f
SET zone_id = l.zone_id
FROM public.lgas l
WHERE f.lga = l.name AND f.zone_id IS NULL;

-- For facilities without matching LGA, assign to Central Zone
UPDATE public.facilities
SET zone_id = 'zone-central-1111-1111-111111111111'
WHERE zone_id IS NULL;

-- =====================================================
-- PART 12: Create helper functions
-- =====================================================

-- Function to get zone summary
CREATE OR REPLACE FUNCTION public.get_zone_summary(zone_uuid UUID)
RETURNS TABLE (
  zone_name TEXT,
  warehouse_count BIGINT,
  lga_count BIGINT,
  facility_count BIGINT,
  fleet_count BIGINT,
  active_dispatches BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    z.name,
    COUNT(DISTINCT w.id) as warehouse_count,
    COUNT(DISTINCT l.id) as lga_count,
    COUNT(DISTINCT f.id) as facility_count,
    COUNT(DISTINCT fl.id) as fleet_count,
    COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('assigned', 'in-progress')) as active_dispatches
  FROM public.zones z
  LEFT JOIN public.warehouses w ON w.zone_id = z.id
  LEFT JOIN public.lgas l ON l.zone_id = z.id
  LEFT JOIN public.facilities f ON f.zone_id = z.id
  LEFT JOIN public.fleets fl ON fl.zone_id = z.id
  LEFT JOIN public.delivery_batches b ON b.warehouse_id = w.id
  WHERE z.id = zone_uuid
  GROUP BY z.name;
END;
$$ LANGUAGE plpgsql;

-- Function to reassign warehouse to new zone
CREATE OR REPLACE FUNCTION public.reassign_warehouse_to_zone(
  warehouse_uuid UUID,
  new_zone_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update warehouse zone
  UPDATE public.warehouses
  SET zone_id = new_zone_uuid, updated_at = now()
  WHERE id = warehouse_uuid;
  
  -- Update all facilities served by this warehouse
  UPDATE public.facilities
  SET zone_id = new_zone_uuid, updated_at = now()
  WHERE warehouse_id = warehouse_uuid;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

COMMENT ON SCHEMA public IS 'BIKO Zones operational hierarchy implemented successfully';
