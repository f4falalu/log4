# VLMS Vehicle Onboarding Documentation

## Overview

The VLMS Vehicle Onboarding system provides a comprehensive, user-friendly wizard for registering new vehicles with a standards-compliant 3-layer taxonomy (EU Categories → BIKO Types → Vehicle Tiers).

**Route**: `/fleetops/vlms/vehicles/onboard`

**Status**: ✅ **Phase 1-2 Complete** (MVP Ready)

---

## Architecture

### 3-Layer Taxonomy

```
Layer 1: vehicle_categories (EU + BIKO)
    ├── EU Categories: L1, L2, M1, M2, N1, N2, N3
    └── BIKO Shortcuts: BIKO_MINIVAN, BIKO_KEKE, BIKO_MOPED, BIKO_COLDCHAIN

Layer 2: vehicle_types (Operational Subtypes)
    ├── Mapped to categories
    ├── User-editable
    └── Example: "Mini Van (Toyota Hiace)" → N1

Layer 3: vehicle_tiers (Capacity Partitions)
    ├── Tier-based capacity distribution
    ├── Supports weight (kg) and volume (m³)
    └── Example: Lower (30%), Middle (40%), Upper (30%)
```

### Database Schema

**Core Tables:**
- `vehicle_categories` - Standards-compliant classification (seeded)
- `vehicle_types` - Operational subtypes (user-extensible)
- `vlms_vehicles` - Vehicle instances (extended with new fields)
- `vehicle_tiers` - Normalized tier storage (auto-synced from JSONB)

**New Fields on `vlms_vehicles`:**
```sql
category_id uuid              -- FK to vehicle_categories
vehicle_type_id uuid          -- FK to vehicle_types
capacity_m3 numeric           -- Volume capacity
capacity_kg numeric           -- Weight capacity
length_cm int                 -- Cargo area length
width_cm int                  -- Cargo area width
height_cm int                 -- Cargo area height
tiered_config jsonb           -- Tier configuration array
```

---

## Wizard Flow

### Step 1: Category Selection
**Component**: `CategorySelector.tsx`

- Display EU categories (L1, L2, M1, M2, N1, N2, N3)
- Display BIKO shortcuts (Mini Van, Keke, Moped, Cold Chain)
- Search functionality
- Tabs: All / EU / BIKO

**Navigation**: Select category → Next

### Step 2: Vehicle Type Selection
**Component**: `SubcategoryCarousel.tsx`

- Shows vehicle types filtered by selected category
- Option to create custom type
- Displays default capacity info for each type
- Pre-fills capacity config based on selected type

**Navigation**: Select type OR Enter custom name → Next

### Step 3: Capacity Configuration
**Component**: `CapacityConfigurator.tsx`

- **Mode Toggle**: Dimensions vs. Manual
- **Dimensional Mode**:
  - Enter L×W×H (cm)
  - Auto-calculate volume (m³)
  - Manual weight capacity (kg)
- **Manual Mode**:
  - Enter weight (kg) directly
  - Enter volume (m³) directly
- Shows tier configuration (if any)
- Real-time validation

**Navigation**: Configure capacity → Next

### Step 4: Registration Details
**Component**: `RegistrationForm.tsx`

Comprehensive form with sections:
1. **Basic Information**: Make, Model, Year, Color
2. **Registration & Identification**: License Plate*, VIN, Registration Expiry, Mileage
3. **Specifications**: Fuel Type, Transmission, Engine Capacity, Seating
4. **Acquisition**: Date, Type (Purchase/Lease/Donation/Transfer), Price, Vendor
5. **Insurance**: Provider, Policy Number, Expiry
6. **Status & Notes**: Status, Additional Notes

**Navigation**: Fill required fields → Next

### Step 5: Review & Submit
**Component**: `VehicleOnboardSummary.tsx`

- Review all entered data
- Organized by section with visual indicators
- Shows computed values (capacity, tier breakdown)
- Submit creates vehicle record
- Navigates to vehicle detail page on success

---

## State Management

### Zustand Store
**File**: `src/hooks/useVehicleOnboardState.ts`

```typescript
interface OnboardingState {
  currentStep: OnboardingStep;
  selectedCategory: VehicleCategory | null;
  selectedType: VehicleType | null;
  customTypeName: string;
  capacityConfig: CapacityConfig;
  registrationData: VehicleRegistrationData;
  isLoading: boolean;
  errors: Record<string, string>;
}
```

**Key Actions:**
- `setSelectedCategory()` - Resets subsequent steps
- `setSelectedType()` - Populates capacity defaults
- `updateCapacityConfig()` - Real-time capacity updates
- `getFormData()` - Assembles complete payload
- `reset()` - Clears wizard state

### React Query Hooks

**Categories**:
- `useVehicleCategories()` - All categories
- `useEUCategories()` - EU only
- `useBIKOCategories()` - BIKO only

**Types**:
- `useVehicleTypes(filters)` - All types
- `useVehicleTypesByCategory(categoryId)` - Filtered by category
- `useCreateVehicleType()` - Create custom type

---

## Utility Functions

### Capacity Calculations
**File**: `src/lib/vlms/capacityCalculations.ts`

```typescript
// Dimensional calculations
calculateVolumeFromDimensions(length_cm, width_cm, height_cm) → m³
createDimensionalConfig(L, W, H) → DimensionalConfig
estimateDimensionsFromVolume(m³) → DimensionalConfig

// Tier calculations
calculateTierCapacities(tiers, totalKg, totalM3) → TierConfig[]
sumTierCapacities(tiers) → { totalWeightKg, totalVolumeM3 }
validateTierOrder(tiers) → boolean
createDefaultTierConfig(tierCount, totalKg, totalM3) → TierConfig[]

// Formatting
formatVolume(m³) → "X.XX m³"
formatWeight(kg) → "X kg" or "X.X tons"
formatDimensions(config) → "L × W × H cm"
```

### Tier Validation
**File**: `src/lib/vlms/tierValidation.ts`

```typescript
validateTierConfig(tiers, maxKg, maxM3) → TierValidationResult
validateCapacityConfig(config) → { isValid, errors[], warnings[] }
calculateCapacityUtilization(tiers, maxKg, maxM3) → { weightUtilization%, volumeUtilization% }
isTierConfigBalanced(tiers) → { isBalanced, message }
```

---

## API Integration

### Supabase Tables

**Read Operations:**
```typescript
// Fetch categories
const { data } = await supabase
  .from('vehicle_categories')
  .select('*')
  .order('source', { ascending: false });

// Fetch types by category
const { data } = await supabase
  .from('vehicle_types')
  .select('*, category:vehicle_categories(*)')
  .eq('category_id', categoryId);
```

**Create Vehicle:**
```typescript
const { data, error } = await supabase
  .from('vlms_vehicles')
  .insert({
    category_id,
    vehicle_type_id,
    make,
    model,
    year,
    license_plate,
    capacity_kg,
    capacity_m3,
    length_cm,
    width_cm,
    height_cm,
    tiered_config: [
      { tier_name: 'Lower', tier_order: 1, max_weight_kg: 300, max_volume_m3: 1.35 },
      { tier_name: 'Middle', tier_order: 2, max_weight_kg: 400, max_volume_m3: 1.8 },
      { tier_name: 'Upper', tier_order: 3, max_weight_kg: 300, max_volume_m3: 1.35 },
    ],
    // ... other fields
  })
  .select()
  .single();
```

### Auto-Triggers

**Volume Calculation:**
```sql
-- Auto-calculates capacity_m3 from dimensions if not provided
CREATE TRIGGER trigger_auto_calculate_vehicle_volume
  BEFORE INSERT OR UPDATE ON vlms_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_vehicle_volume();
```

**Tier Sync:**
```sql
-- Auto-syncs vehicle_tiers table from tiered_config JSONB
CREATE TRIGGER trigger_auto_sync_vehicle_tiers
  AFTER INSERT OR UPDATE ON vlms_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_vehicle_tiers();
```

---

## Seeded Data

### EU Categories (7 categories)
- **L1** - Light Two-Wheeler (Mopeds)
- **L2** - Three-Wheeler Moped (Tricycles)
- **M1** - Passenger Car (≤8 seats)
- **M2** - Minibus (>8 seats, ≤5 tonnes)
- **N1** - Light Commercial Vehicle (≤3.5 tonnes)
- **N2** - Medium Commercial Vehicle (3.5-12 tonnes)
- **N3** - Heavy Commercial Vehicle (>12 tonnes)

### BIKO Categories (4 categories)
- **BIKO_MINIVAN** - Mini Van (e.g., Toyota Hiace)
- **BIKO_KEKE** - Keke/Tricycle (Local delivery vehicle)
- **BIKO_MOPED** - Delivery Moped (Two-wheel with cargo box)
- **BIKO_COLDCHAIN** - Cold Chain Van (Refrigerated)

### Vehicle Types (14 operational types)
Examples:
- Keke Cargo (L2)
- Delivery Moped (L1)
- Mini Van - Hiace (N1)
- Cold Chain Van (BIKO_COLDCHAIN)
- 3-Ton Truck (N2)
- 10-Ton Truck (N3)

---

## Component Structure

```
src/components/vlms/vehicle-onboarding/
├── VehicleOnboardWizard.tsx          # Main wizard orchestrator
├── CategorySelector.tsx              # Step 1: Category grid
├── CategoryTile.tsx                  # Individual category card
├── SubcategoryCarousel.tsx           # Step 2: Type selection
├── TypeCard.tsx                      # Individual type card
├── CapacityConfigurator.tsx          # Step 3: Capacity/dimensions
├── RegistrationForm.tsx              # Step 4: Registration details
└── VehicleOnboardSummary.tsx         # Step 5: Review & submit
```

---

## Usage Example

### User Journey

1. **Navigate**: Click "Onboard Vehicle" from `/fleetops/vlms/vehicles`
2. **Select Category**: Choose "N1 - Van" (EU) or "BIKO - Mini Van"
3. **Select Type**: Pick "Mini Van (Toyota Hiace)" or create custom
4. **Configure Capacity**:
   - Toggle "Use Dimensions"
   - Enter: 400cm × 200cm × 180cm
   - System calculates: 14.4 m³
   - Enter weight: 1000 kg
5. **Registration**:
   - Make: Toyota
   - Model: Hiace
   - Year: 2024
   - License: ABC-123-XY
6. **Review & Submit**: Verify all details → Create Vehicle
7. **Redirect**: Navigates to vehicle detail page

### Programmatic Creation

```typescript
import { useVehicleOnboardState } from '@/hooks/useVehicleOnboardState';

const formData = {
  category_id: 'uuid-of-n1-category',
  vehicle_type_id: 'uuid-of-hiace-type',
  make: 'Toyota',
  model: 'Hiace',
  year: 2024,
  license_plate: 'ABC-123-XY',
  capacity_kg: 1000,
  length_cm: 400,
  width_cm: 200,
  height_cm: 180,
  tiered_config: [
    { tier_name: 'Lower', tier_order: 1, max_weight_kg: 300, max_volume_m3: 1.35 },
    { tier_name: 'Middle', tier_order: 2, max_weight_kg: 400, max_volume_m3: 1.8 },
    { tier_name: 'Upper', tier_order: 3, max_weight_kg: 300, max_volume_m3: 1.35 },
  ],
  acquisition_date: '2024-01-15',
  acquisition_type: 'purchase',
  status: 'available',
};

const vehicle = await createVehicle(formData);
```

---

## Validation Rules

### Required Fields
- ✅ Category selection
- ✅ Vehicle type OR custom type name
- ✅ Make, Model, Year
- ✅ License Plate

### Tier Validation
- Sum of tier weights ≤ total capacity (with 5% tolerance)
- Sum of tier volumes ≤ total volume (with 5% tolerance)
- Tier order must be sequential (1, 2, 3, ...)
- No duplicate tier names
- Minimum tier weight: 10 kg
- Minimum tier volume: 0.01 m³

### Dimensional Validation
- All dimensions must be > 0
- Warnings for unrealistic values:
  - Length > 20m
  - Width > 3m
  - Height > 4m

---

## Testing

### Unit Tests
**File**: `src/lib/vlms/__tests__/capacityCalculations.test.ts`

**Coverage**:
- ✅ Volume calculations from dimensions
- ✅ Dimension estimation from volume
- ✅ Tier capacity calculations
- ✅ Tier validation logic
- ✅ Formatting functions
- ✅ Edge cases (zero values, negative numbers, rounding)

**Run Tests**:
```bash
npm run test src/lib/vlms/__tests__/capacityCalculations.test.ts
```

### Integration Testing
```typescript
// Test complete onboarding flow
describe('Vehicle Onboarding Flow', () => {
  it('should complete full onboarding wizard', async () => {
    // 1. Select category
    // 2. Select type
    // 3. Configure capacity
    // 4. Fill registration
    // 5. Submit
    // 6. Verify vehicle created
  });
});
```

---

## Migration & Backward Compatibility

### Non-Breaking Design
- All new columns on `vlms_vehicles` are **nullable**
- Existing vehicles continue working without changes
- Old `vehicle_type` enum field preserved
- New `category_id` and `vehicle_type_id` are optional

### Migration Path
```sql
-- Phase 1: Add new columns (already done)
ALTER TABLE vlms_vehicles ADD COLUMN category_id uuid;
ALTER TABLE vlms_vehicles ADD COLUMN capacity_m3 numeric;

-- Phase 2: Backfill existing vehicles (manual process)
UPDATE vlms_vehicles
SET category_id = (SELECT id FROM vehicle_categories WHERE code = 'N1')
WHERE vehicle_type = 'van';

-- Phase 3: Data verification
SELECT COUNT(*) FROM vlms_vehicles WHERE category_id IS NULL;
```

---

## Troubleshooting

### Common Issues

**Issue**: Categories not loading
```typescript
// Check Supabase connection
const { data, error } = await supabase.from('vehicle_categories').select('*');
console.log('Categories:', data, error);
```

**Issue**: Volume calculation incorrect
```typescript
// Verify dimensions are in centimeters
const volume = (length_cm / 100) * (width_cm / 100) * (height_cm / 100);
console.log('Calculated volume:', volume, 'm³');
```

**Issue**: Tier validation failing
```typescript
import { validateTierConfig } from '@/lib/vlms/tierValidation';
const result = validateTierConfig(tieredConfig, capacity_kg, capacity_m3);
console.log('Validation result:', result);
```

---

## Future Enhancements (Post-MVP)

### Phase 3: Advanced Tier Visualizer
- 3D/Isometric cargo space visualization
- Drag-and-drop tier configuration
- Visual capacity utilization meters

### Phase 4: Data Migration Tools
- Legacy vehicle mapper
- Bulk category assignment
- Validation reports

### Phase 5: Enhanced Features
- Photo upload during onboarding
- Document attachment
- Fleet/location pre-assignment
- QR code generation
- Import from spreadsheet

---

## API Reference

### Key Endpoints

**GET `/vehicle-categories`**
- Returns all vehicle categories (EU + BIKO)
- Includes default tier configurations

**GET `/vehicle-types?category_id={id}`**
- Returns vehicle types for a category
- Includes capacity defaults

**POST `/vehicle-types`**
- Creates custom vehicle type
- Requires: `category_id`, `name`

**POST `/vlms_vehicles`**
- Creates new vehicle instance
- Auto-calculates volume from dimensions
- Auto-syncs tiers to normalized table

---

## Support & Maintenance

### Code Owners
- **Frontend**: Vehicle onboarding wizard, UI components
- **Backend**: Database schema, triggers, validation functions
- **DevOps**: Migrations, seeding, deployment

### Documentation Updates
- Update this doc when adding new categories/types
- Document schema changes in migration files
- Keep validation rules synced with implementation

---

## Appendix

### Default Tier Configurations

**3-Tier (Standard):**
```json
[
  { "tier_name": "Lower", "tier_order": 1, "weight_pct": 30, "volume_pct": 30 },
  { "tier_name": "Middle", "tier_order": 2, "weight_pct": 40, "volume_pct": 40 },
  { "tier_name": "Upper", "tier_order": 3, "weight_pct": 30, "volume_pct": 30 }
]
```

**Single Tier:**
```json
[
  { "tier_name": "Cargo", "tier_order": 1, "weight_pct": 100, "volume_pct": 100 }
]
```

### Example Payloads

See **API Integration** section above for complete examples.

---

**Last Updated**: 2024-11-17
**Version**: 1.0.0 (MVP Complete)
**Status**: ✅ Production Ready
