-- =====================================================
-- RE-SEED: vehicle_categories + vehicle_types
-- Restores seed data after database purge
-- =====================================================

-- 1) vehicle_categories
INSERT INTO vehicle_categories (code, name, display_name, source, description, icon_name, default_tier_config)
VALUES
  ('L1', 'L1 - Light Two-Wheeler', 'L1 - Light Motorcycle/Moped', 'eu',
   'Light two-wheel vehicles with max speed 45 km/h and engine ≤50cc', 'Bike',
   '[{"tier_name":"Cargo Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('L2', 'L2 - Three-Wheeler Moped', 'L2 - Tricycle/Keke', 'eu',
   'Three-wheel mopeds with max speed 45 km/h', 'TramFront',
   '[{"tier_name":"Cargo Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('M1', 'M1 - Passenger Car', 'M1 - Car/Sedan', 'eu',
   'Vehicles with ≤8 passenger seats (excluding driver)', 'Car',
   '[{"tier_name":"Boot","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('M2', 'M2 - Minibus', 'M2 - Minibus/Van', 'eu',
   'Passenger vehicles with >8 seats and mass ≤5 tonnes', 'Bus',
   '[{"tier_name":"Rear Cargo","tier_order":1,"weight_pct":60,"volume_pct":60},{"tier_name":"Roof Rack","tier_order":2,"weight_pct":40,"volume_pct":40}]'),
  ('N1', 'N1 - Light Commercial Vehicle', 'N1 - Van/Light Truck', 'eu',
   'Goods vehicles with mass ≤3.5 tonnes', 'Truck',
   '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'),
  ('N2', 'N2 - Medium Commercial Vehicle', 'N2 - Medium Truck', 'eu',
   'Goods vehicles with mass 3.5-12 tonnes', 'Truck',
   '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'),
  ('N3', 'N3 - Heavy Commercial Vehicle', 'N3 - Heavy Truck', 'eu',
   'Goods vehicles with mass >12 tonnes', 'Container',
   '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'),
  ('BIKO_MINIVAN', 'BIKO - Mini Van', 'Mini Van', 'biko',
   'Small cargo van popular in urban delivery (e.g., Toyota Hiace)', 'Bus',
   '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'),
  ('BIKO_KEKE', 'BIKO - Keke/Tricycle', 'Keke', 'biko',
   'Three-wheel motorized delivery vehicle (Keke NAPEP, Marwa)', 'TramFront',
   '[{"tier_name":"Cargo Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('BIKO_MOPED', 'BIKO - Delivery Moped', 'Delivery Moped', 'biko',
   'Two-wheel motorcycle with rear cargo box', 'Bike',
   '[{"tier_name":"Top Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('BIKO_COLDCHAIN', 'BIKO - Cold Chain Van', 'Cold Chain Van', 'biko',
   'Refrigerated van for temperature-controlled delivery', 'Snowflake',
   '[{"tier_name":"Cold Storage","tier_order":1,"weight_pct":100,"volume_pct":100}]')
ON CONFLICT (code) DO NOTHING;

-- 2) vehicle_types (matches actual remote schema: no description column, has display_name)
INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'L1'),
  'MOPED_DELIVERY', 'Delivery Moped', 'Delivery Moped', 30, 0.25,
  '[{"tier_name":"Top Box","tier_order":1,"max_weight_kg":30,"max_volume_m3":0.25}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'MOPED_DELIVERY');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'L2'),
  'KEKE_CARGO', 'Keke Cargo', 'Keke Cargo', 250, 0.5,
  '[{"tier_name":"Cargo Box","tier_order":1,"max_weight_kg":250,"max_volume_m3":0.5}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'KEKE_CARGO');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'BIKO_KEKE'),
  'KEKE_PASSENGER_CONVERTED', 'Keke (Passenger Converted)', 'Keke (Converted)', 200, 0.4,
  '[{"tier_name":"Rear Cargo","tier_order":1,"max_weight_kg":200,"max_volume_m3":0.4}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'KEKE_PASSENGER_CONVERTED');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'M1'),
  'SEDAN_STANDARD', 'Standard Sedan', 'Standard Sedan', 150, 0.4,
  '[{"tier_name":"Boot","tier_order":1,"max_weight_kg":150,"max_volume_m3":0.4}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'SEDAN_STANDARD');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'M1'),
  'HATCHBACK', 'Hatchback', 'Hatchback', 200, 0.6,
  '[{"tier_name":"Trunk","tier_order":1,"max_weight_kg":200,"max_volume_m3":0.6}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'HATCHBACK');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'N1'),
  'MINIVAN_HIACE', 'Mini Van (Toyota Hiace)', 'Mini Van (Hiace)', 1000, 4.5,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":300,"max_volume_m3":1.35},{"tier_name":"Middle","tier_order":2,"max_weight_kg":400,"max_volume_m3":1.8},{"tier_name":"Upper","tier_order":3,"max_weight_kg":300,"max_volume_m3":1.35}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'MINIVAN_HIACE');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'BIKO_MINIVAN'),
  'MINIVAN_HIACE_ALT', 'Mini Van', 'Mini Van', 1000, 4.5,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":300,"max_volume_m3":1.35},{"tier_name":"Middle","tier_order":2,"max_weight_kg":400,"max_volume_m3":1.8},{"tier_name":"Upper","tier_order":3,"max_weight_kg":300,"max_volume_m3":1.35}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'MINIVAN_HIACE_ALT');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'N1'),
  'VAN_HIGH_ROOF', 'Van - High Roof', 'Van (High Roof)', 1200, 6.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":360,"max_volume_m3":1.8},{"tier_name":"Middle","tier_order":2,"max_weight_kg":480,"max_volume_m3":2.4},{"tier_name":"Upper","tier_order":3,"max_weight_kg":360,"max_volume_m3":1.8}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'VAN_HIGH_ROOF');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'N1'),
  'VAN_PANEL', 'Panel Van', 'Panel Van', 900, 3.5,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":270,"max_volume_m3":1.05},{"tier_name":"Middle","tier_order":2,"max_weight_kg":360,"max_volume_m3":1.4},{"tier_name":"Upper","tier_order":3,"max_weight_kg":270,"max_volume_m3":1.05}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'VAN_PANEL');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'BIKO_COLDCHAIN'),
  'COLD_VAN', 'Cold Chain Van', 'Cold Chain Van', 800, 3.5,
  '[{"tier_name":"Cold Storage","tier_order":1,"max_weight_kg":800,"max_volume_m3":3.5}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'COLD_VAN');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'N2'),
  'TRUCK_3T', '3-Ton Truck', '3-Ton Truck', 3000, 12.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":900,"max_volume_m3":3.6},{"tier_name":"Middle","tier_order":2,"max_weight_kg":1200,"max_volume_m3":4.8},{"tier_name":"Upper","tier_order":3,"max_weight_kg":900,"max_volume_m3":3.6}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'TRUCK_3T');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'N2'),
  'TRUCK_5T', '5-Ton Truck', '5-Ton Truck', 5000, 18.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":1500,"max_volume_m3":5.4},{"tier_name":"Middle","tier_order":2,"max_weight_kg":2000,"max_volume_m3":7.2},{"tier_name":"Upper","tier_order":3,"max_weight_kg":1500,"max_volume_m3":5.4}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'TRUCK_5T');

INSERT INTO vehicle_types (category_id, code, name, display_name, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT (SELECT id FROM vehicle_categories WHERE code = 'N3'),
  'TRUCK_10T', '10-Ton Truck', '10-Ton Truck', 10000, 30.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":3000,"max_volume_m3":9.0},{"tier_name":"Middle","tier_order":2,"max_weight_kg":4000,"max_volume_m3":12.0},{"tier_name":"Upper","tier_order":3,"max_weight_kg":3000,"max_volume_m3":9.0}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'TRUCK_10T');
