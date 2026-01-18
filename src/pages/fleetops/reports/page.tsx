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

import React, { useState } from 'react';
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
  useVehiclePayloadUtilization,
  useProgramPerformance,
  useDriverUtilization,
  useRouteEfficiency,
  useFacilityCoverage,
  useCostByProgram,
} from '@/hooks/useResourceUtilization';
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
  Gauge,
  Target,
  MapPin,
  Activity,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
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
// FILTER PANEL COMPONENT - Collapsible Category Filter
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
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  // Convert string dates to Date objects for calendar
  const dateFrom = startDate ? new Date(startDate) : undefined;
  const dateTo = endDate ? new Date(endDate) : undefined;

  // Local state for date range before applying
  const [tempDateRange, setTempDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Separate month state for each calendar
  const [startMonth, setStartMonth] = useState<Date>(new Date());
  const [endMonth, setEndMonth] = useState<Date>(new Date());

  // Update temp range when props change (use string dates to avoid infinite loop)
  React.useEffect(() => {
    const from = startDate ? new Date(startDate) : undefined;
    const to = endDate ? new Date(endDate) : undefined;

    setTempDateRange({ from, to });

    // Set calendar months based on selected dates
    if (from) {
      setStartMonth(from);
    }
    if (to) {
      setEndMonth(to);
    }

    // Reset to current month when dates are cleared
    if (!startDate && !endDate) {
      setStartMonth(new Date());
      setEndMonth(new Date());
    }
  }, [startDate, endDate]);

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    console.log('Date range selected:', range);
    setTempDateRange(range || {});
    // Don't auto-close or apply - wait for user to click Apply
  };

  const applyDateRange = () => {
    console.log('Applying date range:', tempDateRange);

    if (tempDateRange?.from) {
      const startDateStr = format(tempDateRange.from, 'yyyy-MM-dd');
      console.log('Setting start date to:', startDateStr);
      onStartDateChange(startDateStr);
    } else {
      onStartDateChange(null);
    }

    if (tempDateRange?.to) {
      const endDateStr = format(tempDateRange.to, 'yyyy-MM-dd');
      console.log('Setting end date to:', endDateStr);
      onEndDateChange(endDateStr);
    } else {
      console.log('No end date selected, setting to null');
      onEndDateChange(null);
    }
    setDateRangeOpen(false);
  };

  const removeFilter = (type: 'date' | 'metric' | 'sort') => {
    switch(type) {
      case 'date':
        onStartDateChange(null);
        onEndDateChange(null);
        break;
      case 'metric':
        onMetricTypeChange('all');
        break;
      case 'sort':
        onSortByChange('on_time_rate');
        break;
    }
  };

  return (
    <Card className="border-2">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="default" className="ml-1 h-5 px-1.5">
                      {(startDate || endDate ? 1 : 0) +
                       (metricType !== 'all' ? 1 : 0) +
                       (sortBy !== 'on_time_rate' ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Dashboard Filters</DialogTitle>
                  <DialogDescription>
                    Filter analytics data by date range, metric type, and sorting preferences
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Date Range with Calendar */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Date Range</Label>
                    <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateFrom && !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom && dateTo ? (
                            <>
                              {format(dateFrom, 'MMM dd, yyyy')} - {format(dateTo, 'MMM dd, yyyy')}
                            </>
                          ) : dateFrom ? (
                            format(dateFrom, 'MMM dd, yyyy')
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="flex flex-col">
                          <div className="p-3 border-b">
                            <p className="text-sm text-muted-foreground">
                              {tempDateRange.from && tempDateRange.to ? (
                                <>Selected: {format(tempDateRange.from, 'MMM dd, yyyy')} - {format(tempDateRange.to, 'MMM dd, yyyy')}</>
                              ) : tempDateRange.from ? (
                                <>Start: {format(tempDateRange.from, 'MMM dd, yyyy')} (click end date)</>
                              ) : (
                                'Click start date, then end date'
                              )}
                            </p>
                          </div>
                          <div className="flex gap-4">
                            <Calendar
                              mode="range"
                              selected={tempDateRange}
                              onSelect={handleDateRangeSelect}
                              month={startMonth}
                              onMonthChange={setStartMonth}
                            />
                            <Calendar
                              mode="range"
                              selected={tempDateRange}
                              onSelect={handleDateRangeSelect}
                              month={endMonth}
                              onMonthChange={setEndMonth}
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 p-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTempDateRange({ from: dateFrom, to: dateTo });
                                setDateRangeOpen(false);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={applyDateRange}
                              disabled={!tempDateRange.from || !tempDateRange.to}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Metric Type */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Metric Type</Label>
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
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Sort By</Label>
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

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={onClearFilters}
                      disabled={!hasActiveFilters}
                    >
                      Clear All
                    </Button>
                    <Button onClick={() => setFilterDialogOpen(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Collapse/Expand Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterCollapsed(!filterCollapsed)}
                className="gap-2"
              >
                {filterCollapsed ? (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show Filters
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide Filters
                  </>
                )}
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && !filterCollapsed && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {(startDate || endDate) && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Date: {dateFrom && dateTo ?
                  `${format(dateFrom, 'MMM dd')} - ${format(dateTo, 'MMM dd, yyyy')}` :
                  dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'Range selected'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter('date')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {metricType !== 'all' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Metric: {metricType === 'delivery' ? 'Delivery Performance' :
                         metricType === 'vehicle' ? 'Vehicle Performance' :
                         metricType === 'driver' ? 'Driver Performance' : 'Cost Analysis'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter('metric')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {sortBy !== 'on_time_rate' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Sort: {sortBy === 'total_cost' ? 'Total Cost' :
                       sortBy === 'efficiency' ? 'Efficiency' : 'Incidents'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter('sort')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function AnalyticsDashboard() {
  // Start with null dates - user can freely select date range
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [metricType, setMetricType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('on_time_rate');

  // Resource filter state
  const [resourceFilterOpen, setResourceFilterOpen] = useState(false);
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>([]);
  const [utilizationStatus, setUtilizationStatus] = useState<string>('all');
  const [efficiencyRating, setEfficiencyRating] = useState<string>('all');
  const [showUnderutilized, setShowUnderutilized] = useState(false);

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

  // Fetch resource utilization data
  const { data: payloadUtil, isLoading: payloadUtilLoading } = useVehiclePayloadUtilization(startDate, endDate);
  const { data: programPerf, isLoading: programPerfLoading } = useProgramPerformance(startDate, endDate);
  const { data: driverUtil, isLoading: driverUtilLoading } = useDriverUtilization(startDate, endDate);
  const { data: routeEff, isLoading: routeEffLoading } = useRouteEfficiency(startDate, endDate);
  const { data: facilityCov, isLoading: facilityCovLoading } = useFacilityCoverage(startDate, endDate);
  const { data: costByProg, isLoading: costByProgLoading } = useCostByProgram(startDate, endDate);

  // Check if filters are active
  const hasActiveFilters = startDate !== null || endDate !== null || metricType !== 'all' || sortBy !== 'on_time_rate';

  // Check if resource filters are active
  const hasActiveResourceFilters = selectedPrograms.length > 0 || selectedVehicleTypes.length > 0 ||
    utilizationStatus !== 'all' || efficiencyRating !== 'all' || showUnderutilized;

  // Clear all filters
  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setMetricType('all');
    setSortBy('on_time_rate');
  };

  // Clear resource filters
  const handleClearResourceFilters = () => {
    setSelectedPrograms([]);
    setSelectedVehicleTypes([]);
    setUtilizationStatus('all');
    setEfficiencyRating('all');
    setShowUnderutilized(false);
  };

  // Toggle program selection
  const toggleProgram = (program: string) => {
    setSelectedPrograms(prev =>
      prev.includes(program) ? prev.filter(p => p !== program) : [...prev, program]
    );
  };

  // Toggle vehicle type selection
  const toggleVehicleType = (type: string) => {
    setSelectedVehicleTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Remove individual filter badge
  const removeFilterBadge = (type: 'program' | 'vehicle' | 'utilization' | 'efficiency' | 'underutilized', value?: string) => {
    switch(type) {
      case 'program':
        if (value) setSelectedPrograms(prev => prev.filter(p => p !== value));
        break;
      case 'vehicle':
        if (value) setSelectedVehicleTypes(prev => prev.filter(t => t !== value));
        break;
      case 'utilization':
        setUtilizationStatus('all');
        break;
      case 'efficiency':
        setEfficiencyRating('all');
        break;
      case 'underutilized':
        setShowUnderutilized(false);
        break;
    }
  };

  // Apply filters to data
  const filteredPayloadUtil = payloadUtil?.filter(vehicle => {
    if (selectedVehicleTypes.length > 0 && !selectedVehicleTypes.includes(vehicle.vehicle_type)) return false;
    if (showUnderutilized && vehicle.underutilized_deliveries === 0) return false;
    return true;
  });

  const filteredProgramPerf = programPerf?.filter(program => {
    if (selectedPrograms.length > 0 && !selectedPrograms.includes(program.programme)) return false;
    return true;
  });

  const filteredDriverUtil = driverUtil?.filter(driver => {
    if (utilizationStatus !== 'all' && driver.utilization_status !== utilizationStatus) return false;
    return true;
  });

  const filteredRouteEff = routeEff?.filter(route => {
    if (efficiencyRating !== 'all' && route.efficiency_rating !== efficiencyRating) return false;
    return true;
  });

  const filteredCostByProg = costByProg?.filter(program => {
    if (selectedPrograms.length > 0 && !selectedPrograms.includes(program.programme)) return false;
    return true;
  });

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
          <TabsTrigger value="resources">Resources</TabsTrigger>
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

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          {/* Collapsible Category Filter */}
          <Card className="border-2">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Dialog open={resourceFilterOpen} onOpenChange={setResourceFilterOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filter Resources
                        {hasActiveResourceFilters && (
                          <Badge variant="default" className="ml-1 h-5 px-1.5">
                            {selectedPrograms.length + selectedVehicleTypes.length +
                             (utilizationStatus !== 'all' ? 1 : 0) +
                             (efficiencyRating !== 'all' ? 1 : 0) +
                             (showUnderutilized ? 1 : 0)}
                          </Badge>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Resource Filters</DialogTitle>
                        <DialogDescription>
                          Filter resource utilization metrics by program, vehicle type, status, and more
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6 py-4">
                        {/* Health Programs */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Health Programs</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {['Family Planning', 'DRF', 'HIV/AIDS', 'Malaria'].map((program) => (
                              <Button
                                key={program}
                                variant={selectedPrograms.includes(program) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleProgram(program)}
                                className="justify-start"
                              >
                                {program}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Vehicle Types */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Vehicle Types</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {Array.from(new Set(payloadUtil?.map(v => v.vehicle_type) || [])).map((type) => (
                              <Button
                                key={type}
                                variant={selectedVehicleTypes.includes(type) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleVehicleType(type)}
                                className="justify-start"
                              >
                                {type}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Utilization Status */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Driver Utilization Status</Label>
                          <Select value={utilizationStatus} onValueChange={setUtilizationStatus}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Underutilized">Underutilized</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Efficiency Rating */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Route Efficiency Rating</Label>
                          <Select value={efficiencyRating} onValueChange={setEfficiencyRating}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Ratings</SelectItem>
                              <SelectItem value="Excellent">Excellent</SelectItem>
                              <SelectItem value="Good">Good</SelectItem>
                              <SelectItem value="Fair">Fair</SelectItem>
                              <SelectItem value="Poor">Poor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Show Underutilized Only */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-0.5">
                            <Label className="text-base">Show Underutilized Vehicles Only</Label>
                            <div className="text-sm text-muted-foreground">
                              Display only vehicles with underutilized deliveries
                            </div>
                          </div>
                          <Switch
                            checked={showUnderutilized}
                            onCheckedChange={setShowUnderutilized}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={handleClearResourceFilters}
                            disabled={!hasActiveResourceFilters}
                          >
                            Clear All
                          </Button>
                          <Button onClick={() => setResourceFilterOpen(false)}>
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Collapse/Expand Button */}
                  {hasActiveResourceFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterCollapsed(!filterCollapsed)}
                      className="gap-2"
                    >
                      {filterCollapsed ? (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Show Filters
                        </>
                      ) : (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide Filters
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {hasActiveResourceFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearResourceFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Active Filter Badges */}
              {hasActiveResourceFilters && !filterCollapsed && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  {selectedPrograms.map((program) => (
                    <Badge key={program} variant="secondary" className="gap-1 pr-1">
                      Program: {program}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeFilterBadge('program', program)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {selectedVehicleTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="gap-1 pr-1">
                      Vehicle: {type}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeFilterBadge('vehicle', type)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {utilizationStatus !== 'all' && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      Utilization: {utilizationStatus}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeFilterBadge('utilization')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {efficiencyRating !== 'all' && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      Efficiency: {efficiencyRating}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeFilterBadge('efficiency')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {showUnderutilized && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      Underutilized Only
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeFilterBadge('underutilized')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Vehicle Payload Utilization with Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Vehicle Payload Utilization
              </CardTitle>
              <CardDescription>Vehicle capacity and weight utilization metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {payloadUtilLoading ? (
                <Skeleton className="h-96" />
              ) : (
                <div className="space-y-6">
                  {/* Bar Chart */}
                  {filteredPayloadUtil && filteredPayloadUtil.length > 0 && (
                    <div className="h-80">
                      <ChartContainer
                        config={{
                          payload: {
                            label: 'Payload Utilization',
                            color: 'hsl(var(--chart-1))',
                          },
                          weight: {
                            label: 'Weight Utilization',
                            color: 'hsl(var(--chart-2))',
                          },
                        }}
                      >
                        <BarChart
                          data={filteredPayloadUtil.slice(0, 10).map(v => ({
                            name: v.plate_number,
                            payload: v.avg_payload_utilization_pct || 0,
                            weight: v.avg_weight_utilization_pct || 0,
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                            domain={[0, 100]}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="payload" fill="var(--color-payload)" name="Payload Utilization" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="weight" fill="var(--color-weight)" name="Weight Utilization" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  )}

                  {/* Detailed List */}
                  <div className="space-y-3">
                    {filteredPayloadUtil?.slice(0, 10).map((vehicle) => (
                      <div key={vehicle.vehicle_id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-semibold text-lg">{vehicle.plate_number}</div>
                            <div className="text-sm text-muted-foreground">{vehicle.vehicle_type}</div>
                          </div>
                          <div className="text-right">
                            <Badge variant={vehicle.avg_payload_utilization_pct >= 80 ? 'default' : vehicle.avg_payload_utilization_pct >= 50 ? 'secondary' : 'destructive'}>
                              {vehicle.total_deliveries} deliveries
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground">Payload Utilization</div>
                            <div className={cn(
                              "text-lg font-bold",
                              vehicle.avg_payload_utilization_pct >= 80 ? "text-green-600" :
                              vehicle.avg_payload_utilization_pct >= 50 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {vehicle.avg_payload_utilization_pct?.toFixed(1) ?? '0.0'}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Weight Utilization</div>
                            <div className="text-lg font-semibold">
                              {vehicle.avg_weight_utilization_pct?.toFixed(1) ?? 'N/A'}
                              {vehicle.avg_weight_utilization_pct ? '%' : ''}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Total Items</div>
                            <div className="text-lg font-semibold">{vehicle.total_items_delivered?.toLocaleString() ?? '0'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Underutilized</div>
                            <div className={cn(
                              "text-lg font-semibold",
                              vehicle.underutilized_deliveries > 0 ? "text-orange-600" : "text-green-600"
                            )}>
                              {vehicle.underutilized_deliveries}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!filteredPayloadUtil || filteredPayloadUtil.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No vehicle utilization data available{hasActiveResourceFilters && ' with current filters'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Program Performance with Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pie Chart - Deliveries by Program */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Deliveries by Program
                </CardTitle>
                <CardDescription>Distribution of deliveries across health programs</CardDescription>
              </CardHeader>
              <CardContent>
                {programPerfLoading ? (
                  <Skeleton className="h-80" />
                ) : (
                  filteredProgramPerf && filteredProgramPerf.length > 0 ? (
                    <div className="h-80">
                      <ChartContainer
                        config={{
                          'Family Planning': { label: 'Family Planning', color: 'hsl(var(--chart-1))' },
                          'DRF': { label: 'DRF', color: 'hsl(var(--chart-2))' },
                          'HIV/AIDS': { label: 'HIV/AIDS', color: 'hsl(var(--chart-3))' },
                          'Malaria': { label: 'Malaria', color: 'hsl(var(--chart-4))' },
                        }}
                      >
                        <PieChart>
                          <Pie
                            data={filteredProgramPerf.map((p, idx) => ({
                              name: p.programme,
                              value: p.total_deliveries,
                              fill: `hsl(var(--chart-${(idx % 4) + 1}))`,
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${entry.value}`}
                            outerRadius={100}
                            dataKey="value"
                          >
                            {filteredProgramPerf.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 4) + 1}))`} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                        </PieChart>
                      </ChartContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No program performance data available{hasActiveResourceFilters && ' with current filters'}
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - On-Time Rates by Program */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  On-Time Performance
                </CardTitle>
                <CardDescription>On-time delivery rates by program</CardDescription>
              </CardHeader>
              <CardContent>
                {programPerfLoading ? (
                  <Skeleton className="h-80" />
                ) : (
                  filteredProgramPerf && filteredProgramPerf.length > 0 ? (
                    <div className="h-80">
                      <ChartContainer
                        config={{
                          rate: {
                            label: 'On-Time Rate %',
                            color: 'hsl(var(--chart-2))',
                          },
                        }}
                      >
                        <BarChart
                          data={filteredProgramPerf.map(p => ({
                            name: p.programme,
                            rate: p.on_time_rate_pct || 0,
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            label={{ value: 'On-Time Rate %', angle: -90, position: 'insideLeft' }}
                            domain={[0, 100]}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="rate" fill="var(--color-rate)" name="On-Time Rate %" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No program performance data available{hasActiveResourceFilters && ' with current filters'}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Program Performance Details */}
          <Card>
            <CardHeader>
              <CardTitle>Program Performance Details</CardTitle>
              <CardDescription>Comprehensive metrics by health program</CardDescription>
            </CardHeader>
            <CardContent>
              {programPerfLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredProgramPerf?.map((program) => (
                    <div key={program.programme} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="font-semibold text-lg mb-3">{program.programme}</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Deliveries</div>
                          <div className="font-semibold">{program.total_deliveries}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Facilities Served</div>
                          <div className="font-semibold">{program.total_facilities_served}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">On-Time Rate</div>
                          <div className={cn(
                            "font-semibold",
                            program.on_time_rate_pct >= 90 ? "text-green-600" :
                            program.on_time_rate_pct >= 75 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {program.on_time_rate_pct?.toFixed(1) ?? '0.0'}%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Total Items</div>
                          <div className="font-semibold">{program.total_items_delivered?.toLocaleString() ?? '0'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!filteredProgramPerf || filteredProgramPerf.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground col-span-2">
                      No program performance data available{hasActiveResourceFilters && ' with current filters'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Driver Utilization with Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Driver Utilization
              </CardTitle>
              <CardDescription>Deliveries per driver per week</CardDescription>
            </CardHeader>
            <CardContent>
              {driverUtilLoading ? (
                <Skeleton className="h-96" />
              ) : (
                <div className="space-y-6">
                  {/* Bar Chart */}
                  {filteredDriverUtil && filteredDriverUtil.length > 0 && (
                    <div className="h-80">
                      <ChartContainer
                        config={{
                          deliveries: {
                            label: 'Deliveries/Week',
                            color: 'hsl(var(--chart-3))',
                          },
                        }}
                      >
                        <BarChart
                          data={filteredDriverUtil.slice(0, 15).map(d => ({
                            name: d.driver_name.split(' ')[0], // First name only for space
                            deliveries: d.avg_deliveries_per_week || 0,
                            status: d.utilization_status,
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            label={{ value: 'Deliveries per Week', angle: -90, position: 'insideLeft' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="deliveries" fill="var(--color-deliveries)" name="Deliveries/Week" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  )}

                  {/* Driver List */}
                  <div className="space-y-2">
                    {filteredDriverUtil?.slice(0, 15).map((driver) => (
                      <div key={driver.driver_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium">{driver.driver_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {driver.total_deliveries} deliveries • {driver.avg_deliveries_per_week?.toFixed(1) ?? '0.0'}/week
                          </div>
                        </div>
                        <Badge variant={
                          driver.utilization_status === 'High' ? 'default' :
                          driver.utilization_status === 'Medium' ? 'secondary' :
                          driver.utilization_status === 'Low' ? 'outline' : 'destructive'
                        }>
                          {driver.utilization_status}
                        </Badge>
                      </div>
                    ))}
                    {(!filteredDriverUtil || filteredDriverUtil.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No driver utilization data available{hasActiveResourceFilters && ' with current filters'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Route Efficiency & Facility Coverage */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Route Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Route Efficiency
                </CardTitle>
                <CardDescription>Actual vs estimated metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {routeEffLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <div className="space-y-2">
                    {filteredRouteEff?.slice(0, 8).map((route) => (
                      <div key={route.batch_id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">{route.batch_name}</div>
                          <Badge variant={
                            route.efficiency_rating === 'Excellent' ? 'default' :
                            route.efficiency_rating === 'Good' ? 'secondary' :
                            route.efficiency_rating === 'Fair' ? 'outline' : 'destructive'
                          }>
                            {route.efficiency_rating}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Duration variance: {route.duration_variance_pct?.toFixed(1) ?? '0.0'}%
                        </div>
                      </div>
                    ))}
                    {(!filteredRouteEff || filteredRouteEff.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No route efficiency data available{hasActiveResourceFilters && ' with current filters'}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Facility Coverage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Facility Coverage
                </CardTitle>
                <CardDescription>Delivery service coverage</CardDescription>
              </CardHeader>
              <CardContent>
                {facilityCovLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <div className="space-y-3">
                    {facilityCov?.[0] && (
                      <>
                        <div className="p-4 border rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">Overall Coverage</div>
                          <div className="text-3xl font-bold">{facilityCov[0].coverage_pct?.toFixed(1) ?? '0.0'}%</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {facilityCov[0].facilities_served} / {facilityCov[0].total_facilities} facilities
                          </div>
                        </div>
                        {facilityCov[0].programme && (
                          <div className="space-y-2">
                            {facilityCov.map((prog, idx) => (
                              prog.programme && (
                                <div key={idx} className="flex items-center justify-between p-2 border rounded hover:bg-muted/30 transition-colors">
                                  <span className="text-sm font-medium">{prog.programme}</span>
                                  <span className={cn(
                                    "text-sm font-semibold",
                                    (prog.program_coverage_pct ?? 0) >= 80 ? "text-green-600" :
                                    (prog.program_coverage_pct ?? 0) >= 50 ? "text-yellow-600" : "text-red-600"
                                  )}>
                                    {prog.program_coverage_pct?.toFixed(1) ?? '0.0'}%
                                  </span>
                                </div>
                              )
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {(!facilityCov || facilityCov.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No facility coverage data available
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cost by Program with Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost by Program
              </CardTitle>
              <CardDescription>Budget analysis by health program</CardDescription>
            </CardHeader>
            <CardContent>
              {costByProgLoading ? (
                <Skeleton className="h-96" />
              ) : (
                <div className="space-y-6">
                  {/* Bar Chart */}
                  {filteredCostByProg && filteredCostByProg.length > 0 && (
                    <div className="h-80">
                      <ChartContainer
                        config={{
                          cost: {
                            label: 'Total Cost',
                            color: 'hsl(var(--chart-4))',
                          },
                        }}
                      >
                        <BarChart
                          data={filteredCostByProg.map(p => ({
                            name: p.programme,
                            cost: p.total_cost || 0,
                          }))}
                          margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            label={{ value: 'Total Cost ($)', angle: -90, position: 'insideLeft' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="cost" fill="var(--color-cost)" name="Total Cost" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  )}

                  {/* Cost Details */}
                  <div className="space-y-3">
                    {filteredCostByProg?.map((program) => (
                      <div key={program.programme} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-lg">{program.programme}</div>
                          <div className="text-right">
                            <div className="text-xl font-bold">${program.total_cost?.toLocaleString() ?? '0'}</div>
                            <div className="text-xs text-muted-foreground">{program.total_deliveries} deliveries</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">Per Delivery</div>
                            <div className="font-semibold">${program.cost_per_delivery?.toFixed(2) ?? '0.00'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Per Item</div>
                            <div className="font-semibold">${program.cost_per_item?.toFixed(2) ?? '0.00'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Per KM</div>
                            <div className="font-semibold">${program.cost_per_km?.toFixed(2) ?? '0.00'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!filteredCostByProg || filteredCostByProg.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No cost by program data available{hasActiveResourceFilters && ' with current filters'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
