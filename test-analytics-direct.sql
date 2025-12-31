-- Test if analytics.get_dashboard_summary works directly
-- This will help us identify if the issue is in the analytics function
-- or in the public wrapper

SELECT * FROM analytics.get_dashboard_summary(NULL, NULL);
