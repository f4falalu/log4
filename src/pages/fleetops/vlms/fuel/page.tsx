'use client';

import { useEffect } from 'react';
import { useFuelLogsStore } from '@/stores/vlms/fuelLogsStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2 } from 'lucide-react';

export default function FuelLogsPage() {
  const { logs, isLoading, fetchLogs } = useFuelLogsStore();

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fuel Management</h1>
          <p className="text-muted-foreground">Track fuel consumption and efficiency</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Log Fuel Purchase
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : logs && logs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead>Quantity (L)</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.transaction_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {log.vehicle?.make} {log.vehicle?.model}
                    <div className="text-sm text-muted-foreground">
                      {log.vehicle?.license_plate}
                    </div>
                  </TableCell>
                  <TableCell>{log.station_name || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{log.fuel_type}</TableCell>
                  <TableCell>{log.quantity.toFixed(2)}</TableCell>
                  <TableCell>${log.total_cost?.toFixed(2)}</TableCell>
                  <TableCell>{log.odometer_reading.toLocaleString()} km</TableCell>
                  <TableCell>
                    {log.fuel_efficiency ? `${log.fuel_efficiency.toFixed(2)} km/L` : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No fuel logs found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
