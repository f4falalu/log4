# Vendor Workflow Refactor - Implementation Summary

## Overview

The vendor system has been refactored from a simple service provider model to a comprehensive role-based organizational entity system. This document summarizes all changes and provides guidance for using the new system.

## Core Concept

**One Clean Rule:**
> Vendor is an identity.
> Role is contextual.
> Permissions are workflow-bound.

### Key Principles

1. **Vendor = Neutral Organizational Entity**
   - A vendor represents any organization that interacts with the system
   - Not limited to service providers
   - Can be government agencies, NGOs, private companies, etc.

2. **Role-Based Capabilities**
   - Client: Receives services/deliveries
   - Partner: Collaborates or co-executes
   - Service Vendor: Provides fleet, drivers, warehousing, etc.
   - An organization can have multiple roles (but never simultaneously in the same workflow)

3. **Workflow-Level Enforcement**
   - The workflow, not the vendor record, decides what the organization can do
   - Prevents logical contradictions (e.g., vendor delivering to itself)

## Changes Implemented

### 1. Database Schema Changes

**New Enums Created:**
- `organization_type`: government_agency, ngo_ingo, private_company, logistics_provider, healthcare_facility, donor_development_partner, other
- `vendor_role`: client, partner, service_vendor
- `vendor_service`: fleet_vehicles, drivers, warehousing, last_mile_delivery, cold_chain_logistics, maintenance_fuel, other
- `vendor_status`: active, suspended, archived

**New Columns Added to `vendors` Table:**

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `organization_type` | organization_type | No | Type of organization |
| `vendor_roles` | vendor_role[] | Yes | Roles this vendor can assume (array) |
| `vendor_status` | vendor_status | No | Current operational status (default: active) |
| `country` | TEXT | No | Country location |
| `state` | TEXT | No | State/Province location |
| `lga` | TEXT | No | Local Government Area |
| `organization_lead_name` | TEXT | No | Primary contact person name |
| `organization_lead_title` | TEXT | No | Title of organization lead |
| `primary_email` | TEXT | No | Primary email contact |
| `primary_phone` | TEXT | No | Primary phone contact |
| `services_offered` | vendor_service[] | Conditional* | Services provided (array) |
| `onboarded_at` | TIMESTAMPTZ | No | Registration timestamp |
| `onboarded_by` | UUID | No | User who registered the vendor |
| `internal_notes` | TEXT | No | Internal notes about vendor |

*Services required if role includes `service_vendor` or `partner`

**Legacy Fields (Maintained for Backward Compatibility):**
- `contact_name` → Use `organization_lead_name` instead
- `email` → Use `primary_email` instead
- `contact_phone` → Use `primary_phone` instead
- `address` → Still used, but structured fields (country/state/lga) preferred

### 2. Validation Schema

**File:** [src/lib/validations/vendor.ts](../src/lib/validations/vendor.ts)

**Key Constraints:**
- Must have at least one vendor role
- At least one contact method (email or phone) required
- Services must be specified if role includes service_vendor or partner
- Organization name and organization lead name are mandatory
- Organization type is required

**Helper Functions:**
- `getVendorRoleLabel(role)`: Convert role enum to human-readable label
- `getOrganizationTypeLabel(type)`: Convert org type to human-readable label
- `getVendorServiceLabel(service)`: Convert service enum to human-readable label

### 3. TypeScript Types & Hooks

**File:** [src/hooks/useVendors.ts](../src/hooks/useVendors.ts)

**Updated Interfaces:**
```typescript
interface Vendor {
  // Core identity
  id: string;
  name: string;

  // New fields
  organization_type?: OrganizationType;
  vendor_roles: VendorRole[];
  vendor_status?: VendorStatus;

  // Structured address
  country?: string;
  state?: string;
  lga?: string;

  // Primary contact
  organization_lead_name?: string;
  organization_lead_title?: string;
  primary_email?: string;
  primary_phone?: string;

  // Services
  services_offered?: VendorService[];

  // Metadata
  onboarded_at?: string;
  onboarded_by?: string;
  internal_notes?: string;

  // Legacy fields (deprecated)
  contact_name?: string;
  email?: string;
  contact_phone?: string;
  address?: string;

  // Computed
  fleet_count?: number;
}
```

**Hooks Enhanced:**
- `useVendors()`: Fetches all vendors with new fields
- `useCreateVendor()`: Auto-sets onboarded_by, onboarded_at, default status
- `useUpdateVendor()`: Supports partial updates of all fields
- `useDeleteVendor()`: Unchanged

### 4. UI Components

**New Component:** [src/components/vendors/VendorRegistrationForm.tsx](../src/components/vendors/VendorRegistrationForm.tsx)

**Features:**
- 4 organized sections:
  1. Organization Information (name, type, address)
  2. Primary Contact (lead name, title, email, phone)
  3. Role & Capability (roles, conditional services)
  4. Internal Notes
- Role-based conditional rendering (services shown only when needed)
- Comprehensive validation with clear error messages
- Supports both create and edit modes
- Backward compatible with legacy vendor data

**Updated Display:** [src/pages/fleetops/fleet-management/page.tsx](../src/pages/fleetops/fleet-management/page.tsx)

**Vendor Table Columns:**
1. Organization Name
2. Type (badge)
3. Roles (multiple badges)
4. Primary Contact (name + email/phone)
5. Status (colored badge)
6. Fleets count
7. Actions (Edit, Delete)

### 5. Database Migration

**File:** [supabase/migrations/20260204_vendor_role_based_model.sql](../supabase/migrations/20260204_vendor_role_based_model.sql)

**Migration Steps:**
1. Creates all 4 new enums
2. Adds 13 new columns to vendors table
3. Migrates existing data from legacy fields to new fields
4. Sets default vendor_roles = ['service_vendor'] for existing vendors
5. Infers organization_type based on name heuristics
6. Adds constraints (roles not empty, contact required)
7. Creates indexes for performance
8. Adds documentation comments
9. Creates helper function `vendor_has_role()`

**Migration Safety:**
- All new columns are nullable or have defaults
- Legacy fields are preserved
- Data is copied, not moved
- Can be rolled back if needed

## Usage Guide

### Registering a New Vendor

1. Navigate to Fleet Management → Vendors tab
2. Click "Add Vendor"
3. Fill in the required fields:
   - Organization Name*
   - Organization Type*
   - Organization Lead Name*
   - At least one: Primary Email or Primary Phone*
   - Select at least one Role* (Client, Partner, or Service Vendor)
   - If Service Vendor or Partner selected, specify Services Offered*
4. Optionally fill:
   - Structured address (Country, State, LGA)
   - Organization Lead Title
   - Internal Notes
5. Click "Create Vendor"

### Editing a Vendor

1. In the vendors table, click the Edit icon
2. Modify any fields (all validation still applies)
3. Click "Update Vendor"

### Understanding Vendor Roles

**Client**
- Receives services or deliveries from your organization
- Example: Ministry of Health receiving drug deliveries
- Cannot be assigned as a fleet provider
- Can be assigned as a delivery recipient

**Partner**
- Collaborates or co-executes with your organization
- Example: NGO that co-manages distribution
- Can provide some services (e.g., vehicles, storage)
- Shared responsibility model

**Service Vendor**
- Provides operational resources to your organization
- Example: Logistics company providing vehicles and drivers
- Can be assigned as fleet provider
- Measured via SLAs and KPIs

**Multiple Roles Example:**
- A government agency might be both a Client (receives deliveries) AND a Partner (provides vehicles for joint operations)
- The system tracks both roles, but workflows enforce single-role context

### Workflow-Level Role Enforcement

The system prevents logical contradictions:

| Workflow | Allowed Roles | Example |
|----------|--------------|---------|
| Requisition submission | Client | Ministry submits drug request |
| Batch planning | Service Vendor | Assign batch to logistics partner |
| Fleet assignment | Service Vendor, Partner | Link vehicles to vendor fleet |
| Delivery execution | Service Vendor, Partner | Vendor completes delivery |
| Analytics viewing | Client, Partner | View delivery reports |

## Data Migration Notes

### Existing Vendors

All existing vendors were migrated with:
- `vendor_roles = ['service_vendor']` (default assumption)
- `vendor_status = 'active'`
- Legacy fields copied to new primary contact fields
- `organization_type` inferred from name (should be reviewed)
- `onboarded_at` set to `created_at` or current time

### Post-Migration Tasks

1. **Review Organization Types**
   - Check auto-inferred types are correct
   - Update manually if needed

2. **Add Client/Partner Roles**
   - Identify vendors that should also be Clients or Partners
   - Update their `vendor_roles` array

3. **Add Services Offered**
   - For Service Vendors, specify what services they provide
   - Required for proper capability matching

4. **Clean Up Legacy Data**
   - In a future migration, consider deprecating legacy fields
   - Only after UI fully adopts new fields

## Technical Architecture

### Constraints Enforced

**Database Level:**
- `vendor_roles` must not be empty
- At least one contact method required (email or phone)
- Indexes on organization_type, vendor_roles, vendor_status

**Application Level (Validation Schema):**
- Services required if role includes service_vendor or partner
- Organization type must be valid enum value
- Role and service values must match enum definitions

### Performance Considerations

- GIN index on `vendor_roles` array for efficient role queries
- Standard B-tree indexes on status and organization_type
- Vendor count computed via fleet relationship

## API Changes

### Before
```typescript
createVendor({
  name: "ABC Logistics",
  contact_name: "John Doe",
  email: "john@abc.com",
  phone: "+234...",
  address: "123 Main St"
})
```

### After
```typescript
createVendor({
  name: "ABC Logistics",
  organization_type: "logistics_provider",
  vendor_roles: ["service_vendor"],
  organization_lead_name: "John Doe",
  primary_email: "john@abc.com",
  primary_phone: "+234...",
  country: "Nigeria",
  state: "Lagos",
  services_offered: ["fleet_vehicles", "drivers", "last_mile_delivery"],

  // Legacy fields still accepted for backward compatibility
  contact_name: "John Doe",
  email: "john@abc.com",
  address: "123 Main St"
})
```

## Files Changed

### New Files
- `src/lib/validations/vendor.ts` - Validation schemas and helpers
- `src/components/vendors/VendorRegistrationForm.tsx` - New registration form
- `supabase/migrations/20260204_vendor_role_based_model.sql` - Database migration
- `docs/VENDOR_WORKFLOW_REFACTOR.md` - This document

### Modified Files
- `src/types/supabase.ts` - Database type definitions
- `src/hooks/useVendors.ts` - Vendor hooks and interfaces
- `src/pages/fleetops/fleet-management/page.tsx` - Vendor UI integration

## Future Enhancements

### Potential Additions
1. **Vendor Approval Workflow**
   - Multi-step approval for new vendors
   - Document verification
   - Background checks

2. **Vendor Performance Tracking**
   - KPI dashboards
   - Rating/scoring system
   - SLA monitoring

3. **Vendor Contracts Management**
   - Contract upload and versioning
   - Expiry tracking
   - Renewal reminders

4. **Partner API Integration**
   - API keys for vendor access
   - Webhook notifications
   - Real-time status updates

5. **Compliance Tracking**
   - License verification
   - Insurance tracking
   - Regulatory compliance checks

## Troubleshooting

### Common Issues

**Issue:** Vendor creation fails with "At least one role required"
- **Solution:** Ensure at least one checkbox is selected in the Roles section

**Issue:** Can't submit form without services
- **Solution:** If Service Vendor or Partner role is selected, you must specify at least one service

**Issue:** Legacy vendors show "No roles"
- **Solution:** Edit the vendor and add appropriate roles based on their actual function

**Issue:** Migration fails on existing database
- **Solution:** The migration uses `IF NOT EXISTS` and handles existing data safely. Check logs for specific constraint violations.

## Support

For questions or issues with the vendor workflow refactor:
1. Check this documentation first
2. Review the validation error messages (they're descriptive)
3. Check the database migration comments for schema details
4. Refer to the code comments in the validation schema

## Changelog

### Version 2.0 (2026-02-04)
- ✅ Implemented role-based vendor model
- ✅ Added organization type classification
- ✅ Added structured address fields
- ✅ Added conditional services validation
- ✅ Created comprehensive registration form
- ✅ Updated vendor list display
- ✅ Created database migration script
- ✅ Maintained backward compatibility

### Version 1.0 (Before 2026-02-04)
- Basic vendor model (name, contact, email, phone, address)
- Simple CRUD operations
- Fleet assignment only
