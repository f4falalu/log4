-- Extend requisitions table with new columns for enhanced requisition workflow
ALTER TABLE public.requisitions
ADD COLUMN IF NOT EXISTS sriv_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'requisition' CHECK (purpose IN (
  'requisition', 'receive_purchase_items', 'issue_to_loss_register',
  'return_expiry', 'issue_to_inter_market'
)),
ADD COLUMN IF NOT EXISTS program VARCHAR(100),
ADD COLUMN IF NOT EXISTS received_from VARCHAR(200),
ADD COLUMN IF NOT EXISTS issued_to VARCHAR(200),
ADD COLUMN IF NOT EXISTS pharmacy_incharge VARCHAR(100),
ADD COLUMN IF NOT EXISTS facility_incharge VARCHAR(100),
ADD COLUMN IF NOT EXISTS submission_date DATE;

-- Extend requisition_items table with conditional quantity columns
ALTER TABLE public.requisition_items
ADD COLUMN IF NOT EXISTS qty_received INTEGER,
ADD COLUMN IF NOT EXISTS qty_issued INTEGER,
ADD COLUMN IF NOT EXISTS qty_returned INTEGER,
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_price DECIMAL(12,2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.requisitions.sriv_number IS 'Store Requisition/Issue Voucher number - unique identifier';
COMMENT ON COLUMN public.requisitions.purpose IS 'Type of requisition determining which quantity column is used';
COMMENT ON COLUMN public.requisitions.program IS 'Associated program (e.g., Family Planning, HIV/AIDS)';
COMMENT ON COLUMN public.requisitions.received_from IS 'Source for receive_purchase_items purpose';
COMMENT ON COLUMN public.requisitions.issued_to IS 'Destination for issue purposes';
COMMENT ON COLUMN public.requisitions.pharmacy_incharge IS 'Name of pharmacy in-charge for approval';
COMMENT ON COLUMN public.requisitions.facility_incharge IS 'Name of facility in-charge for approval';

COMMENT ON COLUMN public.requisition_items.qty_received IS 'Used when purpose is receive_purchase_items';
COMMENT ON COLUMN public.requisition_items.qty_issued IS 'Used when purpose is issue_to_loss_register or issue_to_inter_market';
COMMENT ON COLUMN public.requisition_items.qty_returned IS 'Used when purpose is return_expiry';
