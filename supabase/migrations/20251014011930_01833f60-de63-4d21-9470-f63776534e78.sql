-- Create service_zones table for GIS polygons
CREATE TABLE public.service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  geometry JSONB NOT NULL,
  color TEXT DEFAULT '#1D6AFF',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view zones"
  ON public.service_zones
  FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Admins can manage zones"
  ON public.service_zones
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'system_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "Warehouse officers can manage zones"
  ON public.service_zones
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'warehouse_officer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'warehouse_officer'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_service_zones_updated_at
  BEFORE UPDATE ON public.service_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_zones;