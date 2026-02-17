import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Package,
  TruckIcon,
  Calendar,
  Snowflake,
  MoreVertical,
  Eye,
  Pencil
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Program } from '@/types/program';

interface ProgramCardProps {
  program: Program;
  onEdit: (program: Program) => void;
  onViewDetails: (program: Program) => void;
}

export function ProgramCard({ program, onEdit, onViewDetails }: ProgramCardProps) {
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
    <Card className="hover:shadow-lg transition-shadow relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{program.name}</h3>
              <Badge variant={getPriorityColor(program.priority_tier)}>
                {program.priority_tier}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{program.code}</span>
              {program.requires_cold_chain && (
                <Badge variant="secondary" className="gap-1">
                  <Snowflake className="h-3 w-3" />
                  Cold Chain
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(program)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(program)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {program.funding_source && (
          <div className="mt-2 text-sm text-muted-foreground">
            Funding: {program.funding_source}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badge */}
        <Badge variant={getStatusColor(program.status)} className="w-fit">
          {program.status}
        </Badge>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {program.metrics?.facility_count || 0}
              </p>
              <p className="text-xs text-muted-foreground">Facilities</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-success/10 rounded">
              <Package className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {program.metrics?.active_requisitions || 0}
              </p>
              <p className="text-xs text-muted-foreground">Requisitions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-warning/10 rounded">
              <Calendar className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {program.metrics?.active_schedules || 0}
              </p>
              <p className="text-xs text-muted-foreground">Schedules</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-info/10 rounded">
              <TruckIcon className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {program.metrics?.active_batches || 0}
              </p>
              <p className="text-xs text-muted-foreground">Batches</p>
            </div>
          </div>
        </div>

        {/* SLA */}
        {program.sla_days && (
          <div className="text-sm text-muted-foreground pt-2 border-t">
            SLA: {program.sla_days} days
          </div>
        )}

        {/* View Details Button */}
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={() => onViewDetails(program)}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
