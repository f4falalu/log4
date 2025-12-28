'use client';

import { useEffect, useState } from 'react';
import { useFuelLogsStore } from '@/stores/vlms/fuelLogsStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, Fuel } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { LogFuelPurchaseDialog } from './LogFuelPurchaseDialog';

export default function FuelLogsPage() {
  const { logs, isLoading, fetchLogs } = useFuelLogsStore();
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fuel Management</h1>
          <p className="text-muted-foreground mt-2">Track fuel consumption and efficiency</p>
        </div>
        <Button onClick={() => setLogDialogOpen(true)}>
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
          <EmptyState
            icon={Fuel}
            title="No fuel logs found"
            description="Start tracking fuel consumption by logging your first fuel purchase."
            variant="dashed"
          />
        )}
      </Card>

      <LogFuelPurchaseDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
      />
    </div>
  );
}
