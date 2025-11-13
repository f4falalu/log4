import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Package, Gauge, Clock, Route } from 'lucide-react';
import { useRealtimeStats } from '@/hooks/useRealtimeStats';

export function AnalyticsPanel() {
  const { data: stats } = useRealtimeStats();

  // Calculate metrics
  const totalDeliveries = (stats?.inProgressDeliveries || 0) + (stats?.completedDeliveries || 0);
  const completionRate = totalDeliveries > 0 
    ? ((stats?.completedDeliveries || 0) / totalDeliveries) * 100 
    : 0;

  return (
    <div className="h-full overflow-y-auto">
      {/* KPI Cards Grid */}
      <div className="p-6 grid grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Total Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeliveries}</div>
            <Progress value={completionRate} className="mt-2 h-2" />
            <div className="mt-1 text-xs text-muted-foreground">
              {completionRate.toFixed(0)}% complete
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Avg ETA Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>+5% vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              Payload Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <div className="flex items-center gap-1 mt-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '78%' }} />
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Optimal range: 70-85%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Route className="h-4 w-4 text-muted-foreground" />
              Route Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>Optimized routing</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deliveries by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">North Zone</span>
                  <span className="font-medium">24</span>
                </div>
                <Progress value={65} className="h-2" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">South Zone</span>
                  <span className="font-medium">18</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">East Zone</span>
                  <span className="font-medium">32</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">West Zone</span>
                  <span className="font-medium">15</span>
                </div>
                <Progress value={40} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fleet Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vehicles Active</span>
                <span className="text-sm font-medium">{stats?.activeVehicles || 0} / 15</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Speed</span>
                <span className="text-sm font-medium">42 km/h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Idle Time</span>
                <span className="text-sm font-medium">8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Fuel Efficiency</span>
                <span className="text-sm font-medium flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  Good
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
