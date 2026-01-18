import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogTable } from '@/components/admin/audit/AuditLogTable';
import { useEventStats } from '@/hooks/admin/useAuditLogs';
import { Badge } from '@/components/ui/badge';
import { FileSearch, Activity } from 'lucide-react';

export default function AuditPage() {
  const { data: eventStats = [] } = useEventStats();

  // Get top 5 event types
  const topEvents = eventStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalEvents = eventStats.reduce((sum, e) => sum + e.count, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          View and export mod4 events for auditing and compliance
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Events (Last 7 Days)</p>
                <p className="text-3xl font-bold">{totalEvents.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Top Event Types (7 Days)</p>
            <div className="flex flex-wrap gap-2">
              {topEvents.map((event) => (
                <Badge key={event.event_type} variant="secondary">
                  {event.event_type.replace(/_/g, ' ')}: {event.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Event Logs
          </CardTitle>
          <CardDescription>
            Filter, search, and export mod4 events. Click the eye icon to view full event details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable />
        </CardContent>
      </Card>
    </div>
  );
}
