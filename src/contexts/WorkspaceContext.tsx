import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RbacRole } from '@/rbac/types';

// Module-level workspace type (which section of the app)
type WorkspaceType = 'fleetops' | 'storefront' | 'admin' | 'dashboard' | 'mod4' | 'map';

// Multi-tenant workspace info from get_my_workspaces() RPC
interface TenantWorkspace {
  workspace_id: string;
  name: string;
  slug: string;
  role_code: RbacRole;
  role_name: string;
}

interface WorkspaceContextType {
  // Module workspace (existing — backward compatible)
  workspace: WorkspaceType;
  setWorkspace: (workspace: WorkspaceType) => void;

  // Multi-tenant workspace (new)
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceSlug: string | null;
  role: RbacRole | null;
  workspaces: TenantWorkspace[];
  switchWorkspace: (workspaceId: string) => void;
  isLoadingWorkspaces: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY_MODULE = 'biko_workspace';
const STORAGE_KEY_TENANT = 'biko_active_workspace_id';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Module workspace state (existing)
  const [moduleWorkspace, setModuleWorkspaceState] = useState<WorkspaceType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MODULE) as WorkspaceType;
    if (saved && ['fleetops', 'storefront', 'map'].includes(saved)) {
      return saved;
    }
    return 'fleetops';
  });

  const setModuleWorkspace = (ws: WorkspaceType) => {
    setModuleWorkspaceState(ws);
    localStorage.setItem(STORAGE_KEY_MODULE, ws);
  };

  // Tenant workspace state (new)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_TENANT);
  });

  // Fetch workspaces from RPC
  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ['my-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_workspaces');
      if (error) throw error;
      return (data || []) as TenantWorkspace[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-select workspace if none is active or active one is no longer in list
  useEffect(() => {
    if (workspaces.length === 0) return;

    const currentIsValid = activeWorkspaceId &&
      workspaces.some((w) => w.workspace_id === activeWorkspaceId);

    if (!currentIsValid) {
      const firstId = workspaces[0].workspace_id;
      setActiveWorkspaceId(firstId);
      localStorage.setItem(STORAGE_KEY_TENANT, firstId);
    }
  }, [workspaces, activeWorkspaceId]);

  const switchWorkspace = useCallback((wsId: string) => {
    setActiveWorkspaceId(wsId);
    localStorage.setItem(STORAGE_KEY_TENANT, wsId);
    // Invalidate all workspace-scoped queries
    queryClient.invalidateQueries();
  }, [queryClient]);

  // Derive active workspace info
  const activeWorkspace = workspaces.find((w) => w.workspace_id === activeWorkspaceId) || null;

  return (
    <WorkspaceContext.Provider
      value={{
        // Module workspace (backward compatible)
        workspace: moduleWorkspace,
        setWorkspace: setModuleWorkspace,

        // Multi-tenant workspace
        workspaceId: activeWorkspace?.workspace_id ?? null,
        workspaceName: activeWorkspace?.name ?? null,
        workspaceSlug: activeWorkspace?.slug ?? null,
        role: activeWorkspace?.role_code ?? null,
        workspaces,
        switchWorkspace,
        isLoadingWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
