/**
 * Setup Required Prompt
 *
 * Displays a friendly message when the workspace is not yet ready,
 * guiding users to complete the operational setup.
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  Circle,
  Warehouse,
  Truck,
  Package,
  Users,
  Shield,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import type { WorkspaceReadiness, ReadinessGate } from '@/types/onboarding';
import { getReadinessGateLabel } from '@/types/onboarding';

interface SetupRequiredPromptProps {
  readiness: WorkspaceReadiness | null;
  title?: string;
  description?: string;
}

const GATE_ICONS: Record<ReadinessGate, typeof Warehouse> = {
  admin: Users,
  rbac: Shield,
  warehouse: Warehouse,
  vehicle: Truck,
  packaging_rules: Package,
};

export function SetupRequiredPrompt({
  readiness,
  title = 'Complete Your Setup',
  description = 'A few more steps are needed before you can access planning features.',
}: SetupRequiredPromptProps) {
  const navigate = useNavigate();

  const gates: { key: ReadinessGate; completed: boolean }[] = [
    { key: 'admin', completed: readiness?.has_admin ?? false },
    { key: 'rbac', completed: readiness?.has_rbac_configured ?? false },
    { key: 'warehouse', completed: readiness?.has_warehouse ?? false },
    { key: 'vehicle', completed: readiness?.has_vehicle ?? false },
    { key: 'packaging_rules', completed: readiness?.has_packaging_rules ?? false },
  ];

  const completedCount = gates.filter((g) => g.completed).length;
  const progressPercentage = readiness?.progress_percentage ?? (completedCount / gates.length) * 100;

  const getNextAction = (): { label: string; path: string } | null => {
    if (!readiness?.has_warehouse) {
      return { label: 'Add Warehouse', path: '/admin/facilities/new?type=warehouse' };
    }
    if (!readiness?.has_vehicle) {
      return { label: 'Onboard Vehicle', path: '/vlms/onboarding' };
    }
    return null;
  };

  const nextAction = getNextAction();

  return (
    <div className="flex items-center justify-center min-h-[600px] p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Setup Progress</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            {gates.map(({ key, completed }) => {
              const Icon = GATE_ICONS[key];
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    completed ? 'bg-success/5 border-success/20' : 'bg-muted/50 border-border'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      completed ? 'bg-success/10' : 'bg-muted'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${completed ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  <span className={`flex-1 ${completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {getReadinessGateLabel(key)}
                  </span>
                  {completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Missing items alert */}
          {readiness?.missing_items && readiness.missing_items.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>What&apos;s needed</AlertTitle>
              <AlertDescription>
                {readiness.missing_items.length === 1 ? (
                  <>You need to add {getReadinessGateLabel(readiness.missing_items[0]).toLowerCase()} to continue.</>
                ) : (
                  <>
                    You need to complete: {readiness.missing_items.map((item) => getReadinessGateLabel(item).toLowerCase()).join(', ')}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
            Go Back
          </Button>
          {nextAction && (
            <Button onClick={() => navigate(nextAction.path)} className="flex-1">
              {nextAction.label}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
