-- Add missing fields to drivers table
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS license_expiry DATE,
ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS on_time_percentage NUMERIC DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS license_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Create driver_vehicle_history table
CREATE TABLE IF NOT EXISTS driver_vehicle_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  total_trips INTEGER DEFAULT 0,
  total_distance NUMERIC DEFAULT 0,
  is_current BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_vehicle_history_driver ON driver_vehicle_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_history_vehicle ON driver_vehicle_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_history_current ON driver_vehicle_history(driver_id, is_current) WHERE is_current = true;

-- Enable RLS
ALTER TABLE driver_vehicle_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view driver vehicle history"
  ON driver_vehicle_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage driver vehicle history"
  ON driver_vehicle_history FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Create function to get driver's vehicles
CREATE OR REPLACE FUNCTION get_driver_vehicles(p_driver_id UUID)
RETURNS TABLE (
  vehicle_id UUID,
  plate_number TEXT,
  model TEXT,
  type TEXT,
  photo_url TEXT,
  thumbnail_url TEXT,
  ai_generated BOOLEAN,
  capacity NUMERIC,
  fuel_type TEXT,
  avg_speed INTEGER,
  is_current BOOLEAN,
  assigned_at TIMESTAMPTZ,
  total_trips INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.plate_number,
    v.model,
    v.type,
    v.photo_url,
    v.thumbnail_url,
    v.ai_generated,
    v.capacity,
    v.fuel_type::TEXT,
    v.avg_speed,
    dvh.is_current,
    dvh.assigned_at,
    dvh.total_trips
  FROM driver_vehicle_history dvh
  JOIN vehicles v ON v.id = dvh.vehicle_id
  WHERE dvh.driver_id = p_driver_id
  ORDER BY dvh.is_current DESC, dvh.assigned_at DESC;
END;
$$;