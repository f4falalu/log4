-- =====================================================
-- VLMS VEHICLE ONBOARDING - PHASE 1
-- Migration: Create vehicle_tiers table
-- Purpose: Optional normalized tier storage for capacity planning
-- =====================================================

-- Create vehicle_tiers table
CREATE TABLE IF NOT EXISTS vehicle_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vlms_vehicles(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  tier_order INT NOT NULL,
  max_weight_kg NUMERIC,
  max_volume_m3 NUMERIC,
  description TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_tiers_vehicle
  ON vehicle_tiers(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_tiers_vehicle_order
  ON vehicle_tiers(vehicle_id, tier_order);

-- Add unique constraint: one tier name per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_tiers_vehicle_name_unique
  ON vehicle_tiers(vehicle_id, tier_name);

-- Add comments for documentation
COMMENT ON TABLE vehicle_tiers IS 'Normalized tier storage for vehicle capacity planning (synced with vlms_vehicles.tiered_config)';
COMMENT ON COLUMN vehicle_tiers.tier_name IS 'Tier name (e.g., Lower, Middle, Upper, Cargo Box)';
COMMENT ON COLUMN vehicle_tiers.tier_order IS 'Tier ordering (1 = bottom/first tier)';
COMMENT ON COLUMN vehicle_tiers.max_weight_kg IS 'Maximum weight capacity for this tier in kilograms';
COMMENT ON COLUMN vehicle_tiers.max_volume_m3 IS 'Maximum volume capacity for this tier in cubic meters';

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE vehicle_tiers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read vehicle tiers
CREATE POLICY "Allow read access to vehicle_tiers for authenticated users"
  ON vehicle_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert tiers for vehicles they can access
CREATE POLICY "Allow insert on vehicle_tiers for authenticated users"
  ON vehicle_tiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vlms_vehicles
      WHERE vlms_vehicles.id = vehicle_id
    )
  );

-- Allow updating tiers for vehicles the user can access
CREATE POLICY "Allow update on vehicle_tiers for authenticated users"
  ON vehicle_tiers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vlms_vehicles
      WHERE vlms_vehicles.id = vehicle_id
    )
  );

-- Allow deleting tiers for vehicles the user can access
CREATE POLICY "Allow delete on vehicle_tiers for authenticated users"
  ON vehicle_tiers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vlms_vehicles
      WHERE vlms_vehicles.id = vehicle_id
    )
  );

-- =====================================================
-- HELPER FUNCTION: Sync Tiers from JSONB Config
-- =====================================================

CREATE OR REPLACE FUNCTION sync_vehicle_tiers_from_config(
  p_vehicle_id uuid,
  p_tier_config JSONB
)
RETURNS void AS $$
DECLARE
  tier JSONB;
BEGIN
  -- Delete existing tiers for this vehicle
  DELETE FROM vehicle_tiers WHERE vehicle_id = p_vehicle_id;

  -- If tier_config is null or empty, we're done
  IF p_tier_config IS NULL OR jsonb_array_length(p_tier_config) = 0 THEN
    RETURN;
  END IF;

  -- Insert new tiers from config
  FOR tier IN SELECT * FROM jsonb_array_elements(p_tier_config)
  LOOP
    INSERT INTO vehicle_tiers (
      vehicle_id,
      tier_name,
      tier_order,
      max_weight_kg,
      max_volume_m3
    ) VALUES (
      p_vehicle_id,
      tier->>'tier_name',
      (tier->>'tier_order')::INT,
      (tier->>'max_weight_kg')::NUMERIC,
      (tier->>'max_volume_m3')::NUMERIC
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_vehicle_tiers_from_config IS 'Sync vehicle_tiers table from vlms_vehicles.tiered_config JSONB';

-- =====================================================
-- TRIGGER: Auto-sync tiers when tiered_config changes
-- =====================================================

CREATE OR REPLACE FUNCTION auto_sync_vehicle_tiers()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if tiered_config has changed or is being set
  IF (TG_OP = 'INSERT' AND NEW.tiered_config IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND (OLD.tiered_config IS DISTINCT FROM NEW.tiered_config))
  THEN
    PERFORM sync_vehicle_tiers_from_config(NEW.id, NEW.tiered_config);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_sync_vehicle_tiers
  AFTER INSERT OR UPDATE ON vlms_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_vehicle_tiers();

COMMENT ON TRIGGER trigger_auto_sync_vehicle_tiers ON vlms_vehicles IS 'Auto-sync vehicle_tiers from tiered_config JSONB changes';

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_vehicle_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_tiers_updated_at
  BEFORE UPDATE ON vehicle_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_tiers_updated_at();

-- =====================================================
-- HELPER VIEW: Vehicles with Aggregated Tier Stats
-- =====================================================

CREATE OR REPLACE VIEW vlms_vehicles_with_tier_stats AS
SELECT
  v.*,
  COUNT(vt.id) as tier_count,
  SUM(vt.max_weight_kg) as total_tier_weight_kg,
  SUM(vt.max_volume_m3) as total_tier_volume_m3,
  jsonb_agg(
    jsonb_build_object(
      'tier_name', vt.tier_name,
      'tier_order', vt.tier_order,
      'max_weight_kg', vt.max_weight_kg,
      'max_volume_m3', vt.max_volume_m3
    ) ORDER BY vt.tier_order
  ) FILTER (WHERE vt.id IS NOT NULL) as tiers
FROM vlms_vehicles v
LEFT JOIN vehicle_tiers vt ON v.id = vt.vehicle_id
GROUP BY v.id;

COMMENT ON VIEW vlms_vehicles_with_tier_stats IS 'Vehicles with aggregated tier statistics for capacity planning';

-- Grant access to view
GRANT SELECT ON vlms_vehicles_with_tier_stats TO authenticated;
