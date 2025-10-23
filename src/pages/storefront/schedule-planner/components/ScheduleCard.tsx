import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, MapPin, Package, Truck, User, Route, FileDown, Send } from 'lucide-react';
import { format } from 'date-fns';
import { DeliverySchedule } from '@/hooks/useDeliverySchedules';

interface ScheduleCardProps {
  schedule: DeliverySchedule;
  onViewRoute: (schedule: DeliverySchedule) => void;
  onOptimize: (schedule: DeliverySchedule) => void;
  onExport: (schedule: DeliverySchedule) => void;
  onSendToFleetOps: (schedule: DeliverySchedule) => void;
}

export function ScheduleCard({
  schedule,
  onViewRoute,
  onOptimize,
  onExport,
  onSendToFleetOps
}: ScheduleCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'confirmed': return 'default';
      case 'exported': return 'outline';
      case 'dispatched': return 'default';
      default: return 'secondary';
    }
  };

  const getTimeWindowIcon = (window: string) => {
    switch (window) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌆';
      default: return '📅';
    }
  };

  const utilizationPercent = schedule.vehicle?.capacity 
    ? (schedule.total_payload_kg / schedule.vehicle.capacity) * 100 
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{schedule.title}</h3>
            <p className="text-sm text-muted-foreground">
              {schedule.warehouse?.name} → {schedule.facility_ids.length} Facilities
            </p>
          </div>
          <Badge variant={getStatusColor(schedule.status)}>
            {schedule.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date & Time */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(schedule.planned_date), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {getTimeWindowIcon(schedule.time_window)} {schedule.time_window}
            </span>
          </div>
        </div>

        {/* Payload Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>Payload</span>
            </div>
            <span className="font-medium">
              {schedule.total_payload_kg} kg / {schedule.total_volume_m3.toFixed(2)} m³
            </span>
          </div>
          {schedule.vehicle && (
            <div className="space-y-1">
              <Progress 
                value={utilizationPercent} 
                className={`h-2 ${
                  utilizationPercent > 90 ? 'bg-red-100' : 
                  utilizationPercent > 70 ? 'bg-yellow-100' : 
                  'bg-green-100'
                }`}
              />
              <p className="text-xs text-muted-foreground text-right">
                {utilizationPercent.toFixed(0)}% utilization
              </p>
            </div>
          )}
        </div>

        {/* Vehicle & Driver */}
        <div className="space-y-2 text-sm">
          {schedule.vehicle ? (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span>{schedule.vehicle.model} ({schedule.vehicle.plate_number})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="h-4 w-4" />
              <span>No vehicle assigned</span>
            </div>
          )}

          {schedule.driver ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{schedule.driver.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>No driver assigned</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{schedule.facility_ids.length} stops</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => onViewRoute(schedule)}>
            <Route className="h-3 w-3 mr-1" />
            View Route
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onOptimize(schedule)}
            disabled={schedule.facility_ids.length < 2}
          >
            <Route className="h-3 w-3 mr-1" />
            Optimize
          </Button>
          <Button size="sm" variant="outline" onClick={() => onExport(schedule)}>
            <FileDown className="h-3 w-3 mr-1" />
            Export
          </Button>
          {schedule.status === 'confirmed' && (
            <Button size="sm" onClick={() => onSendToFleetOps(schedule)}>
              <Send className="h-3 w-3 mr-1" />
              Send to FleetOps
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
