import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { SessionTable } from '@/components/admin/sessions/SessionTable';
import { useActiveSessionsCount } from '@/hooks/admin/useSessions';

export default function SessionsPage() {
  const { data: activeCount = 0 } = useActiveSessionsCount();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Session Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor active driver sessions and GPS trails
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <Radio className="h-4 w-4 text-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {activeCount} Active Sessions
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
          <CardDescription>
            View and manage driver sessions. Click a session to see GPS trail and details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionTable />
        </CardContent>
      </Card>
    </div>
  );
}
