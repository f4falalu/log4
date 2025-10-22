import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Truck, Package, Route, MapPin, Clock, Users, Filter, Eye, Edit, Trash2, Play, Pause, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useEnhancedBatches, useCreateBatch, useUpdateBatch, useDeleteBatch, useBatchAnalytics } from '@/hooks/useBatchPlanning';
import { useApprovedRequisitions } from '@/hooks/useRequisitions';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { useFacilities } from '@/hooks/useFacilities';
import { BatchCreateWizard } from '@/components/batch/BatchCreateWizard';
// import { BatchDetailPanel } from '@/components/batch/BatchDetailPanel';
// import { BatchMapView } from '@/components/batch/BatchMapView';
// import { BatchProgressTracker } from '@/components/batch/BatchProgressTracker';

export default function BatchPlannerPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    vehicle_id: 'all',
    driver_id: 'all',
    batch_type: 'all'
  });

  const { data: batches = [], isLoading, error: batchesError } = useEnhancedBatches(filters);
  const { data: analytics, error: analyticsError } = useBatchAnalytics();
  const { data: approvedRequisitions = [], error: requisitionsError } = useApprovedRequisitions();
  const { data: vehicles = [], error: vehiclesError } = useVehicles();
  const { data: drivers = [], error: driversError } = useDrivers();
  const { data: facilities = [], error: facilitiesError } = useFacilities();
  
  const createBatchMutation = useCreateBatch();
  const updateBatchMutation = useUpdateBatch();
  const deleteBatchMutation = useDeleteBatch();

  // Filter batches based on search and active tab
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.vehicle?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && batch.status === activeTab;
  });

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'delivery': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pickup': return 'bg-green-100 text-green-800 border-green-200';
      case 'mixed': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateUtilization = (batch: any) => {
    if (!batch.vehicle?.capacity_volume_m3 || !batch.vehicle?.capacity_weight_kg) return 0;
    
    const volumeUtil = (batch.total_volume / batch.vehicle.capacity_volume_m3) * 100;
    const weightUtil = (batch.total_weight / batch.vehicle.capacity_weight_kg) * 100;
    
    return Math.max(volumeUtil, weightUtil);
  };

  const handleCreateBatch = async (data: any) => {
    try {
      await createBatchMutation.mutateAsync(data);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Create batch error:', error);
    }
  };

  const handleViewDetails = (batch: any) => {
    setSelectedBatch(batch);
    setIsDetailDialogOpen(true);
  };

  const handleStatusUpdate = async (batchId: string, status: string) => {
    try {
      await updateBatchMutation.mutateAsync({
        id: batchId,
        data: { status }
      });
    } catch (error) {
      console.error('Status update error:', error);
    }
  };

  const handleDelete = async (batchId: string) => {
    if (confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteBatchMutation.mutateAsync(batchId);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const statusCounts = {
    all: batches.length,
    planned: batches.filter(b => b.status === 'planned').length,
    'in-progress': batches.filter(b => b.status === 'in-progress').length,
    completed: batches.filter(b => b.status === 'completed').length,
    cancelled: batches.filter(b => b.status === 'cancelled').length
  };

  // Check for database errors
  const hasErrors = batchesError || analyticsError || requisitionsError || vehiclesError || driversError || facilitiesError;
  
  if (hasErrors) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50 text-red-500" />
          <p className="text-lg font-medium mb-2 text-red-600">Database Connection Error</p>
          <p className="text-sm text-muted-foreground mb-4">
            Missing database tables. Please deploy migrations first.
          </p>
          <div className="text-xs text-left bg-red-50 p-3 rounded border max-w-md">
            <p className="font-medium mb-1">To fix this:</p>
            <p>1. Run: <code className="bg-red-100 px-1 rounded">supabase db push</code></p>
            <p>2. Regenerate types and restart dev server</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
          <p>Loading batch data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Planner</h1>
          <p className="text-muted-foreground">Create and manage delivery batches with route optimization</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogDescription>
                Group approved requisitions into optimized delivery batches
              </DialogDescription>
            </DialogHeader>
            <BatchCreateWizard
              approvedRequisitions={approvedRequisitions}
              vehicles={vehicles}
              drivers={drivers}
              facilities={facilities}
              onSubmit={handleCreateBatch}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createBatchMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{analytics.totalBatches}</p>
                <p className="text-sm text-muted-foreground">Total Batches</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{analytics.statusBreakdown?.planned || 0}</p>
                <p className="text-sm text-muted-foreground">Planned</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{analytics.statusBreakdown?.['in-progress'] || 0}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{analytics.statusBreakdown?.completed || 0}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{analytics.totalWeight.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Total Weight (kg)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{analytics.totalVolume.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Total Volume (m³)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Vehicle:</Label>
              <Select value={filters.vehicle_id} onValueChange={(value) => setFilters({...filters, vehicle_id: value})}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.model} ({vehicle.plateNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Type:</Label>
              <Select value={filters.batch_type} onValueChange={(value) => setFilters({...filters, batch_type: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="planned">Planned ({statusCounts.planned})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({statusCounts['in-progress']})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({statusCounts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({statusCounts.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Delivery Batches</CardTitle>
              <CardDescription>
                {filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Vehicle & Driver</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requisitions</TableHead>
                    <TableHead>Load</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => {
                    const utilization = calculateUtilization(batch);
                    
                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono text-sm">
                          {batch.batch_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              <Truck className="h-4 w-4" />
                              {batch.vehicle?.model || 'No Vehicle'}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {batch.driver?.name || 'No Driver'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(batch.batch_type)}>
                            {batch.batch_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {batch.requisition_ids?.length || 0}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{batch.total_weight.toFixed(1)} kg</div>
                            <div className="text-muted-foreground">{batch.total_volume.toFixed(2)} m³</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={utilization} 
                              className="h-2 w-16" 
                            />
                            <span className="text-sm font-medium">
                              {utilization.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(batch.priority)}>
                            {batch.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(batch.status)}>
                            {batch.status.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {batch.expected_start_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(batch.expected_start_time).toLocaleDateString()}
                              </div>
                            )}
                            {batch.expected_start_time && (
                              <div className="text-muted-foreground">
                                {new Date(batch.expected_start_time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(batch)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {batch.status === 'planned' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusUpdate(batch.id, 'in-progress')}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {batch.status === 'in-progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusUpdate(batch.id, 'completed')}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {batch.status === 'planned' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(batch.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filteredBatches.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No batches found</p>
                  <p className="text-sm">Try adjusting your filters or create a new batch</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Batch Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Details</DialogTitle>
            <DialogDescription>
              Complete batch information, route, and progress tracking
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="p-6">
              <p className="text-center text-muted-foreground">
                Batch detail panel will be available after database migration deployment.
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Selected Batch:</h4>
                <p className="text-sm">ID: {selectedBatch.id}</p>
                <p className="text-sm">Status: {selectedBatch.status}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
