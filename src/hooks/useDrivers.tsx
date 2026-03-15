import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Driver } from '@/types';
import { Database } from '@/types/supabase';

type DriverRow = Database['public']['Tables']['drivers']['Row'];

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');

      if (error) throw error;
      if (!data) return [];

      return (data as DriverRow[]).map((d): Driver => ({
        id: d.id,
        // Basic Information
        name: d.name,
        phone: d.phone,
        email: d.email,
        middleName: d.middle_name,
        dateOfBirth: d.date_of_birth,

        // License & Credentials
        licenseType: d.license_type as 'standard' | 'commercial',
        licenseNumber: d.license_number,
        licenseState: d.license_state,
        licenseExpiry: d.license_expiry,
        licenseVerified: d.license_verified || false,

        // Employment Details
        employer: d.employer,
        position: d.position,
        employmentType: d.employment_type,
        groupName: d.group_name,
        startDate: d.start_date,
        preferredServices: d.preferred_services,
        federalId: d.federal_id,

        // Shift & Hours
        shiftStart: d.shift_start,
        shiftEnd: d.shift_end,
        maxHours: d.max_hours,

        // Address & Contact
        addressLine1: d.address_line1,
        addressLine2: d.address_line2,
        city: d.city,
        stateProvince: d.state_province,
        country: d.country,
        postalCode: d.postal_code,
        emergencyContactName: d.emergency_contact_name,
        emergencyContactPhone: d.emergency_contact_phone,

        // Profile & Documents
        profilePhotoUrl: d.profile_photo_url,
        documentsComplete: d.documents_complete || false,

        // Status & Performance
        status: d.status as 'available' | 'busy' | 'offline',
        currentLocation: d.current_lat && d.current_lng ? {
          lat: Number(d.current_lat),
          lng: Number(d.current_lng)
        } : undefined,
        performanceScore: d.performance_score ? Number(d.performance_score) : undefined,
        totalDeliveries: d.total_deliveries || 0,
        onTimePercentage: d.on_time_percentage ? Number(d.on_time_percentage) : 100,
        onboardingCompleted: d.onboarding_completed || false,
        locationUpdatedAt: d.location_updated_at,
      }));
    }
  });
}
