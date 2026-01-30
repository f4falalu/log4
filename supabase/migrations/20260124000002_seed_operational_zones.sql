-- Seed operational zones matching the existing service zone values used across the platform
INSERT INTO public.zones (name, code, type, description, region_center, is_active)
VALUES
  ('Central', 'central', 'operational', 'Central operational zone covering Kano metropolitan area', '{"lat": 12.0022, "lng": 8.5920}', true),
  ('Gaya', 'gaya', 'operational', 'Gaya operational zone', '{"lat": 11.8631, "lng": 9.0019}', true),
  ('Danbatta', 'danbatta', 'operational', 'Danbatta operational zone', '{"lat": 12.4294, "lng": 8.5408}', true),
  ('Gwarzo', 'gwarzo', 'operational', 'Gwarzo operational zone', '{"lat": 11.9167, "lng": 7.9333}', true),
  ('Rano', 'rano', 'operational', 'Rano operational zone', '{"lat": 11.5553, "lng": 8.5839}', true)
ON CONFLICT (code) DO NOTHING;
