import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Driver } from '@/types';

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(d => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        licenseType: d.license_type as 'standard' | 'commercial',
        status: d.status as 'available' | 'busy' | 'offline',
        currentLocation: d.current_lat && d.current_lng ? {
          lat: Number(d.current_lat),
          lng: Number(d.current_lng)
        } : undefined,
        shiftStart: d.shift_start,
        shiftEnd: d.shift_end,
        maxHours: d.max_hours,
        licenseExpiry: d.license_expiry,
        performanceScore: d.performance_score ? Number(d.performance_score) : undefined,
        totalDeliveries: d.total_deliveries || 0,
        onTimePercentage: d.on_time_percentage ? Number(d.on_time_percentage) : 100,
        onboardingCompleted: d.onboarding_completed || false,
        licenseVerified: d.license_verified || false,
        locationUpdatedAt: d.location_updated_at,
      })) as Driver[];
    }
  });
}
