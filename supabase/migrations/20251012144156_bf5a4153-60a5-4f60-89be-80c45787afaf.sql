-- Assign all 5 valid roles to super admin account
INSERT INTO public.user_roles (user_id, role, assigned_by) 
VALUES 
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'system_admin', '594fe632-90cf-48ba-b83d-8f4c39d2e400'),
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'warehouse_officer', '594fe632-90cf-48ba-b83d-8f4c39d2e400'),
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'driver', '594fe632-90cf-48ba-b83d-8f4c39d2e400'),
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'zonal_manager', '594fe632-90cf-48ba-b83d-8f4c39d2e400'),
  ('594fe632-90cf-48ba-b83d-8f4c39d2e400', 'viewer', '594fe632-90cf-48ba-b83d-8f4c39d2e400')
ON CONFLICT (user_id, role) DO NOTHING;