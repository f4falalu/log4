import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAbilityContext } from '@/rbac/AbilityProvider';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Loader2, AlertCircle, AlertTriangle, Plus, Archive } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SettingsSection,
} from '@/components/admin/settings';
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog';
import type { WorkspaceSettings } from '@/hooks/settings/useWorkspaceSettings';

const ORG_TYPES = [
  { value: 'state_program', label: 'State Program' },
  { value: 'ngo', label: 'NGO' },
  { value: 'private_ops', label: 'Private Ops' },
];

const ALL_DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'saturday', label: 'Saturday' },
];

export default function SettingsGeneralPage() {
  const queryClient = useQueryClient();
  const { workspaceId, workspaceName, role, archiveWorkspace } = useWorkspace();
  const { can } = useAbilityContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const isOwnerOrAdmin = role === 'owner' || role === 'admin';

  const handleArchive = async () => {
    if (!workspaceId) return;
    setIsArchiving(true);
    try {
      await archiveWorkspace(workspaceId);
      setShowArchiveConfirm(false);
    } catch {
      // Error toast handled by context
    } finally {
      setIsArchiving(false);
    }
  };

  // Fetch workspace
  const { data: workspace, isLoading, error } = useQuery({
    queryKey: ['workspace-settings', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('No active workspace');

      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, slug, description, settings, org_type')
        .eq('id', workspaceId)
        .single();

      if (error) throw error;
      return data as {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        settings: WorkspaceSettings | null;
        org_type: string | null;
      };
    },
    enabled: !!workspaceId,
    retry: 1,
  });

  // Fetch zones for dispatch zone selector
  const { data: zones = [] } = useQuery({
    queryKey: ['settings-zones', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zones')
        .select('id, name')
        .eq('workspace_id', workspaceId!)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['settings-warehouses', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Fetch programs
  const { data: programs = [] } = useQuery({
    queryKey: ['settings-programs', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Form state
  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState<string | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setOrgType(workspace.org_type || null);
      setSettings(workspace.settings || {});
    }
  }, [workspace]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error('No workspace');

      const settingsToSave = { ...settings };
      if (!settingsToSave.working_days || settingsToSave.working_days.length === 0) {
        settingsToSave.working_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      }

      const { error } = await supabase.rpc('update_workspace_general_settings', {
        p_workspace_id: workspace.id,
        p_name: name,
        p_org_type: orgType,
        p_settings: settingsToSave as Record<string, unknown>,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['workspace-settings', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['my-workspaces'] });
    },
    onError: (err) => {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    },
  });

  const updateSettings = <K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggleProgram = (programId: string) => {
    const current = settings.active_program_ids || [];
    const updated = current.includes(programId)
      ? current.filter((id) => id !== programId)
      : [...current, programId];
    updateSettings('active_program_ids', updated);
  };

  const toggleWorkingDay = (day: string) => {
    const current = settings.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    updateSettings('working_days', updated);
  };

  if (!can('workspace.manage')) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="font-medium mb-1">Failed to load workspace settings</p>
          <p className="text-sm text-muted-foreground">
            {(error as { message?: string })?.message || 'Please check your connection and try again.'}
          </p>
        </div>
      </div>
    );
  }

  const missingDefaults = !settings.default_zone_id || !settings.default_warehouse_id;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">General settings</h1>
          <p className="text-muted-foreground">
            Configure your workspace settings and operational defaults.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setName(workspace.name || '');
              setOrgType(workspace.org_type || null);
              setSettings(workspace.settings || {});
              setHasChanges(false);
            }}
            disabled={!hasChanges}
          >
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!hasChanges || updateMutation.isPending || missingDefaults}
            title={missingDefaults ? 'Set default zone and warehouse before saving' : undefined}
          >
            {updateMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {missingDefaults && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm">
            Operational defaults are incomplete. Please set a default dispatch zone and default warehouse for full functionality.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Workspace Identity */}
        <div className="border rounded-lg bg-card">
          <div className="px-6 pt-1 pb-1">
            <h2 className="text-base font-semibold pt-4 pb-2">Workspace Identity</h2>
          </div>
          <div className="px-6">
            <SettingsSection
              title="Workspace name"
              description="The display name for this workspace."
            >
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Workspace Name"
              />
            </SettingsSection>

            <SettingsSection
              title="State code"
              description="URL-friendly identifier for this workspace."
            >
              <Badge variant="secondary" className="text-sm font-mono px-3 py-1">
                {workspace.slug || '—'}
              </Badge>
            </SettingsSection>

            <SettingsSection
              title="Workspace type"
              description="The organizational type of this workspace."
            >
              <Select
                value={orgType || ''}
                onValueChange={(v) => {
                  setOrgType(v);
                  setHasChanges(true);
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsSection>

            <SettingsSection
              title="Workspace actions"
              description="Create a new workspace or archive the current one."
              showSeparator={false}
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Create Workspace
                </Button>

                {isOwnerOrAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowArchiveConfirm(true)}
                  >
                    <Archive className="h-4 w-4" />
                    Archive Workspace
                  </Button>
                )}
              </div>
            </SettingsSection>
          </div>
        </div>

        {/* Section 2: Operational Defaults */}
        <div className="border rounded-lg bg-card">
          <div className="px-6 pt-1 pb-1">
            <h2 className="text-base font-semibold pt-4 pb-2">Operational Defaults</h2>
          </div>
          <div className="px-6">
            <SettingsSection
              title="Default dispatch zone"
              description="The default zone used when creating new batches."
            >
              <Select
                value={settings.default_zone_id || ''}
                onValueChange={(v) => updateSettings('default_zone_id', v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select zone..." />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone: any) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsSection>

            <SettingsSection
              title="Default warehouse"
              description="The default warehouse used when creating new batches."
            >
              <Select
                value={settings.default_warehouse_id || ''}
                onValueChange={(v) => updateSettings('default_warehouse_id', v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh: any) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsSection>

            <SettingsSection
              title="Auto-assign driver"
              description="Automatically assign the nearest available driver to new batches."
              showSeparator={false}
            >
              <Switch
                checked={settings.auto_assign_driver ?? false}
                onCheckedChange={(v) => updateSettings('auto_assign_driver', v)}
              />
            </SettingsSection>
          </div>
        </div>

        {/* Section 3: Programs */}
        <div className="border rounded-lg bg-card">
          <div className="px-6 pt-1 pb-1">
            <h2 className="text-base font-semibold pt-4 pb-2">Programs</h2>
          </div>
          <div className="px-6">
            <SettingsSection
              title="Active programs"
              description="Programs currently active in this workspace."
              showSeparator={false}
            >
              <div className="space-y-2">
                {programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No programs available.</p>
                ) : (
                  programs.map((program: any) => (
                    <label
                      key={program.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={(settings.active_program_ids || []).includes(program.id)}
                        onCheckedChange={() => toggleProgram(program.id)}
                      />
                      <span className="text-sm">{program.name}</span>
                    </label>
                  ))
                )}
              </div>
            </SettingsSection>
          </div>
        </div>

        {/* Section 4: Operational Calendar */}
        <div className="border rounded-lg bg-card">
          <div className="px-6 pt-1 pb-1">
            <h2 className="text-base font-semibold pt-4 pb-2">Operational Calendar</h2>
          </div>
          <div className="px-6">
            <SettingsSection
              title="Start of week"
              description="Choose which day marks the start of your week."
            >
              <Select
                value={settings.start_of_week || 'monday'}
                onValueChange={(v) => updateSettings('start_of_week', v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsSection>

            <SettingsSection
              title="Working days"
              description="Days of the week when operations are active."
            >
              <div className="flex flex-wrap gap-3">
                {ALL_DAYS.map((day) => (
                  <label
                    key={day.value}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <Checkbox
                      checked={(settings.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']).includes(day.value)}
                      onCheckedChange={() => toggleWorkingDay(day.value)}
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection
              title="Dispatch cutoff time"
              description="Latest time dispatches can be created for same-day delivery."
            >
              <Input
                type="time"
                value={settings.dispatch_cutoff || ''}
                onChange={(e) => updateSettings('dispatch_cutoff', e.target.value)}
                className="w-40"
              />
            </SettingsSection>

            <SettingsSection
              title="Delivery SLA"
              description="Maximum hours allowed for delivery completion."
              showSeparator={false}
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={settings.sla_hours ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!e.target.value) {
                      updateSettings('sla_hours', undefined);
                    } else if (val >= 1 && val <= 168) {
                      updateSettings('sla_hours', val);
                    }
                  }}
                  className="w-24"
                  placeholder="24"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            </SettingsSection>
          </div>
        </div>
      </div>

      <CreateWorkspaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{workspaceName}</strong>?
              This workspace will be hidden and members will no longer be able to access it.
              This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArchiving ? 'Archiving...' : 'Archive Workspace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
