/**
 * Storefront Stock Reports Page
 *
 * Purpose: Dedicated stock analytics dashboard for storefront module
 * Features: Stock status, balance, performance, zone distribution, and low stock alerts
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
  useStockStatus,
  useStockBalance,
  useStockPerformance,
  useStockByZone,
  useLowStockAlerts,
} from '@/hooks/useStockAnalytics';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Building,
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
// MAIN COMPONENT
// ============================================================================

export default function StockReportsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [alertThreshold, setAlertThreshold] = useState<number>(7);

  // Fetch stock analytics data
  const { data: status, isLoading: statusLoading, error: statusError } = useStockStatus();
  const { data: balance, isLoading: balanceLoading } = useStockBalance(selectedProduct === 'all' ? undefined : selectedProduct);
  const { data: performance, isLoading: performanceLoading } = useStockPerformance();
  const { data: byZone, isLoading: byZoneLoading } = useStockByZone();
  const { data: alerts, isLoading: alertsLoading } = useLowStockAlerts(alertThreshold);

  // Export to Excel
  const handleExportExcel = async () => {
    if (!status) return;

    setIsExporting(true);
    try {
      const ExcelJS = await import('exceljs');

      // Create workbook
      const wb = new ExcelJS.Workbook();

      // Summary sheet
      const summaryData = [
        ['Stock Analytics Report'],
        ['Generated:', new Date().toLocaleString()],
        [],
        ['Metric', 'Value'],
        ['Total Products', status.total_products ?? 0],
        ['Total Stock Items', status.total_stock_items ?? 0],
        ['Facilities with Stock', status.total_facilities_with_stock ?? 0],
        ['Low Stock Count', status.low_stock_count ?? 0],
        ['Out of Stock Count', status.out_of_stock_count ?? 0],
      ];

      const ws = wb.addWorksheet('Summary');
      summaryData.forEach(row => ws.addRow(row));

      // Stock Balance sheet
      if (balance && balance.length > 0) {
        const balanceData = [
          ['Stock Balance by Product'],
          [],
          ['Product Name', 'Total Quantity', 'Allocated', 'Available', 'Facilities'],
          ...balance.map((b) => [
            b.product_name,
            b.total_quantity,
            b.allocated_quantity,
            b.available_quantity,
            b.facilities_count
          ])
        ];
        const wsBalance = wb.addWorksheet('Stock Balance');
        balanceData.forEach(row => wsBalance.addRow(row));
      }

      // Low Stock Alerts sheet
      if (alerts && alerts.length > 0) {
        const alertsData = [
          ['Low Stock Alerts'],
          [],
          ['Facility', 'Zone', 'Product', 'Current Quantity', 'Days Supply'],
          ...alerts.map((a) => [
            a.facility_name,
            a.zone,
            a.product_name,
            a.current_quantity,
            a.days_supply_remaining?.toFixed(1) ?? 'N/A'
          ])
        ];
        const wsAlerts = wb.addWorksheet('Low Stock Alerts');
        alertsData.forEach(row => wsAlerts.addRow(row));
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock-analytics-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!status) return;

    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Stock Analytics Report', 20, 20);

      // Date info
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);

      // Summary KPIs
      doc.setFontSize(14);
      doc.text('Summary', 20, 45);

      doc.setFontSize(10);
      let y = 55;
      const metrics = [
        ['Total Products', status.total_products ?? 0],
        ['Total Stock Items', status.total_stock_items ?? 0],
        ['Facilities with Stock', status.total_facilities_with_stock ?? 0],
        ['Low Stock Count', status.low_stock_count ?? 0],
        ['Out of Stock Count', status.out_of_stock_count ?? 0],
      ];

      metrics.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, 20, y);
        y += 6;
      });

      doc.save(`stock-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Error state
  if (statusError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load stock analytics: {statusError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (statusLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Stock Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive stock reporting and inventory insights</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isExporting || !status}>
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

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Products"
          value={status?.total_products?.toLocaleString() ?? '0'}
          description="Unique products tracked"
          icon={Package}
        />
        <MetricCard
          title="Total Stock Items"
          value={status?.total_stock_items?.toLocaleString() ?? '0'}
          description={`${status?.total_facilities_with_stock ?? 0} facilities`}
          icon={BarChart3}
        />
        <MetricCard
          title="Low Stock Alerts"
          value={status?.low_stock_count?.toLocaleString() ?? '0'}
          description="Facilities need restocking"
          icon={AlertTriangle}
          trend={status && status.low_stock_count > 0 ? 'down' : 'up'}
          trendValue={status && status.low_stock_count > 0 ? 'Attention needed' : 'All good'}
        />
        <MetricCard
          title="Out of Stock"
          value={status?.out_of_stock_count?.toLocaleString() ?? '0'}
          description="Facilities with no stock"
          icon={AlertTriangle}
          trend={status && status.out_of_stock_count > 0 ? 'down' : 'up'}
        />
      </div>

      {/* Tabbed Analytics */}
      <Tabs defaultValue="balance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="balance">Stock Balance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="zones">By Zone</TabsTrigger>
          <TabsTrigger value="alerts">Low Stock Alerts</TabsTrigger>
        </TabsList>

        {/* Stock Balance Tab */}
        <TabsContent value="balance" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {balance?.map((b) => (
                  <SelectItem key={b.product_name} value={b.product_name}>
                    {b.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stock Balance by Product</CardTitle>
              <CardDescription>Total, allocated, and available stock quantities</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="space-y-2">
                  {balance?.map((item) => (
                    <div key={item.product_name} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-lg">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.facilities_count} facilities
                          </div>
                        </div>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {item.total_quantity?.toLocaleString() ?? '0'} total
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                          <div className="text-xs text-muted-foreground">Allocated</div>
                          <div className="text-sm font-medium">{item.allocated_quantity?.toLocaleString() ?? '0'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Available</div>
                          <div className="text-sm font-medium text-green-600">
                            {item.available_quantity?.toLocaleString() ?? '0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!balance || balance.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No stock balance data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Performance Metrics</CardTitle>
              <CardDescription>Turnover rate, days of supply, and delivery history</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="space-y-2">
                  {performance?.map((item) => (
                    <div key={item.product_name} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold text-lg">{item.product_name}</div>
                        <Badge variant="outline">
                          {item.current_stock?.toLocaleString() ?? '0'} in stock
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                        <div>
                          <div className="text-xs text-muted-foreground">Turnover Rate</div>
                          <div className="text-sm font-medium">
                            {item.turnover_rate ? `${item.turnover_rate.toFixed(2)}x` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Avg Days Supply</div>
                          <div className="text-sm font-medium">
                            {item.avg_days_supply ? `${item.avg_days_supply.toFixed(1)} days` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Total Delivered</div>
                          <div className="text-sm font-medium">
                            {item.total_delivered?.toLocaleString() ?? '0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!performance || performance.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No performance data available yet. Historical delivery data is required for performance metrics.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Zone Tab */}
        <TabsContent value="zones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Distribution by Zone</CardTitle>
              <CardDescription>Stock levels across service zones</CardDescription>
            </CardHeader>
            <CardContent>
              {byZoneLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="space-y-2">
                  {byZone?.map((zone) => (
                    <div key={zone.zone} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-lg flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            {zone.zone}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {zone.facilities_count} facilities
                          </div>
                        </div>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {zone.total_quantity?.toLocaleString() ?? '0'} items
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                          <div className="text-xs text-muted-foreground">Unique Products</div>
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
                  {(!byZone || byZone.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No zone data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium">Alert Threshold:</label>
            <Select value={alertThreshold.toString()} onValueChange={(v) => setAlertThreshold(parseInt(v))}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 days supply</SelectItem>
                <SelectItem value="7">7 days supply</SelectItem>
                <SelectItem value="14">14 days supply</SelectItem>
                <SelectItem value="30">30 days supply</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                Facilities with low stock levels (less than {alertThreshold} days supply or under 10 items)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="space-y-2">
                  {alerts?.map((alert) => (
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
                        {alert.last_delivery_date && (
                          <div className="text-xs text-muted-foreground">
                            Last: {new Date(alert.last_delivery_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!alerts || alerts.length === 0) && (
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
