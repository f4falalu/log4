-- Test cost_kpis function to identify the ambiguous column issue

-- First, try to query the cost_analysis view directly
SELECT
  total_system_cost,
  total_maintenance_cost,
  total_fuel_cost,
  avg_cost_per_item,
  avg_cost_per_km,
  active_vehicles,
  active_drivers,
  total_items_delivered
FROM analytics.cost_analysis;

-- Then test the function
SELECT * FROM analytics.get_cost_kpis();

-- Then test dashboard summary
SELECT * FROM analytics.get_dashboard_summary(NULL, NULL);
