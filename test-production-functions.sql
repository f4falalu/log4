-- Test that all public functions are accessible
SELECT 'Testing get_dashboard_summary...' as test;
SELECT * FROM public.get_dashboard_summary(NULL, NULL);

SELECT 'Testing get_delivery_kpis...' as test;
SELECT * FROM public.get_delivery_kpis(NULL, NULL);

SELECT 'Testing get_vehicle_kpis...' as test;
SELECT * FROM public.get_vehicle_kpis();

SELECT 'Testing get_driver_kpis...' as test;
SELECT * FROM public.get_driver_kpis();

SELECT 'Testing get_cost_kpis...' as test;
SELECT * FROM public.get_cost_kpis();
