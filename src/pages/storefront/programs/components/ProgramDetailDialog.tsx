import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Package,
  TruckIcon,
  Calendar,
  Snowflake,
  DollarSign,
  Clock,
  Pencil,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type { Program } from '@/types/program';

interface ProgramDetailDialogProps {
  program: Program;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (program: Program) => void;
}

export function ProgramDetailDialog({
  program,
  open,
  onOpenChange,
  onEdit,
}: ProgramDetailDialogProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'normal':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{program.name}</DialogTitle>
              <DialogDescription>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                  {program.code}
                </code>
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onEdit(program);
                onOpenChange(false);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status & Priority */}
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(program.status)}>{program.status}</Badge>
            <Badge variant={getPriorityColor(program.priority_tier)}>
              {program.priority_tier} Priority
            </Badge>
            {program.requires_cold_chain && (
              <Badge variant="secondary" className="gap-1">
                <Snowflake className="h-3 w-3" />
                Cold Chain
              </Badge>
            )}
          </div>

          {/* Description */}
          {program.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{program.description}</p>
            </div>
          )}

          <Separator />

          {/* Funding & Configuration */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Funding Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Funding Source:</span>
                  <span className="font-medium">
                    {program.funding_source || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Operational Settings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">SLA:</span>
                  <span className="font-medium">
                    {program.sla_days ? `${program.sla_days} days` : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Operational Metrics */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Operational Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-primary/10 rounded">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {program.metrics?.facility_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Facilities</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-success/10 rounded">
                  <Package className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {program.metrics?.active_requisitions || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Requisitions</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-warning/10 rounded">
                  <Calendar className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {program.metrics?.active_schedules || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Schedules</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-info/10 rounded">
                  <TruckIcon className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {program.metrics?.active_batches || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Batches</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          {program.metrics && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-4">
                  Performance Indicators
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">Fulfillment Rate</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {program.metrics.fulfillment_rate || 0}%
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-info" />
                      <span className="text-sm font-medium">Avg Delivery Time</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {program.metrics.avg_delivery_time || 0}{' '}
                      <span className="text-sm font-normal text-muted-foreground">
                        days
                      </span>
                    </p>
                  </div>

                  {program.metrics.stockout_count !== undefined &&
                    program.metrics.stockout_count > 0 && (
                      <div className="p-4 border rounded-lg border-destructive/20 bg-destructive/5">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">Stockouts</span>
                        </div>
                        <p className="text-2xl font-bold text-destructive">
                          {program.metrics.stockout_count}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Created: {new Date(program.created_at).toLocaleDateString()}
            </span>
            <span>
              Updated: {new Date(program.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
