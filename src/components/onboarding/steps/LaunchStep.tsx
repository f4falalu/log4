import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Check, AlertCircle, Loader2, Building2, Users, Warehouse, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { WorkspaceReadiness } from '@/types/onboarding';
import type { useOnboardingWizard } from '@/hooks/onboarding/useOnboardingWizard';

interface LaunchStepProps {
  wizard: ReturnType<typeof useOnboardingWizard>;
}

export default function LaunchStep({ wizard }: LaunchStepProps) {
  const { state, completeOnboarding } = wizard;
  const [readiness, setReadiness] = useState<WorkspaceReadiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.workspaceId) return;

    const fetchReadiness = async () => {
      try {
        const { data, error } = await supabase.rpc('get_workspace_readiness', {
          p_workspace_id: state.workspaceId!,
        });
        if (error) throw error;
        setReadiness(data as unknown as WorkspaceReadiness);
      } catch (err) {
        console.error('Failed to fetch readiness:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReadiness();
  }, [state.workspaceId]);

  const handleLaunch = () => {
    completeOnboarding.mutate();
  };

  const checklistItems = [
    {
      label: 'Organization Created',
      done: !!state.workspaceId,
      icon: Building2,
      required: true,
    },
    {
      label: 'Admin Assigned',
      done: readiness?.has_admin ?? false,
      icon: Users,
      required: true,
    },
    {
      label: 'Warehouse Added',
      done: readiness?.has_warehouse ?? false,
      icon: Warehouse,
      required: false,
    },
    {
      label: 'Vehicle Added',
      done: readiness?.has_vehicle ?? false,
      icon: Truck,
      required: false,
    },
  ];

  const requiredComplete = checklistItems.filter(i => i.required).every(i => i.done);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center mb-4">
          <Rocket className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-semibold text-white">Launch Your Workspace</h1>
        <p className="text-zinc-400">
          Review your setup and launch{' '}
          <strong className="text-white">{state.orgName}</strong>.
        </p>
      </div>

      {/* Setup checklist */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Setup Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Checking workspace readiness...</span>
            </div>
          ) : (
            <ul className="space-y-3">
              {checklistItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={index} className="flex items-center gap-3">
                    {item.done ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 border-zinc-700 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-zinc-600" />
                      </div>
                    )}
                    <span
                      className={`text-sm ${item.done ? 'text-zinc-300' : 'text-zinc-500'}`}
                    >
                      {item.label}
                    </span>
                    {!item.required && !item.done && (
                      <span className="text-[10px] uppercase tracking-wider text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                        Optional
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Info notice */}
      {!requiredComplete && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-medium">Setup Incomplete</p>
            <p className="text-xs text-amber-400/70 mt-1">
              Some required setup steps are not complete. Go back to complete them.
            </p>
          </div>
        </div>
      )}

      <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
        <p className="text-sm text-zinc-400">
          You can always come back to configure additional settings, import data, and manage your
          team from the <strong className="text-zinc-300">Admin</strong> section.
        </p>
      </div>

      {/* Launch button */}
      <Button
        onClick={handleLaunch}
        disabled={!requiredComplete || completeOnboarding.isPending}
        className="w-full h-14 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold text-lg"
      >
        {completeOnboarding.isPending ? (
          <>
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            Launching...
          </>
        ) : (
          <>
            <Rocket className="w-6 h-6 mr-2" />
            Launch Workspace
          </>
        )}
      </Button>
    </div>
  );
}
