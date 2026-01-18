-- Reload PostgREST schema cache
-- This forces Supabase to refresh its understanding of available RPC functions

NOTIFY pgrst, 'reload schema';
