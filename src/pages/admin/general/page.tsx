import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Loader2, AlertCircle, Plus, X, Globe } from 'lucide-react';
import {
  SettingsSection,
  SettingsSwitchRow,
  ColorPicker,
  DateFormatToggle,
} from '@/components/admin/settings';

interface WorkspaceSettings {
  accent_color?: string;
  date_format?: string;
  start_of_week?: string;
  language?: string;
  timezone?: string;
  allowed_email_domains?: string[];
  dark_mode?: boolean;
  high_contrast?: boolean;
  markdown_formatting?: boolean;
  enter_to_send?: boolean;
}

interface CurrentWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  settings: WorkspaceSettings | null;
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (GMT+00:00)' },
  { value: 'America/New_York', label: 'Eastern Time (GMT-05:00)' },
  { value: 'America/Chicago', label: 'Central Time (GMT-06:00)' },
  { value: 'America/Denver', label: 'Mountain Time (GMT-07:00)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (GMT-08:00)' },
  { value: 'Europe/London', label: 'London (GMT+00:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (GMT+02:00)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+01:00)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+09:00)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (GMT+08:00)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+11:00)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
];

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'saturday', label: 'Saturday' },
];

export default function AdminGeneralSettings() {
  const queryClient = useQueryClient();

  // Fetch the user's current workspace
  const { data: workspace, isLoading, error } = useQuery({
    queryKey: ['admin-current-workspace'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to get workspace through membership first
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membership) {
        const { data: ws, error: wsError } = await supabase
          .from('workspaces')
          .select('id, name, slug, description, settings')
          .eq('id', membership.workspace_id)
          .single();

        if (wsError) throw new Error(`Failed to load workspace: ${wsError.message}`);
        return ws as CurrentWorkspace;
      }

      // Fallback for system admins who aren't workspace members:
      // get the first active workspace
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .select('id, name, slug, description, settings')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (wsError) throw new Error(`Failed to load workspaces: ${wsError.message}`);
      if (!ws) throw new Error('No workspaces found. Create a workspace first.');
      return ws as CurrentWorkspace;
    },
    retry: 1,
  });

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [settings, setSettings] = useState<WorkspaceSettings>({});
  const [newDomain, setNewDomain] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when workspace loads
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setSlug(workspace.slug || '');
      setSettings(workspace.settings || {});
    }
  }, [workspace]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error('No workspace');

      const { error } = await supabase
        .from('workspaces')
        .update({
          name,
          slug,
          settings: settings as Record<string, unknown>,
        })
        .eq('id', workspace.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['admin-current-workspace'] });
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

  const addDomain = () => {
    if (!newDomain.trim()) return;
    const domains = settings.allowed_email_domains || [];
    if (!domains.includes(newDomain.trim())) {
      updateSettings('allowed_email_domains', [...domains, newDomain.trim()]);
    }
    setNewDomain('');
  };

  const removeDomain = (domain: string) => {
    const domains = settings.allowed_email_domains || [];
    updateSettings(
      'allowed_email_domains',
      domains.filter((d) => d !== domain)
    );
  };

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
            {(error as { message?: string })?.message || 'Could not connect to the database. Please check your connection and try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">General settings</h1>
          <p className="text-muted-foreground">
            Configure your overall application settings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setName(workspace.name || '');
              setSlug(workspace.slug || '');
              setSettings(workspace.settings || {});
              setHasChanges(false);
            }}
            disabled={!hasChanges}
          >
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Update
          </Button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="border rounded-lg bg-card">
        <div className="px-6">
          <SettingsSection
            title="Workspace name"
            description="Specify the name of your workspace."
          >
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasChanges(true);
              }}
              placeholder="My Workspace"
            />
          </SettingsSection>

          <SettingsSection
            title="Workspace domain"
            description="Set the domain for your workspace."
            badge={
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                CONNECTION ERROR
              </Badge>
            }
          >
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground">
                workspace.de/
              </div>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  setHasChanges(true);
                }}
                placeholder="project-name"
                className="rounded-l-none"
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Start of a week"
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
            title="Allowed email domains"
            description="Define the email domains that are permitted."
          >
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(settings.allowed_email_domains || []).map((domain) => (
                  <Badge key={domain} variant="secondary" className="gap-1">
                    {domain}
                    <button onClick={() => removeDomain(domain)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-48"
                  onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                />
                <Button variant="outline" size="sm" onClick={addDomain}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add domain
                </Button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Accent color"
            description="Select a color to represent your brand."
            badge={
              <Badge className="text-xs bg-orange-500/10 text-orange-600 hover:bg-orange-500/20">
                UPGRADE TO PRO
              </Badge>
            }
          >
            <ColorPicker
              value={settings.accent_color || '#6B7280'}
              onChange={(color) => updateSettings('accent_color', color)}
            />
          </SettingsSection>

          <SettingsSection
            title="Language & timezone"
            description="Adjust your language preferences and timezone."
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Language
                </label>
                <Select
                  value={settings.language || 'en'}
                  onValueChange={(v) => updateSettings('language', v)}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Timezone
                </label>
                <Select
                  value={settings.timezone || 'UTC'}
                  onValueChange={(v) => updateSettings('timezone', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Time & date formats"
            description="Choose your preferred formats for time and date."
          >
            <DateFormatToggle
              value={settings.date_format || 'MM/DD/YYYY'}
              onChange={(format) => updateSettings('date_format', format)}
            />
          </SettingsSection>

          <SettingsSection
            title="Preferences"
            description="Customize your experience."
            showSeparator={false}
          >
            <div className="space-y-1">
              <SettingsSwitchRow
                label="Avoid posting with Enter or Return."
                description="Use Cmd + Return (MacOS) or Ctrl + Enter (Windows) to send instead of just Return."
                checked={settings.enter_to_send === false}
                onCheckedChange={(checked) => updateSettings('enter_to_send', !checked)}
              />
              <SettingsSwitchRow
                label="Markdown formatting options."
                description="Turn off Markdown shortcuts here."
                checked={settings.markdown_formatting !== false}
                onCheckedChange={(checked) => updateSettings('markdown_formatting', checked)}
              />
              <SettingsSwitchRow
                label="Dark Mode."
                description="Prefer less brightness? Switch to dark mode."
                checked={settings.dark_mode || false}
                onCheckedChange={(checked) => updateSettings('dark_mode', checked)}
              />
              <SettingsSwitchRow
                label="High Contrast Mode."
                description="This mode enhances contrast for easier viewing, ideal for Windows and low-res monitors."
                checked={settings.high_contrast || false}
                onCheckedChange={(checked) => updateSettings('high_contrast', checked)}
              />
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
