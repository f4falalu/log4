-- ⚠️⚠️⚠️ TEMPORARY: DISABLE RLS FOR TESTING ⚠️⚠️⚠️
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
-- ALTER TABLE public.[table_name] ENABLE ROW LEVEL SECURITY;