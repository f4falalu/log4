'use client';

import { useEffect } from 'react';
import { useIncidentsStore } from '@/stores/vlms/incidentsStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';

export default function IncidentsPage() {
  const { incidents, isLoading, fetchIncidents } = useIncidentsStore();

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      reported: 'default',
      investigating: 'secondary',
      resolved: 'outline',
      closed: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      minor: 'outline',
      moderate: 'default',
      major: 'secondary',
      total_loss: 'destructive',
    };
    return <Badge variant={variants[severity] || 'default'}>{severity}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incident Management</h1>
          <p className="text-muted-foreground">Track and manage vehicle incidents</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : incidents && incidents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident ID</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Est. Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium">{incident.incident_id}</TableCell>
                  <TableCell>
                    {incident.vehicle?.make} {incident.vehicle?.model}
                    <div className="text-sm text-muted-foreground">
                      {incident.vehicle?.license_plate}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">
                    {incident.incident_type?.replace('_', ' ')}
                  </TableCell>
                  <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                  <TableCell>{getStatusBadge(incident.status)}</TableCell>
                  <TableCell>
                    {new Date(incident.incident_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{incident.location}</TableCell>
                  <TableCell>
                    ${incident.estimated_repair_cost?.toLocaleString() || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No incidents reported</p>
          </div>
        )}
      </Card>
    </div>
  );
}
