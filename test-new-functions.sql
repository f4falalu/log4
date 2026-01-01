-- Test each newly created function individually

SELECT 'Testing analytics.get_delivery_kpis' as test;
SELECT * FROM analytics.get_delivery_kpis(NULL, NULL);

SELECT 'Testing analytics.get_vehicle_kpis' as test;
SELECT * FROM analytics.get_vehicle_kpis();

SELECT 'Testing analytics.get_driver_kpis' as test;
SELECT * FROM analytics.get_driver_kpis();

SELECT 'Testing analytics.get_cost_kpis' as test;
SELECT * FROM analytics.get_cost_kpis();

SELECT 'Testing analytics.get_dashboard_summary' as test;
SELECT * FROM analytics.get_dashboard_summary(NULL, NULL);
