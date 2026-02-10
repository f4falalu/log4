-- Create facility_types reference table
CREATE TABLE IF NOT EXISTS public.facility_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create levels_of_care reference table
CREATE TABLE IF NOT EXISTS public.levels_of_care (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  hierarchy_level integer,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed facility types
INSERT INTO public.facility_types (name, description) VALUES
  ('Hospital', 'General or specialist hospital'),
  ('Primary Health Center', 'Primary healthcare facility'),
  ('Health Post', 'Basic health service delivery point'),
  ('Clinic', 'Outpatient clinic'),
  ('Pharmacy', 'Pharmaceutical dispensary'),
  ('Laboratory', 'Diagnostic laboratory'),
  ('Maternity Home', 'Maternity and childbirth facility'),
  ('Nursing Home', 'Residential nursing care facility'),
  ('Dispensary', 'Medicine dispensary point')
ON CONFLICT (name) DO NOTHING;

-- Seed levels of care
INSERT INTO public.levels_of_care (name, description, hierarchy_level) VALUES
  ('Primary', 'Primary level health facilities (PHCs, health posts)', 1),
  ('Secondary', 'Secondary level health facilities (general hospitals)', 2),
  ('Tertiary', 'Tertiary level health facilities (teaching/specialist hospitals)', 3)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.facility_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels_of_care ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read access
CREATE POLICY "Authenticated users can read facility_types"
  ON public.facility_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read levels_of_care"
  ON public.levels_of_care FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon read access (for public API usage)
CREATE POLICY "Anon users can read facility_types"
  ON public.facility_types FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can read levels_of_care"
  ON public.levels_of_care FOR SELECT
  TO anon
  USING (true);
