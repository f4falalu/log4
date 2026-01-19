-- =====================================================
-- RFC-012: Auto-Packaging Trigger
-- =====================================================
-- Automatically computes packaging when a requisition is approved.
-- The system determines packaging type based on item weight/volume
-- and creates immutable packaging records.
--
-- Flow: pending → approved → (trigger) → packaged (auto)
-- =====================================================

-- Step 1: Create function to determine packaging type for an item
CREATE OR REPLACE FUNCTION determine_packaging_type(
  p_weight_kg NUMERIC,
  p_volume_m3 NUMERIC
) RETURNS TEXT AS $$
BEGIN
  -- Determine packaging type based on weight and volume
  -- Priority: weight first, then volume

  IF p_weight_kg IS NULL THEN
    p_weight_kg := 0;
  END IF;

  IF p_volume_m3 IS NULL THEN
    p_volume_m3 := 0;
  END IF;

  -- crate_xl: heavy/large items (>30kg or >0.12m³)
  IF p_weight_kg > 30 OR p_volume_m3 > 0.12 THEN
    RETURN 'crate_xl';
  -- box_l: medium-heavy items (15-30kg or 0.05-0.12m³)
  ELSIF p_weight_kg > 15 OR p_volume_m3 > 0.05 THEN
    RETURN 'box_l';
  -- box_m: standard items (5-15kg or 0.02-0.05m³)
  ELSIF p_weight_kg > 5 OR p_volume_m3 > 0.02 THEN
    RETURN 'box_m';
  -- bag_s: lightweight items (<5kg and <0.02m³)
  ELSE
    RETURN 'bag_s';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create function to compute packaging for a requisition
CREATE OR REPLACE FUNCTION compute_requisition_packaging(p_requisition_id UUID)
RETURNS UUID AS $$
DECLARE
  v_packaging_id UUID;
  v_total_slot_demand NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_total_volume NUMERIC := 0;
  v_total_items INTEGER := 0;
  v_item RECORD;
  v_packaging_type TEXT;
  v_slot_cost NUMERIC;
  v_package_count INTEGER;
  v_item_slot_demand NUMERIC;
BEGIN
  -- Check if packaging already exists
  SELECT id INTO v_packaging_id
  FROM public.requisition_packaging
  WHERE requisition_id = p_requisition_id;

  IF v_packaging_id IS NOT NULL THEN
    RAISE EXCEPTION 'Packaging already computed for requisition %', p_requisition_id;
  END IF;

  -- Create packaging record (will be updated with totals)
  INSERT INTO public.requisition_packaging (
    requisition_id,
    total_slot_demand,
    rounded_slot_demand,
    total_weight_kg,
    total_volume_m3,
    total_items,
    computed_by,
    is_final
  ) VALUES (
    p_requisition_id,
    0,
    0,
    0,
    0,
    0,
    'system',
    FALSE -- Not final until we complete computation
  ) RETURNING id INTO v_packaging_id;

  -- Process each requisition item
  FOR v_item IN
    SELECT
      ri.id,
      ri.item_name,
      ri.quantity,
      COALESCE(ri.weight_kg, 10) AS weight_kg, -- Default 10kg if not specified
      COALESCE(ri.volume_m3, 0.05) AS volume_m3 -- Default 0.05m³ if not specified
    FROM public.requisition_items ri
    WHERE ri.requisition_id = p_requisition_id
  LOOP
    -- Determine packaging type for this item
    v_packaging_type := determine_packaging_type(v_item.weight_kg, v_item.volume_m3);

    -- Get slot cost for this packaging type
    SELECT slot_cost INTO v_slot_cost
    FROM public.packaging_slot_costs
    WHERE packaging_type = v_packaging_type
    AND is_active = TRUE;

    IF v_slot_cost IS NULL THEN
      v_slot_cost := 1.0; -- Default to 1 slot if not configured
    END IF;

    -- Calculate package count (each unit of quantity gets its own package assessment)
    -- For simplicity, 1 package per quantity unit
    v_package_count := v_item.quantity;

    -- Calculate slot demand for this item
    v_item_slot_demand := v_package_count * v_slot_cost;

    -- Insert packaging item record
    INSERT INTO public.requisition_packaging_items (
      requisition_packaging_id,
      requisition_item_id,
      packaging_type,
      package_count,
      slot_cost,
      slot_demand,
      item_name,
      quantity,
      weight_kg,
      volume_m3
    ) VALUES (
      v_packaging_id,
      v_item.id,
      v_packaging_type,
      v_package_count,
      v_slot_cost,
      v_item_slot_demand,
      v_item.item_name,
      v_item.quantity,
      v_item.weight_kg,
      v_item.volume_m3
    );

    -- Accumulate totals
    v_total_slot_demand := v_total_slot_demand + v_item_slot_demand;
    v_total_weight := v_total_weight + (v_item.weight_kg * v_item.quantity);
    v_total_volume := v_total_volume + (v_item.volume_m3 * v_item.quantity);
    v_total_items := v_total_items + v_item.quantity;
  END LOOP;

  -- Update packaging record with totals and finalize
  -- Note: This bypasses the immutability trigger because is_final is still FALSE
  UPDATE public.requisition_packaging
  SET
    total_slot_demand = v_total_slot_demand,
    rounded_slot_demand = CEIL(v_total_slot_demand),
    total_weight_kg = v_total_weight,
    total_volume_m3 = v_total_volume,
    total_items = v_total_items,
    is_final = TRUE -- Now make it immutable
  WHERE id = v_packaging_id;

  RETURN v_packaging_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger function to auto-compute packaging on approval
CREATE OR REPLACE FUNCTION auto_compute_packaging_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When requisition transitions from pending to approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Compute packaging
    PERFORM compute_requisition_packaging(NEW.id);

    -- Auto-transition to packaged state
    NEW.status := 'packaged';
    NEW.packaged_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger for auto-packaging
-- Note: This trigger must run BEFORE the state transition enforcement trigger
DROP TRIGGER IF EXISTS auto_compute_packaging_trigger ON public.requisitions;
CREATE TRIGGER auto_compute_packaging_trigger
  BEFORE UPDATE OF status ON public.requisitions
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'approved')
  EXECUTE FUNCTION auto_compute_packaging_on_approval();

-- Step 5: Create RPC functions for manual state transitions (for UI)

-- Mark requisition as ready for dispatch (Storefront action)
CREATE OR REPLACE FUNCTION mark_requisition_ready_for_dispatch(p_requisition_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_status
  FROM public.requisitions
  WHERE id = p_requisition_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Requisition not found: %', p_requisition_id;
  END IF;

  IF v_status != 'packaged' THEN
    RAISE EXCEPTION 'Cannot mark ready for dispatch: requisition must be in packaged state (current: %)', v_status;
  END IF;

  -- Transition to ready_for_dispatch
  UPDATE public.requisitions
  SET status = 'ready_for_dispatch'
  WHERE id = p_requisition_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign requisitions to a batch (FleetOps action)
CREATE OR REPLACE FUNCTION assign_requisitions_to_batch(
  p_requisition_ids UUID[],
  p_batch_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_requisition_id UUID;
  v_status TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Validate batch exists
  IF NOT EXISTS (SELECT 1 FROM public.delivery_batches WHERE id = p_batch_id) THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  -- Process each requisition
  FOREACH v_requisition_id IN ARRAY p_requisition_ids
  LOOP
    -- Get current status
    SELECT status INTO v_status
    FROM public.requisitions
    WHERE id = v_requisition_id;

    IF v_status IS NULL THEN
      RAISE WARNING 'Requisition not found: %, skipping', v_requisition_id;
      CONTINUE;
    END IF;

    IF v_status != 'ready_for_dispatch' THEN
      RAISE WARNING 'Requisition % not ready for dispatch (current: %), skipping', v_requisition_id, v_status;
      CONTINUE;
    END IF;

    -- Assign to batch and transition status
    UPDATE public.requisitions
    SET
      status = 'assigned_to_batch',
      batch_id = p_batch_id
    WHERE id = v_requisition_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get slot demand for a facility (FleetOps batch planning)
CREATE OR REPLACE FUNCTION get_facility_slot_demand(p_facility_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_slots NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(rp.rounded_slot_demand), 0) INTO v_total_slots
  FROM public.requisitions r
  JOIN public.requisition_packaging rp ON rp.requisition_id = r.id
  WHERE r.facility_id = p_facility_id
  AND r.status = 'ready_for_dispatch';

  RETURN v_total_slots;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get total slot demand for multiple facilities (batch planning validation)
CREATE OR REPLACE FUNCTION get_batch_slot_demand(p_facility_ids UUID[])
RETURNS TABLE (
  facility_id UUID,
  facility_name TEXT,
  slot_demand NUMERIC,
  requisition_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS facility_id,
    f.name AS facility_name,
    COALESCE(SUM(rp.rounded_slot_demand), 0) AS slot_demand,
    COUNT(DISTINCT r.id)::INTEGER AS requisition_count
  FROM unnest(p_facility_ids) AS fid(id)
  JOIN public.facilities f ON f.id = fid.id
  LEFT JOIN public.requisitions r ON r.facility_id = f.id AND r.status = 'ready_for_dispatch'
  LEFT JOIN public.requisition_packaging rp ON rp.requisition_id = r.id
  GROUP BY f.id, f.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 6: Comments
COMMENT ON FUNCTION compute_requisition_packaging IS
'Computes packaging for a requisition based on item weight/volume.
Called automatically when requisition is approved. Creates immutable packaging records.';

COMMENT ON FUNCTION mark_requisition_ready_for_dispatch IS
'Storefront action to mark a packaged requisition as ready for FleetOps batch planning.';

COMMENT ON FUNCTION assign_requisitions_to_batch IS
'FleetOps action to assign ready_for_dispatch requisitions to a delivery batch.';

COMMENT ON FUNCTION get_facility_slot_demand IS
'Returns total slot demand for all ready_for_dispatch requisitions at a facility.';

COMMENT ON FUNCTION get_batch_slot_demand IS
'Returns slot demand breakdown for multiple facilities (used in batch planning validation).';
