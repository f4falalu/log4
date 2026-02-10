import { z } from 'zod';
import { Constants } from '@/types/supabase';

// Extract enum values from database constants
const ORGANIZATION_TYPES = Constants.public.Enums.organization_type;
const VENDOR_ROLES = Constants.public.Enums.vendor_role;
const VENDOR_SERVICES = Constants.public.Enums.vendor_service;
const VENDOR_STATUSES = Constants.public.Enums.vendor_status;

/**
 * Base Vendor Schema (without refinements)
 * Used as foundation for both registration and update schemas
 */
const vendorBaseSchema = z.object({
  // Core Identity (Mandatory)
  name: z.string().min(1, 'Organization name is required').max(255),

  organization_type: z.enum(ORGANIZATION_TYPES as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid organization type' }),
  }),

  // Vendor Role Classification (Mandatory)
  vendor_roles: z.array(z.enum(VENDOR_ROLES as [string, ...string[]]))
    .min(1, 'At least one vendor role is required'),

  // Structured Address
  country: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  address: z.string().max(500).optional(),

  // Primary Contact Information (At least one contact method required)
  organization_lead_name: z.string().min(1, 'Organization lead name is required').max(255),
  organization_lead_title: z.string().max(255).optional(),
  primary_email: z.string().email('Invalid email format').optional(),
  primary_phone: z.string().max(50).optional(),

  // Services Offered (Conditional - required if service_vendor or partner)
  services_offered: z.array(z.enum(VENDOR_SERVICES as [string, ...string[]])).optional(),

  // Operational Metadata
  vendor_status: z.enum(VENDOR_STATUSES as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid vendor status' }),
  }).optional().default('active' as any),

  internal_notes: z.string().max(1000).optional(),

  // Legacy fields (backward compatibility)
  contact_name: z.string().max(255).optional(),
  contact_phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
});

/**
 * Vendor Registration Schema
 *
 * Implements the canonical vendor model with role-based validation:
 * - Vendor is an identity (organization)
 * - Role is contextual (client, partner, service_vendor)
 * - Permissions are workflow-bound
 *
 * Key constraints:
 * - Must have at least one role
 * - Cannot select services unless role includes service_vendor or partner
 * - Primary contact email or phone is required
 */
export const vendorRegistrationSchema = vendorBaseSchema
  .refine(
    (data) => {
      // At least one contact method is required
      return data.primary_email || data.primary_phone;
    },
    {
      message: 'Either primary email or primary phone is required',
      path: ['primary_email'],
    }
  )
  .refine(
    (data) => {
      // Services required if role includes service_vendor or partner
      const requiresServices = data.vendor_roles.some(
        role => role === 'service_vendor' || role === 'partner'
      );

      if (requiresServices && (!data.services_offered || data.services_offered.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Services must be specified when vendor role includes "service_vendor" or "partner"',
      path: ['services_offered'],
    }
  );

/**
 * Vendor Update Schema
 *
 * Same as registration but all fields are optional
 */
export const vendorUpdateSchema = vendorBaseSchema
  .partial()
  .refine(
    (data) => {
      // If vendor_roles is provided, validate it
      if (data.vendor_roles && data.vendor_roles.length === 0) {
        return false;
      }
      return true;
    },
    {
      message: 'If updating roles, at least one role must be provided',
      path: ['vendor_roles'],
    }
  )
  .refine(
    (data) => {
      // Services required if role includes service_vendor or partner
      if (data.vendor_roles) {
        const requiresServices = data.vendor_roles.some(
          role => role === 'service_vendor' || role === 'partner'
        );

        if (requiresServices && data.services_offered !== undefined && data.services_offered.length === 0) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Services must be specified when vendor role includes "service_vendor" or "partner"',
      path: ['services_offered'],
    }
  );

// Type exports
export type VendorRegistrationInput = z.infer<typeof vendorRegistrationSchema>;
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;

// Helper function to get human-readable role labels
export const getVendorRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    client: 'Client',
    partner: 'Partner',
    service_vendor: 'Service Vendor',
  };
  return labels[role] || role;
};

// Helper function to get human-readable organization type labels
export const getOrganizationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    government_agency: 'Government Agency',
    ngo_ingo: 'NGO / INGO',
    private_company: 'Private Company',
    logistics_provider: 'Logistics Provider',
    healthcare_facility: 'Healthcare Facility',
    donor_development_partner: 'Donor / Development Partner',
    other: 'Other',
  };
  return labels[type] || type;
};

// Helper function to get human-readable service labels
export const getVendorServiceLabel = (service: string): string => {
  const labels: Record<string, string> = {
    fleet_vehicles: 'Fleet / Vehicles',
    drivers: 'Drivers',
    warehousing: 'Warehousing',
    last_mile_delivery: 'Last-mile Delivery',
    cold_chain_logistics: 'Cold Chain Logistics',
    maintenance_fuel: 'Maintenance / Fuel',
    other: 'Other',
  };
  return labels[service] || service;
};
