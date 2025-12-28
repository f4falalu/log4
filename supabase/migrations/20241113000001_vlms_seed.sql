-- =====================================================
-- VLMS Sample/Seed Data
-- =====================================================
-- This file contains sample data for testing the VLMS system
-- Run this AFTER applying the main schema migration
-- =====================================================

-- Note: This assumes you have existing profiles in your system
-- The sample data uses placeholder UUIDs that should be replaced
-- with actual user IDs from your profiles table

-- Sample Vehicles
INSERT INTO vlms_vehicles (
  make, model, year, vin, license_plate,
  vehicle_type, fuel_type, transmission,
  engine_capacity, color, seating_capacity, cargo_capacity,
  acquisition_date, acquisition_type, purchase_price,
  status, current_mileage
) VALUES
-- Vehicle 1: Toyota Hilux
('Toyota', 'Hilux', 2023, 'JTFDE626000000001', 'KN-1234-ABC',
 'truck', 'diesel', 'manual',
 2.8, 'White', 5, 1.2,
 '2023-01-15', 'purchase', 45000.00,
 'available', 15234.50),

-- Vehicle 2: Honda CR-V
('Honda', 'CR-V', 2022, 'JTFDE626000000002', 'KN-5678-DEF',
 'suv', 'gasoline', 'automatic',
 2.4, 'Silver', 7, 0.8,
 '2022-06-20', 'purchase', 38000.00,
 'in_use', 28450.30),

-- Vehicle 3: Nissan Patrol
('Nissan', 'Patrol', 2024, 'JTFDE626000000003', 'KN-9012-GHI',
 'suv', 'gasoline', 'automatic',
 5.6, 'Black', 8, 1.0,
 '2024-02-10', 'lease', NULL,
 'available', 5120.00),

-- Vehicle 4: Toyota Corolla
('Toyota', 'Corolla', 2021, 'JTFDE626000000004', 'KN-3456-JKL',
 'sedan', 'hybrid', 'automatic',
 1.8, 'Blue', 5, 0.4,
 '2021-03-25', 'purchase', 28000.00,
 'maintenance', 42350.75),

-- Vehicle 5: Mitsubishi L200
('Mitsubishi', 'L200', 2023, 'JTFDE626000000005', 'KN-7890-MNO',
 'truck', 'diesel', 'manual',
 2.5, 'Red', 5, 1.5,
 '2023-08-12', 'purchase', 42000.00,
 'available', 12890.20);

-- Note: To add maintenance records, fuel logs, etc., you'll need actual vehicle IDs
-- After running this seed, you can query:
-- SELECT id, vehicle_id, make, model, license_plate FROM vlms_vehicles;
-- Then use those IDs to create related records

-- Example maintenance record (update the vehicle_id UUID after seeding vehicles)
-- INSERT INTO vlms_maintenance_records (
--   vehicle_id, scheduled_date, status, maintenance_type,
--   category, description, labor_cost, parts_cost
-- )
-- SELECT
--   id, CURRENT_DATE + INTERVAL '7 days', 'scheduled', 'routine',
--   'oil_change', 'Routine oil change and filter replacement', 50.00, 30.00
-- FROM vlms_vehicles
-- WHERE license_plate = 'KN-1234-ABC';
