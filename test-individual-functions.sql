-- Test each analytics function individually to isolate the issue

-- Test 1: Delivery KPIs
SELECT 'Testing get_delivery_kpis...' as test;
SELECT * FROM analytics.get_delivery_kpis(NULL, NULL);

-- Test 2: Vehicle KPIs
SELECT 'Testing get_vehicle_kpis...' as test;
SELECT * FROM analytics.get_vehicle_kpis();

-- Test 3: Driver KPIs
SELECT 'Testing get_driver_kpis...' as test;
SELECT * FROM analytics.get_driver_kpis();

-- Test 4: Cost KPIs (THIS ONE MIGHT FAIL)
SELECT 'Testing get_cost_kpis...' as test;
SELECT * FROM analytics.get_cost_kpis();

-- Test 5: Dashboard Summary
SELECT 'Testing get_dashboard_summary...' as test;
SELECT * FROM analytics.get_dashboard_summary(NULL, NULL);
