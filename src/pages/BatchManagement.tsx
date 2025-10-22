import { useState } from 'react';
import { BreadcrumbNavigation } from '@/components/ui/breadcrumb-navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeliveryBatches, useCreateDeliveryBatch } from '@/hooks/useDeliveryBatches';
import { useBatchUpdate } from '@/hooks/useBatchUpdate';
import BatchList from '@/components/delivery/BatchList';
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Truck,
  MapPin,
  BarChart3
} from 'lucide-react';
import { DeliveryBatch } from '@/types';

export default function BatchManagement() {
  const { data: batches = [], isLoading } = useDeliveryBatches();
  const batchUpdate = useBatchUpdate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  const handleBatchUpdate = (batchId: string, updates: Partial<DeliveryBatch>) => {
    batchUpdate.mutate({ batchId, updates });
  };

  // Filter batches
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         batch.medicationType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || batch.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Categorize batches by tab
  const activeBatches = filteredBatches.filter(b => 
    ['planned', 'assigned', 'in-progress'].includes(b.status)
  );
  const completedBatches = filteredBatches.filter(b => b.status === 'completed');
  const cancelledBatches = filteredBatches.filter(b => b.status === 'cancelled');

  // Statistics
  const stats = {
    total: batches.length,
    active: batches.filter(b => ['planned', 'assigned', 'in-progress'].includes(b.status)).length,
    completed: batches.filter(b => b.status === 'completed').length,
    cancelled: batches.filter(b => b.status === 'cancelled').length
  };

  const breadcrumbItems = [
    { label: 'FleetOps', href: '/fleetops' },
    { label: 'Batch Management' }
  ];

  return (
    <div className="p-6 space-y-6">
        {/* Breadcrumbs */}
        <BreadcrumbNavigation items={breadcrumbItems} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Batch Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage delivery batches, assignments, and route schedules
            </p>
          </div>
          <Button size="lg" className="sm:w-auto w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In progress or planned
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully delivered
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cancelled}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Terminated batches
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            <CardDescription>
              Find and filter delivery batches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or medication..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Batch Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              All
              <Badge variant="secondary" className="ml-1">
                {filteredBatches.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              Active
              <Badge variant="default" className="ml-1">
                {activeBatches.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              Completed
              <Badge variant="secondary" className="ml-1">
                {completedBatches.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              Cancelled
              <Badge variant="destructive" className="ml-1">
                {cancelledBatches.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <BatchList 
              batches={filteredBatches} 
              onBatchUpdate={handleBatchUpdate}
            />
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <BatchList 
              batches={activeBatches} 
              onBatchUpdate={handleBatchUpdate}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <BatchList 
              batches={completedBatches} 
              onBatchUpdate={handleBatchUpdate}
            />
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            <BatchList 
              batches={cancelledBatches} 
              onBatchUpdate={handleBatchUpdate}
            />
          </TabsContent>
        </Tabs>
    </div>
  );
}
