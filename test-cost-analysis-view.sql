-- Test if cost_analysis view itself has ambiguity

-- This should fail if the view has ambiguity
SELECT
  total_maintenance_cost,
  total_fuel_cost
FROM analytics.cost_analysis
LIMIT 1;
