import { useMemo } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Facility, Delivery } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Calendar, 
  Truck, 
  MapPin, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Package
} from 'lucide-react';
import { UnifiedMapContainer } from '@/components/map/UnifiedMapContainer';

interface DashboardProps {
  facilities: Facility[];
  deliveries: Delivery[];
}

const Dashboard = ({ facilities, deliveries }: DashboardProps) => {
  const stats = useMemo(() => {
    const today = new Date();
    const todayDeliveries = deliveries.filter(d => 
      isToday(parseISO(d.scheduledDate))
    );
    const tomorrowDeliveries = deliveries.filter(d => 
      isTomorrow(parseISO(d.scheduledDate))
    );
    const urgentDeliveries = deliveries.filter(d => 
      d.priority === 'urgent' && d.status === 'scheduled'
    );
    const completedDeliveries = deliveries.filter(d => 
      d.status === 'completed'
    );

    return {
      totalFacilities: facilities.length,
      totalDeliveries: deliveries.length,
      todayDeliveries: todayDeliveries.length,
      tomorrowDeliveries: tomorrowDeliveries.length,
      urgentDeliveries: urgentDeliveries.length,
      completedDeliveries: completedDeliveries.length,
    };
  }, [facilities, deliveries]);

  const upcomingDeliveries = useMemo(() => {
    return deliveries
      .filter(d => d.status === 'scheduled')
      .sort((a, b) => {
        const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
        const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  }, [deliveries]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-light border-medical/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-medical/10 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-medical" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalFacilities}</p>
                <p className="text-sm text-muted-foreground">Total Facilities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-light border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalDeliveries}</p>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-light border-warning/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.todayDeliveries}</p>
                <p className="text-sm text-muted-foreground">Today's Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-light border-destructive/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.urgentDeliveries}</p>
                <p className="text-sm text-muted-foreground">Urgent Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geofence Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span>Geofence Alerts</span>
          </CardTitle>
          <CardDescription>
            Real-time zone entry/exit notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px]">
            {/* ZoneAlerts component will be imported and displayed here */}
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Geofence monitoring active</p>
              <p className="text-sm">Alerts will appear here when vehicles enter/exit zones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Facility Locations</span>
            </CardTitle>
            <CardDescription>
              Interactive map showing all registered facilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {facilities.length > 0 ? (
              <UnifiedMapContainer 
                mode="embedded"
                facilities={facilities}
                center={facilities.length > 0 ? [facilities[0].lat, facilities[0].lng] : undefined}
                zoom={facilities.length > 1 ? 6 : 10}
                showToolbar={false}
                showBottomPanel={false}
                className="rounded-lg overflow-hidden border"
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center border rounded-lg bg-muted/5">
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No facilities to display on map</p>
                  <p className="text-sm">Add facilities to see them here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>Upcoming Deliveries</span>
          </CardTitle>
          <CardDescription>
            Next 5 scheduled deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingDeliveries.length > 0 ? (
            <div className="space-y-4">
              {upcomingDeliveries.map((delivery) => {
                const deliveryDate = parseISO(delivery.scheduledDate);
                const isScheduledToday = isToday(deliveryDate);
                const isScheduledTomorrow = isTomorrow(deliveryDate);
                
                return (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/5 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{delivery.facilityName}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {isScheduledToday ? 'Today' : 
                               isScheduledTomorrow ? 'Tomorrow' : 
                               format(deliveryDate, 'MMM d, yyyy')}
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{delivery.scheduledTime}</span>
                          </span>
                          <span>{delivery.medicationType}</span>
                          <span>Qty: {delivery.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(delivery.priority)}>
                        {delivery.priority}
                      </Badge>
                      <Badge className={getStatusColor(delivery.status)}>
                        {delivery.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming deliveries scheduled</p>
              <p className="text-sm">Create a delivery schedule to see them here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;