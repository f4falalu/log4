-- =====================================================
-- RFC-012: Requisition Packaging Tables
-- =====================================================
-- Creates immutable packaging tables that represent the authoritative
-- slot demand for each requisition. Packaging is computed once at approval
-- and cannot be modified afterward.
--
-- Slot demand is derived from packaging rules, NOT raw volume math.
-- =====================================================

-- Step 1: Create packaging types enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'packaging_type') THEN
    CREATE TYPE packaging_type AS ENUM ('bag_s', 'box_m', 'box_l', 'crate_xl');
  END IF;
END $$;

-- Step 2: Create packaging cost configuration table (system config)
CREATE TABLE IF NOT EXISTS public.packaging_slot_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packaging_type TEXT NOT NULL UNIQUE,
  slot_cost NUMERIC(4, 2) NOT NULL,
  max_weight_kg NUMERIC(10, 2),
  max_volume_m3 NUMERIC(10, 3),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Insert default packaging cost matrix
INSERT INTO public.packaging_slot_costs (packaging_type, slot_cost, max_weight_kg, max_volume_m3, description)
VALUES
  ('bag_s', 0.25, 5, 0.02, 'Small bag - lightweight items, documents'),
  ('box_m', 0.50, 15, 0.05, 'Medium box - standard supplies'),
  ('box_l', 1.00, 30, 0.12, 'Large box - bulk supplies'),
  ('crate_xl', 2.00, 100, 0.50, 'Extra large crate - heavy equipment')
ON CONFLICT (packaging_type) DO NOTHING;

-- Step 4: Create requisition_packaging table (1:1 with requisition)
CREATE TABLE IF NOT EXISTS public.requisition_packaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID UNIQUE NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,

  -- Slot demand (from packaging rules, NOT volume)
  total_slot_demand NUMERIC(6, 2) NOT NULL,
  rounded_slot_demand INTEGER NOT NULL,

  -- Metadata
  packaging_version INTEGER NOT NULL DEFAULT 1,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computed_by TEXT DEFAULT 'system',
  is_final BOOLEAN DEFAULT TRUE,

  -- Optional analytics (informational only, not used for slot calculation)
  total_weight_kg NUMERIC(10, 2),
  total_volume_m3 NUMERIC(10, 3),
  total_items INTEGER,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 5: Create requisition_packaging_items table (per-item breakdown)
CREATE TABLE IF NOT EXISTS public.requisition_packaging_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_packaging_id UUID NOT NULL REFERENCES public.requisition_packaging(id) ON DELETE CASCADE,
  requisition_item_id UUID NOT NULL REFERENCES public.requisition_items(id) ON DELETE CASCADE,

  -- Packaging assignment
  packaging_type TEXT NOT NULL CHECK (packaging_type IN ('bag_s', 'box_m', 'box_l', 'crate_xl')),
  package_count INTEGER NOT NULL DEFAULT 1,

  -- Slot cost per packaging type
  slot_cost NUMERIC(4, 2) NOT NULL,
  slot_demand NUMERIC(6, 2) NOT NULL, -- package_count × slot_cost

  -- Item details at time of packaging (snapshot)
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  weight_kg NUMERIC(10, 2),
  volume_m3 NUMERIC(10, 3),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_requisition_packaging_requisition ON public.requisition_packaging(requisition_id);
CREATE INDEX IF NOT EXISTS idx_requisition_packaging_items_packaging ON public.requisition_packaging_items(requisition_packaging_id);
CREATE INDEX IF NOT EXISTS idx_requisition_packaging_items_item ON public.requisition_packaging_items(requisition_item_id);

-- Step 7: Create immutability trigger for requisition_packaging
CREATE OR REPLACE FUNCTION prevent_packaging_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_final = TRUE THEN
    RAISE EXCEPTION 'requisition_packaging is immutable after finalization. is_final=TRUE prevents modifications.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_packaging_immutability ON public.requisition_packaging;
CREATE TRIGGER enforce_packaging_immutability
  BEFORE UPDATE ON public.requisition_packaging
  FOR EACH ROW
  EXECUTE FUNCTION prevent_packaging_updates();

-- Step 8: Create immutability trigger for requisition_packaging_items
CREATE OR REPLACE FUNCTION prevent_packaging_items_updates()
RETURNS TRIGGER AS $$
DECLARE
  v_is_final BOOLEAN;
BEGIN
  SELECT is_final INTO v_is_final
  FROM public.requisition_packaging
  WHERE id = OLD.requisition_packaging_id;

  IF v_is_final = TRUE THEN
    RAISE EXCEPTION 'requisition_packaging_items are immutable after parent packaging is finalized.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_packaging_items_immutability ON public.requisition_packaging_items;
CREATE TRIGGER enforce_packaging_items_immutability
  BEFORE UPDATE ON public.requisition_packaging_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_packaging_items_updates();

-- Step 9: Prevent deletion of packaging items after finalization
CREATE OR REPLACE FUNCTION prevent_packaging_items_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_is_final BOOLEAN;
BEGIN
  SELECT is_final INTO v_is_final
  FROM public.requisition_packaging
  WHERE id = OLD.requisition_packaging_id;

  IF v_is_final = TRUE THEN
    RAISE EXCEPTION 'Cannot delete requisition_packaging_items after packaging is finalized.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_packaging_items_deletion_trigger ON public.requisition_packaging_items;
CREATE TRIGGER prevent_packaging_items_deletion_trigger
  BEFORE DELETE ON public.requisition_packaging_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_packaging_items_deletion();

-- Step 10: Enable RLS
ALTER TABLE public.packaging_slot_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_packaging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_packaging_items ENABLE ROW LEVEL SECURITY;

-- Step 11: RLS Policies
CREATE POLICY "Authenticated users can view packaging slot costs"
  ON public.packaging_slot_costs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System admins can manage packaging slot costs"
  ON public.packaging_slot_costs FOR ALL
  USING (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Authenticated users can view requisition packaging"
  ON public.requisition_packaging FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can create requisition packaging"
  ON public.requisition_packaging FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can view requisition packaging items"
  ON public.requisition_packaging_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can create requisition packaging items"
  ON public.requisition_packaging_items FOR INSERT
  WITH CHECK (TRUE);

-- Step 12: Comments for documentation
COMMENT ON TABLE public.packaging_slot_costs IS
'System configuration table defining slot costs for each packaging type.
bag_s = 0.25 slots, box_m = 0.5 slots, box_l = 1.0 slots, crate_xl = 2.0 slots';

COMMENT ON TABLE public.requisition_packaging IS
'Immutable packaging record computed at requisition approval. One-to-one with requisitions.
total_slot_demand is the authoritative source for slot calculations in batch planning.';

COMMENT ON TABLE public.requisition_packaging_items IS
'Per-item breakdown of packaging assignments. Immutable after parent packaging is finalized.
slot_demand = package_count × slot_cost for each item.';
