-- =======================================================
--  BIKO Fleet Management + Payload System Schema
-- =======================================================

-- 1. Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Fleets Table
CREATE TABLE IF NOT EXISTS fleets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_fleet_id UUID REFERENCES fleets(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id),
  service_area_id UUID REFERENCES service_zones(id),
  zone_id UUID REFERENCES service_zones(id),
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  mission TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Vehicles Table Updates
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS fleet_id UUID REFERENCES fleets(id),
ADD COLUMN IF NOT EXISTS capacity_volume_m3 FLOAT,
ADD COLUMN IF NOT EXISTS capacity_weight_kg FLOAT,
ADD COLUMN IF NOT EXISTS ai_capacity_image_url TEXT;

-- 4. Enhanced Payload Items Table (replacing existing basic version)
DROP TABLE IF EXISTS payload_items CASCADE;
CREATE TABLE payload_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES delivery_batches(id),
  facility_id UUID REFERENCES facilities(id),
  box_type TEXT CHECK (box_type IN ('small','medium','large','custom')),
  custom_length_cm FLOAT,
  custom_width_cm FLOAT,
  custom_height_cm FLOAT,
  quantity INT DEFAULT 1,
  weight_kg FLOAT,
  volume_m3 FLOAT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create function for volume calculation (PostgreSQL compatible)
CREATE OR REPLACE FUNCTION calculate_payload_volume()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.box_type = 'small' THEN
    NEW.volume_m3 := 0.091 * NEW.quantity;
  ELSIF NEW.box_type = 'medium' THEN
    NEW.volume_m3 := 0.142 * NEW.quantity;
  ELSIF NEW.box_type = 'large' THEN
    NEW.volume_m3 := 0.288 * NEW.quantity;
  ELSIF NEW.box_type = 'custom' AND NEW.custom_length_cm IS NOT NULL 
    AND NEW.custom_width_cm IS NOT NULL AND NEW.custom_height_cm IS NOT NULL THEN
    NEW.volume_m3 := (NEW.custom_length_cm * NEW.custom_width_cm * NEW.custom_height_cm) / 1000000 * NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic volume calculation
CREATE TRIGGER payload_volume_trigger
  BEFORE INSERT OR UPDATE ON payload_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_payload_volume();

-- 5. Delivery Batches Table Updates
ALTER TABLE delivery_batches
ADD COLUMN IF NOT EXISTS payload_utilization_pct FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_distance_km FLOAT,
ADD COLUMN IF NOT EXISTS estimated_duration_min FLOAT;

-- =======================================================
--  RLS (Row-Level Security) Policies
-- =======================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payload_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vendors"
  ON vendors FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System admins can manage vendors"
  ON vendors FOR ALL
  USING (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Authenticated users can view fleets"
  ON fleets FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers and admins can modify fleets"
  ON fleets FOR ALL
  USING (has_role(auth.uid(), 'warehouse_officer') OR has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Authenticated users can view payload items"
  ON payload_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage payload items"
  ON payload_items FOR ALL
  USING (has_role(auth.uid(), 'warehouse_officer') OR has_role(auth.uid(), 'system_admin'));

-- =======================================================
--  Realtime Subscriptions
-- =======================================================

ALTER PUBLICATION supabase_realtime ADD TABLE vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE fleets;
ALTER PUBLICATION supabase_realtime ADD TABLE payload_items;

-- =======================================================
--  Performance Indexes
-- =======================================================

CREATE INDEX IF NOT EXISTS idx_fleets_parent_fleet_id ON fleets(parent_fleet_id);
CREATE INDEX IF NOT EXISTS idx_fleets_vendor_id ON fleets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_fleets_service_area_id ON fleets(service_area_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_fleet_id ON vehicles(fleet_id);
CREATE INDEX IF NOT EXISTS idx_payload_items_facility_id ON payload_items(facility_id);
CREATE INDEX IF NOT EXISTS idx_payload_items_batch_id ON payload_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_payload_items_status ON payload_items(status);

-- =======================================================
--  Sample Data for Development
-- =======================================================

INSERT INTO vendors (name, contact_name, contact_phone, email, address) VALUES
('BIKO Logistics', 'John Manager', '+234-800-BIKO-001', 'fleet@biko.ng', 'Lagos, Nigeria'),
('Partner Transport Co', 'Sarah Wilson', '+234-800-PART-002', 'ops@partnertransport.ng', 'Abuja, Nigeria'),
('Regional Delivery Services', 'Mike Johnson', '+234-800-REGI-003', 'contact@regionaldelivery.ng', 'Kano, Nigeria')
ON CONFLICT DO NOTHING;

-- Insert sample fleets
INSERT INTO fleets (name, vendor_id, status, mission) 
SELECT 
  'Main Fleet', 
  v.id, 
  'active', 
  'Primary delivery operations for Lagos and surrounding areas'
FROM vendors v WHERE v.name = 'BIKO Logistics'
ON CONFLICT DO NOTHING;

INSERT INTO fleets (name, vendor_id, status, mission)
SELECT 
  'Northern Operations', 
  v.id, 
  'active', 
  'Specialized fleet for northern Nigeria operations'
FROM vendors v WHERE v.name = 'Regional Delivery Services'
ON CONFLICT DO NOTHING;

-- Update existing vehicles with capacity information
UPDATE vehicles 
SET 
  capacity_volume_m3 = CASE 
    WHEN type = 'truck' THEN 15.0
    WHEN type = 'van' THEN 8.0
    WHEN type = 'pickup' THEN 3.0
    WHEN type = 'car' THEN 1.5
    ELSE 5.0
  END,
  capacity_weight_kg = CASE 
    WHEN type = 'truck' THEN 5000
    WHEN type = 'van' THEN 2000
    WHEN type = 'pickup' THEN 1000
    WHEN type = 'car' THEN 500
    ELSE 1500
  END
WHERE capacity_volume_m3 IS NULL OR capacity_weight_kg IS NULL;
