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
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();