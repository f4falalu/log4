import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkspaceSettings {
  default_zone_id?: string;
  default_warehouse_id?: string;
  auto_assign_driver?: boolean;
  active_program_ids?: string[];
  start_of_week?: string;
  working_days?: string[];
  dispatch_cutoff?: string;
  sla_hours?: number;
  date_format?: string;
}

export interface WorkspaceSettingsResult {
  id: string;
  name: string;
  slug: string;
  org_type: string | null;
  settings: WorkspaceSettings;
}

/**
 * Fetch workspace settings by ID.
 * This is the data contract used by batch creation and other operational features.
 * Do NOT hardcode defaults — always read from this function.
 */
export async function getWorkspaceSettings(
  workspaceId: string
): Promise<WorkspaceSettingsResult> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, slug, org_type, settings')
    .eq('id', workspaceId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    org_type: data.org_type,
    settings: (data.settings as WorkspaceSettings) || {},
  };
}

/**
 * React Query hook for workspace settings.
 * Use this in components; use getWorkspaceSettings() directly in mutations/actions.
 */
export function useWorkspaceSettings(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace-settings', workspaceId],
    queryFn: () => getWorkspaceSettings(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}
