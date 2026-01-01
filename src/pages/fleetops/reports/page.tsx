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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDashboardSummary,
  useTopVehiclesByOnTime,
  useTopDrivers,
  useVehiclesNeedingMaintenance,
  useVehicleCosts,
  useDriverCosts,
} from '@/hooks/useAnalytics';
import {
  useStockStatus,
  useStockByZone,
  useLowStockAlerts,
} from '@/hooks/useStockAnalytics';
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
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  X,
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
// FILTER PANEL COMPONENT
// ============================================================================

interface FilterPanelProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
  metricType: string;
  onMetricTypeChange: (type: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

function FilterPanel({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  metricType,
  onMetricTypeChange,
  sortBy,
  onSortByChange,
  onClearFilters,
  hasActiveFilters,
}: FilterPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => onStartDateChange(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-input rounded-md"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => onEndDateChange(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-input rounded-md"
            />
          </div>

          {/* Metric Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Metric Type</label>
            <Select value={metricType} onValueChange={onMetricTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Metrics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metrics</SelectItem>
                <SelectItem value="delivery">Delivery Performance</SelectItem>
                <SelectItem value="vehicle">Vehicle Performance</SelectItem>
                <SelectItem value="driver">Driver Performance</SelectItem>
                <SelectItem value="cost">Cost Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_time_rate">On-Time Rate</SelectItem>
                <SelectItem value="total_cost">Total Cost</SelectItem>
                <SelectItem value="efficiency">Efficiency</SelectItem>
                <SelectItem value="incidents">Incidents</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function AnalyticsDashboard() {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [metricType, setMetricType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('on_time_rate');

  // Fetch all analytics data using React Query hooks (A7)
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary(startDate, endDate);
  const { data: topVehicles, isLoading: vehiclesLoading } = useTopVehiclesByOnTime(5);
  const { data: topDrivers, isLoading: driversLoading } = useTopDrivers(sortBy as any, 5);
  const { data: maintenanceNeeded, isLoading: maintenanceLoading } = useVehiclesNeedingMaintenance();
  const { data: vehicleCosts, isLoading: vehicleCostsLoading } = useVehicleCosts(5);
  const { data: driverCosts, isLoading: driverCostsLoading } = useDriverCosts(5);

  // Fetch stock analytics data
  const { data: stockStatus, isLoading: stockStatusLoading } = useStockStatus();
  const { data: stockByZone, isLoading: stockByZoneLoading } = useStockByZone();
  const { data: lowStockAlerts, isLoading: lowStockAlertsLoading } = useLowStockAlerts(7);

  // Check if filters are active
  const hasActiveFilters = startDate !== null || endDate !== null || metricType !== 'all' || sortBy !== 'on_time_rate';

  // Clear all filters
  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setMetricType('all');
    setSortBy('on_time_rate');
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!summary) return;

    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');

      // Summary sheet
      const summaryData = [
        ['Analytics Dashboard Report'],
        ['Generated:', new Date().toLocaleString()],
        ['Date Range:', `${startDate || 'All'} to ${endDate || 'All'}`],
        [],
        ['Metric', 'Value'],
        ['Total Deliveries', summary.total_deliveries ?? 0],
        ['On-Time Rate', `${summary.on_time_rate?.toFixed(1) ?? '0.0'}%`],
        ['Avg Completion Hours', summary.avg_completion_hours?.toFixed(1) ?? '0.0'],
        ['Total Items', summary.total_items ?? 0],
        ['Active Vehicles', summary.active_vehicles ?? 0],
        ['Vehicle Utilization Rate', `${summary.vehicle_utilization_rate?.toFixed(1) ?? '0.0'}%`],
        ['Vehicles in Maintenance', summary.vehicles_in_maintenance ?? 0],
        ['Active Drivers', summary.active_drivers ?? 0],
        ['Driver On-Time Rate', `${summary.driver_on_time_rate?.toFixed(1) ?? '0.0'}%`],
        ['Total Incidents', summary.total_incidents ?? 0],
        ['Total Cost', `$${summary.total_cost?.toLocaleString() ?? '0'}`],
        ['Cost Per Item', `$${summary.cost_per_item?.toFixed(2) ?? '0.00'}`],
        ['Cost Per KM', `$${summary.cost_per_km?.toFixed(2) ?? '0.00'}`],
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');

      // Top Vehicles sheet
      if (topVehicles && topVehicles.length > 0) {
        const vehiclesData = [
          ['Top Performing Vehicles'],
          [],
          ['Rank', 'Vehicle Number', 'Type', 'On-Time Rate', 'On-Time Batches', 'Total Batches'],
          ...topVehicles.map((v, i) => [
            i + 1,
            v.vehicle_number,
            v.vehicle_type,
            `${v.on_time_rate?.toFixed(1) ?? '0.0'}%`,
            v.on_time_batches,
            v.total_batches
          ])
        ];
        const wsVehicles = XLSX.utils.aoa_to_sheet(vehiclesData);
        XLSX.utils.book_append_sheet(wb, wsVehicles, 'Top Vehicles');
      }

      // Top Drivers sheet
      if (topDrivers && topDrivers.length > 0) {
        const driversData = [
          ['Top Performing Drivers'],
          [],
          ['Rank', 'Driver Name', 'On-Time Rate', 'Completed Batches', 'Fuel Efficiency (km/L)'],
          ...topDrivers.map((d, i) => [
            i + 1,
            d.driver_name,
            `${d.on_time_rate?.toFixed(1) ?? '0.0'}%`,
            d.completed_batches,
            d.fuel_efficiency_km_per_liter?.toFixed(1) ?? 'N/A'
          ])
        ];
        const wsDrivers = XLSX.utils.aoa_to_sheet(driversData);
        XLSX.utils.book_append_sheet(wb, wsDrivers, 'Top Drivers');
      }

      XLSX.writeFile(wb, `analytics-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!summary) return;

    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Analytics Dashboard Report', 20, 20);

      // Date info
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
      doc.text(`Date Range: ${startDate || 'All'} to ${endDate || 'All'}`, 20, 36);

      // Summary KPIs
      doc.setFontSize(14);
      doc.text('Summary', 20, 50);

      doc.setFontSize(10);
      let y = 60;
      const metrics = [
        ['Total Deliveries', summary.total_deliveries ?? 0],
        ['On-Time Rate', `${summary.on_time_rate?.toFixed(1) ?? '0.0'}%`],
        ['Avg Completion Hours', summary.avg_completion_hours?.toFixed(1) ?? '0.0'],
        ['Total Items', summary.total_items ?? 0],
        ['Active Vehicles', summary.active_vehicles ?? 0],
        ['Vehicles in Maintenance', summary.vehicles_in_maintenance ?? 0],
        ['Active Drivers', summary.active_drivers ?? 0],
        ['Total Incidents', summary.total_incidents ?? 0],
        ['Total Cost', `$${summary.total_cost?.toLocaleString() ?? '0'}`],
        ['Cost Per Item', `$${summary.cost_per_item?.toFixed(2) ?? '0.00'}`],
      ];

      metrics.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, 20, y);
        y += 6;
      });

      doc.save(`analytics-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isExporting || !summary}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        metricType={metricType}
        onMetricTypeChange={setMetricType}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Deliveries"
          value={summary?.total_deliveries?.toLocaleString() ?? '0'}
          description="Completed deliveries"
          icon={Package}
        />
        <MetricCard
          title="On-Time Rate"
          value={`${summary?.on_time_rate?.toFixed(1) ?? '0.0'}%`}
          description="Deliveries on schedule"
          icon={Clock}
          trend={summary && summary.on_time_rate && summary.on_time_rate >= 90 ? 'up' : 'down'}
          trendValue={summary?.on_time_rate ? `${summary.on_time_rate >= 90 ? '+' : ''}${(summary.on_time_rate - 90).toFixed(1)}%` : undefined}
        />
        <MetricCard
          title="Active Fleet"
          value={summary?.active_vehicles || '0'}
          description={`${summary?.vehicles_in_maintenance || '0'} in maintenance`}
          icon={Truck}
        />
        <MetricCard
          title="Total Cost"
          value={`$${summary?.total_cost?.toLocaleString() ?? '0'}`}
          description={`$${summary?.cost_per_item?.toFixed(2) ?? '0.00'} per item`}
          icon={DollarSign}
        />
      </div>

      {/* Stock KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Stock Items"
          value={stockStatusLoading ? '...' : stockStatus?.total_stock_items?.toLocaleString() ?? '0'}
          description={`${stockStatus?.total_facilities_with_stock ?? 0} facilities with stock`}
          icon={Package}
        />
        <MetricCard
          title="Low Stock Alerts"
          value={stockStatusLoading ? '...' : stockStatus?.low_stock_count?.toLocaleString() ?? '0'}
          description="Facilities need restocking"
          icon={AlertTriangle}
          trend={stockStatus && stockStatus.low_stock_count > 0 ? 'down' : 'up'}
          trendValue={stockStatus && stockStatus.low_stock_count > 0 ? 'Attention needed' : 'All good'}
        />
        <MetricCard
          title="Total Products"
          value={stockStatusLoading ? '...' : stockStatus?.total_products?.toLocaleString() ?? '0'}
          description="Unique products tracked"
          icon={Package}
        />
        <MetricCard
          title="Out of Stock"
          value={stockStatusLoading ? '...' : stockStatus?.out_of_stock_count?.toLocaleString() ?? '0'}
          description="Facilities with no stock"
          icon={AlertTriangle}
          trend={stockStatus && stockStatus.out_of_stock_count > 0 ? 'down' : 'up'}
        />
      </div>

      {/* Tabbed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Avg Completion Time"
              value={`${summary?.avg_completion_hours?.toFixed(1) ?? '0.0'}h`}
              description="Hours per delivery"
              icon={Clock}
            />
            <MetricCard
              title="Items Delivered"
              value={summary?.total_items?.toLocaleString() ?? '0'}
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
                          <div className="text-sm font-medium">{vehicle.total_distance_km?.toLocaleString() ?? '0'} km</div>
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
                        <div className="text-lg font-bold">{vehicle.on_time_rate?.toFixed(1) ?? '0.0'}%</div>
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
                        <div className="text-lg font-bold">{driver.on_time_rate?.toFixed(1) ?? '0.0'}%</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Fuel className="h-3 w-3" />
                          {driver.fuel_efficiency_km_per_liter?.toFixed(1) ?? 'N/A'} km/L
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
                          <span className="font-semibold">${vehicle.total_cost?.toLocaleString() ?? '0'}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Fuel: ${vehicle.fuel_cost?.toLocaleString() ?? '0'}</span>
                          <span>Maintenance: ${vehicle.maintenance_cost?.toLocaleString() ?? '0'}</span>
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
                          <span className="font-semibold">${driver.total_cost?.toLocaleString() ?? '0'}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{driver.items_delivered} items</span>
                          <span>${driver.cost_per_item?.toFixed(2) ?? '0.00'}/item</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4">
          {/* Stock by Zone */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Distribution by Zone</CardTitle>
              <CardDescription>Stock levels across service zones</CardDescription>
            </CardHeader>
            <CardContent>
              {stockByZoneLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="space-y-2">
                  {stockByZone?.map((zone) => (
                    <div key={zone.zone} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold text-lg">{zone.zone}</div>
                          <div className="text-sm text-muted-foreground">
                            {zone.facilities_count} facilities
                          </div>
                        </div>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {zone.total_quantity?.toLocaleString() ?? '0'} items
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                        <div>
                          <div className="text-xs text-muted-foreground">Products</div>
                          <div className="text-sm font-medium">{zone.total_products}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Low Stock Facilities</div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            {zone.low_stock_facilities > 0 && (
                              <AlertTriangle className="h-3 w-3 text-orange-600" />
                            )}
                            {zone.low_stock_facilities}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!stockByZone || stockByZone.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No stock data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                Facilities with low stock levels (less than 10 items)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockAlertsLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="space-y-2">
                  {lowStockAlerts?.slice(0, 10).map((alert) => (
                    <div key={`${alert.facility_id}-${alert.product_name}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium">{alert.facility_name}</div>
                        <div className="text-sm text-muted-foreground">{alert.product_name}</div>
                        {alert.zone && alert.zone !== 'N/A' && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {alert.zone}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-lg font-bold",
                          alert.current_quantity < 5 ? "text-red-600" : "text-orange-600"
                        )}>
                          {alert.current_quantity} items
                        </div>
                        {alert.days_supply_remaining !== null && (
                          <div className="text-xs text-muted-foreground">
                            {alert.days_supply_remaining.toFixed(1)} days supply
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!lowStockAlerts || lowStockAlerts.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-green-600 font-medium mb-2">All stock levels healthy</div>
                      <div className="text-sm">No low stock alerts at this time</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
