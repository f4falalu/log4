import { useState, useMemo } from 'react';
import { Plus, Search, Warehouse as WarehouseIcon, MapPin, Package, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useWarehouses, useWarehousesStats } from '@/hooks/useWarehouses';
import type { Warehouse, WarehouseFilters } from '@/types/warehouse';
import { WarehouseTable } from './components/WarehouseTable';
import { WarehouseDetailPanel } from './components/WarehouseDetailPanel';
import { WarehouseFormDialog } from './components/WarehouseFormDialog';

export default function WarehousePage() {
  // Filters state
  const [filters, setFilters] = useState<WarehouseFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Selection state
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | undefined>();

  // Active filters
  const activeFilters = useMemo(() => ({
    ...filters,
    search: searchTerm || undefined,
  }), [filters, searchTerm]);

  // Data fetching
  const { data, isLoading } = useWarehouses(activeFilters, page, pageSize);
  const { data: stats } = useWarehousesStats();

  const warehouses = data?.warehouses || [];
  const totalWarehouses = data?.total || 0;
  const totalPages = Math.ceil(totalWarehouses / pageSize);

  // Handlers
  const handleWarehouseClick = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedWarehouse(null);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingWarehouse(undefined);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingWarehouse(undefined);
  };

  const formatCapacity = (value?: number) => {
    if (!value) return '-';
    return `${value.toLocaleString()} m³`;
  };

  return (
    <div className="h-full flex flex-col overflow-x-auto">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background min-w-fit">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Warehouse</h1>
              <p className="text-sm text-muted-foreground">
                Manage warehouses, storage zones, and capacity
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Warehouses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <WarehouseIcon className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">{stats?.total_warehouses || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold">{stats?.active_warehouses || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  <span className="text-2xl font-bold">
                    {formatCapacity(stats?.total_capacity_m3)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <span className="text-2xl font-bold">
                      {(stats?.utilization_pct || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={stats?.utilization_pct || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search warehouses..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="pl-9"
              />
            </div>

            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setPage(0);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 min-w-fit">
        {/* Table */}
        <div className="flex-1 min-w-[800px] overflow-auto">
          <WarehouseTable
            warehouses={warehouses}
            isLoading={isLoading}
            onWarehouseClick={handleWarehouseClick}
            onEdit={handleEdit}
            selectedWarehouseId={selectedWarehouse?.id}
            page={page}
            totalPages={totalPages}
            totalWarehouses={totalWarehouses}
            onPageChange={setPage}
            pageSize={pageSize}
          />
        </div>

        {/* Detail Panel */}
        {isDetailOpen && selectedWarehouse && (
          <WarehouseDetailPanel
            warehouse={selectedWarehouse}
            onClose={handleCloseDetail}
            onEdit={() => handleEdit(selectedWarehouse)}
          />
        )}
      </div>

      {/* Form Dialog */}
      <WarehouseFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        warehouse={editingWarehouse}
      />
    </div>
  );
}
