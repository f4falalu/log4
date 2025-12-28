-- Create enum types for better data consistency
CREATE TYPE facility_type AS ENUM ('hospital', 'clinic', 'health_center', 'pharmacy', 'lab', 'other');
CREATE TYPE warehouse_type AS ENUM ('central', 'zonal', 'regional');
CREATE TYPE license_type AS ENUM ('standard', 'commercial');
CREATE TYPE driver_status AS ENUM ('available', 'busy', 'offline');
CREATE TYPE vehicle_type AS ENUM ('truck', 'van', 'pickup', 'car');
CREATE TYPE vehicle_status AS ENUM ('available', 'in-use', 'maintenance');
CREATE TYPE fuel_type AS ENUM ('diesel', 'petrol', 'electric');
CREATE TYPE batch_status AS ENUM ('planned', 'assigned', 'in-progress', 'completed', 'cancelled');
CREATE TYPE delivery_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Facilities table
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  type facility_type NOT NULL DEFAULT 'clinic',
  phone TEXT,
  contact_person TEXT,
  capacity INTEGER,
  operating_hours TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Warehouses table
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  type warehouse_type NOT NULL DEFAULT 'zonal',
  capacity INTEGER NOT NULL,
  operating_hours TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  license_type license_type NOT NULL DEFAULT 'standard',
  status driver_status NOT NULL DEFAULT 'available',
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  max_hours INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type vehicle_type NOT NULL,
  model TEXT NOT NULL,
  plate_number TEXT NOT NULL UNIQUE,
  capacity DECIMAL(10, 2) NOT NULL,
  max_weight INTEGER NOT NULL,
  fuel_type fuel_type NOT NULL,
  avg_speed INTEGER NOT NULL DEFAULT 40,
  status vehicle_status NOT NULL DEFAULT 'available',
  current_driver_id UUID REFERENCES public.drivers(id),
  fuel_efficiency DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery batches table
CREATE TABLE public.delivery_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  driver_id UUID REFERENCES public.drivers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status batch_status NOT NULL DEFAULT 'planned',
  priority delivery_priority NOT NULL DEFAULT 'medium',
  total_distance DECIMAL(10, 2) NOT NULL,
  estimated_duration INTEGER NOT NULL,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  medication_type TEXT NOT NULL,
  total_quantity INTEGER NOT NULL,
  optimized_route JSONB NOT NULL,
  facility_ids UUID[] NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Route history table for tracking actual performance
CREATE TABLE public.route_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.facilities(id),
  sequence_number INTEGER NOT NULL,
  planned_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  planned_duration INTEGER,
  actual_duration INTEGER,
  distance_from_previous DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Optimization cache table for storing computed routes
CREATE TABLE public.optimization_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  facility_ids UUID[] NOT NULL,
  warehouse_id UUID NOT NULL,
  optimized_route JSONB NOT NULL,
  total_distance DECIMAL(10, 2) NOT NULL,
  estimated_duration INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_cache ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (can be tightened later with authentication)
CREATE POLICY "Allow all operations on facilities" ON public.facilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on warehouses" ON public.warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on delivery_batches" ON public.delivery_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on route_history" ON public.route_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on optimization_cache" ON public.optimization_cache FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_facilities_type ON public.facilities(type);
CREATE INDEX idx_facilities_location ON public.facilities(lat, lng);
CREATE INDEX idx_warehouses_type ON public.warehouses(type);
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_delivery_batches_status ON public.delivery_batches(status);
CREATE INDEX idx_delivery_batches_date ON public.delivery_batches(scheduled_date);
CREATE INDEX idx_route_history_batch ON public.route_history(batch_id);
CREATE INDEX idx_optimization_cache_key ON public.optimization_cache(cache_key);
CREATE INDEX idx_optimization_cache_expires ON public.optimization_cache(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_batches_updated_at BEFORE UPDATE ON public.delivery_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('system_admin', 'warehouse_officer', 'driver', 'zonal_manager', 'viewer');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'system_admin'));

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

-- Update RLS policies for delivery_batches
DROP POLICY IF EXISTS "Allow all operations on delivery_batches" ON public.delivery_batches;

CREATE POLICY "Authenticated users can view batches"
  ON public.delivery_batches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can create batches"
  ON public.delivery_batches FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'warehouse_officer') OR 
    public.has_role(auth.uid(), 'system_admin')
  );

CREATE POLICY "Warehouse officers can update batches"
  ON public.delivery_batches FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'warehouse_officer') OR 
    public.has_role(auth.uid(), 'system_admin')
  );

CREATE POLICY "Drivers can update their assigned batches"
  ON public.delivery_batches FOR UPDATE
  USING (driver_id::text = auth.uid()::text);

-- Update RLS policies for drivers
DROP POLICY IF EXISTS "Allow all operations on drivers" ON public.drivers;

CREATE POLICY "Authenticated users can view drivers"
  ON public.drivers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage drivers"
  ON public.drivers FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Drivers can update their own location and status"
  ON public.drivers FOR UPDATE
  USING (id::text = auth.uid()::text);

-- Update RLS policies for facilities
DROP POLICY IF EXISTS "Allow all operations on facilities" ON public.facilities;

CREATE POLICY "Authenticated users can view facilities"
  ON public.facilities FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage facilities"
  ON public.facilities FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

-- Update RLS policies for vehicles
DROP POLICY IF EXISTS "Allow all operations on vehicles" ON public.vehicles;

CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

-- Update RLS policies for warehouses
DROP POLICY IF EXISTS "Allow all operations on warehouses" ON public.warehouses;

CREATE POLICY "Authenticated users can view warehouses"
  ON public.warehouses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage warehouses"
  ON public.warehouses FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

-- Update RLS policies for optimization_cache
DROP POLICY IF EXISTS "Allow all operations on optimization_cache" ON public.optimization_cache;

CREATE POLICY "Authenticated users can view cache"
  ON public.optimization_cache FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage cache"
  ON public.optimization_cache FOR ALL
  USING (auth.role() = 'authenticated');

-- Update RLS policies for route_history
DROP POLICY IF EXISTS "Allow all operations on route_history" ON public.route_history;

CREATE POLICY "Authenticated users can view route history"
  ON public.route_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage route history"
  ON public.route_history FOR ALL
  USING (
    public.has_role(auth.uid(), 'warehouse_officer') OR 
    public.has_role(auth.uid(), 'system_admin')
  );-- ⚠️⚠️⚠️ TEMPORARY: DISABLE RLS FOR TESTING ⚠️⚠️⚠️
-- TODO: RE-ENABLE RLS BEFORE PRODUCTION!
-- This migration disables Row Level Security on all tables for testing purposes
-- This is INSECURE and should NEVER be deployed to production

-- Disable RLS on all tables
ALTER TABLE public.delivery_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses DISABLE ROW LEVEL SECURITY;

-- Note: To re-enable RLS, run:
-- ALTER TABLE public.[table_name] ENABLE ROW LEVEL SECURITY;-- Phase 1: Enable Realtime for critical tables
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
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_maintenance;-- Assign all 5 valid roles to super admin account
INSERT INTO public.user_roles (user_id, role, assigned_by) 
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;

-- Create vehicle_types table
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon_name TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on vehicle_types
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_types
CREATE POLICY "Anyone can view vehicle types"
  ON vehicle_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vehicle types"
  ON vehicle_types FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Seed default vehicle types
INSERT INTO vehicle_types (name, display_name, is_default) VALUES
  ('truck', 'Truck', true),
  ('van', 'Van', true),
  ('pickup', 'Pickup', true),
  ('car', 'Car', true)
ON CONFLICT (name) DO NOTHING;

-- Change vehicle type from enum to text (if it's still an enum)
-- First, we need to handle existing data
ALTER TABLE vehicles ALTER COLUMN type TYPE TEXT USING type::TEXT;

-- Create storage bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Admins can upload vehicle photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-photos' 
    AND has_role(auth.uid(), 'system_admin'::app_role)
  );

CREATE POLICY "Anyone can view vehicle photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Admins can delete vehicle photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND has_role(auth.uid(), 'system_admin'::app_role)
  );-- Add missing fields to drivers table
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
$$;-- Create service_zones table for GIS polygons
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
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_zones;-- Phase 1: Enable RLS on all exposed tables
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
ALTER PUBLICATION supabase_realtime ADD TABLE zone_alerts;-- =======================================================
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
-- Create requisitions table for warehouse order requests
CREATE TABLE public.requisitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_number TEXT NOT NULL UNIQUE,
  facility_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  requested_delivery_date DATE NOT NULL,
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  fulfilled_at TIMESTAMP WITH TIME ZONE
);

-- Create requisition_items table for line items
CREATE TABLE public.requisition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'units',
  weight_kg NUMERIC,
  volume_m3 NUMERIC,
  temperature_required BOOLEAN DEFAULT false,
  handling_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for requisitions
CREATE POLICY "Authenticated users can view requisitions"
  ON public.requisitions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage requisitions"
  ON public.requisitions FOR ALL
  USING (
    has_role(auth.uid(), 'warehouse_officer') OR 
    has_role(auth.uid(), 'system_admin')
  );

CREATE POLICY "Users can create their own requisitions"
  ON public.requisitions FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

-- RLS Policies for requisition_items
CREATE POLICY "Authenticated users can view requisition items"
  ON public.requisition_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage requisition items"
  ON public.requisition_items FOR ALL
  USING (
    has_role(auth.uid(), 'warehouse_officer') OR 
    has_role(auth.uid(), 'system_admin')
  );

-- Create function to auto-update updated_at
CREATE TRIGGER update_requisitions_updated_at
  BEFORE UPDATE ON public.requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_requisitions_facility ON public.requisitions(facility_id);
CREATE INDEX idx_requisitions_warehouse ON public.requisitions(warehouse_id);
CREATE INDEX idx_requisitions_status ON public.requisitions(status);
CREATE INDEX idx_requisition_items_requisition ON public.requisition_items(requisition_id);-- Create delivery_schedules table
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
  EXECUTE FUNCTION update_updated_at_column();-- =====================================================
-- BIKO Scheduler Feature - Database Schema
-- =====================================================
-- This migration creates tables and functions for the
-- comprehensive Scheduler planning cockpit feature
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

-- Scheduler batch status (pre-dispatch planning stages)
CREATE TYPE scheduler_batch_status AS ENUM (
  'draft',              -- Initial creation, not yet ready
  'ready',              -- Ready for dispatch assignment
  'scheduled',          -- Driver/vehicle assigned, awaiting dispatch
  'published',          -- Pushed to FleetOps (delivery_batches)
  'cancelled'           -- Cancelled before dispatch
);

-- Scheduling mode tracking
CREATE TYPE scheduling_mode AS ENUM (
  'manual',             -- Human-created grouping
  'ai_optimized',       -- AI optimization run
  'uploaded',           -- From Excel/CSV file
  'template'            -- From saved template
);

-- Optimization status
CREATE TYPE optimization_status AS ENUM (
  'pending',            -- Queued for processing
  'running',            -- Currently optimizing
  'completed',          -- Successfully completed
  'failed'              -- Optimization failed
);

-- =====================================================
-- 2. SCHEDULER BATCHES TABLE
-- =====================================================
-- Staging area for batches before they're published to delivery_batches

CREATE TABLE IF NOT EXISTS public.scheduler_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name VARCHAR(255),
  batch_code VARCHAR(50) UNIQUE, -- Auto-generated: ZWH-20240728-01

  -- Planning details
  warehouse_id UUID REFERENCES public.warehouses(id),
  facility_ids UUID[] NOT NULL DEFAULT '{}',
  planned_date DATE NOT NULL,
  time_window VARCHAR(50), -- "morning", "afternoon", "evening", "all_day"

  -- Assignment
  driver_id UUID REFERENCES public.drivers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),

  -- Route & Optimization
  optimized_route JSONB, -- Array of {lat, lng, facility_id, sequence}
  total_distance_km DECIMAL(10, 2),
  estimated_duration_min INTEGER,

  -- Capacity tracking
  total_consignments INTEGER DEFAULT 0,
  total_weight_kg DECIMAL(10, 2),
  total_volume_m3 DECIMAL(10, 2),
  capacity_utilization_pct DECIMAL(5, 2),

  -- Status & Workflow
  status scheduler_batch_status DEFAULT 'draft',
  scheduling_mode scheduling_mode,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ, -- When it was moved to 'scheduled' status
  published_at TIMESTAMPTZ, -- When pushed to FleetOps
  published_batch_id UUID REFERENCES public.delivery_batches(id), -- Link to delivery_batches after publish

  -- Additional data
  notes TEXT,
  tags VARCHAR(50)[],
  zone VARCHAR(100), -- Geographic zone (North, South, East, West, Central)

  -- Constraints
  CONSTRAINT check_capacity_pct CHECK (capacity_utilization_pct >= 0 AND capacity_utilization_pct <= 150)
);

-- =====================================================
-- 3. SCHEDULE TEMPLATES TABLE
-- =====================================================
-- Save recurring schedule patterns

CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template details
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Pattern definition
  warehouse_id UUID REFERENCES public.warehouses(id),
  facility_ids UUID[] NOT NULL DEFAULT '{}',

  -- Recurrence
  recurrence_type VARCHAR(50), -- daily, weekly, monthly, custom
  recurrence_days INTEGER[], -- [0,1,2,3,4] for Mon-Fri
  time_window VARCHAR(50),

  -- Default assignments (optional)
  default_driver_id UUID REFERENCES public.drivers(id),
  default_vehicle_id UUID REFERENCES public.vehicles(id),

  -- Settings
  auto_schedule BOOLEAN DEFAULT FALSE, -- Automatically create batches
  active BOOLEAN DEFAULT TRUE,
  priority VARCHAR(20) DEFAULT 'medium',

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0
);

-- =====================================================
-- 4. OPTIMIZATION RUNS TABLE
-- =====================================================
-- Track AI optimization history and performance

CREATE TABLE IF NOT EXISTS public.optimization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run details
  run_name VARCHAR(255),

  -- Input parameters
  warehouse_id UUID REFERENCES public.warehouses(id),
  facility_ids UUID[] NOT NULL,
  capacity_threshold DECIMAL(5, 2) DEFAULT 90.0, -- 90%
  time_window_mode VARCHAR(20) DEFAULT 'flexible', -- strict, flexible
  priority_weights JSONB, -- {distance: "high", duration: "medium", cost: "low"}

  -- Vehicle constraints
  vehicle_constraints JSONB, -- {type, capacity_min, capacity_max}

  -- Results
  status optimization_status DEFAULT 'pending',
  result_batches JSONB, -- Array of optimized batch configurations
  total_batches_created INTEGER,
  total_distance_km DECIMAL(10, 2),
  total_duration_min INTEGER,
  avg_capacity_utilization DECIMAL(5, 2),

  -- Performance metrics
  optimization_time_ms INTEGER, -- How long optimization took
  algorithm_used VARCHAR(100), -- e.g., "greedy_nearest_neighbor", "genetic_algorithm"

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT, -- If failed

  -- Link to created batches
  scheduler_batch_ids UUID[]
);

-- =====================================================
-- 5. SCHEDULER SETTINGS TABLE
-- =====================================================
-- User/organization-level scheduler preferences

CREATE TABLE IF NOT EXISTS public.scheduler_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User/Org reference
  user_id UUID REFERENCES auth.users(id),

  -- Default settings
  default_warehouse_id UUID REFERENCES public.warehouses(id),
  default_capacity_threshold DECIMAL(5, 2) DEFAULT 90.0,
  default_time_window VARCHAR(50) DEFAULT 'all_day',

  -- UI preferences
  default_view VARCHAR(20) DEFAULT 'map', -- map, calendar, list, kanban
  show_zones BOOLEAN DEFAULT TRUE,
  auto_cluster_enabled BOOLEAN DEFAULT TRUE,

  -- Notification preferences
  notify_on_optimization_complete BOOLEAN DEFAULT TRUE,
  notify_on_publish BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one settings per user
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Scheduler batches indexes
CREATE INDEX idx_scheduler_batches_warehouse ON public.scheduler_batches(warehouse_id);
CREATE INDEX idx_scheduler_batches_status ON public.scheduler_batches(status);
CREATE INDEX idx_scheduler_batches_planned_date ON public.scheduler_batches(planned_date);
CREATE INDEX idx_scheduler_batches_driver ON public.scheduler_batches(driver_id);
CREATE INDEX idx_scheduler_batches_vehicle ON public.scheduler_batches(vehicle_id);
CREATE INDEX idx_scheduler_batches_zone ON public.scheduler_batches(zone);
CREATE INDEX idx_scheduler_batches_created_by ON public.scheduler_batches(created_by);
CREATE INDEX idx_scheduler_batches_published ON public.scheduler_batches(published_batch_id);

-- Schedule templates indexes
CREATE INDEX idx_schedule_templates_warehouse ON public.schedule_templates(warehouse_id);
CREATE INDEX idx_schedule_templates_active ON public.schedule_templates(active);
CREATE INDEX idx_schedule_templates_created_by ON public.schedule_templates(created_by);

-- Optimization runs indexes
CREATE INDEX idx_optimization_runs_warehouse ON public.optimization_runs(warehouse_id);
CREATE INDEX idx_optimization_runs_status ON public.optimization_runs(status);
CREATE INDEX idx_optimization_runs_created_by ON public.optimization_runs(created_by);
CREATE INDEX idx_optimization_runs_created_at ON public.optimization_runs(created_at DESC);

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-generate batch code
CREATE OR REPLACE FUNCTION generate_batch_code()
RETURNS TRIGGER AS $$
DECLARE
  warehouse_code VARCHAR(10);
  date_code VARCHAR(20);
  sequence_num INTEGER;
  new_code VARCHAR(50);
BEGIN
  -- Get warehouse code (first 3 letters)
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO warehouse_code
  FROM public.warehouses
  WHERE id = NEW.warehouse_id;

  -- Format date as YYYYMMDD
  date_code := TO_CHAR(NEW.planned_date, 'YYYYMMDD');

  -- Get next sequence number for this warehouse+date
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM public.scheduler_batches
  WHERE warehouse_id = NEW.warehouse_id
    AND planned_date = NEW.planned_date;

  -- Generate code: ZWH-20240728-01
  new_code := warehouse_code || '-' || date_code || '-' || LPAD(sequence_num::TEXT, 2, '0');

  NEW.batch_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_batch_code
BEFORE INSERT ON public.scheduler_batches
FOR EACH ROW
WHEN (NEW.batch_code IS NULL)
EXECUTE FUNCTION generate_batch_code();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduler_batches_updated_at
BEFORE UPDATE ON public.scheduler_batches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_schedule_templates_updated_at
BEFORE UPDATE ON public.schedule_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_scheduler_settings_updated_at
BEFORE UPDATE ON public.scheduler_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Track status transitions
CREATE OR REPLACE FUNCTION track_scheduler_batch_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When moved to scheduled status, record timestamp
  IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
    NEW.scheduled_at := NOW();
  END IF;

  -- When published to FleetOps, record timestamp
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_scheduler_status
BEFORE UPDATE ON public.scheduler_batches
FOR EACH ROW
EXECUTE FUNCTION track_scheduler_batch_status();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.scheduler_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_settings ENABLE ROW LEVEL SECURITY;

-- Scheduler batches policies
CREATE POLICY "Users can view all scheduler batches"
  ON public.scheduler_batches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create scheduler batches"
  ON public.scheduler_batches FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own scheduler batches"
  ON public.scheduler_batches FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own scheduler batches"
  ON public.scheduler_batches FOR DELETE
  USING (created_by = auth.uid());

-- Schedule templates policies
CREATE POLICY "Users can view all schedule templates"
  ON public.schedule_templates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create schedule templates"
  ON public.schedule_templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own templates"
  ON public.schedule_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.schedule_templates FOR DELETE
  USING (created_by = auth.uid());

-- Optimization runs policies
CREATE POLICY "Users can view all optimization runs"
  ON public.optimization_runs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create optimization runs"
  ON public.optimization_runs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Scheduler settings policies
CREATE POLICY "Users can view their own settings"
  ON public.scheduler_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
  ON public.scheduler_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON public.scheduler_settings FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- 9. SAMPLE DATA (DEVELOPMENT ONLY)
-- =====================================================

-- Insert sample scheduler batches (will be removed in production)
-- INSERT INTO public.scheduler_batches (
--   name,
--   warehouse_id,
--   facility_ids,
--   planned_date,
--   time_window,
--   status,
--   scheduling_mode,
--   total_consignments,
--   capacity_utilization_pct,
--   zone
-- ) SELECT
--   'Sample Batch ' || generate_series,
--   (SELECT id FROM public.warehouses LIMIT 1),
--   ARRAY(SELECT id FROM public.facilities ORDER BY RANDOM() LIMIT 5),
--   CURRENT_DATE + generate_series,
--   CASE (generate_series % 4)
--     WHEN 0 THEN 'morning'
--     WHEN 1 THEN 'afternoon'
--     WHEN 2 THEN 'evening'
--     ELSE 'all_day'
--   END,
--   'ready'::scheduler_batch_status,
--   'manual'::scheduling_mode,
--   (RANDOM() * 20 + 5)::INTEGER,
--   (RANDOM() * 30 + 60)::DECIMAL(5,2),
--   CASE (generate_series % 5)
--     WHEN 0 THEN 'North'
--     WHEN 1 THEN 'South'
--     WHEN 2 THEN 'East'
--     WHEN 3 THEN 'West'
--     ELSE 'Central'
--   END
-- FROM generate_series(1, 20);

-- =====================================================
-- 10. VIEWS FOR REPORTING
-- =====================================================

-- Scheduler overview stats
CREATE OR REPLACE VIEW scheduler_overview_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'ready') as ready_count,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
  COUNT(*) FILTER (WHERE status = 'published') as published_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  SUM(total_consignments) as total_consignments,
  AVG(capacity_utilization_pct) as avg_capacity,
  SUM(total_distance_km) as total_distance,
  COUNT(DISTINCT warehouse_id) as active_warehouses,
  COUNT(DISTINCT driver_id) as assigned_drivers,
  COUNT(DISTINCT vehicle_id) as assigned_vehicles
FROM public.scheduler_batches
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

COMMENT ON TABLE public.scheduler_batches IS 'Staging area for dispatch planning before publishing to FleetOps';
COMMENT ON TABLE public.schedule_templates IS 'Reusable schedule patterns for recurring deliveries';
COMMENT ON TABLE public.optimization_runs IS 'Track AI optimization executions and results';
COMMENT ON TABLE public.scheduler_settings IS 'User preferences for scheduler interface';
