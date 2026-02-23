import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { useAuditLogs, type AuditLog } from '@/hooks/rbac';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface UserAuditHistoryProps {
  userId: string;
  userName: string;
}

const SEVERITY_CONFIG = {
  low: {
    label: 'Low',
    variant: 'outline' as const,
    icon: Info,
  },
  medium: {
    label: 'Medium',
    variant: 'secondary' as const,
    icon: FileText,
  },
  high: {
    label: 'High',
    variant: 'default' as const,
    icon: AlertTriangle,
  },
  critical: {
    label: 'Critical',
    variant: 'destructive' as const,
    icon: AlertCircle,
  },
};

export function UserAuditHistory({ userId, userName }: UserAuditHistoryProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading } = useAuditLogs({
    userId,
    severity: severityFilter === 'all' ? undefined : severityFilter,
    limit: 50,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
          <CardDescription>Recent actions performed by this user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Audit History</CardTitle>
            <CardDescription>Recent actions performed by {userName}</CardDescription>
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {logs && logs.logs.length > 0 ? (
          <div className="space-y-2">
            {logs.logs.map((log) => {
              const severityConfig = SEVERITY_CONFIG[log.severity];
              const SeverityIcon = severityConfig.icon;

              return (
                <Dialog key={log.id}>
                  <DialogTrigger asChild>
                    <button
                      className="w-full text-left p-4 border rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <SeverityIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{log.action}</span>
                            <Badge variant={severityConfig.variant} className="text-xs shrink-0">
                              {severityConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">
                              {log.resource_type} · {log.resource_id}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseISO(log.created_at), 'PPp')}
                          </p>
                        </div>
                        {log.state_diff && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Has Changes
                          </Badge>
                        )}
                      </div>
                    </button>
                  </DialogTrigger>

                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Audit Log Details</DialogTitle>
                      <DialogDescription>
                        {log.resource_type} · {format(parseISO(log.created_at), 'PPpp')}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Action</p>
                          <p className="text-sm">{log.action}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Severity</p>
                          <Badge variant={severityConfig.variant}>{severityConfig.label}</Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Resource Type</p>
                          <p className="text-sm">{log.resource_type}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Resource ID</p>
                          <p className="text-sm font-mono text-xs truncate">{log.resource_id}</p>
                        </div>
                      </div>

                      {/* State Diff */}
                      {log.state_diff && (
                        <div>
                          <p className="text-sm font-medium mb-2">State Changes</p>
                          <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs font-mono">
                              {JSON.stringify(log.state_diff, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      {log.metadata && (
                        <div>
                          <p className="text-sm font-medium mb-2">Additional Metadata</p>
                          <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs font-mono">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {log.description && (
                        <div>
                          <p className="text-sm font-medium mb-2">Description</p>
                          <p className="text-sm text-muted-foreground">{log.description}</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No audit logs found</p>
          </div>
        )}

        {logs && logs.total > 50 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Showing 50 of {logs.total} total audit logs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
