-- Phase 1: Enable Realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE route_history;

-- Phase 1.2 & 4.1: Enhance drivers table
ALTER TABLE drivers
ADD COLUMN location_updated_at TIMESTAMPTZ,
ADD COLUMN license_expiry DATE,
ADD COLUMN license_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN performance_score NUMERIC(3,2) DEFAULT 0.0,
ADD COLUMN total_deliveries INTEGER DEFAULT 0,
ADD COLUMN on_time_percentage NUMERIC(5,2) DEFAULT 100.0;

-- Phase 2.1: Enhance route_history table
ALTER TABLE route_history
ADD COLUMN status TEXT CHECK(status IN ('pending', 'in-transit', 'arrived', 'completed', 'skipped')) DEFAULT 'pending',
ADD COLUMN check_in_time TIMESTAMPTZ,
ADD COLUMN check_out_time TIMESTAMPTZ,
ADD COLUMN proof_of_delivery_url TEXT,
ADD COLUMN recipient_name TEXT,
ADD COLUMN delay_reason TEXT;

-- Phase 3.1: Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('info', 'warning', 'urgent', 'success')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT CHECK(related_entity_type IN ('batch', 'driver', 'vehicle', 'facility')),
  related_entity_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);

-- Enable RLS and policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Phase 4.1: Create driver_availability table
CREATE TABLE driver_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, date)
);

ALTER TABLE driver_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view driver availability"
ON driver_availability FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage driver availability"
ON driver_availability FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "Drivers can manage their own availability"
ON driver_availability FOR ALL
USING (driver_id::text = auth.uid()::text);

-- Phase 4.2: Create vehicle_maintenance table
CREATE TABLE vehicle_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  maintenance_type TEXT CHECK(maintenance_type IN ('routine', 'repair', 'inspection', 'emergency')) NOT NULL,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  description TEXT,
  cost NUMERIC(10,2),
  odometer_reading INTEGER,
  status TEXT CHECK(status IN ('scheduled', 'in-progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicle maintenance"
ON vehicle_maintenance FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage vehicle maintenance"
ON vehicle_maintenance FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Phase 4.2: Create vehicle_trips table
CREATE TABLE vehicle_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES delivery_batches(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  start_odometer INTEGER,
  end_odometer INTEGER,
  fuel_consumed NUMERIC(6,2),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicle trips"
ON vehicle_trips FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage vehicle trips"
ON vehicle_trips FOR ALL
USING (auth.role() = 'authenticated');

-- Phase 6.1: Create recurring_schedules table
CREATE TABLE recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  facility_ids UUID[] NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  recurrence_type TEXT CHECK(recurrence_type IN ('daily', 'weekly', 'biweekly', 'monthly')) NOT NULL,
  recurrence_days INTEGER[],
  scheduled_time TIME NOT NULL,
  medication_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  priority delivery_priority DEFAULT 'medium',
  active BOOLEAN DEFAULT TRUE,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recurring schedules"
ON recurring_schedules FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage recurring schedules"
ON recurring_schedules FOR ALL
USING (has_role(auth.uid(), 'warehouse_officer'::app_role) OR has_role(auth.uid(), 'system_admin'::app_role));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_maintenance;