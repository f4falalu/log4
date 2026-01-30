-- Create the operational zones table
CREATE TABLE IF NOT EXISTS public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  type TEXT NOT NULL DEFAULT 'operational',
  description TEXT,
  region_center JSONB, -- { lat: number, lng: number }
  zone_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_zones_is_active ON public.zones(is_active);
CREATE INDEX IF NOT EXISTS idx_zones_type ON public.zones(type);
CREATE INDEX IF NOT EXISTS idx_zones_name ON public.zones(name);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_zones_updated_at();

-- Enable RLS
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read zones
CREATE POLICY "Authenticated users can read zones"
  ON public.zones FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert zones
CREATE POLICY "Authenticated users can insert zones"
  ON public.zones FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update zones
CREATE POLICY "Authenticated users can update zones"
  ON public.zones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete zones
CREATE POLICY "Authenticated users can delete zones"
  ON public.zones FOR DELETE
  TO authenticated
  USING (true);
