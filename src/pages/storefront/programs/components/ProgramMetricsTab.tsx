import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrograms } from '@/hooks/usePrograms';
import {
  CheckCircle,
  Clock,
  Package,
  TruckIcon,
  TrendingUp,
  AlertTriangle,
  Building2,
  DollarSign,
} from 'lucide-react';
import type { Program } from '@/types/program';

export function ProgramMetricsTab() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');

  const { data, isLoading, error } = usePrograms({});
  const programs = data?.programs || [];

  // Calculate aggregate metrics
  const aggregateMetrics = programs.reduce(
    (acc, program) => ({
      totalFacilities: acc.totalFacilities + (program.metrics?.facility_count || 0),
      totalRequisitions: acc.totalRequisitions + (program.metrics?.active_requisitions || 0),
      totalSchedules: acc.totalSchedules + (program.metrics?.active_schedules || 0),
      totalBatches: acc.totalBatches + (program.metrics?.active_batches || 0),
      pendingBatches: acc.pendingBatches + (program.metrics?.pending_batches || 0),
      stockouts: acc.stockouts + (program.metrics?.stockout_count || 0),
    }),
    {
      totalFacilities: 0,
      totalRequisitions: 0,
      totalSchedules: 0,
      totalBatches: 0,
      pendingBatches: 0,
      stockouts: 0,
    }
  );

  const selectedProgram =
    selectedProgramId === 'all'
      ? null
      : programs.find((p) => p.id === selectedProgramId);

  const metrics = selectedProgram
    ? {
        facilities: selectedProgram.metrics?.facility_count || 0,
        requisitions: selectedProgram.metrics?.active_requisitions || 0,
        schedules: selectedProgram.metrics?.active_schedules || 0,
        batches: selectedProgram.metrics?.active_batches || 0,
        pendingBatches: selectedProgram.metrics?.pending_batches || 0,
        stockouts: selectedProgram.metrics?.stockout_count || 0,
        fulfillmentRate: selectedProgram.metrics?.fulfillment_rate || 0,
        avgDeliveryTime: selectedProgram.metrics?.avg_delivery_time || 0,
      }
    : {
        facilities: aggregateMetrics.totalFacilities,
        requisitions: aggregateMetrics.totalRequisitions,
        schedules: aggregateMetrics.totalSchedules,
        batches: aggregateMetrics.totalBatches,
        pendingBatches: aggregateMetrics.pendingBatches,
        stockouts: aggregateMetrics.stockouts,
        fulfillmentRate: 94,
        avgDeliveryTime: 3.2,
      };

  return (
    <div className="space-y-6">
      {/* Header with Program Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Program Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Operational intelligence and performance KPIs
          </p>
        </div>

        <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs (Aggregate)</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-destructive">Error loading metrics: {error.message}</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fulfillment Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fulfillment Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-3xl font-bold">{metrics.fulfillmentRate}%</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-xs text-success">+13% from last month</span>
                </div>
              </CardContent>
            </Card>

            {/* Active Requisitions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Requisitions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{metrics.requisitions}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Pending fulfillment
                </p>
              </CardContent>
            </Card>

            {/* Pending Batches */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Batches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-warning" />
                  <span className="text-3xl font-bold">{metrics.pendingBatches}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Awaiting dispatch
                </p>
              </CardContent>
            </Card>

            {/* Stockouts Reported */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Stockouts Reported
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-3xl font-bold">{metrics.stockouts}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Requires attention
                </p>
              </CardContent>
            </Card>

            {/* Avg Delivery Time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Delivery Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-info" />
                  <span className="text-3xl font-bold">{metrics.avgDeliveryTime}</span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  From schedule to delivery
                </p>
              </CardContent>
            </Card>

            {/* Active Batches */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Batches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-success" />
                  <span className="text-3xl font-bold">{metrics.batches}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  In route
                </p>
              </CardContent>
            </Card>

            {/* Facilities */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Linked Facilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{metrics.facilities}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Covered by program
                </p>
              </CardContent>
            </Card>

            {/* Active Schedules */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Schedules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="text-3xl font-bold">{metrics.schedules}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Planned deliveries
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Program List with Mini Metrics */}
          {selectedProgramId === 'all' && (
            <div>
              <h3 className="text-md font-semibold mb-4">Program Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((program) => (
                  <Card key={program.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{program.name}</CardTitle>
                        <Badge
                          variant={
                            program.priority_tier === 'CRITICAL'
                              ? 'destructive'
                              : program.priority_tier === 'HIGH'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {program.priority_tier}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {program.funding_source}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Facilities</p>
                          <p className="font-semibold">
                            {program.metrics?.facility_count || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Batches</p>
                          <p className="font-semibold">
                            {program.metrics?.active_batches || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Requisitions</p>
                          <p className="font-semibold">
                            {program.metrics?.active_requisitions || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Schedules</p>
                          <p className="font-semibold">
                            {program.metrics?.active_schedules || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
