/**
 * Phase 2: Analytics Backend - Ticket A8
 * FleetOps Analytics Dashboard UI
 *
 * Purpose: Display pre-aggregated analytics from materialized views
 * Performance: All data comes from server-side aggregations (A1-A5)
 *
 * CRITICAL: This page contains ZERO client-side aggregation logic.
 * All calculations are performed in the database.
 * This component ONLY displays data.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  useDashboardSummary,
  useTopVehiclesByOnTime,
  useTopDrivers,
  useVehiclesNeedingMaintenance,
  useVehicleCosts,
  useDriverCosts,
} from '@/hooks/useAnalytics';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Truck,
  DollarSign,
  AlertTriangle,
  Clock,
  Fuel,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

function MetricCard({ title, value, description, icon: Icon, trend, trendValue, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
            <span className={cn(
              "text-xs font-medium",
              trend === 'up' && "text-green-600",
              trend === 'down' && "text-red-600"
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DATE RANGE SELECTOR (SIMPLE)
// ============================================================================

function DateRangeSelector({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}: {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <label className="text-sm font-medium">From:</label>
      <input
        type="date"
        value={startDate || ''}
        onChange={(e) => onStartDateChange(e.target.value || null)}
        className="px-3 py-1.5 text-sm border border-input rounded-md"
      />
      <label className="text-sm font-medium">To:</label>
      <input
        type="date"
        value={endDate || ''}
        onChange={(e) => onEndDateChange(e.target.value || null)}
        className="px-3 py-1.5 text-sm border border-input rounded-md"
      />
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function AnalyticsDashboard() {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  // Fetch all analytics data using React Query hooks (A7)
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary(startDate, endDate);
  const { data: topVehicles, isLoading: vehiclesLoading } = useTopVehiclesByOnTime(5);
  const { data: topDrivers, isLoading: driversLoading } = useTopDrivers('on_time_rate', 5);
  const { data: maintenanceNeeded, isLoading: maintenanceLoading } = useVehiclesNeedingMaintenance();
  const { data: vehicleCosts, isLoading: vehicleCostsLoading } = useVehicleCosts(5);
  const { data: driverCosts, isLoading: driverCostsLoading } = useDriverCosts(5);

  // Error state
  if (summaryError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load analytics dashboard: {summaryError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (summaryLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[2000px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Real-time fleet performance metrics</p>
        </div>
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Deliveries"
          value={summary?.total_deliveries.toLocaleString() || '0'}
          description="Completed deliveries"
          icon={Package}
        />
        <MetricCard
          title="On-Time Rate"
          value={`${summary?.on_time_rate.toFixed(1) || '0'}%`}
          description="Deliveries on schedule"
          icon={Clock}
          trend={summary && summary.on_time_rate >= 90 ? 'up' : 'down'}
          trendValue={summary ? `${summary.on_time_rate >= 90 ? '+' : ''}${(summary.on_time_rate - 90).toFixed(1)}%` : undefined}
        />
        <MetricCard
          title="Active Fleet"
          value={summary?.active_vehicles || '0'}
          description={`${summary?.vehicles_in_maintenance || '0'} in maintenance`}
          icon={Truck}
        />
        <MetricCard
          title="Total Cost"
          value={`$${summary?.total_cost.toLocaleString() || '0'}`}
          description={`$${summary?.cost_per_item.toFixed(2) || '0'} per item`}
          icon={DollarSign}
        />
      </div>

      {/* Tabbed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Avg Completion Time"
              value={`${summary?.avg_completion_hours.toFixed(1) || '0'}h`}
              description="Hours per delivery"
              icon={Clock}
            />
            <MetricCard
              title="Items Delivered"
              value={summary?.total_items.toLocaleString() || '0'}
              description="Total items"
              icon={Package}
            />
            <MetricCard
              title="Active Drivers"
              value={summary?.active_drivers || '0'}
              description={`${summary?.total_incidents || '0'} incidents`}
              icon={Users}
            />
          </div>

          {/* Maintenance Alerts */}
          {maintenanceNeeded && maintenanceNeeded.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Vehicles Needing Maintenance
                </CardTitle>
                <CardDescription>
                  Vehicles with over 10,000km or maintenance due within 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {maintenanceLoading ? (
                  <Skeleton className="h-32" />
                ) : (
                  <div className="space-y-2">
                    {maintenanceNeeded.slice(0, 5).map((vehicle) => (
                      <div key={vehicle.vehicle_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{vehicle.plate_number}</div>
                          <div className="text-sm text-muted-foreground">{vehicle.vehicle_type}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{vehicle.total_distance_km.toLocaleString()} km</div>
                          <Badge variant={vehicle.maintenance_in_progress > 0 ? "default" : "outline"}>
                            {vehicle.maintenance_in_progress > 0 ? "In Progress" : "Scheduled"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Vehicles</CardTitle>
              <CardDescription>Ranked by on-time delivery rate</CardDescription>
            </CardHeader>
            <CardContent>
              {vehiclesLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="space-y-2">
                  {topVehicles?.map((vehicle, index) => (
                    <div key={vehicle.vehicle_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-lg font-bold text-muted-foreground">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{vehicle.vehicle_number}</div>
                          <div className="text-sm text-muted-foreground">{vehicle.vehicle_type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{vehicle.on_time_rate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.on_time_batches}/{vehicle.total_batches} on-time
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Drivers</CardTitle>
              <CardDescription>Ranked by on-time delivery rate</CardDescription>
            </CardHeader>
            <CardContent>
              {driversLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="space-y-2">
                  {topDrivers?.map((driver, index) => (
                    <div key={driver.driver_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-lg font-bold text-muted-foreground">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{driver.driver_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {driver.completed_batches} deliveries
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{driver.on_time_rate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Fuel className="h-3 w-3" />
                          {driver.fuel_efficiency_km_per_liter?.toFixed(1) || 'N/A'} km/L
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Costs</CardTitle>
                <CardDescription>Top 5 by total cost</CardDescription>
              </CardHeader>
              <CardContent>
                {vehicleCostsLoading ? (
                  <Skeleton className="h-48" />
                ) : (
                  <div className="space-y-2">
                    {vehicleCosts?.map((vehicle) => (
                      <div key={vehicle.vehicle_id} className="p-3 border rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">Vehicle ID</span>
                          <span className="text-sm font-mono">{vehicle.vehicle_id.slice(0, 8)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Cost</span>
                          <span className="font-semibold">${vehicle.total_cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Fuel: ${vehicle.fuel_cost.toLocaleString()}</span>
                          <span>Maintenance: ${vehicle.maintenance_cost.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Driver Costs</CardTitle>
                <CardDescription>Top 5 by total cost</CardDescription>
              </CardHeader>
              <CardContent>
                {driverCostsLoading ? (
                  <Skeleton className="h-48" />
                ) : (
                  <div className="space-y-2">
                    {driverCosts?.map((driver) => (
                      <div key={driver.driver_id} className="p-3 border rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">Driver ID</span>
                          <span className="text-sm font-mono">{driver.driver_id.slice(0, 8)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Cost</span>
                          <span className="font-semibold">${driver.total_cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{driver.items_delivered} items</span>
                          <span>${driver.cost_per_item.toFixed(2)}/item</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
