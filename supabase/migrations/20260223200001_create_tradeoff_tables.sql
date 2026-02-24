-- =====================================================
-- Trade-Off Tables
-- =====================================================
-- Trade-Off is the ONLY reassignment mechanism in operational mode.
-- When a driver can't complete delivery, items are manually
-- allocated to receiving vehicles with multi-party confirmation.
-- =====================================================

-- Trade-Off state machine
CREATE TYPE tradeoff_status AS ENUM (
  'initiated',
  'receivers_selected',
  'allocation_complete',
  'confirmations_pending',
  'all_confirmed',
  'executed',
  'cancelled'
);

-- Main trade-off record
CREATE TABLE IF NOT EXISTS public.trade_offs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  original_dispatch_id UUID, -- references delivery_batches if applicable
  source_vehicle_id UUID REFERENCES public.vehicles(id),
  source_driver_id UUID REFERENCES public.drivers(id),

  -- Receiving vehicles
  receiving_vehicle_ids UUID[] NOT NULL DEFAULT '{}',

  -- Handover location
  handover_lat DECIMAL(10, 8),
  handover_lng DECIMAL(11, 8),

  -- State
  status tradeoff_status NOT NULL DEFAULT 'initiated',

  -- Metadata
  initiated_by UUID REFERENCES auth.users(id),
  reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Trade-Off item allocations
CREATE TABLE IF NOT EXISTS public.trade_off_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_off_id UUID NOT NULL REFERENCES public.trade_offs(id) ON DELETE CASCADE,

  -- Item details
  item_name TEXT NOT NULL,
  original_quantity INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'units',

  -- Allocation per vehicle: { vehicleId: quantity }
  allocated_quantities JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Multi-party confirmations
CREATE TABLE IF NOT EXISTS public.trade_off_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_off_id UUID NOT NULL REFERENCES public.trade_offs(id) ON DELETE CASCADE,

  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  driver_name TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  role TEXT NOT NULL CHECK (role IN ('source', 'receiver')),

  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(trade_off_id, driver_id)
);

-- Indexes
CREATE INDEX idx_trade_offs_status ON public.trade_offs(status);
CREATE INDEX idx_trade_offs_source_vehicle ON public.trade_offs(source_vehicle_id);
CREATE INDEX idx_trade_offs_initiated_by ON public.trade_offs(initiated_by);
CREATE INDEX idx_trade_off_items_trade_off ON public.trade_off_items(trade_off_id);
CREATE INDEX idx_trade_off_confirmations_trade_off ON public.trade_off_confirmations(trade_off_id);

-- Enable RLS
ALTER TABLE public.trade_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_off_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_off_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view trade-offs"
  ON public.trade_offs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create trade-offs"
  ON public.trade_offs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "Initiator can update their trade-offs"
  ON public.trade_offs FOR UPDATE
  TO authenticated
  USING (auth.uid() = initiated_by);

CREATE POLICY "Authenticated users can view trade-off items"
  ON public.trade_off_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage trade-off items"
  ON public.trade_off_items FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view confirmations"
  ON public.trade_off_confirmations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage confirmations"
  ON public.trade_off_confirmations FOR ALL
  TO authenticated
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_trade_offs_updated_at
  BEFORE UPDATE ON public.trade_offs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
