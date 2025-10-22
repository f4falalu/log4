import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  Truck, 
  Users, 
  Package, 
  Route, 
  MapPin, 
  Clock, 
  Weight, 
  Ruler, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle,
  Navigation,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useEnhancedBatch, useUpdateBatchStop } from '@/hooks/useBatchPlanning';
import { BatchMapView } from './BatchMapView';
import { BatchProgressTracker } from './BatchProgressTracker';

interface BatchDetailPanelProps {
  batch: any;
  onClose: () => void;
  onStatusUpdate: (batchId: string, status: string) => void;
}

export function BatchDetailPanel({ batch, onClose, onStatusUpdate }: BatchDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: detailedBatch, isLoading } = useEnhancedBatch(batch.id);
  const updateStopMutation = useUpdateBatchStop();

  const batchData = detailedBatch || batch;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStopStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'arrived': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'en_route': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'skipped': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateUtilization = () => {
    if (!batchData.vehicle?.capacity_volume_m3 || !batchData.vehicle?.capacity_weight_kg) return 0;
    
    const volumeUtil = (batchData.total_volume / batchData.vehicle.capacity_volume_m3) * 100;
    const weightUtil = (batchData.total_weight / batchData.vehicle.capacity_weight_kg) * 100;
    
    return Math.max(volumeUtil, weightUtil);
  };

  const handleStopStatusUpdate = async (stopId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'arrived') {
        updateData.actual_arrival = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.actual_departure = new Date().toISOString();
      }

      await updateStopMutation.mutateAsync({
        id: stopId,
        ...updateData
      });
    } catch (error) {
      console.error('Stop status update error:', error);
    }
  };

  const completedStops = batchData.stops?.filter((stop: any) => stop.status === 'completed').length || 0;
  const totalStops = batchData.stops?.length || 0;
  const progressPercentage = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Loading batch details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{batchData.batch_number}</h3>
          <p className="text-sm text-muted-foreground">
            Created on {new Date(batchData.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(batchData.status)}>
            {batchData.status.replace('-', ' ').toUpperCase()}
          </Badge>
          <Badge className={getPriorityColor(batchData.priority)}>
            {batchData.priority.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        {batchData.status === 'planned' && (
          <Button
            onClick={() => onStatusUpdate(batchData.id, 'in-progress')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Batch
          </Button>
        )}
        
        {batchData.status === 'in-progress' && (
          <Button
            onClick={() => onStatusUpdate(batchData.id, 'completed')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Batch
          </Button>
        )}

        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <Separator />

      {/* Progress Overview */}
      {batchData.status === 'in-progress' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Batch Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {completedStops} of {totalStops} stops completed
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <div className="text-center text-sm text-muted-foreground">
                {progressPercentage.toFixed(0)}% Complete
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stops">Route & Stops</TabsTrigger>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="tracking">Live Tracking</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vehicle & Driver Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Vehicle & Driver
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Vehicle:</span>
                  <p className="font-medium">
                    {batchData.vehicle?.model} ({batchData.vehicle?.plate_number})
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Driver:</span>
                  <p className="font-medium">
                    {batchData.driver?.name || 'No driver assigned'}
                  </p>
                  {batchData.driver?.phone && (
                    <p className="text-sm text-muted-foreground">{batchData.driver.phone}</p>
                  )}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Batch Type:</span>
                  <p className="font-medium capitalize">{batchData.batch_type}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Route Optimization:</span>
                  <p className="font-medium capitalize">{batchData.route_optimization_method}</p>
                </div>
              </CardContent>
            </Card>

            {/* Capacity Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Capacity Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {batchData.vehicle && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Volume:</span>
                        <span>{batchData.total_volume.toFixed(2)} / {batchData.vehicle.capacity_volume_m3} m³</span>
                      </div>
                      <Progress 
                        value={(batchData.total_volume / batchData.vehicle.capacity_volume_m3) * 100} 
                        className="h-2" 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Weight:</span>
                        <span>{batchData.total_weight.toFixed(1)} / {batchData.vehicle.capacity_weight_kg} kg</span>
                      </div>
                      <Progress 
                        value={(batchData.total_weight / batchData.vehicle.capacity_weight_kg) * 100} 
                        className="h-2" 
                      />
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Overall Utilization:</span>
                        <span className="font-bold text-blue-600">
                          {calculateUtilization().toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{batchData.requisition_ids?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Requisitions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{totalStops}</p>
                    <p className="text-sm text-muted-foreground">Stops</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Weight className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{batchData.total_weight.toFixed(0)}</p>
                    <p className="text-sm text-muted-foreground">kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{batchData.total_volume.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">m³</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Information */}
          {(batchData.expected_start_time || batchData.expected_end_time) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {batchData.expected_start_time && (
                    <div>
                      <span className="text-sm text-muted-foreground">Expected Start:</span>
                      <p className="font-medium">
                        {new Date(batchData.expected_start_time).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {batchData.expected_end_time && (
                    <div>
                      <span className="text-sm text-muted-foreground">Expected End:</span>
                      <p className="font-medium">
                        {new Date(batchData.expected_end_time).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {batchData.actual_start_time && (
                    <div>
                      <span className="text-sm text-muted-foreground">Actual Start:</span>
                      <p className="font-medium">
                        {new Date(batchData.actual_start_time).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {batchData.actual_end_time && (
                    <div>
                      <span className="text-sm text-muted-foreground">Actual End:</span>
                      <p className="font-medium">
                        {new Date(batchData.actual_end_time).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Special Instructions */}
          {(batchData.delivery_instructions || batchData.special_requirements?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Special Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {batchData.delivery_instructions && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Delivery Instructions:</span>
                    <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">
                      {batchData.delivery_instructions}
                    </p>
                  </div>
                )}
                {batchData.special_requirements?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Special Requirements:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {batchData.special_requirements.map((req: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Route & Stops Tab */}
        <TabsContent value="stops" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Route Stops</CardTitle>
              <CardDescription>
                {totalStops} stop{totalStops !== 1 ? 's' : ''} in this batch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchData.stops && batchData.stops.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sequence</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Estimated Arrival</TableHead>
                      <TableHead>Actual Arrival</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchData.stops.map((stop: any) => (
                      <TableRow key={stop.id}>
                        <TableCell className="text-center font-medium">
                          {stop.stop_sequence}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{stop.facility?.name}</div>
                            <div className="text-sm text-muted-foreground">{stop.facility?.address}</div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{stop.stop_type}</TableCell>
                        <TableCell>
                          <Badge className={getStopStatusColor(stop.status)}>
                            {stop.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {stop.estimated_arrival 
                            ? new Date(stop.estimated_arrival).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-sm">
                          {stop.actual_arrival 
                            ? new Date(stop.actual_arrival).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {stop.status === 'pending' && batchData.status === 'in-progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStopStatusUpdate(stop.id, 'en_route')}
                              >
                                Start
                              </Button>
                            )}
                            {stop.status === 'en_route' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStopStatusUpdate(stop.id, 'arrived')}
                              >
                                Arrived
                              </Button>
                            )}
                            {stop.status === 'arrived' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStopStatusUpdate(stop.id, 'completed')}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stops defined for this batch</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requisitions Tab */}
        <TabsContent value="requisitions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Linked Requisitions</CardTitle>
              <CardDescription>
                {batchData.requisitions?.length || 0} requisition{(batchData.requisitions?.length || 0) !== 1 ? 's' : ''} in this batch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchData.requisitions && batchData.requisitions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requisition #</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Weight/Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchData.requisitions.map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono text-sm">
                          {req.requisition_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{req.facility?.name}</div>
                            <div className="text-sm text-muted-foreground">{req.facility?.address}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{req.total_items}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{req.total_weight.toFixed(1)} kg</div>
                            <div className="text-muted-foreground">{req.total_volume.toFixed(2)} m³</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No requisitions linked to this batch</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map View Tab */}
        <TabsContent value="map" className="space-y-4">
          <BatchMapView batch={batchData} />
        </TabsContent>

        {/* Live Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <BatchProgressTracker batch={batchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
