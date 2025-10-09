import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { Download, FileText, TrendingUp, Users, Truck, Package } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { toast } from 'sonner';

const ReportsPage = () => {
  const { data: batches = [] } = useDeliveryBatches();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const [timeRange, setTimeRange] = useState('7');

  const filterByTimeRange = (date: string) => {
    const itemDate = new Date(date);
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
    return itemDate >= cutoffDate;
  };

  const filteredBatches = batches.filter(b => filterByTimeRange(b.createdAt));

  // Calculate metrics
  const totalDeliveries = filteredBatches.length;
  const completedDeliveries = filteredBatches.filter(b => b.status === 'completed').length;
  const inProgressDeliveries = filteredBatches.filter(b => b.status === 'in-progress').length;
  const completionRate = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries * 100).toFixed(1) : 0;
  const totalDistance = filteredBatches.reduce((sum, b) => sum + b.totalDistance, 0);
  const avgDistance = totalDeliveries > 0 ? (totalDistance / totalDeliveries).toFixed(1) : 0;

  const driverStats = drivers.map(driver => {
    const driverBatches = filteredBatches.filter(b => b.driverId === driver.id);
    return {
      name: driver.name,
      deliveries: driverBatches.length,
      completed: driverBatches.filter(b => b.status === 'completed').length,
      onTimePercentage: driver.onTimePercentage || 0
    };
  }).sort((a, b) => b.deliveries - a.deliveries);

  const vehicleStats = vehicles.map(vehicle => {
    const vehicleBatches = filteredBatches.filter(b => b.vehicleId === vehicle.id);
    const distance = vehicleBatches.reduce((sum, b) => sum + b.totalDistance, 0);
    return {
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      trips: vehicleBatches.length,
      distance: distance.toFixed(0),
      utilization: vehicleBatches.length > 0 ? 'High' : 'Low'
    };
  }).sort((a, b) => b.trips - a.trips);

  const handleExportCSV = (reportType: string) => {
    let data: any[] = [];
    let filename = '';

    switch (reportType) {
      case 'deliveries':
        data = filteredBatches.map(b => ({
          'Batch Name': b.name,
          'Status': b.status,
          'Priority': b.priority,
          'Date': new Date(b.scheduledDate).toLocaleDateString(),
          'Facilities': b.facilities.length,
          'Distance (km)': b.totalDistance,
          'Duration (min)': Math.round(b.estimatedDuration)
        }));
        filename = 'delivery-report';
        break;
      case 'drivers':
        data = driverStats.map(d => ({
          'Driver Name': d.name,
          'Total Deliveries': d.deliveries,
          'Completed': d.completed,
          'On-Time %': d.onTimePercentage.toFixed(1)
        }));
        filename = 'driver-performance';
        break;
      case 'vehicles':
        data = vehicleStats.map(v => ({
          'Vehicle': v.model,
          'Plate Number': v.plateNumber,
          'Total Trips': v.trips,
          'Distance (km)': v.distance,
          'Utilization': v.utilization
        }));
        filename = 'vehicle-utilization';
        break;
    }

    exportToCSV(data, filename);
    toast.success('Report exported to CSV');
  };

  const handleExportPDF = (reportType: string) => {
    toast.info('PDF export coming soon');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive operational insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {completedDeliveries} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {inProgressDeliveries} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDistance.toFixed(0)} km</div>
            <p className="text-xs text-muted-foreground">
              Avg: {avgDistance} km per delivery
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.filter(d => d.status !== 'offline').length}</div>
            <p className="text-xs text-muted-foreground">
              of {drivers.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deliveries">Delivery Report</TabsTrigger>
          <TabsTrigger value="drivers">Driver Performance</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Utilization</TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Delivery Performance</CardTitle>
                <CardDescription>All deliveries in selected time range</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportCSV('deliveries')}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportPDF('deliveries')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredBatches.slice(0, 10).map(batch => (
                  <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{batch.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(batch.scheduledDate).toLocaleDateString()} • {batch.facilities.length} stops
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{batch.totalDistance.toFixed(0)} km</div>
                      <div className="text-xs text-muted-foreground capitalize">{batch.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Driver Performance</CardTitle>
                <CardDescription>Performance metrics by driver</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportCSV('drivers')}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportPDF('drivers')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {driverStats.slice(0, 10).map(driver => (
                  <div key={driver.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{driver.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {driver.completed} of {driver.deliveries} completed
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{driver.onTimePercentage.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">On-time rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vehicle Utilization</CardTitle>
                <CardDescription>Fleet usage statistics</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportCSV('vehicles')}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportPDF('vehicles')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vehicleStats.slice(0, 10).map(vehicle => (
                  <div key={vehicle.plateNumber} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{vehicle.model}</div>
                      <div className="text-sm text-muted-foreground">{vehicle.plateNumber}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{vehicle.trips} trips</div>
                      <div className="text-xs text-muted-foreground">{vehicle.distance} km total</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
