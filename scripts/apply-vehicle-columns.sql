-- Add VLMS-compatible columns to vehicles table
BEGIN;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type varchar(50),
  ADD COLUMN IF NOT EXISTS license_plate varchar(20),
  ADD COLUMN IF NOT EXISTS make varchar(100),
  ADD COLUMN IF NOT EXISTS year int,
  ADD COLUMN IF NOT EXISTS acquisition_type varchar(50),
  ADD COLUMN IF NOT EXISTS acquisition_date date,
  ADD COLUMN IF NOT EXISTS vendor_name varchar(255),
  ADD COLUMN IF NOT EXISTS registration_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS transmission varchar(50),
  ADD COLUMN IF NOT EXISTS interior_length_cm int,
  ADD COLUMN IF NOT EXISTS interior_width_cm int,
  ADD COLUMN IF NOT EXISTS interior_height_cm int,
  ADD COLUMN IF NOT EXISTS seating_capacity int,
  ADD COLUMN IF NOT EXISTS current_mileage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_type_id uuid,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS vehicle_id varchar(50),
  ADD COLUMN IF NOT EXISTS capacity_m3 numeric,
  ADD COLUMN IF NOT EXISTS tiered_config jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

COMMIT;
