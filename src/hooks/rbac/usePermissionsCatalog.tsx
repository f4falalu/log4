import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PermissionCatalogItem {
  id: string;
  resource: string;
  action: string;
  code: string;
  description: string;
  category:
    | 'SYSTEM'
    | 'MASTER_DATA'
    | 'INVENTORY'
    | 'REQUISITION'
    | 'INVOICE'
    | 'SCHEDULER'
    | 'BATCH'
    | 'DRIVER'
    | 'REPORTING';
  is_dangerous: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all permissions from the catalog
 */
export function usePermissionsCatalog() {
  return useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category')
        .order('code');

      if (error) throw error;
      return data as PermissionCatalogItem[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - catalog rarely changes
  });
}

/**
 * Get permissions grouped by category
 */
export function usePermissionsCatalogByCategory() {
  const { data: permissions = [], ...rest } = usePermissionsCatalog();

  const grouped = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, PermissionCatalogItem[]>);

  return {
    data: grouped,
    ...rest,
  };
}

/**
 * Get permissions by resource
 */
export function usePermissionsByResource(resource: string) {
  const { data: permissions = [], ...rest } = usePermissionsCatalog();

  const filtered = permissions.filter((p) => p.resource === resource);

  return {
    data: filtered,
    ...rest,
  };
}

/**
 * Get all dangerous permissions
 */
export function useDangerousPermissions() {
  const { data: permissions = [], ...rest } = usePermissionsCatalog();

  const dangerous = permissions.filter((p) => p.is_dangerous);

  return {
    data: dangerous,
    ...rest,
  };
}

/**
 * Permission category metadata
 */
export const PERMISSION_CATEGORIES = {
  SYSTEM: {
    label: 'System / Admin',
    description: 'System administration and user management',
    color: 'destructive',
  },
  MASTER_DATA: {
    label: 'Master Data',
    description: 'Core data management (items, programs, warehouses)',
    color: 'default',
  },
  INVENTORY: {
    label: 'Inventory',
    description: 'Stock management and inventory operations',
    color: 'secondary',
  },
  REQUISITION: {
    label: 'Requisition',
    description: 'Requisition creation and approval',
    color: 'default',
  },
  INVOICE: {
    label: 'Invoice',
    description: 'Invoice processing and financial operations',
    color: 'destructive',
  },
  SCHEDULER: {
    label: 'Scheduler',
    description: 'Delivery schedule planning',
    color: 'default',
  },
  BATCH: {
    label: 'Batch / FleetOps',
    description: 'Fleet operations and dispatch management',
    color: 'default',
  },
  DRIVER: {
    label: 'Driver',
    description: 'Mobile driver execution',
    color: 'secondary',
  },
  REPORTING: {
    label: 'Reporting',
    description: 'Analytics and report generation',
    color: 'secondary',
  },
} as const;

/**
 * Get category metadata
 */
export function getCategoryMeta(category: string) {
  return PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] || {
    label: category,
    description: '',
    color: 'default',
  };
}
