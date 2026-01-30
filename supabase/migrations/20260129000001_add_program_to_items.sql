-- Add program column to items table for categorizing items by health program
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS program VARCHAR(100);

-- Add index for program filter queries
CREATE INDEX IF NOT EXISTS idx_items_program ON public.items(program);

-- Comment for documentation
COMMENT ON COLUMN public.items.program IS 'Health program category (e.g., Essential Medicines, HIV/AIDS, Malaria Control)';
