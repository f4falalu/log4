-- Drop old overloaded signatures so only the 4-param version remains
DROP FUNCTION IF EXISTS public.create_workspace(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_workspace(TEXT, TEXT, TEXT);
