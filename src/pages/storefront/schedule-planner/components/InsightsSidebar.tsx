import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, History, TrendingUp, FileText } from 'lucide-react';
import { DeliverySchedule } from '@/hooks/useDeliverySchedules';
import { format } from 'date-fns';

interface InsightsSidebarProps {
  schedules: DeliverySchedule[];
}

export function InsightsSidebar({ schedules }: InsightsSidebarProps) {
  const recentSchedules = schedules
    .filter(s => s.status === 'dispatched' || s.status === 'confirmed')
    .slice(0, 5);

  const draftSchedules = schedules.filter(s => s.status === 'draft');

  const avgPayload = schedules.length > 0
    ? schedules.reduce((sum, s) => sum + s.total_payload_kg, 0) / schedules.length
    : 0;

  return (
    <div className="w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {/* Optimization Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-warning" />
                Route Optimization Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {draftSchedules.length > 0 && (
                <p className="text-muted-foreground">
                  {draftSchedules.length} draft schedule{draftSchedules.length > 1 ? 's' : ''} ready for optimization
                </p>
              )}
              <p className="text-muted-foreground">
                Consider grouping nearby facilities to reduce travel time
              </p>
              <p className="text-muted-foreground">
                Morning deliveries typically have 15% better completion rates
              </p>
            </CardContent>
          </Card>

          {/* Recent Schedules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Schedules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentSchedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent schedules</p>
              ) : (
                recentSchedules.map((schedule) => (
                  <div key={schedule.id} className="space-y-1">
                    <p className="text-sm font-medium">{schedule.title}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(schedule.planned_date), 'MMM dd')}</span>
                      <Badge variant="outline" className="text-xs">
                        {schedule.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Fleet Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Fleet Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Payload:</span>
                <span className="font-medium">{avgPayload.toFixed(0)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Schedules:</span>
                <span className="font-medium">{schedules.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dispatched:</span>
                <span className="font-medium">
                  {schedules.filter(s => s.status === 'dispatched').length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Dispatch Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dispatch Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Assign vehicles based on payload capacity</p>
              <p>• Confirm driver availability before dispatch</p>
              <p>• Optimize routes to reduce fuel costs</p>
              <p>• Export schedules for driver reference</p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
