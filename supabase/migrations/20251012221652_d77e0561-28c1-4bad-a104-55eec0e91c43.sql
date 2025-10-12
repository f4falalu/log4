-- Add photo fields to vehicles table
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
  );