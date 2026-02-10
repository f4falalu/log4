-- Remove the seed zones so users can create zones manually
DELETE FROM public.zones
WHERE code IN ('central', 'gaya', 'danbatta', 'gwarzo', 'rano');
