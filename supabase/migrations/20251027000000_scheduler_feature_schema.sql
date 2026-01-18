-- =====================================================
-- BIKO Scheduler Feature - Database Schema
-- =====================================================
-- This migration creates tables and functions for the
-- comprehensive Scheduler planning cockpit feature
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

-- Scheduler batch status (pre-dispatch planning stages)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduler_batch_status') THEN
    CREATE TYPE scheduler_batch_status AS ENUM (
      'draft',              -- Initial creation, not yet ready
      'ready',              -- Ready for dispatch assignment
      'scheduled',          -- Driver/vehicle assigned, awaiting dispatch
      'published',          -- Pushed to FleetOps (delivery_batches)
      'cancelled'           -- Cancelled before dispatch
    );
  END IF;
END$$;

-- Scheduling mode tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduling_mode') THEN
    CREATE TYPE scheduling_mode AS ENUM (
      'manual',             -- Human-created grouping
      'ai_optimized',       -- AI optimization run
      'uploaded',           -- From Excel/CSV file
      'template'            -- From saved template
    );
  END IF;
END$$;

-- Optimization status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'optimization_status') THEN
    CREATE TYPE optimization_status AS ENUM (
      'pending',            -- Queued for processing
      'running',            -- Currently optimizing
      'completed',          -- Successfully completed
      'failed'              -- Optimization failed
    );
  END IF;
END$$;

-- =====================================================
-- 2. SCHEDULER BATCHES TABLE
-- =====================================================
-- Staging area for batches before they're published to delivery_batches

CREATE TABLE IF NOT EXISTS public.scheduler_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name VARCHAR(255),
  batch_code VARCHAR(50) UNIQUE, -- Auto-generated: ZWH-20240728-01

  -- Planning details
  warehouse_id UUID REFERENCES public.warehouses(id),
  facility_ids UUID[] NOT NULL DEFAULT '{}',
  planned_date DATE NOT NULL,
  time_window VARCHAR(50), -- "morning", "afternoon", "evening", "all_day"

  -- Assignment
  driver_id UUID REFERENCES public.drivers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),

  -- Route & Optimization
  optimized_route JSONB, -- Array of {lat, lng, facility_id, sequence}
  total_distance_km DECIMAL(10, 2),
  estimated_duration_min INTEGER,

  -- Capacity tracking
  total_consignments INTEGER DEFAULT 0,
  total_weight_kg DECIMAL(10, 2),
  total_volume_m3 DECIMAL(10, 2),
  capacity_utilization_pct DECIMAL(5, 2),

  -- Status & Workflow
  status scheduler_batch_status DEFAULT 'draft',
  scheduling_mode scheduling_mode,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ, -- When it was moved to 'scheduled' status
  published_at TIMESTAMPTZ, -- When pushed to FleetOps
  published_batch_id UUID REFERENCES public.delivery_batches(id), -- Link to delivery_batches after publish

  -- Additional data
  notes TEXT,
  tags VARCHAR(50)[],
  zone VARCHAR(100), -- Geographic zone (North, South, East, West, Central)

  -- Constraints
  CONSTRAINT check_capacity_pct CHECK (capacity_utilization_pct >= 0 AND capacity_utilization_pct <= 150)
);

-- =====================================================
-- 3. SCHEDULE TEMPLATES TABLE
-- =====================================================
-- Save recurring schedule patterns

CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template details
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Pattern definition
  warehouse_id UUID REFERENCES public.warehouses(id),
  facility_ids UUID[] NOT NULL DEFAULT '{}',

  -- Recurrence
  recurrence_type VARCHAR(50), -- daily, weekly, monthly, custom
  recurrence_days INTEGER[], -- [0,1,2,3,4] for Mon-Fri
  time_window VARCHAR(50),

  -- Default assignments (optional)
  default_driver_id UUID REFERENCES public.drivers(id),
  default_vehicle_id UUID REFERENCES public.vehicles(id),

  -- Settings
  auto_schedule BOOLEAN DEFAULT FALSE, -- Automatically create batches
  active BOOLEAN DEFAULT TRUE,
  priority VARCHAR(20) DEFAULT 'medium',

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0
);

-- =====================================================
-- 4. OPTIMIZATION RUNS TABLE
-- =====================================================
-- Track AI optimization history and performance

CREATE TABLE IF NOT EXISTS public.optimization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run details
  run_name VARCHAR(255),

  -- Input parameters
  warehouse_id UUID REFERENCES public.warehouses(id),
  facility_ids UUID[] NOT NULL,
  capacity_threshold DECIMAL(5, 2) DEFAULT 90.0, -- 90%
  time_window_mode VARCHAR(20) DEFAULT 'flexible', -- strict, flexible
  priority_weights JSONB, -- {distance: "high", duration: "medium", cost: "low"}

  -- Vehicle constraints
  vehicle_constraints JSONB, -- {type, capacity_min, capacity_max}

  -- Results
  status optimization_status DEFAULT 'pending',
  result_batches JSONB, -- Array of optimized batch configurations
  total_batches_created INTEGER,
  total_distance_km DECIMAL(10, 2),
  total_duration_min INTEGER,
  avg_capacity_utilization DECIMAL(5, 2),

  -- Performance metrics
  optimization_time_ms INTEGER, -- How long optimization took
  algorithm_used VARCHAR(100), -- e.g., "greedy_nearest_neighbor", "genetic_algorithm"

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT, -- If failed

  -- Link to created batches
  scheduler_batch_ids UUID[]
);

-- =====================================================
-- 5. SCHEDULER SETTINGS TABLE
-- =====================================================
-- User/organization-level scheduler preferences

CREATE TABLE IF NOT EXISTS public.scheduler_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User/Org reference
  user_id UUID REFERENCES auth.users(id),

  -- Default settings
  default_warehouse_id UUID REFERENCES public.warehouses(id),
  default_capacity_threshold DECIMAL(5, 2) DEFAULT 90.0,
  default_time_window VARCHAR(50) DEFAULT 'all_day',

  -- UI preferences
  default_view VARCHAR(20) DEFAULT 'map', -- map, calendar, list, kanban
  show_zones BOOLEAN DEFAULT TRUE,
  auto_cluster_enabled BOOLEAN DEFAULT TRUE,

  -- Notification preferences
  notify_on_optimization_complete BOOLEAN DEFAULT TRUE,
  notify_on_publish BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one settings per user
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Scheduler batches indexes
CREATE INDEX IF NOT EXISTS idx_scheduler_batches_warehouse ON public.scheduler_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_batches_status ON public.scheduler_batches(status);
CREATE INDEX IF NOT EXISTS idx_scheduler_batches_planned_date ON public.scheduler_batches(planned_date);
CREATE INDEX IF NOT EXISTS idx_scheduler_batches_driver ON public.scheduler_batches(driver_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_batches_vehicle ON public.scheduler_batches(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_batches_zone ON public.scheduler_batches(zone);
CREATE INDEX IF NOT EXISTS idx_scheduler_batches_created_by ON public.scheduler_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduler_batches_published ON public.scheduler_batches(published_batch_id);

-- Schedule templates indexes
CREATE INDEX IF NOT EXISTS idx_schedule_templates_warehouse ON public.schedule_templates(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON public.schedule_templates(active);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_created_by ON public.schedule_templates(created_by);

-- Optimization runs indexes
CREATE INDEX IF NOT EXISTS idx_optimization_runs_warehouse ON public.optimization_runs(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_status ON public.optimization_runs(status);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_created_by ON public.optimization_runs(created_by);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_created_at ON public.optimization_runs(created_at DESC);

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-generate batch code
CREATE OR REPLACE FUNCTION generate_batch_code()
RETURNS TRIGGER AS $$
DECLARE
  warehouse_code VARCHAR(10);
  date_code VARCHAR(20);
  sequence_num INTEGER;
  new_code VARCHAR(50);
BEGIN
  -- Get warehouse code (first 3 letters)
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO warehouse_code
  FROM public.warehouses
  WHERE id = NEW.warehouse_id;

  -- Format date as YYYYMMDD
  date_code := TO_CHAR(NEW.planned_date, 'YYYYMMDD');

  -- Get next sequence number for this warehouse+date
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM public.scheduler_batches
  WHERE warehouse_id = NEW.warehouse_id
    AND planned_date = NEW.planned_date;

  -- Generate code: ZWH-20240728-01
  new_code := warehouse_code || '-' || date_code || '-' || LPAD(sequence_num::TEXT, 2, '0');

  NEW.batch_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_batch_code ON public.scheduler_batches;
CREATE TRIGGER trigger_generate_batch_code
BEFORE INSERT ON public.scheduler_batches
FOR EACH ROW
WHEN (NEW.batch_code IS NULL)
EXECUTE FUNCTION generate_batch_code();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_scheduler_batches_updated_at ON public.scheduler_batches;
CREATE TRIGGER trigger_scheduler_batches_updated_at
BEFORE UPDATE ON public.scheduler_batches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_schedule_templates_updated_at ON public.schedule_templates;
CREATE TRIGGER trigger_schedule_templates_updated_at
BEFORE UPDATE ON public.schedule_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_scheduler_settings_updated_at ON public.scheduler_settings;
CREATE TRIGGER trigger_scheduler_settings_updated_at
BEFORE UPDATE ON public.scheduler_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Track status transitions
CREATE OR REPLACE FUNCTION track_scheduler_batch_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When moved to scheduled status, record timestamp
  IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
    NEW.scheduled_at := NOW();
  END IF;

  -- When published to FleetOps, record timestamp
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_scheduler_status ON public.scheduler_batches;
CREATE TRIGGER trigger_track_scheduler_status
BEFORE UPDATE ON public.scheduler_batches
FOR EACH ROW
EXECUTE FUNCTION track_scheduler_batch_status();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.scheduler_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_settings ENABLE ROW LEVEL SECURITY;

-- Scheduler batches policies
CREATE POLICY "Users can view all scheduler batches"
  ON public.scheduler_batches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create scheduler batches"
  ON public.scheduler_batches FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own scheduler batches"
  ON public.scheduler_batches FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own scheduler batches"
  ON public.scheduler_batches FOR DELETE
  USING (created_by = auth.uid());

-- Schedule templates policies
CREATE POLICY "Users can view all schedule templates"
  ON public.schedule_templates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create schedule templates"
  ON public.schedule_templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own templates"
  ON public.schedule_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.schedule_templates FOR DELETE
  USING (created_by = auth.uid());

-- Optimization runs policies
CREATE POLICY "Users can view all optimization runs"
  ON public.optimization_runs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create optimization runs"
  ON public.optimization_runs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Scheduler settings policies
CREATE POLICY "Users can view their own settings"
  ON public.scheduler_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
  ON public.scheduler_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON public.scheduler_settings FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- 9. SAMPLE DATA (DEVELOPMENT ONLY)
-- =====================================================

-- Insert sample scheduler batches (will be removed in production)
-- INSERT INTO public.scheduler_batches (
--   name,
--   warehouse_id,
--   facility_ids,
--   planned_date,
--   time_window,
--   status,
--   scheduling_mode,
--   total_consignments,
--   capacity_utilization_pct,
--   zone
-- ) SELECT
--   'Sample Batch ' || generate_series,
--   (SELECT id FROM public.warehouses LIMIT 1),
--   ARRAY(SELECT id FROM public.facilities ORDER BY RANDOM() LIMIT 5),
--   CURRENT_DATE + generate_series,
--   CASE (generate_series % 4)
--     WHEN 0 THEN 'morning'
--     WHEN 1 THEN 'afternoon'
--     WHEN 2 THEN 'evening'
--     ELSE 'all_day'
--   END,
--   'ready'::scheduler_batch_status,
--   'manual'::scheduling_mode,
--   (RANDOM() * 20 + 5)::INTEGER,
--   (RANDOM() * 30 + 60)::DECIMAL(5,2),
--   CASE (generate_series % 5)
--     WHEN 0 THEN 'North'
--     WHEN 1 THEN 'South'
--     WHEN 2 THEN 'East'
--     WHEN 3 THEN 'West'
--     ELSE 'Central'
--   END
-- FROM generate_series(1, 20);

-- =====================================================
-- 10. VIEWS FOR REPORTING
-- =====================================================

-- Scheduler overview stats
CREATE OR REPLACE VIEW scheduler_overview_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'ready') as ready_count,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
  COUNT(*) FILTER (WHERE status = 'published') as published_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  SUM(total_consignments) as total_consignments,
  AVG(capacity_utilization_pct) as avg_capacity,
  SUM(total_distance_km) as total_distance,
  COUNT(DISTINCT warehouse_id) as active_warehouses,
  COUNT(DISTINCT driver_id) as assigned_drivers,
  COUNT(DISTINCT vehicle_id) as assigned_vehicles
FROM public.scheduler_batches
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

COMMENT ON TABLE public.scheduler_batches IS 'Staging area for dispatch planning before publishing to FleetOps';
COMMENT ON TABLE public.schedule_templates IS 'Reusable schedule patterns for recurring deliveries';
COMMENT ON TABLE public.optimization_runs IS 'Track AI optimization executions and results';
COMMENT ON TABLE public.scheduler_settings IS 'User preferences for scheduler interface';
