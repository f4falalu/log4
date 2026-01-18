-- Fix permissions for resource utilization functions
-- These functions need to be accessible via RPC (authenticated users)

BEGIN;

-- Grant EXECUTE permission on analytics schema functions to authenticated users
GRANT EXECUTE ON FUNCTION analytics.get_vehicle_payload_utilization(DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_program_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_driver_utilization(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_route_efficiency(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_facility_coverage(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_cost_by_program(DATE, DATE) TO authenticated;

-- Grant EXECUTE permission on public schema wrapper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_vehicle_payload_utilization(DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_utilization(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_route_efficiency(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_facility_coverage(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_by_program(DATE, DATE) TO authenticated;

-- Also grant to anon role for public access (if needed)
GRANT EXECUTE ON FUNCTION public.get_vehicle_payload_utilization(DATE, DATE, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_program_performance(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_driver_utilization(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_route_efficiency(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_facility_coverage(DATE, DATE, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_cost_by_program(DATE, DATE) TO anon;

COMMIT;

-- Verify permissions
SELECT
    routine_schema,
    routine_name,
    pg_catalog.has_function_privilege('authenticated', routine_schema || '.' || routine_name || '(' ||
        CASE routine_name
            WHEN 'get_vehicle_payload_utilization' THEN 'date,date,uuid'
            WHEN 'get_program_performance' THEN 'date,date'
            WHEN 'get_driver_utilization' THEN 'date,date'
            WHEN 'get_route_efficiency' THEN 'date,date'
            WHEN 'get_facility_coverage' THEN 'date,date,text'
            WHEN 'get_cost_by_program' THEN 'date,date'
        END || ')', 'EXECUTE') as has_execute_permission
FROM information_schema.routines
WHERE routine_name IN (
    'get_vehicle_payload_utilization',
    'get_program_performance',
    'get_driver_utilization',
    'get_route_efficiency',
    'get_facility_coverage',
    'get_cost_by_program'
)
AND routine_schema IN ('analytics', 'public')
ORDER BY routine_schema, routine_name;
