-- Enable PostGIS extension for geographic data support
-- PostGIS adds support for geographic objects, spatial queries, and GIS functionality

-- Enable the PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm for fuzzy text matching (trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable unaccent for accent-insensitive text matching
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add comment explaining the extensions
COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';
COMMENT ON EXTENSION pg_trgm IS 'Text similarity measurement and index searching based on trigrams';
COMMENT ON EXTENSION unaccent IS 'Text search dictionary that removes accents';

-- Verify extensions are enabled
DO $$
BEGIN
  RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
  RAISE NOTICE 'Extensions enabled successfully';
END $$;
