-- Create delivery_schedules table
CREATE TABLE IF NOT EXISTS delivery_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) NOT NULL,
  planned_date date NOT NULL,
  time_window text CHECK (time_window IN ('morning', 'afternoon', 'evening', 'all_day')),
  route jsonb,
  vehicle_id uuid REFERENCES vehicles(id),
  driver_id uuid REFERENCES drivers(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'exported', 'dispatched', 'cancelled')),
  total_payload_kg numeric DEFAULT 0,
  total_volume_m3 numeric DEFAULT 0,
  facility_ids uuid[] NOT NULL DEFAULT '{}',
  optimization_method text CHECK (optimization_method IN ('manual', 'ai_optimized')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  dispatched_at timestamptz,
  notes text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_date ON delivery_schedules(planned_date);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_warehouse ON delivery_schedules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_status ON delivery_schedules(status);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_vehicle ON delivery_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_driver ON delivery_schedules(driver_id);

-- Enable RLS
ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view delivery schedules"
  ON delivery_schedules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage delivery schedules"
  ON delivery_schedules FOR ALL
  USING (
    has_role(auth.uid(), 'warehouse_officer'::app_role) OR 
    has_role(auth.uid(), 'system_admin'::app_role)
  );

-- Trigger for updated_at
CREATE TRIGGER update_delivery_schedules_updated_at
  BEFORE UPDATE ON delivery_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();