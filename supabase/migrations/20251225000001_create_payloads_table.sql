-- Create payloads table for draft payload planning
-- This table stores draft payloads before they're converted to delivery_batches

CREATE TABLE IF NOT EXISTS payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'ready', 'finalized')) DEFAULT 'draft',
  total_weight_kg FLOAT DEFAULT 0,
  total_volume_m3 FLOAT DEFAULT 0,
  utilization_pct FLOAT DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update payload_items to reference payloads table (in addition to batch_id)
ALTER TABLE payload_items
ADD COLUMN IF NOT EXISTS payload_id UUID REFERENCES payloads(id) ON DELETE CASCADE;

-- Make batch_id nullable since we use payload_id for draft items
ALTER TABLE payload_items
ALTER COLUMN batch_id DROP NOT NULL;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_payloads_vehicle_id ON payloads(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_payloads_workspace_id ON payloads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payloads_status ON payloads(status);
CREATE INDEX IF NOT EXISTS idx_payload_items_payload_id ON payload_items(payload_id);

-- Enable RLS
ALTER TABLE payloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payloads
CREATE POLICY "Enable read access for authenticated users"
  ON payloads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable all operations for authenticated users"
  ON payloads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE payloads;

-- Function to update payload totals when items change
CREATE OR REPLACE FUNCTION update_payload_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent payload's totals
  UPDATE payloads
  SET
    total_weight_kg = (
      SELECT COALESCE(SUM(weight_kg * quantity), 0)
      FROM payload_items
      WHERE payload_id = COALESCE(NEW.payload_id, OLD.payload_id)
    ),
    total_volume_m3 = (
      SELECT COALESCE(SUM(volume_m3), 0)
      FROM payload_items
      WHERE payload_id = COALESCE(NEW.payload_id, OLD.payload_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.payload_id, OLD.payload_id);

  -- Calculate utilization if vehicle is assigned
  UPDATE payloads p
  SET utilization_pct = CASE
    WHEN v.capacity_volume_m3 > 0 THEN
      LEAST((p.total_volume_m3 / v.capacity_volume_m3) * 100, 100)
    ELSE 0
  END
  FROM vehicles v
  WHERE p.vehicle_id = v.id
    AND p.id = COALESCE(NEW.payload_id, OLD.payload_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update payload totals
DROP TRIGGER IF EXISTS trigger_update_payload_totals ON payload_items;
CREATE TRIGGER trigger_update_payload_totals
  AFTER INSERT OR UPDATE OR DELETE ON payload_items
  FOR EACH ROW
  EXECUTE FUNCTION update_payload_totals();

-- Function to update payload totals when vehicle changes
CREATE OR REPLACE FUNCTION update_payload_utilization_on_vehicle_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate utilization when vehicle is assigned/changed
  IF NEW.vehicle_id IS NOT NULL THEN
    UPDATE payloads
    SET utilization_pct = CASE
      WHEN v.capacity_volume_m3 > 0 THEN
        LEAST((NEW.total_volume_m3 / v.capacity_volume_m3) * 100, 100)
      ELSE 0
    END
    FROM vehicles v
    WHERE payloads.id = NEW.id AND v.id = NEW.vehicle_id;
  ELSE
    UPDATE payloads
    SET utilization_pct = 0
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for vehicle change
DROP TRIGGER IF EXISTS trigger_update_utilization_on_vehicle_change ON payloads;
CREATE TRIGGER trigger_update_utilization_on_vehicle_change
  AFTER UPDATE OF vehicle_id ON payloads
  FOR EACH ROW
  WHEN (OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id)
  EXECUTE FUNCTION update_payload_utilization_on_vehicle_change();

-- Updated timestamp trigger for payloads
CREATE OR REPLACE FUNCTION update_payloads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payloads_timestamp ON payloads;
CREATE TRIGGER trigger_update_payloads_timestamp
  BEFORE UPDATE ON payloads
  FOR EACH ROW
  EXECUTE FUNCTION update_payloads_updated_at();
