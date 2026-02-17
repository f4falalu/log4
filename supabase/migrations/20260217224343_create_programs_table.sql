-- Create programs table for operational program configuration
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  funding_source TEXT,
  priority_tier TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority_tier IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  requires_cold_chain BOOLEAN NOT NULL DEFAULT false,
  sla_days INTEGER CHECK (sla_days > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_funding_source ON programs(funding_source);
CREATE INDEX IF NOT EXISTS idx_programs_priority_tier ON programs(priority_tier);
CREATE INDEX IF NOT EXISTS idx_programs_code ON programs(code);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_programs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER programs_updated_at_trigger
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_programs_updated_at();

-- Enable RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- RLS policies for programs
CREATE POLICY "Users can view programs"
  ON programs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create programs"
  ON programs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update programs"
  ON programs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete programs"
  ON programs FOR DELETE
  TO authenticated
  USING (true);

-- Insert sample programs
INSERT INTO programs (name, code, description, funding_source, priority_tier, requires_cold_chain, sla_days, status)
VALUES
  ('ART Program', 'ART-01', 'Anti-Retroviral Therapy program for HIV/AIDS treatment', 'usaid-art', 'HIGH', false, 7, 'active'),
  ('Malaria', 'MAL-01', 'Malaria prevention and treatment program', 'global-fund', 'NORMAL', false, 5, 'active'),
  ('PMTCT Program', 'PMTCT-01', 'Prevention of Mother-to-Child Transmission of HIV', 'usaid-art', 'NORMAL', false, 7, 'active'),
  ('Family Planning', 'FP-01', 'Family planning and reproductive health services', 'unfpa', 'CRITICAL', false, 14, 'active'),
  ('Nutrition', 'NUT-01', 'Nutritional support and supplementation program', 'usaid-nhdp', 'HIGH', false, 10, 'active'),
  ('Immunization', 'IMM-01', 'Childhood immunization and vaccination program', 'who', 'NORMAL', true, 3, 'active')
ON CONFLICT (code) DO NOTHING;

-- Add comment
COMMENT ON TABLE programs IS 'Operational programs with funding sources and policy configurations';
