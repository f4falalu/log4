# Vendor System - Quick Reference Guide

## TL;DR

**Core Principle:** Vendors are organizations with contextual roles. Workflows enforce single-role behavior.

## Vendor Roles

| Role | Meaning | Use In Workflows |
|------|---------|------------------|
| `client` | Receives services/deliveries | Requisitions, Delivery recipients |
| `partner` | Collaborates, co-executes | Joint operations, Shared resources |
| `service_vendor` | Provides operational resources | Fleet assignment, Driver pools |

## Required Fields

**Always Required:**
- `name` (Organization name)
- `organization_type` (Enum)
- `vendor_roles` (Array, at least one)
- `organization_lead_name` (Primary contact)
- At least one: `primary_email` OR `primary_phone`

**Conditionally Required:**
- `services_offered` (If role includes `service_vendor` or `partner`)

## Validation Schema Import

```typescript
import {
  vendorRegistrationSchema,
  vendorUpdateSchema,
  type VendorRegistrationInput,
  getVendorRoleLabel,
  getOrganizationTypeLabel,
  getVendorServiceLabel
} from '@/lib/validations/vendor';
```

## Hooks Usage

```typescript
import { useVendors, useCreateVendor, useUpdateVendor } from '@/hooks/useVendors';

// Fetch vendors
const { data: vendors, isLoading, error } = useVendors();

// Create vendor
const createVendor = useCreateVendor();
await createVendor.mutateAsync({
  name: "ABC Logistics",
  organization_type: "logistics_provider",
  vendor_roles: ["service_vendor"],
  organization_lead_name: "John Doe",
  primary_email: "john@abc.com",
  services_offered: ["fleet_vehicles", "drivers"]
});

// Update vendor
const updateVendor = useUpdateVendor();
await updateVendor.mutateAsync({
  id: vendorId,
  data: {
    vendor_roles: ["client", "partner"],
    services_offered: ["warehousing"]
  }
});
```

## Enums Reference

### Organization Types
```typescript
'government_agency' | 'ngo_ingo' | 'private_company' |
'logistics_provider' | 'healthcare_facility' |
'donor_development_partner' | 'other'
```

### Vendor Roles
```typescript
'client' | 'partner' | 'service_vendor'
```

### Vendor Services
```typescript
'fleet_vehicles' | 'drivers' | 'warehousing' |
'last_mile_delivery' | 'cold_chain_logistics' |
'maintenance_fuel' | 'other'
```

### Vendor Status
```typescript
'active' | 'suspended' | 'archived'
```

## Common Queries

### Get all active service vendors
```sql
SELECT * FROM vendors
WHERE vendor_status = 'active'
AND 'service_vendor' = ANY(vendor_roles);
```

### Get vendors offering specific service
```sql
SELECT * FROM vendors
WHERE 'fleet_vehicles' = ANY(services_offered);
```

### Check if vendor has role
```sql
SELECT vendor_has_role(vendor_roles, 'client') FROM vendors;
```

## UI Component

```typescript
import { VendorRegistrationForm } from '@/components/vendors/VendorRegistrationForm';

<VendorRegistrationForm
  vendor={editingVendor}  // null for create, Vendor object for edit
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

## Display Helpers

```typescript
// Convert enums to readable labels
const roleLabel = getVendorRoleLabel('service_vendor'); // "Service Vendor"
const orgLabel = getOrganizationTypeLabel('ngo_ingo'); // "NGO / INGO"
const serviceLabel = getVendorServiceLabel('fleet_vehicles'); // "Fleet / Vehicles"
```

## Workflow Role Checks

```typescript
// Example: Only allow service vendors to be assigned as fleet providers
function canBeFleetProvider(vendor: Vendor): boolean {
  return vendor.vendor_roles.includes('service_vendor') ||
         vendor.vendor_roles.includes('partner');
}

// Example: Only allow clients to submit requisitions
function canSubmitRequisition(vendor: Vendor): boolean {
  return vendor.vendor_roles.includes('client');
}
```

## Migration Status

- ✅ Existing vendors have `vendor_roles = ['service_vendor']`
- ✅ Legacy fields preserved (`contact_name`, `email`, `contact_phone`)
- ⚠️ Review and update `organization_type` (auto-inferred, may need correction)
- ⚠️ Add appropriate roles for clients/partners
- ⚠️ Add `services_offered` for service vendors

## Constraints

**Database:**
- `vendor_roles` cannot be empty
- At least one contact method required

**Application:**
- Services required if role includes service_vendor or partner
- Organization type must be valid enum

## Common Patterns

### Multi-Role Vendor
```typescript
{
  name: "National Health Service",
  organization_type: "government_agency",
  vendor_roles: ["client", "partner"],  // Both receive AND collaborate
  services_offered: ["warehousing"],    // Provides storage facilities
  // ... other fields
}
```

### Service-Only Vendor
```typescript
{
  name: "FastTrack Logistics",
  organization_type: "logistics_provider",
  vendor_roles: ["service_vendor"],
  services_offered: ["fleet_vehicles", "drivers", "last_mile_delivery"],
  // ... other fields
}
```

### Client-Only Vendor
```typescript
{
  name: "Rural Health Clinic",
  organization_type: "healthcare_facility",
  vendor_roles: ["client"],
  // services_offered not required for client-only
  // ... other fields
}
```

## Backward Compatibility

Legacy field mappings (read automatically):
- `contact_name` → `organization_lead_name`
- `email` → `primary_email`
- `contact_phone` → `primary_phone`

For new records, use the new field names directly.

## Quick Troubleshooting

| Error | Fix |
|-------|-----|
| "At least one role required" | Select at least one role checkbox |
| "Services must be specified" | Add services when service_vendor/partner selected |
| "Email or phone required" | Provide at least one contact method |
| "Vendor not found" | Check vendor_status (may be archived) |

## Key Files

- Types: `src/types/supabase.ts`
- Validation: `src/lib/validations/vendor.ts`
- Hooks: `src/hooks/useVendors.ts`
- Form: `src/components/vendors/VendorRegistrationForm.tsx`
- Migration: `supabase/migrations/20260204_vendor_role_based_model.sql`

## Best Practices

1. **Always validate with schema** before submitting to API
2. **Check roles** before allowing workflow actions
3. **Use helper functions** for label display (don't hardcode)
4. **Filter by status** in queries (exclude archived unless explicitly needed)
5. **Index GIN arrays** for role/service queries at scale
6. **Document role assumptions** in workflow code comments

## Testing

```typescript
// Test vendor creation
const validVendor: VendorRegistrationInput = {
  name: "Test Vendor",
  organization_type: "private_company",
  vendor_roles: ["service_vendor"],
  organization_lead_name: "Test Lead",
  primary_email: "test@example.com",
  services_offered: ["fleet_vehicles"]
};

// Should pass validation
vendorRegistrationSchema.parse(validVendor);

// Should fail - no services for service_vendor
const invalidVendor = {
  ...validVendor,
  services_offered: undefined
};
// Throws validation error
```

## Performance Tips

- Use GIN index for array searches: `vendor_roles`, `services_offered`
- Paginate vendor lists for large datasets
- Cache vendor lookups in workflow contexts
- Pre-filter by status before other conditions

## Further Reading

See [VENDOR_WORKFLOW_REFACTOR.md](./VENDOR_WORKFLOW_REFACTOR.md) for complete implementation details.
