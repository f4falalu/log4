import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RouteOptimizationParams {
  warehouseId: string;
  facilityIds: string[];
  vehicleType?: string;
  medicationType?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface OptimizedRoute {
  totalDistance: number;
  estimatedDuration: number;
  optimizedRoute: [number, number][];
  warehouseId: string;
  facilities: any[];
}

/**
 * Hook for route optimization via edge function
 * Abstracts the optimize-route edge function into a reusable mutation
 */
export function useRouteOptimization() {
  const mutation = useMutation({
    mutationFn: async (params: RouteOptimizationParams) => {
      const { data, error } = await supabase.functions.invoke('optimize-route', {
        body: params
      });
      
      if (error) throw error;
      return data as OptimizedRoute;
    },
    onSuccess: (data) => {
      toast.success(`Route optimized: ${data.totalDistance.toFixed(1)} km`, {
        description: `Estimated duration: ${Math.round(data.estimatedDuration)} minutes`
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to optimize route', {
        description: error.message
      });
    }
  });
  
  return {
    optimize: mutation.mutate,
    optimizeAsync: mutation.mutateAsync,
    isOptimizing: mutation.isPending,
    optimizedRoute: mutation.data,
    error: mutation.error,
    reset: mutation.reset,
  };
}
