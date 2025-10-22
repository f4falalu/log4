import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Truck, Package, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { useFleets } from '@/hooks/useFleets';
import { useVehicles } from '@/hooks/useVehicles';
import { useEnhancedDeliveryBatches } from '@/hooks/useEnhancedDispatch';

interface FleetMetrics {
  totalFleets: number;
  activeFleets: number;
  totalVehicles: number;
  availableVehicles: number;
  inUseVehicles: number;
  maintenanceVehicles: number;
  totalCapacityVolume: number;
  totalCapacityWeight: number;
  utilizationRate: number;
}

interface FleetPerformance {
  fleetId: string;
  fleetName: string;
  vehicleCount: number;
  completedDeliveries: number;
  avgUtilization: number;
  totalDistance: number;
  fuelEfficiency: number;
  onTimeDeliveries: number;
  status: 'excellent' | 'good' | 'needs_improvement';
}

export function FleetAnalyticsDashboard() {
  const { data: fleets = [] } = useFleets();
  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useEnhancedDeliveryBatches();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedFleetId, setSelectedFleetId] = useState('all');

  // Calculate fleet metrics
  const fleetMetrics: FleetMetrics = useMemo(() => {
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const inUseVehicles = vehicles.filter(v => v.status === 'in-use').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
    
    const totalCapacityVolume = vehicles.reduce((sum, v) => 
      sum + ((v as any).capacity_volume_m3 || v.capacity || 0), 0
    );
    
    const totalCapacityWeight = vehicles.reduce((sum, v) => 
      sum + ((v as any).capacity_weight_kg || v.maxWeight || 0), 0
    );

    const utilizationRate = totalVehicles > 0 ? (inUseVehicles / totalVehicles) * 100 : 0;

    return {
      totalFleets: fleets.length,
      activeFleets: fleets.filter(f => f.status === 'active').length,
      totalVehicles,
      availableVehicles,
      inUseVehicles,
      maintenanceVehicles,
      totalCapacityVolume,
      totalCapacityWeight,
      utilizationRate
    };
  }, [fleets, vehicles]);

  // Calculate fleet performance data
  const fleetPerformance: FleetPerformance[] = useMemo(() => {
    return fleets.map(fleet => {
      const fleetVehicles = vehicles.filter(v => (v as any).fleet_id === fleet.id);
      const fleetBatches = batches.filter(b => 
        fleetVehicles.some(v => v.id === b.vehicle_id)
      );
      
      const completedDeliveries = fleetBatches.filter(b => b.status === 'completed').length;
      const avgUtilization = fleetBatches.length > 0 
        ? fleetBatches.reduce((sum, b) => sum + (b.payload_utilization_pct || 0), 0) / fleetBatches.length
        : 0;
      
      const totalDistance = fleetBatches.reduce((sum, b) => sum + (b.estimated_distance_km || 0), 0);
      const onTimeDeliveries = Math.floor(completedDeliveries * (0.8 + Math.random() * 0.2)); // Simulated
      
      let status: 'excellent' | 'good' | 'needs_improvement' = 'needs_improvement';
      if (avgUtilization > 80 && onTimeDeliveries / completedDeliveries > 0.9) {
        status = 'excellent';
      } else if (avgUtilization > 60 && onTimeDeliveries / completedDeliveries > 0.8) {
        status = 'good';
      }

      return {
        fleetId: fleet.id,
        fleetName: fleet.name,
        vehicleCount: fleetVehicles.length,
        completedDeliveries,
        avgUtilization,
        totalDistance,
        fuelEfficiency: 12 + Math.random() * 8, // Simulated fuel efficiency
        onTimeDeliveries,
        status
      };
    });
  }, [fleets, vehicles, batches]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'needs_improvement': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'text-green-600';
    if (utilization >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fleet Analytics Dashboard</h1>
          <p className="text-muted-foreground">Performance insights and operational metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedFleetId} onValueChange={setSelectedFleetId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fleets</SelectItem>
              {fleets.map(fleet => (
                <SelectItem key={fleet.id} value={fleet.id}>
                  {fleet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Active Fleets</p>
                <p className="text-2xl font-bold">{fleetMetrics.activeFleets}/{fleetMetrics.totalFleets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Vehicle Utilization</p>
                <p className="text-2xl font-bold">{fleetMetrics.utilizationRate.toFixed(1)}%</p>
                <Progress value={fleetMetrics.utilizationRate} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-bold">{fleetMetrics.totalCapacityVolume.toFixed(0)} m³</p>
                <p className="text-sm text-muted-foreground">{fleetMetrics.totalCapacityWeight.toFixed(0)} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Avg Payload Efficiency</p>
                <p className="text-2xl font-bold">
                  {batches.length > 0 
                    ? (batches.reduce((sum, b) => sum + (b.payload_utilization_pct || 0), 0) / batches.length).toFixed(1)
                    : '0'
                  }%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Fleet Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="utilization">Utilization Trends</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        {/* Fleet Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vehicle Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Vehicle Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fleetMetrics.availableVehicles}</span>
                      <Progress 
                        value={(fleetMetrics.availableVehicles / fleetMetrics.totalVehicles) * 100} 
                        className="h-2 w-24" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>In Use</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fleetMetrics.inUseVehicles}</span>
                      <Progress 
                        value={(fleetMetrics.inUseVehicles / fleetMetrics.totalVehicles) * 100} 
                        className="h-2 w-24" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span>Maintenance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fleetMetrics.maintenanceVehicles}</span>
                      <Progress 
                        value={(fleetMetrics.maintenanceVehicles / fleetMetrics.totalVehicles) * 100} 
                        className="h-2 w-24" 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fleet Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Fleet Performance Summary</CardTitle>
                <CardDescription>Key performance indicators across all fleets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {fleetPerformance.filter(f => f.status === 'excellent').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Excellent</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {fleetPerformance.filter(f => f.status === 'good').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Good</p>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {fleetPerformance.filter(f => f.status === 'needs_improvement').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Needs Improvement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Analysis */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fleet Performance Analysis</CardTitle>
              <CardDescription>Detailed performance metrics for each fleet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fleetPerformance.map((fleet) => (
                  <div key={fleet.fleetId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{fleet.fleetName}</h3>
                        <Badge className={getStatusColor(fleet.status)}>
                          {fleet.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {fleet.vehicleCount} vehicles
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Completed Deliveries</p>
                        <p className="text-xl font-bold">{fleet.completedDeliveries}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Utilization</p>
                        <p className={`text-xl font-bold ${getUtilizationColor(fleet.avgUtilization)}`}>
                          {fleet.avgUtilization.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Distance</p>
                        <p className="text-xl font-bold">{fleet.totalDistance.toFixed(0)} km</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">On-Time Rate</p>
                        <p className="text-xl font-bold">
                          {fleet.completedDeliveries > 0 
                            ? ((fleet.onTimeDeliveries / fleet.completedDeliveries) * 100).toFixed(1)
                            : '0'
                          }%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Utilization Trends */}
        <TabsContent value="utilization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payload Utilization Trends</CardTitle>
              <CardDescription>Track how efficiently your fleet capacity is being used</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Utilization Trends Chart</p>
                <p className="text-sm">Interactive charts showing utilization patterns over time</p>
                <p className="text-xs mt-2">This would integrate with charting libraries like Chart.js or Recharts</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fleet Cost Analysis
              </CardTitle>
              <CardDescription>Operational costs and efficiency metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">₦{(fleetPerformance.reduce((sum, f) => sum + f.totalDistance, 0) * 45).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Estimated Fuel Costs</p>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">
                    {fleetPerformance.length > 0 
                      ? (fleetPerformance.reduce((sum, f) => sum + f.fuelEfficiency, 0) / fleetPerformance.length).toFixed(1)
                      : '0'
                    } km/L
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Fuel Efficiency</p>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">
                    ₦{((fleetPerformance.reduce((sum, f) => sum + f.totalDistance, 0) * 45) / 
                       Math.max(fleetPerformance.reduce((sum, f) => sum + f.completedDeliveries, 0), 1)).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Cost per Delivery</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
