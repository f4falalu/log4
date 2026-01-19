import { useState } from 'react';
import { BreadcrumbNavigation } from '@/components/ui/breadcrumb-navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useAssignDriverToBatch } from '@/hooks/useAssignDriverToBatch';
import { useStartDispatch } from '@/hooks/useStartDispatch';
import { useCompleteDispatch } from '@/hooks/useCompleteDispatch';
import { useRealtimeBatches } from '@/hooks/useRealtimeBatches';
import {
  Truck,
  PlayCircle,
  CheckCircle,
  Lock,
  Users,
  Package,
  Calendar,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { DeliveryBatch } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

/**
 * RFC-012 Phase 5: FleetOps Dispatch Page
 *
 * This page provides a simplified interface for dispatch operations:
 * 1. View batches in 'planned' status (awaiting assignment)
 * 2. Assign vehicle and driver to batches
 * 3. Start dispatch (lock snapshot, transition to in-progress)
 * 4. Complete dispatch (mark as completed)
 */
export default function DispatchPage() {
  const { data: batches = [], isLoading } = useDeliveryBatches();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const assignDriver = useAssignDriverToBatch();
  const startDispatch = useStartDispatch();
  const completeDispatch = useCompleteDispatch();

  // Enable real-time updates
  useRealtimeBatches();

  // Track assignment selections per batch
  const [assignments, setAssignments] = useState<Record<string, { vehicleId: string; driverId: string }>>({});

  const breadcrumbItems = [
    { label: 'FleetOps', href: '/fleetops' },
    { label: 'Dispatch' }
  ];

  // Filter batches by status
  const plannedBatches = batches.filter(b => b.status === 'planned');
  const assignedBatches = batches.filter(b => b.status === 'assigned');
  const inProgressBatches = batches.filter(b => b.status === 'in-progress');
  const completedBatches = batches.filter(b => b.status === 'completed');

  const handleAssignment = (batchId: string) => {
    const assignment = assignments[batchId];
    if (!assignment?.vehicleId || !assignment?.driverId) {
      return;
    }

    assignDriver.mutate({
      batchId,
      vehicleId: assignment.vehicleId,
      driverId: assignment.driverId,
    });
  };

  const handleStartDispatch = (batchId: string) => {
    startDispatch.mutate({ batchId });
  };

  const handleCompleteDispatch = (batchId: string) => {
    completeDispatch.mutate({ batchId });
  };

  const updateAssignment = (batchId: string, field: 'vehicleId' | 'driverId', value: string) => {
    setAssignments(prev => ({
      ...prev,
      [batchId]: {
        ...prev[batchId],
        [field]: value,
      },
    }));
  };

  const renderBatchCard = (batch: DeliveryBatch) => {
    const assignment = assignments[batch.id];
    const canAssign = assignment?.vehicleId && assignment?.driverId;
    const isAssigned = batch.status === 'assigned';
    const isInProgress = batch.status === 'in-progress';

    return (
      <Card key={batch.id} className="relative">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                {batch.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {batch.facilities?.length || 0} stops
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(batch.scheduledDate).toLocaleDateString()}
                </span>
              </CardDescription>
            </div>
            <Badge variant={
              batch.status === 'planned' ? 'secondary' :
              batch.status === 'assigned' ? 'default' :
              batch.status === 'in-progress' ? 'default' : 'outline'
            }>
              {batch.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle Selection */}
          {(batch.status === 'planned') && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle</label>
                <Select
                  value={assignment?.vehicleId || ''}
                  onValueChange={(value) => updateAssignment(batch.id, 'vehicleId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} - {vehicle.registration}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Driver</label>
                <Select
                  value={assignment?.driverId || ''}
                  onValueChange={(value) => updateAssignment(batch.id, 'driverId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => handleAssignment(batch.id)}
                disabled={!canAssign || assignDriver.isPending}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Assign to Batch
              </Button>
            </>
          )}

          {/* Assigned State */}
          {isAssigned && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vehicle:</span>
                  <span className="font-medium">
                    {vehicles.find(v => v.id === batch.vehicleId)?.registration || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-medium">
                    {drivers.find(d => d.id === batch.driverId)?.name || 'N/A'}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => handleStartDispatch(batch.id)}
                disabled={startDispatch.isPending}
                className="w-full"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Dispatch
              </Button>
            </div>
          )}

          {/* In Progress State */}
          {isInProgress && (
            <div className="space-y-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Batch Snapshot Locked</AlertTitle>
                <AlertDescription className="text-xs">
                  This batch is immutable and cannot be modified during dispatch.
                </AlertDescription>
              </Alert>
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vehicle:</span>
                  <span className="font-medium">
                    {vehicles.find(v => v.id === batch.vehicleId)?.registration || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-medium">
                    {drivers.find(d => d.id === batch.driverId)?.name || 'N/A'}
                  </span>
                </div>
                {batch.actualStartTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Started:</span>
                    <span className="font-medium">
                      {new Date(batch.actualStartTime).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => handleCompleteDispatch(batch.id)}
                disabled={completeDispatch.isPending}
                className="w-full"
                variant="default"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Dispatch
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Loading dispatch data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <BreadcrumbNavigation items={breadcrumbItems} />

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Dispatch Operations
          </h1>
          <p className="text-muted-foreground mt-1">
            Assign drivers and vehicles, start and complete dispatch operations
          </p>
        </div>

        {/* RFC-012 Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>RFC-012: Domain Separation</AlertTitle>
          <AlertDescription>
            FleetOps owns dispatch operations. Batches published from Storefront arrive in "planned" status.
            Assign vehicle/driver, start dispatch to lock the batch snapshot, then complete when done.
          </AlertDescription>
        </Alert>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plannedBatches.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedBatches.length}</div>
            <p className="text-xs text-muted-foreground">Ready to start</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressBatches.length}</div>
            <p className="text-xs text-muted-foreground">Currently dispatching</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedBatches.length}</div>
            <p className="text-xs text-muted-foreground">Dispatch finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Batches Grid */}
      <div className="space-y-6">
        {/* Planned Batches */}
        {plannedBatches.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Planned Batches ({plannedBatches.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plannedBatches.map(renderBatchCard)}
            </div>
          </div>
        )}

        {/* Assigned Batches */}
        {assignedBatches.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assigned Batches ({assignedBatches.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedBatches.map(renderBatchCard)}
            </div>
          </div>
        )}

        {/* In Progress Batches */}
        {inProgressBatches.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              In Progress ({inProgressBatches.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inProgressBatches.map(renderBatchCard)}
            </div>
          </div>
        )}

        {/* Empty State */}
        {plannedBatches.length === 0 && assignedBatches.length === 0 && inProgressBatches.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Dispatch Operations</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Batches from Storefront will appear here when ready for dispatch operations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
