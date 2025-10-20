-- Phase 1: Enable RLS on all exposed tables
ALTER TABLE delivery_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Add missing columns to delivery_batches
ALTER TABLE delivery_batches 
ADD COLUMN IF NOT EXISTS total_weight NUMERIC,
ADD COLUMN IF NOT EXISTS total_volume NUMERIC,
ADD COLUMN IF NOT EXISTS payload_utilization_pct NUMERIC,
ADD COLUMN IF NOT EXISTS route_optimization_method TEXT DEFAULT 'client',
ADD COLUMN IF NOT EXISTS route_constraints JSONB,
ADD COLUMN IF NOT EXISTS external_route_data JSONB;

-- Create payload_items table
CREATE TABLE IF NOT EXISTS payload_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES delivery_batches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  weight_kg NUMERIC NOT NULL,
  volume_m3 NUMERIC NOT NULL,
  temperature_required BOOLEAN DEFAULT FALSE,
  handling_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create handoffs table
CREATE TABLE IF NOT EXISTS handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  to_vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  from_batch_id UUID NOT NULL REFERENCES delivery_batches(id),
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  scheduled_time TIMESTAMPTZ,
  actual_time TIMESTAMPTZ,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Create zone_alerts table
CREATE TABLE IF NOT EXISTS zone_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES service_zones(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('entry', 'exit')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Add handoff reference to route_history
ALTER TABLE route_history ADD COLUMN IF NOT EXISTS handoff_id UUID REFERENCES handoffs(id);

-- Enable RLS on new tables
ALTER TABLE payload_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payload_items
CREATE POLICY "Authenticated users can view payload items"
  ON payload_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage payload items"
  ON payload_items FOR ALL
  USING (has_role(auth.uid(), 'warehouse_officer') OR has_role(auth.uid(), 'system_admin'));

-- Create RLS policies for handoffs
CREATE POLICY "Authenticated users can view handoffs"
  ON handoffs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage handoffs"
  ON handoffs FOR ALL
  USING (has_role(auth.uid(), 'warehouse_officer') OR has_role(auth.uid(), 'system_admin'));

-- Create RLS policies for zone_alerts
CREATE POLICY "Authenticated users can view zone alerts"
  ON zone_alerts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can create zone alerts"
  ON zone_alerts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can acknowledge zone alerts"
  ON zone_alerts FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE payload_items;
ALTER PUBLICATION supabase_realtime ADD TABLE handoffs;
ALTER PUBLICATION supabase_realtime ADD TABLE zone_alerts;