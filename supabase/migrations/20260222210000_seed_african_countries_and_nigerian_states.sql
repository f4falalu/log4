-- Seed African countries and all 36 Nigerian states + FCT
-- Countries can be expanded later; states will be enhanced with OSM boundaries via Geofabrik import

BEGIN;

-- ============================================================
-- 1. African Countries
-- ============================================================
-- Nigeria already exists as 'country-nigeria-0000-0000-000000000000'
-- Adding major African countries for multi-country operations

INSERT INTO public.countries (id, name, iso_code, iso3_code, capital, currency_code, phone_code, is_active)
VALUES
  (gen_random_uuid(), 'Ghana', 'GH', 'GHA', 'Accra', 'GHS', '+233', true),
  (gen_random_uuid(), 'Kenya', 'KE', 'KEN', 'Nairobi', 'KES', '+254', true),
  (gen_random_uuid(), 'South Africa', 'ZA', 'ZAF', 'Pretoria', 'ZAR', '+27', true),
  (gen_random_uuid(), 'Ethiopia', 'ET', 'ETH', 'Addis Ababa', 'ETB', '+251', true),
  (gen_random_uuid(), 'Tanzania', 'TZ', 'TZA', 'Dodoma', 'TZS', '+255', true),
  (gen_random_uuid(), 'Uganda', 'UG', 'UGA', 'Kampala', 'UGX', '+256', true),
  (gen_random_uuid(), 'Rwanda', 'RW', 'RWA', 'Kigali', 'RWF', '+250', true),
  (gen_random_uuid(), 'Senegal', 'SN', 'SEN', 'Dakar', 'XOF', '+221', true),
  (gen_random_uuid(), 'Cameroon', 'CM', 'CMR', 'Yaoundé', 'XAF', '+237', true),
  (gen_random_uuid(), 'Ivory Coast', 'CI', 'CIV', 'Yamoussoukro', 'XOF', '+225', true),
  (gen_random_uuid(), 'Mozambique', 'MZ', 'MOZ', 'Maputo', 'MZN', '+258', true),
  (gen_random_uuid(), 'Zambia', 'ZM', 'ZMB', 'Lusaka', 'ZMW', '+260', true),
  (gen_random_uuid(), 'Zimbabwe', 'ZW', 'ZWE', 'Harare', 'ZWL', '+263', true),
  (gen_random_uuid(), 'Malawi', 'MW', 'MWI', 'Lilongwe', 'MWK', '+265', true),
  (gen_random_uuid(), 'Mali', 'ML', 'MLI', 'Bamako', 'XOF', '+223', true),
  (gen_random_uuid(), 'Burkina Faso', 'BF', 'BFA', 'Ouagadougou', 'XOF', '+226', true),
  (gen_random_uuid(), 'Niger', 'NE', 'NER', 'Niamey', 'XOF', '+227', true),
  (gen_random_uuid(), 'Chad', 'TD', 'TCD', 'N''Djamena', 'XAF', '+235', true),
  (gen_random_uuid(), 'Guinea', 'GN', 'GIN', 'Conakry', 'GNF', '+224', true),
  (gen_random_uuid(), 'Benin', 'BJ', 'BEN', 'Porto-Novo', 'XOF', '+229', true),
  (gen_random_uuid(), 'Togo', 'TG', 'TGO', 'Lomé', 'XOF', '+228', true),
  (gen_random_uuid(), 'Sierra Leone', 'SL', 'SLE', 'Freetown', 'SLE', '+232', true),
  (gen_random_uuid(), 'Liberia', 'LR', 'LBR', 'Monrovia', 'LRD', '+231', true),
  (gen_random_uuid(), 'Democratic Republic of the Congo', 'CD', 'COD', 'Kinshasa', 'CDF', '+243', true),
  (gen_random_uuid(), 'Republic of the Congo', 'CG', 'COG', 'Brazzaville', 'XAF', '+242', true),
  (gen_random_uuid(), 'Angola', 'AO', 'AGO', 'Luanda', 'AOA', '+244', true),
  (gen_random_uuid(), 'Sudan', 'SD', 'SDN', 'Khartoum', 'SDG', '+249', true),
  (gen_random_uuid(), 'Egypt', 'EG', 'EGY', 'Cairo', 'EGP', '+20', true),
  (gen_random_uuid(), 'Morocco', 'MA', 'MAR', 'Rabat', 'MAD', '+212', true),
  (gen_random_uuid(), 'Tunisia', 'TN', 'TUN', 'Tunis', 'TND', '+216', true),
  (gen_random_uuid(), 'Algeria', 'DZ', 'DZA', 'Algiers', 'DZD', '+213', true),
  (gen_random_uuid(), 'Libya', 'LY', 'LBY', 'Tripoli', 'LYD', '+218', true),
  (gen_random_uuid(), 'Somalia', 'SO', 'SOM', 'Mogadishu', 'SOS', '+252', true),
  (gen_random_uuid(), 'Eritrea', 'ER', 'ERI', 'Asmara', 'ERN', '+291', true),
  (gen_random_uuid(), 'Djibouti', 'DJ', 'DJI', 'Djibouti', 'DJF', '+253', true),
  (gen_random_uuid(), 'Botswana', 'BW', 'BWA', 'Gaborone', 'BWP', '+267', true),
  (gen_random_uuid(), 'Namibia', 'NA', 'NAM', 'Windhoek', 'NAD', '+264', true),
  (gen_random_uuid(), 'Lesotho', 'LS', 'LSO', 'Maseru', 'LSL', '+266', true),
  (gen_random_uuid(), 'Eswatini', 'SZ', 'SWZ', 'Mbabane', 'SZL', '+268', true),
  (gen_random_uuid(), 'Madagascar', 'MG', 'MDG', 'Antananarivo', 'MGA', '+261', true),
  (gen_random_uuid(), 'Mauritius', 'MU', 'MUS', 'Port Louis', 'MUR', '+230', true),
  (gen_random_uuid(), 'Gabon', 'GA', 'GAB', 'Libreville', 'XAF', '+241', true),
  (gen_random_uuid(), 'Equatorial Guinea', 'GQ', 'GNQ', 'Malabo', 'XAF', '+240', true),
  (gen_random_uuid(), 'Central African Republic', 'CF', 'CAF', 'Bangui', 'XAF', '+236', true),
  (gen_random_uuid(), 'South Sudan', 'SS', 'SSD', 'Juba', 'SSP', '+211', true),
  (gen_random_uuid(), 'Burundi', 'BI', 'BDI', 'Gitega', 'BIF', '+257', true),
  (gen_random_uuid(), 'Comoros', 'KM', 'COM', 'Moroni', 'KMF', '+269', true),
  (gen_random_uuid(), 'Seychelles', 'SC', 'SYC', 'Victoria', 'SCR', '+248', true),
  (gen_random_uuid(), 'Cape Verde', 'CV', 'CPV', 'Praia', 'CVE', '+238', true),
  (gen_random_uuid(), 'São Tomé and Príncipe', 'ST', 'STP', 'São Tomé', 'STN', '+239', true),
  (gen_random_uuid(), 'Gambia', 'GM', 'GMB', 'Banjul', 'GMD', '+220', true),
  (gen_random_uuid(), 'Guinea-Bissau', 'GW', 'GNB', 'Bissau', 'XOF', '+245', true),
  (gen_random_uuid(), 'Mauritania', 'MR', 'MRT', 'Nouakchott', 'MRU', '+222', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. All 36 Nigerian States + FCT (admin_level = 4)
-- ============================================================
-- Kano may already exist — ON CONFLICT will skip it
-- These are lightweight entries (no geometry) — Geofabrik import will enhance them later

DO $$
DECLARE
  v_nigeria_id UUID;
  v_states TEXT[] := ARRAY[
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
    'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
    'Ekiti', 'Enugu', 'Federal Capital Territory', 'Gombe', 'Imo',
    'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
    'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
    'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
  ];
  v_state_name TEXT;
BEGIN
  -- Look up Nigeria by ISO code (handles any ID format)
  SELECT id INTO v_nigeria_id FROM public.countries WHERE iso_code = 'NG';

  IF v_nigeria_id IS NULL THEN
    RAISE NOTICE 'Nigeria not found in countries table — skipping states seed';
    RETURN;
  END IF;

  RAISE NOTICE 'Nigeria ID: %', v_nigeria_id;

  FOREACH v_state_name IN ARRAY v_states
  LOOP
    INSERT INTO public.admin_units (
      id, country_id, parent_id, admin_level, name, name_en, is_active, metadata
    ) VALUES (
      gen_random_uuid(),
      v_nigeria_id,
      NULL,
      4,
      v_state_name,
      v_state_name || CASE WHEN v_state_name = 'Federal Capital Territory' THEN '' ELSE ' State' END,
      true,
      jsonb_build_object('placeholder', true, 'source', 'seed', 'note', 'Seed entry — will be enhanced with OSM boundary data via Geofabrik import')
    )
    ON CONFLICT (parent_id, name, country_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Seeded % Nigerian states', array_length(v_states, 1);
END $$;

COMMIT;
