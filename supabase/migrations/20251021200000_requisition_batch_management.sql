-- =====================================================
-- BIKO REQUISITION MANAGEMENT & BATCH PLANNING SCHEMA
-- =====================================================

-- Create requisitions table
CREATE TABLE IF NOT EXISTS requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  created_by UUID, -- References profiles/users when auth is implemented
  approved_by UUID, -- References profiles/users when auth is implemented
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'completed')),
  requisition_type TEXT DEFAULT 'routine' CHECK (requisition_type IN ('routine', 'emergency')),
  requisition_number TEXT UNIQUE NOT NULL,
  total_items INTEGER DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  total_weight NUMERIC DEFAULT 0,
  invoice_url TEXT,
  expected_delivery_date DATE,
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create requisition_items table
CREATE TABLE IF NOT EXISTS requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES requisitions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  pack_size TEXT,
  unit TEXT DEFAULT 'pieces',
  weight_kg NUMERIC DEFAULT 0,
  volume_m3 NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhance delivery_batches table for comprehensive batch planning
ALTER TABLE delivery_batches 
ADD COLUMN IF NOT EXISTS requisition_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS batch_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS total_weight NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_volume NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS route_optimization_method TEXT DEFAULT 'client' CHECK (route_optimization_method IN ('client', 'api', 'manual')),
ADD COLUMN IF NOT EXISTS route_constraints JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS route_sequence JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS batch_type TEXT DEFAULT 'delivery' CHECK (batch_type IN ('delivery', 'pickup', 'mixed')),
ADD COLUMN IF NOT EXISTS origin_facility_id UUID REFERENCES facilities(id),
ADD COLUMN IF NOT EXISTS expected_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expected_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
ADD COLUMN IF NOT EXISTS special_requirements TEXT[],
ADD COLUMN IF NOT EXISTS weather_conditions TEXT,
ADD COLUMN IF NOT EXISTS traffic_conditions TEXT;

-- Enhance vehicles table for payload registration
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '{"length": 0, "width": 0, "height": 0}',
ADD COLUMN IF NOT EXISTS box_fit_calculation JSONB DEFAULT '{"small": 0, "medium": 0, "large": 0}',
ADD COLUMN IF NOT EXISTS ai_capacity_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_capacity_update TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS capacity_estimation_confidence NUMERIC DEFAULT 0;

-- Update payload_items to reference requisitions
ALTER TABLE payload_items 
ADD COLUMN IF NOT EXISTS requisition_id UUID REFERENCES requisitions(id),
ADD COLUMN IF NOT EXISTS requisition_item_id UUID REFERENCES requisition_items(id),
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES delivery_batches(id),
ADD COLUMN IF NOT EXISTS loading_sequence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_handling TEXT[],
ADD COLUMN IF NOT EXISTS temperature_requirements TEXT,
ADD COLUMN IF NOT EXISTS fragile BOOLEAN DEFAULT false;

-- Create batch_stops table for detailed route management
CREATE TABLE IF NOT EXISTS batch_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES delivery_batches(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  stop_sequence INTEGER NOT NULL,
  stop_type TEXT DEFAULT 'delivery' CHECK (stop_type IN ('pickup', 'delivery', 'waypoint')),
  estimated_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  estimated_departure TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'en_route', 'arrived', 'completed', 'skipped')),
  delivery_confirmation JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create batch_requisitions junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS batch_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES delivery_batches(id) ON DELETE CASCADE,
  requisition_id UUID REFERENCES requisitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, requisition_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_requisitions_facility_id ON requisitions(facility_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_created_at ON requisitions(created_at);
CREATE INDEX IF NOT EXISTS idx_requisitions_number ON requisitions(requisition_number);

CREATE INDEX IF NOT EXISTS idx_requisition_items_requisition_id ON requisition_items(requisition_id);
CREATE INDEX IF NOT EXISTS idx_requisition_items_item_name ON requisition_items(item_name);

CREATE INDEX IF NOT EXISTS idx_delivery_batches_batch_number ON delivery_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_status ON delivery_batches(status);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_vehicle_id ON delivery_batches(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_driver_id ON delivery_batches(driver_id);

CREATE INDEX IF NOT EXISTS idx_batch_stops_batch_id ON batch_stops(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_stops_facility_id ON batch_stops(facility_id);
CREATE INDEX IF NOT EXISTS idx_batch_stops_sequence ON batch_stops(stop_sequence);

CREATE INDEX IF NOT EXISTS idx_payload_items_requisition_id ON payload_items(requisition_id);
CREATE INDEX IF NOT EXISTS idx_payload_items_batch_id ON payload_items(batch_id);

-- Create functions for auto-calculations
CREATE OR REPLACE FUNCTION calculate_requisition_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE requisitions 
  SET 
    total_items = (
      SELECT COALESCE(SUM(quantity), 0) 
      FROM requisition_items 
      WHERE requisition_id = NEW.requisition_id
    ),
    total_volume = (
      SELECT COALESCE(SUM(volume_m3 * quantity), 0) 
      FROM requisition_items 
      WHERE requisition_id = NEW.requisition_id
    ),
    total_weight = (
      SELECT COALESCE(SUM(weight_kg * quantity), 0) 
      FROM requisition_items 
      WHERE requisition_id = NEW.requisition_id
    ),
    updated_at = NOW()
  WHERE id = NEW.requisition_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for batch number generation
CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_number IS NULL THEN
    NEW.batch_number := 'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for requisition number generation
CREATE OR REPLACE FUNCTION generate_requisition_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requisition_number IS NULL THEN
    NEW.requisition_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                             LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for box fit calculation
CREATE OR REPLACE FUNCTION calculate_box_fit()
RETURNS TRIGGER AS $$
DECLARE
  vehicle_volume NUMERIC;
  small_box_volume NUMERIC := 0.027; -- 30cm x 30cm x 30cm
  medium_box_volume NUMERIC := 0.064; -- 40cm x 40cm x 40cm  
  large_box_volume NUMERIC := 0.125; -- 50cm x 50cm x 50cm
BEGIN
  vehicle_volume := NEW.capacity_volume_m3;
  
  IF vehicle_volume > 0 THEN
    NEW.box_fit_calculation := jsonb_build_object(
      'small', FLOOR(vehicle_volume / small_box_volume),
      'medium', FLOOR(vehicle_volume / medium_box_volume),
      'large', FLOOR(vehicle_volume / large_box_volume)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_calculate_requisition_totals ON requisition_items;
CREATE TRIGGER trigger_calculate_requisition_totals
  AFTER INSERT OR UPDATE OR DELETE ON requisition_items
  FOR EACH ROW EXECUTE FUNCTION calculate_requisition_totals();

DROP TRIGGER IF EXISTS trigger_generate_batch_number ON delivery_batches;
CREATE TRIGGER trigger_generate_batch_number
  BEFORE INSERT ON delivery_batches
  FOR EACH ROW EXECUTE FUNCTION generate_batch_number();

DROP TRIGGER IF EXISTS trigger_generate_requisition_number ON requisitions;
CREATE TRIGGER trigger_generate_requisition_number
  BEFORE INSERT ON requisitions
  FOR EACH ROW EXECUTE FUNCTION generate_requisition_number();

DROP TRIGGER IF EXISTS trigger_calculate_box_fit ON vehicles;
CREATE TRIGGER trigger_calculate_box_fit
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION calculate_box_fit();

-- Enable RLS (Row Level Security)
ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_requisitions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - can be enhanced based on auth requirements)
CREATE POLICY "Enable read access for all users" ON requisitions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON requisitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON requisitions FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON requisitions FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON requisition_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON requisition_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON requisition_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON requisition_items FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON batch_stops FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON batch_stops FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON batch_stops FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON batch_stops FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON batch_requisitions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON batch_requisitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON batch_requisitions FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON batch_requisitions FOR DELETE USING (true);

-- Insert sample data for testing
INSERT INTO requisitions (facility_id, status, requisition_type, expected_delivery_date, notes) 
SELECT 
  f.id,
  CASE 
    WHEN random() < 0.3 THEN 'approved'
    WHEN random() < 0.6 THEN 'pending'
    ELSE 'draft'
  END,
  CASE WHEN random() < 0.8 THEN 'routine' ELSE 'emergency' END,
  CURRENT_DATE + (random() * 30)::integer,
  'Sample requisition for ' || f.name
FROM facilities f
LIMIT 10;

-- Insert sample requisition items
INSERT INTO requisition_items (requisition_id, item_name, quantity, unit, weight_kg, volume_m3)
SELECT 
  r.id,
  CASE (random() * 5)::integer
    WHEN 0 THEN 'Medical Supplies'
    WHEN 1 THEN 'Pharmaceuticals'
    WHEN 2 THEN 'Surgical Equipment'
    WHEN 3 THEN 'Laboratory Reagents'
    ELSE 'General Supplies'
  END,
  (random() * 50 + 1)::integer,
  'boxes',
  random() * 10 + 1,
  random() * 0.1 + 0.01
FROM requisitions r, generate_series(1, 3);

-- Update batch numbers for existing batches
UPDATE delivery_batches 
SET batch_number = 'BATCH-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || id::text
WHERE batch_number IS NULL;

COMMENT ON TABLE requisitions IS 'Facility requisition requests for supplies and materials';
COMMENT ON TABLE requisition_items IS 'Individual items within each requisition';
COMMENT ON TABLE batch_stops IS 'Detailed stop information for delivery batches';
COMMENT ON TABLE batch_requisitions IS 'Junction table linking batches to requisitions';

-- Create materialized view for dashboard analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS requisition_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  status,
  requisition_type,
  COUNT(*) as count,
  SUM(total_items) as total_items,
  SUM(total_volume) as total_volume,
  SUM(total_weight) as total_weight,
  AVG(total_items) as avg_items_per_requisition
FROM requisitions
GROUP BY DATE_TRUNC('day', created_at), status, requisition_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_requisition_analytics ON requisition_analytics(date, status, requisition_type);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW requisition_analytics;
